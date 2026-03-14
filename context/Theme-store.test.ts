import { beforeEach, describe, expect, it, vi } from 'vitest';

import { darkColors, lightColors } from '@/shared/styles/theme';

const { getItemMock, setItemMock } = vi.hoisted(() => ({
  getItemMock: vi.fn(),
  setItemMock: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: getItemMock,
    setItem: setItemMock,
  },
}));

import useThemeStore from '@/context/Theme-store';

describe('Theme store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useThemeStore.setState({ isDark: false, theme: { dark: false }, colors: lightColors });
  });

  it('toggles from light to dark and persists state', async () => {
    await useThemeStore.getState().toggleTheme();

    expect(useThemeStore.getState().isDark).toBe(true);
    expect(useThemeStore.getState().theme.dark).toBe(true);
    expect(useThemeStore.getState().colors).toEqual(darkColors);
    expect(setItemMock).toHaveBeenCalledWith('APP_THEME', JSON.stringify({ isDark: true }));
  });

  it('loads saved dark theme from storage', async () => {
    getItemMock.mockResolvedValue(JSON.stringify({ isDark: true }));

    await useThemeStore.getState().loadTheme();

    expect(useThemeStore.getState().isDark).toBe(true);
    expect(useThemeStore.getState().theme.dark).toBe(true);
    expect(useThemeStore.getState().colors).toEqual(darkColors);
  });

  it('keeps current theme when storage is empty', async () => {
    getItemMock.mockResolvedValue(null);

    await useThemeStore.getState().loadTheme();

    expect(useThemeStore.getState().isDark).toBe(false);
    expect(useThemeStore.getState().colors).toEqual(lightColors);
  });
});
