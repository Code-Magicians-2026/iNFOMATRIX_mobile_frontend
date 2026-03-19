import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LanguageCode } from '@/context/Language-store';
import { useI18n } from '@/src/i18n/useI18n';
import type { ThemeColors } from '@/shared/styles/theme';

interface LanguageOption {
  code: LanguageCode;
  label: string;
}

interface LanguageSwitcherStubProps {
  colors: ThemeColors;
  isTablet: boolean;
}

const LanguageSwitcherStub = ({
  colors,
  isTablet,
}: LanguageSwitcherStubProps) => {
  const { language, setLanguage, t } = useI18n();
  const styles = React.useMemo(
    () => getStyles(colors, isTablet),
    [colors, isTablet],
  );

  const languageOptions = React.useMemo<LanguageOption[]>(
    () => [
      { code: 'uk', label: t('settings.language.option.uk') },
      { code: 'en', label: t('settings.language.option.en') },
    ],
    [t],
  );

  return (
    <View
      style={styles.container}
      accessible
      importantForAccessibility="yes"
      accessibilityLabel={t('settings.language.sectionLabel')}
    >
      <Text style={styles.title} allowFontScaling>
        {t('settings.language.title')}
      </Text>
      <View style={styles.optionsContainer}>
        {languageOptions.map((option) => {
          const isActive = option.code === language;

          return (
            <Pressable
              key={option.code}
              onPress={() => {
                void setLanguage(option.code);
              }}
              style={[styles.optionButton, isActive && styles.optionButtonActive]}
              android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={t('settings.language.selectOption', {
                label: option.label,
              })}
            >
              <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const getStyles = (colors: ThemeColors, isTablet: boolean) =>
  StyleSheet.create({
    container: {
      width: '100%',
      gap: 10,
    },
    title: {
      fontSize: isTablet ? 22 : 20,
      color: colors.text,
    },
    optionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    optionButton: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      borderRadius: 10,
      paddingVertical: isTablet ? 10 : 8,
      paddingHorizontal: isTablet ? 14 : 12,
      elevation: 2,
      overflow: 'hidden',
    },
    optionButtonActive: {
      borderColor: '#ff2d55',
      backgroundColor: colors.card,
      elevation: 4,
    },
    optionText: {
      color: colors.textSecondary,
      fontSize: isTablet ? 17 : 15,
    },
    optionTextActive: {
      color: colors.text,
      fontWeight: '600',
    },
  });

export default LanguageSwitcherStub;
