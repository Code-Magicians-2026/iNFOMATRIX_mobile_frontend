import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { getStyles } from './style';
import { useColorScheme } from '@/hooks/use-color-scheme';
import useAuthStore from '@/context/Auth-store';

type HeaderProps = {
  title: string;
  onProfilePress?: () => void;
  onAiPress?: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
};

const Header = ({
  title,
  onProfilePress,
  onAiPress,
  showBackButton = false,
  onBackPress,
}: HeaderProps) => {
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
    <View style={styles.header} importantForAccessibility="yes">
      {showBackButton ? (
        <Pressable
          onPress={onBackPress}
          style={styles.sideButton}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
          accessibilityRole="button"
          accessibilityLabel="Назад"
          accessibilityHint="Повертає на попередній екран"
        >
          <Text style={styles.sideButtonText} allowFontScaling>
            {'<'}
          </Text>
        </Pressable>
      ) : onAiPress ? (
        <Pressable
          onPress={onAiPress}
          style={styles.aiButton}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
          accessibilityRole="button"
          accessibilityLabel="AI чат"
          accessibilityHint="Відкриває екран чату з агентом"
        >
          <Text style={styles.aiButtonText} allowFontScaling>
            AI
          </Text>
        </Pressable>
      ) : (
        <View style={styles.sideButtonPlaceholder} />
      )}

      <Text style={styles.title} allowFontScaling>
        {title}
      </Text>

      {onProfilePress ? (
        <Pressable
          onPress={onProfilePress}
          style={styles.profileButton}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
          accessibilityRole="button"
          accessibilityLabel="Профіль"
          accessibilityHint="Відкриває екран профілю"
        >
          <Text style={styles.profileButtonText} allowFontScaling>
            {profileInitial}
          </Text>
        </Pressable>
      ) : showBackButton && onAiPress ? (
        <Pressable
          onPress={onAiPress}
          style={styles.aiButton}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
          accessibilityRole="button"
          accessibilityLabel="AI чат"
          accessibilityHint="Відкриває екран чату з агентом"
        >
          <Text style={styles.aiButtonText} allowFontScaling>
            AI
          </Text>
        </Pressable>
      ) : (
        <View style={styles.sideButtonPlaceholder} />
      )}
    </View>
  );
};

export default Header;
