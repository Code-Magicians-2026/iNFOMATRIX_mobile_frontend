import React from 'react';
import { SafeAreaView, Switch, Text, View } from 'react-native';

import useThemeStore from '@/context/Theme-store';
import { getStyles } from '@/src/features/profile/styles/settings.styles';

const SettingsScreen = () => {
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const colors = useThemeStore((s) => s.colors);
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.settingRow}>
        <Text style={styles.label}>Темна тема</Text>
        <Switch
          value={isDark}
          onValueChange={() => {
            void toggleTheme();
          }}
          trackColor={{ false: '#767577', true: '#ff2d55' }}
        />
      </View>
    </SafeAreaView>
  );
};

export default SettingsScreen;
