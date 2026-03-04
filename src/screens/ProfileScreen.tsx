import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AppStackParamList } from '@/src/navigation/AppNavigator';
import { ThemeColors } from '@/shared/styles/theme';
import useThemeStore from '@/context/Theme-store';

type ProfileNavigation = NativeStackNavigationProp<AppStackParamList, 'Profile'>;

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileNavigation>();
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable onPress={() => navigation.navigate('Login')} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Увійти</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Registration')} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Реєстрація</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Settings')} style={styles.tertiaryButton}>
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
      gap: 12,
      paddingHorizontal: 24,
    },
    primaryButton: {
      width: '100%',
      maxWidth: 280,
      backgroundColor: '#ff2d55',
      paddingVertical: 14,
      borderRadius: 10,
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
    },
    tertiaryButtonText: {
      textAlign: 'center',
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
  });

export default ProfileScreen;
