import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import { useI18n } from '@/src/i18n/useI18n';

type LoadingStateProps = {
  label?: string;
};

const LoadingState = ({ label }: LoadingStateProps) => {
  const colors = useThemeStore((s) => s.colors);
  const { isTablet } = useResponsiveLayout();
  const { language } = useI18n();
  const styles = React.useMemo(() => getStyles(isTablet), [isTablet]);
  const resolvedLabel = label ?? (language === 'uk' ? 'Завантаження...' : 'Loading...');

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color="#ff2d55" />
      <Text style={[styles.label, { color: colors.textSecondary }]} allowFontScaling>
        {resolvedLabel}
      </Text>
    </View>
  );
};

const getStyles = (isTablet: boolean) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: isTablet ? 18 : 14,
    },
    label: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: '500',
    },
  });

export default LoadingState;
