import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { getStyles } from './style';
import { useColorScheme } from '@/hooks/use-color-scheme';
import useAuthStore from '@/context/Auth-store';

type HeaderProps = {
  title: string;
  onProfilePress?: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
};

const Header = ({ title, onProfilePress, showBackButton = false, onBackPress }: HeaderProps) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isAuthenticated = useAuthStore((s) => Boolean(s.session?.accessToken));
  const styles = React.useMemo(() => getStyles(isDark, isAuthenticated), [isAuthenticated, isDark]);
  const sessionEmail = useAuthStore((s) => s.session?.email ?? '');
  const profileInitial = React.useMemo(() => {
    const normalized = sessionEmail.trim();
    if (!normalized) {
      return 'G';
    }
    return normalized[0].toUpperCase();
  }, [sessionEmail]);

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

      <TouchableOpacity
        onPress={onProfilePress}
        disabled={!onProfilePress}
        style={styles.profileButton}
      >
        <Text style={styles.profileButtonText}>{profileInitial}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Header;
