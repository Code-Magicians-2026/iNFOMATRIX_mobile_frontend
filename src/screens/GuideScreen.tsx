import React from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';

import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';

const GuideScreen = () => {
  const colors = useThemeStore((s) => s.colors);
  const { isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(() => getStyles(isTablet, spacing), [isTablet, spacing]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text
        style={[styles.text, { color: colors.text }]}
        allowFontScaling
        accessible
        importantForAccessibility="yes"
      >
        Guide screen
      </Text>
    </SafeAreaView>
  );
};

const getStyles = (isTablet: boolean, spacing: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing,
    },
    text: {
      fontSize: isTablet ? 22 : 18,
      fontWeight: '500',
    },
  });

export default GuideScreen;
