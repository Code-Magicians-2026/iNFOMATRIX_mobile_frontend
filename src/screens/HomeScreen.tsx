import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import useAuthStore from '@/context/Auth-store';
import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';

const HomeScreen = () => {
  const colors = useThemeStore((s) => s.colors);
  const userEmail = useAuthStore((s) => s.session?.email ?? 'guest');
  const { isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(() => getStyles(isTablet, spacing), [isTablet, spacing]);
  const [mvpHintVisible, setMvpHintVisible] = React.useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]} allowFontScaling>
          Today's Progress
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} allowFontScaling>
          Welcome back, {userEmail}
        </Text>
        <Text style={[styles.metric, { color: colors.text }]} allowFontScaling>
          Completed quests today: 0
        </Text>
        <Text style={[styles.metric, { color: colors.text }]} allowFontScaling>
          XP today: 0
        </Text>
      </View>

      <Pressable
        onPress={() => setMvpHintVisible(true)}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
        accessibilityRole="button"
        accessibilityLabel="Add task"
        accessibilityHint="Створює нову задачу для генерації quest"
        importantForAccessibility="yes"
      >
        <Text style={styles.primaryButtonText} allowFontScaling>
          Add task
        </Text>
      </Pressable>

      {mvpHintVisible ? (
        <Text style={[styles.helperText, { color: colors.textSecondary }]} allowFontScaling>
          MVP step 1: task flow UI is fixed, quest generation will be wired next.
        </Text>
      ) : null}
    </SafeAreaView>
  );
};

const getStyles = (isTablet: boolean, spacing: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing,
      gap: 16,
    },
    progressCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: isTablet ? 24 : 18,
      gap: 8,
      elevation: 2,
    },
    title: {
      fontSize: isTablet ? 28 : 24,
      fontWeight: '700',
    },
    subtitle: {
      fontSize: isTablet ? 16 : 14,
    },
    metric: {
      fontSize: isTablet ? 18 : 16,
      fontWeight: '500',
    },
    primaryButton: {
      backgroundColor: '#ff2d55',
      minHeight: 48,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
    },
    primaryButtonText: {
      color: '#ffffff',
      fontSize: isTablet ? 18 : 16,
      fontWeight: '700',
    },
    helperText: {
      textAlign: 'center',
      fontSize: isTablet ? 15 : 13,
    },
    pressed: {
      opacity: 0.9,
    },
  });

export default HomeScreen;
