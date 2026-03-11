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

type LoginNavigation = NativeStackNavigationProp<AppStackParamList, 'Login'>;
type LoginRoute = RouteProp<AppStackParamList, 'Login'>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginScreen = () => {
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isLandscape, isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(
    () => getStyles(colors, spacing, cardMaxWidth, isTablet, isLandscape),
    [cardMaxWidth, colors, isLandscape, isTablet, spacing],
  );
  const login = useAuthStore((s) => s.login);
  const navigation = useNavigation<LoginNavigation>();
  const route = useRoute<LoginRoute>();

  const [email, setEmail] = React.useState(route.params?.initialEmail ?? '');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const loginMutation = useMutation({
    mutationKey: ['auth', 'login'],
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
  });

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

    try {
      await loginMutation.mutateAsync({ email: normalizedEmail, password });
      navigation.dispatch(StackActions.popTo(route.params?.redirectTo ?? 'Profile'));
    } catch (loginError) {
      setError(getApiErrorMessage(loginError, 'Не вдалося увійти.'));
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
          accessibilityLabel="Форма входу"
        >
          <Text style={styles.title} allowFontScaling>
            Вхід
          </Text>
          <Text style={styles.subtitle} allowFontScaling>
            Увійдіть, щоб продовжити роботу
          </Text>

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
              editable={!loginMutation.isPending}
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
              placeholder="Введіть пароль"
              placeholderTextColor={colors.textSecondary}
              editable={!loginMutation.isPending}
              accessibilityLabel="Пароль"
              accessibilityHint="Поле для введення паролю"
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
              void onLoginPress();
            }}
            disabled={loginMutation.isPending}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            accessibilityRole="button"
            accessibilityLabel="Кнопка входу"
            accessibilityHint="Виконує вхід у акаунт"
            accessibilityState={{ disabled: loginMutation.isPending }}
            importantForAccessibility="yes"
          >
            {loginMutation.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText} allowFontScaling>
                Увійти
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() =>
              navigation.navigate('Registration', {
                redirectTo: route.params?.redirectTo ?? 'Profile',
              })
            }
            disabled={loginMutation.isPending}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            accessibilityRole="button"
            accessibilityLabel="Кнопка реєстрації"
            accessibilityHint="Відкриває екран створення акаунта"
            accessibilityState={{ disabled: loginMutation.isPending }}
            importantForAccessibility="yes"
          >
            <Text style={styles.secondaryButtonText} allowFontScaling>
              Створити акаунт
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

export default LoginScreen;
