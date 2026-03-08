import { request } from './client';
import type { EmailDto, LoginRequestDto, RegisterRequestDto, TokenDto } from '../dto/auth.dto';

export const register = async (payload: RegisterRequestDto): Promise<EmailDto> =>
  request<EmailDto>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const login = async (payload: LoginRequestDto): Promise<TokenDto> =>
  request<TokenDto>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
