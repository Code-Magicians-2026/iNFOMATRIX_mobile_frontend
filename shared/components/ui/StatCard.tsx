import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';

type StatCardProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const StatCard = ({ title, subtitle, children, style }: StatCardProps) => {
  const colors = useThemeStore((s) => s.colors);
  const { isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(() => getStyles(isTablet, spacing), [isTablet, spacing]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {title ? (
        <Text style={[styles.title, { color: colors.text }]} allowFontScaling>
          {title}
        </Text>
      ) : null}
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} allowFontScaling>
          {subtitle}
        </Text>
      ) : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const getStyles = (isTablet: boolean, spacing: number) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderRadius: 12,
      padding: isTablet ? Math.round(spacing * 0.7) : Math.round(spacing * 0.6),
      gap: 6,
      elevation: 2,
    },
    title: {
      fontSize: isTablet ? 22 : 18,
      fontWeight: '700',
    },
    subtitle: {
      fontSize: isTablet ? 15 : 13,
    },
    content: {
      gap: 8,
    },
  });

export default StatCard;
