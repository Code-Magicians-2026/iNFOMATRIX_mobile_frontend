import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { getStyles } from './style';
import { useColorScheme } from '@/hooks/use-color-scheme';

type HeaderProps = {
  title: string;
  onProfilePress?: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
};

const Header = ({ title, onProfilePress, showBackButton = false, onBackPress }: HeaderProps) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = React.useMemo(() => getStyles(isDark), [isDark]);

  return (
    <View style={styles.header}>
      {showBackButton ? (
        <TouchableOpacity onPress={onBackPress} style={styles.sideButton}>
          <Text style={styles.sideButtonText}>{'<'}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.sideButtonPlaceholder} />
      )}

      <Text style={styles.title}>{title}</Text>

      <TouchableOpacity onPress={onProfilePress} style={styles.profileButton}>
        <Text style={styles.profileButtonText}>P</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Header;
