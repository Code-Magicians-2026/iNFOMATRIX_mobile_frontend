import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
};

const PrimaryButton = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
}: PrimaryButtonProps) => {
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const { isTablet } = useResponsiveLayout();
  const styles = React.useMemo(() => getStyles(isTablet), [isTablet]);

  const isDisabled = disabled || loading;

  const variantStyles = React.useMemo(() => {
    switch (variant) {
      case 'secondary':
        return {
          container: {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
          },
          text: {
            color: colors.text,
          },
        };
      case 'tertiary':
        return {
          container: {
            backgroundColor: isDark ? '#2f2f31' : '#e9e9ee',
            borderColor: 'transparent',
            borderWidth: 0,
          },
          text: {
            color: colors.text,
          },
        };
      default:
        return {
          container: {
            backgroundColor: '#ff2d55',
            borderColor: 'transparent',
            borderWidth: 0,
          },
          text: {
            color: '#ffffff',
          },
        };
    }
  }, [colors.border, colors.card, colors.text, isDark, variant]);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variantStyles.container,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      importantForAccessibility="yes"
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? '#ffffff' : '#ff2d55'} />
        ) : (
          <Text style={[styles.label, variantStyles.text]} allowFontScaling>
            {label}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const getStyles = (isTablet: boolean) =>
  StyleSheet.create({
    button: {
      minHeight: 48,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
    },
    content: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      width: '100%',
    },
    label: {
      textAlign: 'center',
      fontSize: isTablet ? 17 : 16,
      fontWeight: '700',
    },
    disabled: {
      opacity: 0.65,
    },
    pressed: {
      opacity: 0.9,
    },
  });

export default PrimaryButton;
