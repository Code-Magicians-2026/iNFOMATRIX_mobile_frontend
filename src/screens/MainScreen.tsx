import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import useThemeStore from '@/context/Theme-store';
import useAuthStore from '@/context/Auth-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';

const MainScreen = () => {
  const colors = useThemeStore((s) => s.colors);
  const userEmail = useAuthStore((s) => s.session?.email ?? 'guest');
  const { isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(() => getStyles(isTablet, spacing), [isTablet, spacing]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content} accessible importantForAccessibility="yes">
        <Text style={[styles.text, { color: colors.text }]} allowFontScaling>
          Main screen
        </Text>
        <Text style={[styles.welcomeText, { color: colors.textSecondary }]} allowFontScaling>
          Welcome, {userEmail}
        </Text>
      </View>
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
    content: {
      alignItems: 'center',
      gap: 8,
    },
    text: {
      fontSize: isTablet ? 22 : 18,
      fontWeight: '500',
    },
    welcomeText: {
      fontSize: isTablet ? 18 : 16,
      fontWeight: '500',
    },
  });

export default MainScreen;
