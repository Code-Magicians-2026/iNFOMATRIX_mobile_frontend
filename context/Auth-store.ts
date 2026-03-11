import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  confirmEmail as confirmEmailRequest,
  login as loginRequest,
  register as registerRequest,
  resetPassword as resetPasswordRequest,
} from '@/src/features/auth/api/auth';
import type { TokenDto } from '@/src/features/auth/dto/auth.dto';
import type { AuthSession } from '@/src/features/auth/models/auth-session.model';

interface AuthState {
  session: AuthSession | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  confirmEmail: (email: string, token: string) => Promise<void>;
  completePasswordReset: (email: string, newPassword: string) => Promise<void>;
  createSessionFromToken: (token: TokenDto, fallbackEmail?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const STORAGE_KEY = 'AUTH_SESSION';

const buildSessionFromToken = (token: TokenDto, fallbackEmail?: string): AuthSession => {
  if (!token.accessToken || !token.refreshToken) {
    throw new Error('Сервер не повернув токени доступу.');
  }

  const email = token.email ?? fallbackEmail ?? null;
  if (!email) {
    throw new Error('Сервер не повернув email користувача.');
  }

  return {
    email,
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresIn: token.expiresIn,
    tokenType: token.tokenType ?? 'Bearer',
  };
};

const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  isHydrated: false,

  hydrate: async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      if (!value) {
        set({ session: null, isHydrated: true });
        return;
      }

      const parsed = JSON.parse(value) as AuthSession;
      if (!parsed.accessToken || !parsed.refreshToken || !parsed.email) {
        set({ session: null, isHydrated: true });
        return;
      }

      set({ session: parsed, isHydrated: true });
    } catch {
      set({ session: null, isHydrated: true });
    }
  },

  register: async (fullName: string, email: string, password: string) => {
    await registerRequest({ fullName, email, password });
    try {
      await get().login(email, password);
    } catch {
      throw new Error('Акаунт створено, але автовхід не вдався. Увійдіть вручну.');
    }
  },

  login: async (email: string, password: string) => {
    const token = await loginRequest({ email, password });
    await get().createSessionFromToken(token, email);
  },

  confirmEmail: async (email: string, token: string) => {
    const response = await confirmEmailRequest({ email, token });
    await get().createSessionFromToken(response, email);
  },

  completePasswordReset: async (email: string, newPassword: string) => {
    const response = await resetPasswordRequest({ email, newPassword });
    await get().createSessionFromToken(response, email);
  },

  createSessionFromToken: async (token: TokenDto, fallbackEmail?: string) => {
    const session = buildSessionFromToken(token, fallbackEmail);
    set({ session });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {}
  },

  logout: async () => {
    set({ session: null });
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
  },
}));

export default useAuthStore;
