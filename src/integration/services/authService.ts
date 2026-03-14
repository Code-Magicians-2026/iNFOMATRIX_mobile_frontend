import type {
  ConfirmEmailRequestDto,
  EmailDto,
  LoginRequestDto,
  RegisterRequestDto,
  RequestResetPasswordRequestDto,
  ResetPasswordRequestDto,
  TokenDto,
  VerifyOtpRequestDto,
} from '@/src/features/auth/dto/auth.dto';

const MOCK_DELAY_MS = 180;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const normalizeUserId = (email: string) => {
  const normalized = email
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'local-user';
};

const buildMockToken = (email: string): TokenDto => ({
  accessToken: `mock-access-${Date.now()}`,
  refreshToken: `mock-refresh-${Date.now()}`,
  expiresIn: 3600,
  tokenType: 'Bearer',
  email,
  userId: `user-${normalizeUserId(email)}`,
});

export const authService = {
  register: async (payload: RegisterRequestDto): Promise<EmailDto> => {
    await wait(MOCK_DELAY_MS);

    return { email: payload.email };
  },

  login: async (payload: LoginRequestDto): Promise<TokenDto> => {
    await wait(MOCK_DELAY_MS);

    return buildMockToken(payload.email);
  },

  confirmEmail: async (payload: ConfirmEmailRequestDto): Promise<TokenDto> => {
    await wait(MOCK_DELAY_MS);

    return buildMockToken(payload.email);
  },

  requestResetPassword: async (payload: RequestResetPasswordRequestDto): Promise<EmailDto> => {
    await wait(MOCK_DELAY_MS);

    return { email: payload.email };
  },

  verifyOtp: async (payload: VerifyOtpRequestDto): Promise<EmailDto> => {
    await wait(MOCK_DELAY_MS);

    return { email: payload.email };
  },

  resetPassword: async (payload: ResetPasswordRequestDto): Promise<TokenDto> => {
    await wait(MOCK_DELAY_MS);

    return buildMockToken(payload.email);
  },
};

