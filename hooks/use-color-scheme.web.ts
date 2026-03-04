import useThemeStore from '@/context/Theme-store';

export function useColorScheme(): 'light' | 'dark' {
  const isDark = useThemeStore((s) => s.isDark);
  return isDark ? 'dark' : 'light';
}
