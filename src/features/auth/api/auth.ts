import { request } from './client';
import type {
  ConfirmEmailRequestDto,
  EmailDto,
  LoginRequestDto,
  RegisterRequestDto,
  RequestResetPasswordRequestDto,
  ResetPasswordRequestDto,
  TokenDto,
  VerifyOtpRequestDto,
} from '../dto/auth.dto';

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

export const confirmEmail = async (payload: ConfirmEmailRequestDto): Promise<TokenDto> =>
  request<TokenDto>('/api/auth/confirm-email', {
    method: 'POST',
    body: JSON.stringify(payload),
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
