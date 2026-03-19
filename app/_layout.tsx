import 'react-native-reanimated';

import React from 'react';
import { StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';

import useThemeStore from '@/context/Theme-store';
import useAuthStore from '@/context/Auth-store';
import useOfflineTestingStore from '@/context/OfflineTesting-store';
import usePlansStore from '@/context/Plans-store';
import useLanguageStore from '@/context/Language-store';
import { queryClient } from '@/src/features/auth/api/queryClient';
import AppErrorBoundary from '@/shared/components/AppErrorBoundary';

export default function RootLayout() {
  const theme = useThemeStore((s) => s.theme);
  const isDark = useThemeStore((s) => s.isDark);
  const colors = useThemeStore((s) => s.colors);
  const loadTheme = useThemeStore((s) => s.loadTheme);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydratePlans = usePlansStore((s) => s.hydrate);
  const hydrateOfflineTesting = useOfflineTestingStore((s) => s.hydrate);
  const hydrateLanguage = useLanguageStore((s) => s.hydrate);
  const paperTheme = React.useMemo(
    () =>
      isDark
        ? {
            ...MD3DarkTheme,
            colors: {
              ...MD3DarkTheme.colors,
              primary: '#ff2d55',
              background: colors.background,
              surface: colors.card,
              onSurface: colors.text,
              outline: colors.border,
            },
          }
        : {
            ...MD3LightTheme,
            colors: {
              ...MD3LightTheme.colors,
              primary: '#ff2d55',
              background: colors.background,
              surface: colors.card,
              onSurface: colors.text,
              outline: colors.border,
            },
          },
    [colors.background, colors.border, colors.card, colors.text, isDark],
  );

  React.useEffect(() => {
    void loadTheme();
    void hydrateAuth();
    void hydratePlans();
    void hydrateOfflineTesting();
    void hydrateLanguage();
  }, [hydrateAuth, hydrateLanguage, hydrateOfflineTesting, hydratePlans, loadTheme]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <AppErrorBoundary isDark={isDark}>
          <PaperProvider theme={paperTheme}>
            <ThemeProvider value={theme}>
              <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
              </Stack>
              <StatusBar style={isDark ? 'light' : 'dark'} />
            </ThemeProvider>
          </PaperProvider>
        </AppErrorBoundary>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
