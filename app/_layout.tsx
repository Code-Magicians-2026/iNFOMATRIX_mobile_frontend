import React from 'react';
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import useThemeStore from '@/context/Theme-store';
import useAuthStore from '@/context/Auth-store';

export default function RootLayout() {
  const theme = useThemeStore((s) => s.theme);
  const isDark = useThemeStore((s) => s.isDark);
  const loadTheme = useThemeStore((s) => s.loadTheme);
  const hydrateAuth = useAuthStore((s) => s.hydrate);

  React.useEffect(() => {
    void loadTheme();
    void hydrateAuth();
  }, [hydrateAuth, loadTheme]);

  return (
    <ThemeProvider value={theme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
