import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getItemMock,
  setItemMock,
  removeItemMock,
  loginRequestMock,
  registerRequestMock,
} = vi.hoisted(() => ({
  getItemMock: vi.fn(),
  setItemMock: vi.fn(),
  removeItemMock: vi.fn(),
  loginRequestMock: vi.fn(),
  registerRequestMock: vi.fn(),
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

  it('register throws localized message when auto-login fails', async () => {
    registerRequestMock.mockResolvedValue({ email: 'user@example.com' });
    loginRequestMock.mockRejectedValue(new Error('Bad credentials'));

    await expect(useAuthStore.getState().register('user@example.com', 'secret')).rejects.toThrow(
      'Акаунт створено, але автовхід не вдався. Увійдіть вручну.',
    );
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
