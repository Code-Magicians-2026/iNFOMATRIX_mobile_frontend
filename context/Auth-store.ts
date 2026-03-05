import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { login as loginRequest, register as registerRequest } from '@/src/api/auth';

interface AuthSession {
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

interface AuthState {
  session: AuthSession | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const STORAGE_KEY = 'AUTH_SESSION';

const useAuthStore = create<AuthState>((set) => ({
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

  register: async (email: string, password: string) => {
    await registerRequest({ email, password });
  },

  login: async (email: string, password: string) => {
    const token = await loginRequest({ email, password });

    if (!token.accessToken || !token.refreshToken) {
      throw new Error('Сервер не повернув токени доступу.');
    }

    const session: AuthSession = {
      email,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresIn: token.expiresIn,
      tokenType: token.tokenType ?? 'Bearer',
    };

    set({ session });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  },

  logout: async () => {
    set({ session: null });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
}));

export default useAuthStore;
