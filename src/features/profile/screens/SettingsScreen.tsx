import React from 'react';
import { Pressable, SafeAreaView, Switch, Text, View } from 'react-native';

import useAuthStore from '@/context/Auth-store';
import useThemeStore from '@/context/Theme-store';
import useOfflineTestingStore from '@/context/OfflineTesting-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import LanguageSwitcherStub from '@/src/features/profile/components/LanguageSwitcherStub';
import { useI18n } from '@/src/i18n/useI18n';
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
  const { t } = useI18n();
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
        accessibilityLabel={t('settings.offlineMode.accessibilityLabel')}
      >
        <View style={styles.labelWrap}>
          <Text style={styles.label} allowFontScaling>
            {t('settings.offlineMode.title')}
          </Text>
          <Text style={styles.description} allowFontScaling>
            {t('settings.offlineMode.description')}
          </Text>
        </View>
        <Switch
          value={isOfflineTestingMode}
          disabled={!isOfflineTestingHydrated}
          onValueChange={(value) => {
            void setOfflineTestingMode(value);
          }}
          trackColor={{ false: '#767577', true: '#ff2d55' }}
          accessibilityLabel={t('settings.offlineMode.switchLabel')}
          accessibilityHint={t('settings.offlineMode.switchHint')}
        />
      </View>

      {isOfflineTestingMode && isOfflineTestingHydrated ? (
        <View
          style={styles.settingBlock}
          accessible
          importantForAccessibility="yes"
          accessibilityLabel={t('settings.debugRole.accessibilityLabel')}
        >
          <View style={styles.labelWrap}>
            <Text style={styles.label} allowFontScaling>
              {t('settings.debugRole.title')}
            </Text>
            <Text style={styles.description} allowFontScaling>
              {t('settings.debugRole.description')}
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
              accessibilityLabel={t('settings.debugRole.adultButton')}
            >
              <Text
                style={[
                  styles.roleChipLabel,
                  { color: effectiveRole === 'adult' ? '#ffffff' : colors.text },
                ]}
                allowFontScaling
              >
                {t('common.roleAdult')}
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
              accessibilityLabel={t('settings.debugRole.childButton')}
            >
              <Text
                style={[
                  styles.roleChipLabel,
                  { color: effectiveRole === 'child' ? '#ffffff' : colors.text },
                ]}
                allowFontScaling
              >
                {t('common.roleChild')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View
        style={styles.settingRow}
        accessible
        importantForAccessibility="yes"
        accessibilityLabel={t('settings.darkTheme.accessibilityLabel')}
      >
        <View style={styles.labelWrap}>
          <Text style={styles.label} allowFontScaling>
            {t('settings.darkTheme.title')}
          </Text>
        </View>
        <Switch
          value={isDark}
          onValueChange={() => {
            void toggleTheme();
          }}
          trackColor={{ false: '#767577', true: '#ff2d55' }}
          accessibilityLabel={t('settings.darkTheme.switchLabel')}
          accessibilityHint={t('settings.darkTheme.switchHint')}
        />
      </View>

      <View
        style={styles.settingRow}
        accessible
        importantForAccessibility="yes"
        accessibilityLabel={t('settings.biometric.accessibilityLabel')}
      >
        <View style={styles.labelWrap}>
          <Text style={styles.label} allowFontScaling>
            {t('settings.biometric.title')}
          </Text>
        </View>
        <Switch
          trackColor={{ false: '#767577', true: '#ff2d55' }}
          accessibilityLabel={t('settings.biometric.switchLabel')}
          accessibilityHint={t('settings.biometric.switchHint')}
        />
      </View>

      <View
        style={styles.settingBlock}
        accessible
        importantForAccessibility="yes"
        accessibilityLabel={t('settings.language.sectionLabel')}
      >
        <LanguageSwitcherStub colors={colors} isTablet={isTablet} />
      </View>
    </SafeAreaView>
  );
};

export default SettingsScreen;
