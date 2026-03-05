const API_BASE_URL = 'https://infomatrix-api.azurewebsites.net';

interface ApiProblemDetails {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
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
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const data = (await response.json()) as ApiProblemDetails | string;
      if (typeof data === 'string' && data.trim().length > 0) {
        return data;
      }

      const parsedMessage = extractProblemMessage(data as ApiProblemDetails);
      if (parsedMessage) {
        return parsedMessage;
      }
    } else {
      const text = await response.text();
      if (text.trim().length > 0) {
        return text;
      }
    }
  } catch {}

  return `Request failed with status ${response.status}`;
};

export const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers = new Headers(options.headers);

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await parseApiErrorMessage(response);
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
};

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    if (error.message === 'Network request failed') {
      return 'Не вдалося підключитися до сервера.';
    }
    return error.message || fallback;
  }

  return fallback;
};
