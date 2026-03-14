import { ApiError, request } from './client';
import type {
  ConfirmEmailRequestDto,
  CreateFamilyRequestDto,
  EmailDto,
  LoginRequestDto,
  RefreshTokenRequestDto,
  RegisterChildRequestDto,
  RegisterRequestDto,
  RequestResetPasswordRequestDto,
  ResetPasswordRequestDto,
  TokenDto,
  VerifyOtpRequestDto,
} from '../dto/auth.dto';

interface AuthorizedRequestOptions {
  accessToken: string;
}

interface UnknownApiObject {
  [key: string]: unknown;
}

const RETRIABLE_STATUSES = new Set([408, 502, 503]);

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const shouldRetryTransientError = (error: unknown): boolean =>
  error instanceof ApiError && RETRIABLE_STATUSES.has(error.status);

const requestWithTransientRetry = async <T>(
  execute: () => Promise<T>,
  maxAttempts = 2,
): Promise<T> => {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await execute();
    } catch (error) {
      lastError = error;
      const canRetry = attempt < maxAttempts && shouldRetryTransientError(error);
      if (!canRetry) {
        throw error;
      }

      await sleep(350 * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
};

const resolveAccessToken = (accessToken: string): string => {
  const normalized = accessToken.trim();
  if (!normalized) {
    throw new Error('Access token is required for authenticated family requests.');
  }

  return normalized;
};

const withAuthorization = ({ accessToken }: AuthorizedRequestOptions) => ({
  accessToken: resolveAccessToken(accessToken),
});

export const register = async (payload: RegisterRequestDto): Promise<EmailDto> =>
  request<EmailDto>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const login = async (payload: LoginRequestDto): Promise<TokenDto> =>
  request<TokenDto>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    timeoutMs: 120000,
  });

export const confirmEmail = async (payload: ConfirmEmailRequestDto): Promise<TokenDto> =>
  request<TokenDto>('/api/auth/confirm-email', {
    method: 'POST',
    body: JSON.stringify(payload),
    // Email confirmation may take longer than standard auth calls.
    timeoutMs: 120000,
  });

export const refreshToken = async (payload: RefreshTokenRequestDto): Promise<TokenDto> =>
  request<TokenDto>('/api/auth/refresh-token', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const createFamily = async (
  payload: CreateFamilyRequestDto,
  options: AuthorizedRequestOptions,
): Promise<UnknownApiObject | null> =>
  request<UnknownApiObject | null>('/api/families', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...withAuthorization(options),
    timeoutMs: 20000,
  });

export const getFamily = async (options: AuthorizedRequestOptions): Promise<unknown> =>
  requestWithTransientRetry(() =>
    request<unknown>('/api/families', {
      method: 'GET',
      ...withAuthorization(options),
      timeoutMs: 9000,
    }),
  );

export const getFamilyChildren = async (options: AuthorizedRequestOptions): Promise<unknown> =>
  requestWithTransientRetry(() =>
    request<unknown>('/api/children', {
      method: 'GET',
      ...withAuthorization(options),
      timeoutMs: 9000,
    }),
  );

export const registerChild = async (
  payload: RegisterChildRequestDto,
  options: AuthorizedRequestOptions,
): Promise<void> =>
  request<void>('/api/children', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...withAuthorization(options),
    timeoutMs: 20000,
  });

export const requestResetPassword = async (
  payload: RequestResetPasswordRequestDto,
): Promise<EmailDto> =>
  request<EmailDto>('/api/auth/request-reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const verifyOtp = async (payload: VerifyOtpRequestDto): Promise<EmailDto> =>
  request<EmailDto>('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const resetPassword = async (payload: ResetPasswordRequestDto): Promise<TokenDto> =>
  request<TokenDto>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
