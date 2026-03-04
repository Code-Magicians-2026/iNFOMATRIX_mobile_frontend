import { create } from 'zustand';
import { DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { ThemeColors, darkColors, lightColors } from '@/shared/styles/theme';

interface ThemeState {
  isDark: boolean;
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => Promise<void>;
  loadTheme: () => Promise<void>;
}

const STORAGE_KEY = 'APP_THEME';
const initialIsDark = Appearance.getColorScheme() === 'dark';

const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: initialIsDark,
  theme: initialIsDark ? DarkTheme : DefaultTheme,
  colors: initialIsDark ? darkColors : lightColors,

  toggleTheme: async () => {
    const current = get().isDark;
    const newIsDark = !current;
    const newTheme = newIsDark ? DarkTheme : DefaultTheme;
    const newColors = newIsDark ? darkColors : lightColors;
    set({ isDark: newIsDark, theme: newTheme, colors: newColors });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ isDark: newIsDark }));
    } catch {}
  },

  loadTheme: async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      if (value) {
        const parsed = JSON.parse(value);
        const isDark = !!parsed.isDark;
        set({
          isDark,
          theme: isDark ? DarkTheme : DefaultTheme,
          colors: isDark ? darkColors : lightColors,
        });
      }
    } catch {}
  },
}));

export default useThemeStore;
