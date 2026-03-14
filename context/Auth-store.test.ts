import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getItemMock,
  setItemMock,
  removeItemMock,
  loginRequestMock,
  registerRequestMock,
  confirmEmailRequestMock,
  resetPasswordRequestMock,
  createFamilyRequestMock,
  getFamilyRequestMock,
  registerChildRequestMock,
} = vi.hoisted(() => ({
  getItemMock: vi.fn(),
  setItemMock: vi.fn(),
  removeItemMock: vi.fn(),
  loginRequestMock: vi.fn(),
  registerRequestMock: vi.fn(),
  confirmEmailRequestMock: vi.fn(),
  resetPasswordRequestMock: vi.fn(),
  createFamilyRequestMock: vi.fn(),
  getFamilyRequestMock: vi.fn(),
  registerChildRequestMock: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: getItemMock,
    setItem: setItemMock,
    removeItem: removeItemMock,
  },
}));

vi.mock('@/src/integration/services/authService', () => ({
  authService: {
    login: loginRequestMock,
    register: registerRequestMock,
    confirmEmail: confirmEmailRequestMock,
    resetPassword: resetPasswordRequestMock,
    createFamily: createFamilyRequestMock,
    getFamily: getFamilyRequestMock,
    registerChild: registerChildRequestMock,
  },
}));

import useAuthStore from '@/context/Auth-store';

describe('Auth store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      session: null,
      currentUser: null,
      role: null,
      selectedChildId: null,
      family: null,
      pendingFamilyName: null,
      isHydrated: false,
    });
    getFamilyRequestMock.mockResolvedValue(null);
  });

  it('hydrates legacy session payload and migrates it', async () => {
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
    expect(useAuthStore.getState().role).toBe('child');
    expect(useAuthStore.getState().currentUser?.email).toBe('user@example.com');
    expect(useAuthStore.getState().family).toBeNull();
    expect(useAuthStore.getState().isHydrated).toBe(true);
    expect(setItemMock).toHaveBeenCalledTimes(1);
  });

  it('clears state when stored payload is invalid', async () => {
    getItemMock.mockResolvedValue(JSON.stringify({ email: 'x@example.com', accessToken: null }));

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().currentUser).toBeNull();
    expect(useAuthStore.getState().role).toBeNull();
    expect(useAuthStore.getState().family).toBeNull();
    expect(useAuthStore.getState().isHydrated).toBe(true);
  });

  it('login stores session, role, currentUser and persists envelope', async () => {
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
    expect(useAuthStore.getState().role).toBe('adult');
    expect(useAuthStore.getState().currentUser?.fullName).toBe('User');
    expect(getFamilyRequestMock).toHaveBeenCalledWith('access');
    expect(setItemMock).toHaveBeenCalled();

    const lastPersistedCall = setItemMock.mock.calls.at(-1) as [string, string];
    const [, persistedJson] = lastPersistedCall;
    const persisted = JSON.parse(persistedJson) as { role: string; currentUser: { email: string } };
    expect(persisted.role).toBe('adult');
    expect(persisted.currentUser.email).toBe('user@example.com');
  });

  it('throws when login response has no access token', async () => {
    loginRequestMock.mockResolvedValue({
      accessToken: null,
      refreshToken: null,
      expiresIn: 0,
      tokenType: null,
    });

    await expect(useAuthStore.getState().login('user@example.com', 'secret')).rejects.toThrow(
      'Сервер не повернув access token.',
    );
  });

  it('register stores pending family name and does not create session', async () => {
    registerRequestMock.mockResolvedValue({ email: 'user@example.com' });

    await useAuthStore.getState().register('User', 'Name', 'user@example.com', 'secret');
    expect(registerRequestMock).toHaveBeenCalledWith({
      firstName: 'User',
      lastName: 'Name',
      email: 'user@example.com',
      password: 'secret',
    });
    expect(createFamilyRequestMock).not.toHaveBeenCalled();
    expect(loginRequestMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().family).toBeNull();
    expect(useAuthStore.getState().pendingFamilyName).toBe("Name's");
    expect(setItemMock).not.toHaveBeenCalled();
  });

  it('register forwards API error', async () => {
    registerRequestMock.mockRejectedValue(new Error('Email exists'));

    await expect(
      useAuthStore.getState().register('User', 'Name', 'user@example.com', 'secret'),
    ).rejects.toThrow('Email exists');
  });

  it('confirmEmail stores session using provided email fallback', async () => {
    confirmEmailRequestMock.mockResolvedValue({
      accessToken: 'access',
      refreshToken: null,
      expiresIn: 3600,
      email: null,
    });

    await useAuthStore.getState().confirmEmail('user@example.com', '123456');

    expect(useAuthStore.getState().session).toEqual({
      email: 'user@example.com',
      accessToken: 'access',
      refreshToken: null,
      expiresIn: 3600,
      tokenType: 'Bearer',
    });
    expect(useAuthStore.getState().currentUser?.email).toBe('user@example.com');
    expect(getFamilyRequestMock).toHaveBeenCalledWith('access');
    expect(setItemMock).toHaveBeenCalled();
  });

  it('supports role switch and child selection for adult flow', async () => {
    await useAuthStore.getState().setRole('adult');

    expect(useAuthStore.getState().role).toBe('adult');
    expect(useAuthStore.getState().currentUser?.role).toBe('adult');

    await useAuthStore.getState().setSelectedChildId('child-42');
    expect(useAuthStore.getState().selectedChildId).toBe('child-42');

    await useAuthStore.getState().setRole('child');
    expect(useAuthStore.getState().selectedChildId).toBeNull();
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
    expect(useAuthStore.getState().currentUser?.email).toBe('reset@example.com');
    expect(getFamilyRequestMock).toHaveBeenCalledWith('access');
    expect(setItemMock).toHaveBeenCalled();
  });

  it('logout clears all auth and role-based state', async () => {
    useAuthStore.setState({
      session: {
        email: 'user@example.com',
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 3600,
        tokenType: 'Bearer',
      },
      currentUser: {
        id: 'user-1',
        fullName: 'User One',
        email: 'user@example.com',
        role: 'adult',
        level: 2,
        xp: 120,
        streak: 3,
        avatarType: 'mentor',
      },
      role: 'adult',
      selectedChildId: 'child-7',
      family: { id: 'family-1', name: 'Family One' },
      pendingFamilyName: null,
      isHydrated: true,
    });

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().currentUser).toBeNull();
    expect(useAuthStore.getState().role).toBeNull();
    expect(useAuthStore.getState().selectedChildId).toBeNull();
    expect(useAuthStore.getState().family).toBeNull();
    expect(removeItemMock).toHaveBeenCalledTimes(2);
    expect(removeItemMock).toHaveBeenCalledWith('AUTH_SESSION');
    expect(removeItemMock).toHaveBeenCalledWith('AI_PLANS_CACHE_V1');
  });
});

