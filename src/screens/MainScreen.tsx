import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import useThemeStore from '@/context/Theme-store';
import useAuthStore from '@/context/Auth-store';

const MainScreen = () => {
  const colors = useThemeStore((s) => s.colors);
  const userEmail = useAuthStore((s) => s.session?.email ?? 'guest');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.text, { color: colors.text }]}>Main screen</Text>
        <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
          Welcome, {userEmail}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 18,
    fontWeight: '500',
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default MainScreen;
