import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import useAuthStore from '@/context/Auth-store';
import useThemeStore from '@/context/Theme-store';
import type { AppStackParamList } from '@/src/navigation/AppNavigator';
import { getApiErrorMessage } from '@/src/api/client';
import type { ThemeColors } from '@/shared/styles/theme';

type LoginNavigation = NativeStackNavigationProp<AppStackParamList, 'Login'>;
type LoginRoute = RouteProp<AppStackParamList, 'Login'>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginScreen = () => {
  const colors = useThemeStore((s) => s.colors);
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const login = useAuthStore((s) => s.login);
  const navigation = useNavigation<LoginNavigation>();
  const route = useRoute<LoginRoute>();

  const [email, setEmail] = React.useState(route.params?.initialEmail ?? '');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onLoginPress = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) {
      setError('Введіть коректну електронну пошту.');
      return;
    }

    if (password.length < 6) {
      setError('Пароль має містити щонайменше 6 символів.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login(normalizedEmail, password);
      navigation.goBack();
    } catch (loginError) {
      setError(getApiErrorMessage(loginError, 'Не вдалося увійти.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Вхід</Text>
          <Text style={styles.subtitle}>Увійдіть, щоб продовжити роботу</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@example.com"
              placeholderTextColor={colors.textSecondary}
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Пароль</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Введіть пароль"
              placeholderTextColor={colors.textSecondary}
              editable={!isSubmitting}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            onPress={() => {
              void onLoginPress();
            }}
            disabled={isSubmitting}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Увійти</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Registration')}
            disabled={isSubmitting}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
          >
            <Text style={styles.secondaryButtonText}>Створити акаунт</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardWrapper: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 18,
      elevation: 2,
      gap: 14,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    fieldGroup: {
      gap: 8,
    },
    label: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 11,
      color: colors.text,
      fontSize: 15,
    },
    errorText: {
      color: '#c11335',
      fontSize: 13,
      fontWeight: '500',
    },
    primaryButton: {
      backgroundColor: '#ff2d55',
      borderRadius: 10,
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
    },
    primaryButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '700',
    },
    secondaryButton: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      elevation: 1,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    pressed: {
      opacity: 0.9,
    },
  });

export default LoginScreen;
