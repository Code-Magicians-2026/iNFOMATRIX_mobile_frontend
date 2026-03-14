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
} from '@/src/features/auth/dto/auth.dto';
import {
  confirmEmail,
  createFamily,
  getFamily,
  getFamilyChildren,
  login,
  refreshToken,
  register,
  registerChild,
  requestResetPassword,
  resetPassword,
  verifyOtp,
} from '@/src/features/auth/api/auth';

export const authService = {
  register: async (payload: RegisterRequestDto): Promise<EmailDto> => {
    return register(payload);
  },

  login: async (payload: LoginRequestDto): Promise<TokenDto> => {
    return login(payload);
  },

  confirmEmail: async (payload: ConfirmEmailRequestDto): Promise<TokenDto> => {
    return confirmEmail(payload);
  },

  refreshToken: async (payload: RefreshTokenRequestDto): Promise<TokenDto> => {
    return refreshToken(payload);
  },

  createFamily: async (
    payload: CreateFamilyRequestDto,
    accessToken: string,
  ): Promise<unknown> => createFamily(payload, { accessToken }),

  getFamily: async (accessToken: string): Promise<unknown> => getFamily({ accessToken }),

  getFamilyChildren: async (accessToken: string): Promise<unknown> => getFamilyChildren({ accessToken }),

  registerChild: async (
    payload: RegisterChildRequestDto,
    accessToken: string,
  ): Promise<void> => {
    await registerChild(payload, { accessToken });
  },

  requestResetPassword: async (payload: RequestResetPasswordRequestDto): Promise<EmailDto> => {
    return requestResetPassword(payload);
  },

  verifyOtp: async (payload: VerifyOtpRequestDto): Promise<EmailDto> => {
    return verifyOtp(payload);
  },

  resetPassword: async (payload: ResetPasswordRequestDto): Promise<TokenDto> => {
    return resetPassword(payload);
  },
};

