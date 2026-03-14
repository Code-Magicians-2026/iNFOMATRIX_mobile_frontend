import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/shared/styles/theme';

type LanguageCode = 'uk' | 'en' | 'pl';

interface LanguageOption {
  code: LanguageCode;
  label: string;
}

interface LanguageSwitcherStubProps {
  colors: ThemeColors;
  isTablet: boolean;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'uk', label: 'Українська' },
  { code: 'en', label: 'English' },
  { code: 'ro', label: 'Limba română' },
  { code: 'pl', label: 'Polski' },
];

const LanguageSwitcherStub = ({
  colors,
  isTablet,
}: LanguageSwitcherStubProps) => {
  const [selectedLanguage, setSelectedLanguage] =
    React.useState<LanguageCode>('uk');
  const styles = React.useMemo(
    () => getStyles(colors, isTablet),
    [colors, isTablet],
  );

  return (
    <View
      style={styles.container}
      accessible
      importantForAccessibility="yes"
      accessibilityLabel="Налаштування мови інтерфейсу"
    >
      <Text style={styles.title} allowFontScaling>
        Мова інтерфейсу
      </Text>
      <View style={styles.optionsContainer}>
        {LANGUAGE_OPTIONS.map((option) => {
          const isActive = option.code === selectedLanguage;

          return (
            <Pressable
              key={option.code}
              onPress={() => {
                setSelectedLanguage(option.code);
              }}
              style={[styles.optionButton, isActive && styles.optionButtonActive]}
              android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Обрати мову: ${option.label}`}
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
