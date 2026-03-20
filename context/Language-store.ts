import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type LanguageCode = 'uk' | 'en';

interface LanguageState {
  language: LanguageCode;
  isHydrated: boolean;
  setLanguage: (language: LanguageCode) => Promise<void>;
  hydrate: () => Promise<void>;
}

const STORAGE_KEY = 'APP_LANGUAGE_V1';

const isLanguageCode = (value: unknown): value is LanguageCode =>
  value === 'uk' || value === 'en';

const resolveInitialLanguage = (): LanguageCode => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale?.toLowerCase() ?? '';
    return locale.startsWith('uk') ? 'uk' : 'en';
  } catch {
    return 'uk';
  }
};

const useLanguageStore = create<LanguageState>((set) => ({
  language: resolveInitialLanguage(),
  isHydrated: false,

  setLanguage: async (language) => {
    set({ language });

    try {
      await AsyncStorage.setItem(STORAGE_KEY, language);
    } catch {}
  },

  hydrate: async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      if (isLanguageCode(value)) {
        set({ language: value, isHydrated: true });
        return;
      }
    } catch {}

    set({ isHydrated: true });
  },
}));

export default useLanguageStore;
