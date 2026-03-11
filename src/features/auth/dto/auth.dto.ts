export interface RegisterRequestDto {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface EmailDto {
  email: string | null;
}

export interface ConfirmEmailRequestDto {
  email: string;
  token: string;
}

export interface RequestResetPasswordRequestDto {
  email: string;
}

export interface VerifyOtpRequestDto {
  email: string;
  token: string;
}

export interface ResetPasswordRequestDto {
  email: string;
  newPassword: string;
}

export interface TokenDto {
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number;
  tokenType?: string | null;
  email?: string | null;
  userId?: string;
}
