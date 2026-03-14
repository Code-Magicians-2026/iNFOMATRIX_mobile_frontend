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
import useOfflineTestingStore from '@/context/OfflineTesting-store';

const throwOfflineAuthError = () => {
  throw new Error('Auth API is disabled in Offline testing mode.');
};

const isOfflineTestingModeEnabled = () => useOfflineTestingStore.getState().isOfflineTestingMode;

export const authService = {
  register: async (payload: RegisterRequestDto): Promise<EmailDto> => {
    if (isOfflineTestingModeEnabled()) {
      throwOfflineAuthError();
    }
    return register(payload);
  },

  login: async (payload: LoginRequestDto): Promise<TokenDto> => {
    if (isOfflineTestingModeEnabled()) {
      throwOfflineAuthError();
    }
    return login(payload);
  },

  confirmEmail: async (payload: ConfirmEmailRequestDto): Promise<TokenDto> => {
    if (isOfflineTestingModeEnabled()) {
      throwOfflineAuthError();
    }
    return confirmEmail(payload);
  },

  refreshToken: async (payload: RefreshTokenRequestDto): Promise<TokenDto> => {
    if (isOfflineTestingModeEnabled()) {
      throwOfflineAuthError();
    }
    return refreshToken(payload);
  },

  createFamily: async (
    payload: CreateFamilyRequestDto,
    accessToken: string,
  ): Promise<unknown> => {
    if (isOfflineTestingModeEnabled()) {
      throwOfflineAuthError();
    }
    return createFamily(payload, { accessToken });
  },

  getFamily: async (accessToken: string): Promise<unknown> => {
    if (isOfflineTestingModeEnabled()) {
      throwOfflineAuthError();
    }
    return getFamily({ accessToken });
  },

  getFamilyChildren: async (accessToken: string): Promise<unknown> => {
    if (isOfflineTestingModeEnabled()) {
      throwOfflineAuthError();
    }
    return getFamilyChildren({ accessToken });
  },

  registerChild: async (
    payload: RegisterChildRequestDto,
    accessToken: string,
  ): Promise<void> => {
    if (isOfflineTestingModeEnabled()) {
      throwOfflineAuthError();
    }
    await registerChild(payload, { accessToken });
  },

  requestResetPassword: async (payload: RequestResetPasswordRequestDto): Promise<EmailDto> => {
    if (isOfflineTestingModeEnabled()) {
      throwOfflineAuthError();
    }
    return requestResetPassword(payload);
  },

  verifyOtp: async (payload: VerifyOtpRequestDto): Promise<EmailDto> => {
    if (isOfflineTestingModeEnabled()) {
      throwOfflineAuthError();
    }
    return verifyOtp(payload);
  },

  resetPassword: async (payload: ResetPasswordRequestDto): Promise<TokenDto> => {
    if (isOfflineTestingModeEnabled()) {
      throwOfflineAuthError();
    }
    return resetPassword(payload);
  },
};

