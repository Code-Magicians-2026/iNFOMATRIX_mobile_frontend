import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';

type LoadingStateProps = {
  label?: string;
};

const LoadingState = ({ label = 'Loading...' }: LoadingStateProps) => {
  const colors = useThemeStore((s) => s.colors);
  const { isTablet } = useResponsiveLayout();
  const styles = React.useMemo(() => getStyles(isTablet), [isTablet]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color="#ff2d55" />
      <Text style={[styles.label, { color: colors.textSecondary }]} allowFontScaling>
        {label}
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
