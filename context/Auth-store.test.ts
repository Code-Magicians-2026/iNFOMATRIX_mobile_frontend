import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getItemMock,
  setItemMock,
  removeItemMock,
  loginRequestMock,
  registerRequestMock,
  confirmEmailRequestMock,
  resetPasswordRequestMock,
} = vi.hoisted(() => ({
  getItemMock: vi.fn(),
  setItemMock: vi.fn(),
  removeItemMock: vi.fn(),
  loginRequestMock: vi.fn(),
  registerRequestMock: vi.fn(),
  confirmEmailRequestMock: vi.fn(),
  resetPasswordRequestMock: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: getItemMock,
    setItem: setItemMock,
    removeItem: removeItemMock,
  },
}));

vi.mock('@/src/features/auth/api/auth', () => ({
  login: loginRequestMock,
  register: registerRequestMock,
  confirmEmail: confirmEmailRequestMock,
  resetPassword: resetPasswordRequestMock,
}));

import useAuthStore from '@/context/Auth-store';

describe('Auth store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ session: null, isHydrated: false });
  });

  it('hydrates valid session from storage', async () => {
    getItemMock.mockResolvedValue(
      JSON.stringify({
        email: 'user@example.com',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
      }),
    );

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().session?.email).toBe('user@example.com');
    expect(useAuthStore.getState().isHydrated).toBe(true);
  });

  it('clears session when stored payload is invalid', async () => {
    getItemMock.mockResolvedValue(JSON.stringify({ email: 'x@example.com', accessToken: null }));

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().isHydrated).toBe(true);
  });

  it('login stores session and persists it', async () => {
    loginRequestMock.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 3600,
      tokenType: null,
    });

    await useAuthStore.getState().login('user@example.com', 'secret');

    expect(loginRequestMock).toHaveBeenCalledWith({ email: 'user@example.com', password: 'secret' });
    expect(useAuthStore.getState().session).toEqual({
      email: 'user@example.com',
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 3600,
      tokenType: 'Bearer',
    });
    expect(setItemMock).toHaveBeenCalledTimes(1);
  });

  it('throws when login response has no tokens', async () => {
    loginRequestMock.mockResolvedValue({
      accessToken: null,
      refreshToken: null,
      expiresIn: 0,
      tokenType: null,
    });

    await expect(useAuthStore.getState().login('user@example.com', 'secret')).rejects.toThrow(
      'Сервер не повернув токени доступу.',
    );
  });

  it('register only creates account and does not create session', async () => {
    registerRequestMock.mockResolvedValue({ email: 'user@example.com' });

    await useAuthStore.getState().register('User Name', 'user@example.com', 'secret');
    expect(registerRequestMock).toHaveBeenCalledWith({
      fullName: 'User Name',
      email: 'user@example.com',
      password: 'secret',
    });
    expect(loginRequestMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState().session).toBeNull();
    expect(setItemMock).not.toHaveBeenCalled();
  });

  it('register forwards API error', async () => {
    registerRequestMock.mockRejectedValue(new Error('Email exists'));

    await expect(
      useAuthStore.getState().register('User Name', 'user@example.com', 'secret'),
    ).rejects.toThrow('Email exists');
  });

  it('confirmEmail stores session using provided email fallback', async () => {
    confirmEmailRequestMock.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 3600,
      email: null,
    });

    await useAuthStore.getState().confirmEmail('user@example.com', '123456');

    expect(useAuthStore.getState().session).toEqual({
      email: 'user@example.com',
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 3600,
      tokenType: 'Bearer',
    });
    expect(setItemMock).toHaveBeenCalledTimes(1);
  });

  it('completePasswordReset stores session using API email', async () => {
    resetPasswordRequestMock.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 3600,
      email: 'reset@example.com',
    });

    await useAuthStore.getState().completePasswordReset('user@example.com', 'new-password');

    expect(useAuthStore.getState().session?.email).toBe('reset@example.com');
    expect(setItemMock).toHaveBeenCalledTimes(1);
  });

  it('logout clears session and removes persisted key', async () => {
    useAuthStore.setState({
      session: {
        email: 'user@example.com',
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 3600,
        tokenType: 'Bearer',
      },
      isHydrated: true,
    });

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().session).toBeNull();
    expect(removeItemMock).toHaveBeenCalledTimes(1);
  });
});
