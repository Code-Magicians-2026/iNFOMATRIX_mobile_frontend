import { request } from '@/src/api/client';

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface EmailDto {
  email: string | null;
}

export interface TokenDto {
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number;
  tokenType: string | null;
}

export const register = async (payload: RegisterRequest): Promise<EmailDto> =>
  request<EmailDto>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const login = async (payload: LoginRequest): Promise<TokenDto> =>
  request<TokenDto>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
