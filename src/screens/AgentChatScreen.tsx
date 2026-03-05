import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import useThemeStore from '@/context/Theme-store';

const AgentChatScreen = () => {
  const colors = useThemeStore((s) => s.colors);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>AI Chat</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Чат з агентом зараз у розробці.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default AgentChatScreen;
