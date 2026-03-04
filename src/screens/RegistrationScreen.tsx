import React from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';

import useThemeStore from '@/context/Theme-store';

const RegistrationScreen = () => {
  const colors = useThemeStore((s) => s.colors);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.text }]}>Екран реєстрації</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: '500',
  },
});

export default RegistrationScreen;
