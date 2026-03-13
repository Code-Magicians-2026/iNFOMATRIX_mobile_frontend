import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';

type EmptyStateProps = {
  title: string;
  description?: string;
};

const EmptyState = ({ title, description }: EmptyStateProps) => {
  const colors = useThemeStore((s) => s.colors);
  const { isTablet } = useResponsiveLayout();
  const styles = React.useMemo(() => getStyles(isTablet), [isTablet]);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]} allowFontScaling>
        {title}
      </Text>
      {description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]} allowFontScaling>
          {description}
        </Text>
      ) : null}
    </View>
  );
};

const getStyles = (isTablet: boolean) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: isTablet ? 12 : 8,
    },
    title: {
      textAlign: 'center',
      fontSize: isTablet ? 18 : 16,
      fontWeight: '600',
    },
    description: {
      textAlign: 'center',
      fontSize: isTablet ? 15 : 13,
      lineHeight: isTablet ? 22 : 19,
    },
  });

export default EmptyState;
