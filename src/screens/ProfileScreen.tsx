import React from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AppStackParamList } from '@/src/navigation/AppNavigator';
import { ThemeColors } from '@/shared/styles/theme';
import useThemeStore from '@/context/Theme-store';
import useAuthStore from '@/context/Auth-store';

type ProfileNavigation = NativeStackNavigationProp<AppStackParamList, 'Profile'>;

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileNavigation>();
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onLogoutPress = async () => {
    setIsSubmitting(true);
    try {
      await logout();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {session ? (
          <View style={styles.accountCard}>
            <Text style={styles.accountLabel}>Ви увійшли як</Text>
            <Text style={styles.accountEmail}>{session.email}</Text>
          </View>
        ) : null}

        {session ? (
          <Pressable
            onPress={() => {
              void onLogoutPress();
            }}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Вийти</Text>
            )}
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={() => navigation.navigate('Login', { redirectTo: 'Profile' })}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            >
              <Text style={styles.primaryButtonText}>Увійти</Text>
            </Pressable>

            <Pressable
              onPress={() =>
                navigation.navigate('Registration', {
                  redirectTo: 'Profile',
                })
              }
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            >
              <Text style={styles.secondaryButtonText}>Реєстрація</Text>
            </Pressable>
          </>
        )}

        <Pressable
          onPress={() => navigation.navigate('Settings')}
          style={({ pressed }) => [styles.tertiaryButton, pressed && styles.pressed]}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
        >
          <Text style={styles.tertiaryButtonText}>Налаштування</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      paddingHorizontal: 24,
    },
    accountCard: {
      width: '100%',
      maxWidth: 280,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 14,
      gap: 6,
      elevation: 1,
    },
    accountLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    accountEmail: {
      fontSize: 16,
      color: colors.text,
      textAlign: 'center',
      fontWeight: '700',
    },
    primaryButton: {
      width: '100%',
      maxWidth: 280,
      backgroundColor: '#ff2d55',
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
    },
    primaryButtonText: {
      textAlign: 'center',
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryButton: {
      width: '100%',
      maxWidth: 280,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
      borderRadius: 10,
      elevation: 1,
    },
    secondaryButtonText: {
      textAlign: 'center',
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    tertiaryButton: {
      width: '100%',
      maxWidth: 280,
      backgroundColor: isDark ? '#2f2f31' : '#e9e9ee',
      paddingVertical: 14,
      borderRadius: 10,
      elevation: 1,
    },
    tertiaryButtonText: {
      textAlign: 'center',
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    pressed: {
      opacity: 0.9,
    },
  });

export default ProfileScreen;
