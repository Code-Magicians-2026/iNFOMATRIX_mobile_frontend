import React from 'react';
import { Pressable, SafeAreaView, Switch, Text, View } from 'react-native';

import useAuthStore from '@/context/Auth-store';
import useThemeStore from '@/context/Theme-store';
import useOfflineTestingStore from '@/context/OfflineTesting-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import LanguageSwitcherStub from '@/src/features/profile/components/LanguageSwitcherStub';
import { getStyles } from '@/src/features/profile/styles/settings.styles';

const SettingsScreen = () => {
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const colors = useThemeStore((s) => s.colors);
  const isOfflineTestingMode = useOfflineTestingStore((s) => s.isOfflineTestingMode);
  const isOfflineTestingHydrated = useOfflineTestingStore((s) => s.isHydrated);
  const setOfflineTestingMode = useOfflineTestingStore((s) => s.setOfflineTestingMode);
  const role = useAuthStore((s) => s.role);
  const setRole = useAuthStore((s) => s.setRole);
  const effectiveRole = role ?? 'child';
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
        accessibilityLabel="Налаштування офлайн демо режиму"
      >
        <View style={styles.labelWrap}>
          <Text style={styles.label} allowFontScaling>
            Offline testing mode
          </Text>
          <Text style={styles.description} allowFontScaling>
            Demo data only, no backend requests
          </Text>
        </View>
        <Switch
          value={isOfflineTestingMode}
          disabled={!isOfflineTestingHydrated}
          onValueChange={(value) => {
            void setOfflineTestingMode(value);
          }}
          trackColor={{ false: "#767577", true: "#ff2d55" }}
          accessibilityLabel="Перемикач офлайн демо режиму"
          accessibilityHint="Вмикає локальний офлайн режим із mock даними"
        />
      </View>

      {isOfflineTestingMode && isOfflineTestingHydrated ? (
        <View
          style={styles.settingBlock}
          accessible
          importantForAccessibility="yes"
          accessibilityLabel="Debug перемикач ролі"
        >
          <View style={styles.labelWrap}>
            <Text style={styles.label} allowFontScaling>
              Debug role
            </Text>
            <Text style={styles.description} allowFontScaling>
              Available only in offline testing mode
            </Text>
          </View>
          <View style={styles.roleChipsRow}>
            <Pressable
              onPress={() => {
                void setRole('adult');
              }}
              style={[
                styles.roleChip,
                {
                  borderColor: effectiveRole === 'adult' ? '#ff2d55' : colors.border,
                  backgroundColor: effectiveRole === 'adult' ? '#ff2d55' : colors.background,
                },
              ]}
              android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
              accessibilityRole="button"
              accessibilityLabel="Увімкнути роль adult"
            >
              <Text
                style={[
                  styles.roleChipLabel,
                  { color: effectiveRole === 'adult' ? '#ffffff' : colors.text },
                ]}
                allowFontScaling
              >
                Adult
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void setRole('child');
              }}
              style={[
                styles.roleChip,
                {
                  borderColor: effectiveRole === 'child' ? '#ff2d55' : colors.border,
                  backgroundColor: effectiveRole === 'child' ? '#ff2d55' : colors.background,
                },
              ]}
              android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
              accessibilityRole="button"
              accessibilityLabel="Увімкнути роль child"
            >
              <Text
                style={[
                  styles.roleChipLabel,
                  { color: effectiveRole === 'child' ? '#ffffff' : colors.text },
                ]}
                allowFontScaling
              >
                Child
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View
        style={styles.settingRow}
        accessible
        importantForAccessibility="yes"
        accessibilityLabel="Налаштування темної теми"
      >
        <View style={styles.labelWrap}>
          <Text style={styles.label} allowFontScaling>
            Темна тема
          </Text>
        </View>
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
        <View style={styles.labelWrap}>
          <Text style={styles.label} allowFontScaling>
            Біометрична автентифікація
          </Text>
        </View>
        <Switch
          trackColor={{ false: "#767577", true: "#ff2d55" }}
          accessibilityLabel="Перемикач біометричної автентифікації"
          accessibilityHint="Вмикає або вимикає біометричну автентифікацію"
        />
      </View>

      <View
        style={styles.settingBlock}
        accessible
        importantForAccessibility="yes"
        accessibilityLabel="Налаштування мови інтерфейсу"
      >
        <LanguageSwitcherStub colors={colors} isTablet={isTablet} />
      </View>
    </SafeAreaView>
  );
};

export default SettingsScreen;
