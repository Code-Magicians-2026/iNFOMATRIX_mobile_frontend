import React from 'react';
import { SafeAreaView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';

type ScreenContainerProps = {
  children: React.ReactNode;
  centered?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

const ScreenContainer = ({ children, centered = false, contentStyle }: ScreenContainerProps) => {
  const colors = useThemeStore((s) => s.colors);
  const { spacing } = useResponsiveLayout();
  const styles = React.useMemo(() => getStyles(spacing), [spacing]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.content, centered && styles.centered, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
};

const getStyles = (spacing: number) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing,
      paddingVertical: Math.max(12, Math.round(spacing * 0.75)),
      gap: 14,
    },
    centered: {
      justifyContent: 'center',
    },
  });

export default ScreenContainer;

