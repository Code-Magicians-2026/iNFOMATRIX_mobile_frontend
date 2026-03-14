const API_BASE_URL =
  "https://infomatrix-api-cda8ftcucbg8dnfc.germanywestcentral-01.azurewebsites.net";
const REQUEST_TIMEOUT_MS = 60000;

interface ApiRequestOptions extends RequestInit {
  accessToken?: string | null;
  timeoutMs?: number;
}

interface ApiProblemDetails {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

const normalizeAccessToken = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/^Bearer\s+/i, "").trim();
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const extractProblemMessage = (problem: ApiProblemDetails): string | null => {
  if (problem.detail) {
    return problem.detail;
  }

  if (problem.title) {
    return problem.title;
  }

  if (problem.errors) {
    const firstFieldErrors = Object.values(problem.errors)[0];
    if (Array.isArray(firstFieldErrors) && firstFieldErrors[0]) {
      return firstFieldErrors[0];
    }
  }

  return null;
};

const parseApiErrorMessage = async (response: Response): Promise<string> => {
  try {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = (await response.json()) as ApiProblemDetails | string;
      if (typeof data === "string" && data.trim().length > 0) {
        return data;
      }

      const parsedMessage = extractProblemMessage(data as ApiProblemDetails);
      if (parsedMessage) {
        return parsedMessage;
      }
    } else {
      const text = await response.text();
      if (text.trim().length > 0) {
        const trimmed = text.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          try {
            const parsed = JSON.parse(trimmed) as ApiProblemDetails | string;
            if (typeof parsed === "string" && parsed.trim().length > 0) {
              return parsed;
            }

            const parsedMessage = extractProblemMessage(
              parsed as ApiProblemDetails,
            );
            if (parsedMessage) {
              return parsedMessage;
            }
          } catch {}
        }

        return text;
      }
    }
  } catch {}

  return `Request failed with status ${response.status}`;
};

export const request = async <T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> => {
  const { accessToken, timeoutMs, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);
  const isFormDataBody =
    typeof FormData !== "undefined" && requestOptions.body instanceof FormData;

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (requestOptions.body && !headers.has("Content-Type") && !isFormDataBody) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken && !headers.has("Authorization")) {
    const normalizedAccessToken = normalizeAccessToken(accessToken);
    if (normalizedAccessToken) {
      headers.set("Authorization", `Bearer ${normalizedAccessToken}`);
    }
  }

  const controller = new AbortController();
  const effectiveTimeoutMs =
    typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0
      ? timeoutMs
      : REQUEST_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), effectiveTimeoutMs);
  const parentSignal = requestOptions.signal;

  const onParentAbort = () => {
    controller.abort();
  };

  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort();
    } else {
      parentSignal.addEventListener("abort", onParentAbort);
    }
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("Request timed out", 504);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    parentSignal?.removeEventListener("abort", onParentAbort);
  }

  if (!response.ok) {
    const message = await parseApiErrorMessage(response);
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  const text = await response.text();
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed) as T;
    } catch {}
  }

  return text as T;
};

export const getApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return "Забагато запитів на email. Зачекайте трохи та спробуйте знову.";
    }

    if (error.status === 504 || error.status === 408) {
      return "Сервер не відповідає вчасно. Спробуйте ще раз через 10-30 секунд.";
    }

    if (error.status === 502 || error.status === 503) {
      return "Сервер тимчасово недоступний. Спробуйте пізніше.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    if (error.message === "Network request failed") {
      return "Не вдалося підключитися до сервера.";
    }
    return error.message || fallback;
  }

  return fallback;
};
