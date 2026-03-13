import React from 'react';
import { SafeAreaView, Switch, Text, View } from 'react-native';

import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import { getStyles } from '@/src/features/profile/styles/settings.styles';

const SettingsScreen = () => {
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const colors = useThemeStore((s) => s.colors);
  const { isLandscape, isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(
    () => getStyles(colors, spacing, isTablet, isLandscape),
    [colors, isLandscape, isTablet, spacing],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View
        style={styles.settingRow}
        accessible
        importantForAccessibility="yes"
        accessibilityLabel="Налаштування темної теми"
      >
        <Text style={styles.label} allowFontScaling>
          Темна тема
        </Text>
        <Switch
          value={isDark}
          onValueChange={() => {
            void toggleTheme();
          }}
          trackColor={{ false: "#767577", true: "#ff2d55" }}
          accessibilityLabel="Перемикач темної теми"
          accessibilityHint="Вмикає або вимикає темну тему застосунку"
        />
      </View>

      <View
        style={styles.settingRow}
        accessible
        importantForAccessibility="yes"
        accessibilityLabel="Налаштування біометричної автентифікації"
      >
        <Text style={styles.label} allowFontScaling>
          Біометрична автентифікація
        </Text>
        <Switch
          trackColor={{ false: "#767577", true: "#ff2d55" }}
          accessibilityLabel="Перемикач біометричної автентифікації"
          accessibilityHint="Вмикає або вимикає біометричну автентифікацію"
        />
      </View>

      <View
        style={styles.settingRow}
        accessible
        importantForAccessibility="yes"
        accessibilityLabel="Налаштування змінити мову інтерфейсу"
      >
        <Text style={styles.label} allowFontScaling>
          Змінити мову інтерфейсу
        </Text>
        <Switch
          trackColor={{ false: "#767577", true: "#ff2d55" }}
          accessibilityLabel="Перемикач зміни мови інтерфейсу"
          accessibilityHint="Вмикає або вимикає зміну мови інтерфейсу"
        />
      </View>
    </SafeAreaView>
  );
};

export default SettingsScreen;
