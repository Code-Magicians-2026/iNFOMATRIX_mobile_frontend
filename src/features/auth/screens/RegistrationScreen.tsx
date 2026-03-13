import React from 'react';
import { useMutation } from '@tanstack/react-query';
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
import { StackActions, type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import useAuthStore from '@/context/Auth-store';
import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import type { AppStackParamList } from '@/src/navigation/AppNavigator';
import { getApiErrorMessage } from '@/src/features/auth/api/client';
import type { ThemeColors } from '@/shared/styles/theme';

type RegistrationNavigation = NativeStackNavigationProp<AppStackParamList, 'Registration'>;
type RegistrationRoute = RouteProp<AppStackParamList, 'Registration'>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RegistrationScreen = () => {
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isLandscape, isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(
    () => getStyles(colors, spacing, cardMaxWidth, isTablet, isLandscape),
    [cardMaxWidth, colors, isLandscape, isTablet, spacing],
  );
  const register = useAuthStore((s) => s.register);
  const navigation = useNavigation<RegistrationNavigation>();
  const route = useRoute<RegistrationRoute>();

  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const registerMutation = useMutation({
    mutationKey: ['auth', 'register'],
    mutationFn: ({
      fullName,
      email,
      password,
    }: {
      fullName: string;
      email: string;
      password: string;
    }) => register(fullName, email, password),
  });

  const onRegisterPress = async () => {
    const normalizedFullName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedFullName.length < 2) {
      setError("Введіть повне ім'я (мінімум 2 символи).");
      return;
    }

    if (!emailPattern.test(normalizedEmail)) {
      setError('Введіть коректну електронну пошту.');
      return;
    }

    if (password.length < 6) {
      setError('Пароль має містити щонайменше 6 символів.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Паролі не співпадають.');
      return;
    }

    setError(null);

    try {
      await registerMutation.mutateAsync({
        fullName: normalizedFullName,
        email: normalizedEmail,
        password,
      });
      navigation.dispatch(
        StackActions.replace('ConfirmEmail', {
          initialEmail: normalizedEmail,
          redirectTo: route.params?.redirectTo ?? 'Profile',
        }),
      );
    } catch (registrationError) {
      setError(getApiErrorMessage(registrationError, 'Не вдалося зареєструватися.'));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={styles.card}
          accessible
          importantForAccessibility="yes"
          accessibilityLabel="Форма реєстрації"
        >
          <Text style={styles.title} allowFontScaling>
            Реєстрація
          </Text>
          <Text style={styles.subtitle} allowFontScaling>
            Створіть обліковий запис
          </Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.label} allowFontScaling>
              {"Повне ім'я"}
            </Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="Ім'я Прізвище"
              placeholderTextColor={colors.textSecondary}
              editable={!registerMutation.isPending}
              accessibilityLabel="Повне ім'я"
              accessibilityHint="Поле для введення повного імені"
              importantForAccessibility="yes"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label} allowFontScaling>
              Email
            </Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@example.com"
              placeholderTextColor={colors.textSecondary}
              editable={!registerMutation.isPending}
              accessibilityLabel="Електронна пошта"
              accessibilityHint="Поле для введення електронної пошти"
              importantForAccessibility="yes"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label} allowFontScaling>
              Пароль
            </Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Мінімум 6 символів"
              placeholderTextColor={colors.textSecondary}
              editable={!registerMutation.isPending}
              accessibilityLabel="Пароль"
              accessibilityHint="Поле для введення паролю"
              importantForAccessibility="yes"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label} allowFontScaling>
              Підтвердження пароля
            </Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Повторіть пароль"
              placeholderTextColor={colors.textSecondary}
              editable={!registerMutation.isPending}
              accessibilityLabel="Підтвердження пароля"
              accessibilityHint="Поле для повторного введення паролю"
              importantForAccessibility="yes"
            />
          </View>

          {error ? (
            <Text style={styles.errorText} accessibilityRole="alert" allowFontScaling>
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={() => {
              void onRegisterPress();
            }}
            disabled={registerMutation.isPending}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            accessibilityRole="button"
            accessibilityLabel="Кнопка реєстрації"
            accessibilityHint="Створює новий акаунт"
            accessibilityState={{ disabled: registerMutation.isPending }}
            importantForAccessibility="yes"
          >
            {registerMutation.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText} allowFontScaling>
                Зареєструватися
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              navigation.dispatch(
                StackActions.replace('Login', {
                  initialEmail: email.trim().toLowerCase(),
                  redirectTo: route.params?.redirectTo ?? 'Profile',
                }),
              );
            }}
            disabled={registerMutation.isPending}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            accessibilityRole="button"
            accessibilityLabel="Кнопка входу"
            accessibilityHint="Переходить на екран входу"
            accessibilityState={{ disabled: registerMutation.isPending }}
            importantForAccessibility="yes"
          >
            <Text style={styles.secondaryButtonText} allowFontScaling>
              Вже є акаунт
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const getStyles = (
  colors: ThemeColors,
  spacing: number,
  cardMaxWidth: number,
  isTablet: boolean,
  isLandscape: boolean,
) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing,
      paddingVertical: isLandscape ? spacing * 0.5 : spacing * 0.35,
    },
    card: {
      width: '100%',
      maxWidth: isLandscape ? cardMaxWidth + 60 : cardMaxWidth,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: isTablet ? 18 : 16,
      padding: isTablet ? spacing * 0.75 : spacing * 0.7,
      elevation: 2,
      gap: isTablet ? 16 : 14,
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

export default RegistrationScreen;
