import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
};

const SectionHeader = ({ title, subtitle }: SectionHeaderProps) => {
  const colors = useThemeStore((s) => s.colors);
  const { isTablet } = useResponsiveLayout();
  const styles = React.useMemo(() => getStyles(isTablet), [isTablet]);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]} allowFontScaling>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} allowFontScaling>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const getStyles = (isTablet: boolean) =>
  StyleSheet.create({
    container: {
      gap: 4,
    },
    title: {
      fontSize: isTablet ? 30 : 24,
      fontWeight: '700',
    },
    subtitle: {
      fontSize: isTablet ? 16 : 14,
      lineHeight: isTablet ? 22 : 20,
    },
  });

export default SectionHeader;
