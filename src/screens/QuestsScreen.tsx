import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';

const QuestsScreen = () => {
  const colors = useThemeStore((s) => s.colors);
  const { isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(() => getStyles(isTablet, spacing), [isTablet, spacing]);
  const [hasDraftTask, setHasDraftTask] = React.useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.questCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]} allowFontScaling>
          Quests
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} allowFontScaling>
          Generated quests will appear here after AI processing.
        </Text>
        <Text style={[styles.emptyState, { color: colors.text }]} allowFontScaling>
          No active quests yet.
        </Text>
      </View>

      <Pressable
        onPress={() => setHasDraftTask(true)}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
        accessibilityRole="button"
        accessibilityLabel="Add task"
        accessibilityHint="Додає задачу до черги генерації quest"
        importantForAccessibility="yes"
      >
        <Text style={styles.primaryButtonText} allowFontScaling>
          Add task
        </Text>
      </Pressable>

      {hasDraftTask ? (
        <Text style={[styles.helperText, { color: colors.textSecondary }]} allowFontScaling>
          Draft task added. AI quest creation is the next implementation step.
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
    questCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: isTablet ? 24 : 18,
      gap: 10,
      elevation: 2,
    },
    title: {
      fontSize: isTablet ? 28 : 24,
      fontWeight: '700',
    },
    subtitle: {
      fontSize: isTablet ? 16 : 14,
    },
    emptyState: {
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

export default QuestsScreen;
