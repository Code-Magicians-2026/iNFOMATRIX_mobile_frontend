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
import { requestResetPassword, verifyOtp } from '@/src/features/auth/api/auth';
import { ApiError, getApiErrorMessage } from '@/src/features/auth/api/client';
import type { AppStackParamList } from '@/src/navigation/AppNavigator';
import type { ThemeColors } from '@/shared/styles/theme';

type ResetPasswordNavigation = NativeStackNavigationProp<AppStackParamList, 'ResetPassword'>;
type ResetPasswordRoute = RouteProp<AppStackParamList, 'ResetPassword'>;
type ResetStep = 'request' | 'verify' | 'reset';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_SECONDS = 60;

const ResetPasswordScreen = () => {
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isLandscape, isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(
    () => getStyles(colors, spacing, cardMaxWidth, isTablet, isLandscape),
    [cardMaxWidth, colors, isLandscape, isTablet, spacing],
  );
  const completePasswordReset = useAuthStore((s) => s.completePasswordReset);
  const navigation = useNavigation<ResetPasswordNavigation>();
  const route = useRoute<ResetPasswordRoute>();

  const [step, setStep] = React.useState<ResetStep>('request');
  const [email, setEmail] = React.useState(route.params?.initialEmail ?? '');
  const [otpToken, setOtpToken] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [cooldownLeft, setCooldownLeft] = React.useState(0);

  const requestResetMutation = useMutation({
    mutationKey: ['auth', 'request-reset-password'],
    mutationFn: ({ email }: { email: string }) => requestResetPassword({ email }),
  });
  const verifyOtpMutation = useMutation({
    mutationKey: ['auth', 'verify-otp'],
    mutationFn: ({ email, token }: { email: string; token: string }) => verifyOtp({ email, token }),
  });
  const resetPasswordMutation = useMutation({
    mutationKey: ['auth', 'reset-password'],
    mutationFn: ({ email, newPassword }: { email: string; newPassword: string }) =>
      completePasswordReset(email, newPassword),
  });

  const isAnyPending =
    requestResetMutation.isPending || verifyOtpMutation.isPending || resetPasswordMutation.isPending;
  const isRequestBlockedByCooldown = step === 'request' && cooldownLeft > 0;
  const isResendBlockedByCooldown = step === 'verify' && cooldownLeft > 0;

  React.useEffect(() => {
    if (cooldownLeft <= 0) {
      return;
    }

    const timerId = setInterval(() => {
      setCooldownLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => clearInterval(timerId);
  }, [cooldownLeft]);

  const startCooldown = (seconds = RESEND_COOLDOWN_SECONDS) => {
    setCooldownLeft((current) => (current > seconds ? current : seconds));
  };

  const onRequestResetPress = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (cooldownLeft > 0) {
      setError(`Повторний запит буде доступний через ${cooldownLeft} с.`);
      return;
    }

    if (!emailPattern.test(normalizedEmail)) {
      setError('Введіть коректну електронну пошту.');
      return;
    }

    setError(null);
    setInfo(null);

    try {
      const response = await requestResetMutation.mutateAsync({ email: normalizedEmail });
      setEmail(response.email ?? normalizedEmail);
      startCooldown();
      setStep('verify');
      setInfo('Код надіслано на вашу пошту. Введіть його для продовження.');
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 429) {
        startCooldown();
        setError(`Забагато запитів на email. Спробуйте знову через ${RESEND_COOLDOWN_SECONDS} с.`);
        return;
      }

      setError(getApiErrorMessage(requestError, 'Не вдалося надіслати код відновлення.'));
    }
  };

  const onVerifyOtpPress = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedToken = otpToken.trim();
    if (!emailPattern.test(normalizedEmail)) {
      setError('Введіть коректну електронну пошту.');
      return;
    }

    if (!normalizedToken) {
      setError('Введіть OTP-код із листа.');
      return;
    }

    setError(null);
    setInfo(null);

    try {
      const response = await verifyOtpMutation.mutateAsync({
        email: normalizedEmail,
        token: normalizedToken,
      });
      setEmail(response.email ?? normalizedEmail);
      setStep('reset');
      setInfo('Код підтверджено. Тепер введіть новий пароль.');
    } catch (verifyError) {
      setError(getApiErrorMessage(verifyError, 'Не вдалося підтвердити OTP-код.'));
    }
  };

  const onResetPasswordPress = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!emailPattern.test(normalizedEmail)) {
      setError('Введіть коректну електронну пошту.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Пароль має містити щонайменше 6 символів.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Паролі не співпадають.');
      return;
    }

    setError(null);
    setInfo(null);

    try {
      await resetPasswordMutation.mutateAsync({ email: normalizedEmail, newPassword });
      navigation.dispatch(StackActions.popTo(route.params?.redirectTo ?? 'Profile'));
    } catch (resetError) {
      setError(getApiErrorMessage(resetError, 'Не вдалося оновити пароль.'));
    }
  };

  const onPrimaryPress = () => {
    if (step === 'request') {
      void onRequestResetPress();
      return;
    }

    if (step === 'verify') {
      void onVerifyOtpPress();
      return;
    }

    void onResetPasswordPress();
  };

  const titleByStep: Record<ResetStep, string> = {
    request: 'Відновлення пароля',
    verify: 'Перевірка OTP',
    reset: 'Новий пароль',
  };

  const subtitleByStep: Record<ResetStep, string> = {
    request: 'Крок 1/3: надішліть запит на відновлення пароля.',
    verify: 'Крок 2/3: перевірте OTP-код з листа.',
    reset: 'Крок 3/3: задайте новий пароль.',
  };

  const primaryButtonTextByStep: Record<ResetStep, string> = {
    request: 'Надіслати код',
    verify: 'Підтвердити OTP',
    reset: 'Оновити пароль',
  };
  const primaryButtonText =
    step === 'request' && cooldownLeft > 0
      ? `Надіслати код (${cooldownLeft}с)`
      : primaryButtonTextByStep[step];

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
          accessibilityLabel="Форма відновлення пароля"
        >
          <Text style={styles.title} allowFontScaling>
            {titleByStep[step]}
          </Text>
          <Text style={styles.subtitle} allowFontScaling>
            {subtitleByStep[step]}
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
              editable={!isAnyPending && step === 'request'}
              accessibilityLabel="Електронна пошта"
              accessibilityHint="Email акаунта для відновлення пароля"
              importantForAccessibility="yes"
            />
          </View>

          {step === 'verify' ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.label} allowFontScaling>
                OTP-код
              </Text>
              <TextInput
                style={styles.input}
                value={otpToken}
                onChangeText={setOtpToken}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Введіть OTP-код"
                placeholderTextColor={colors.textSecondary}
                editable={!isAnyPending}
                accessibilityLabel="OTP-код"
                accessibilityHint="Поле для коду з email"
                importantForAccessibility="yes"
              />
            </View>
          ) : null}

          {step === 'reset' ? (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label} allowFontScaling>
                  Новий пароль
                </Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder="Мінімум 6 символів"
                  placeholderTextColor={colors.textSecondary}
                  editable={!isAnyPending}
                  accessibilityLabel="Новий пароль"
                  accessibilityHint="Поле для нового пароля"
                  importantForAccessibility="yes"
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label} allowFontScaling>
                  Підтвердіть пароль
                </Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholder="Повторіть новий пароль"
                  placeholderTextColor={colors.textSecondary}
                  editable={!isAnyPending}
                  accessibilityLabel="Підтвердження нового пароля"
                  accessibilityHint="Поле для повторного введення нового пароля"
                  importantForAccessibility="yes"
                />
              </View>
            </>
          ) : null}

          {info ? (
            <Text style={styles.infoText} allowFontScaling>
              {info}
            </Text>
          ) : null}

          {error ? (
            <Text style={styles.errorText} accessibilityRole="alert" allowFontScaling>
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={onPrimaryPress}
            disabled={isAnyPending || isRequestBlockedByCooldown}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            accessibilityRole="button"
            accessibilityLabel="Основна дія відновлення пароля"
            accessibilityHint="Виконує поточний крок відновлення"
            accessibilityState={{ disabled: isAnyPending || isRequestBlockedByCooldown }}
            importantForAccessibility="yes"
          >
            {isAnyPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText} allowFontScaling>
                {primaryButtonText}
              </Text>
            )}
          </Pressable>

          {step === 'verify' ? (
            <Pressable
              onPress={() => {
                void onRequestResetPress();
              }}
              disabled={isAnyPending || isResendBlockedByCooldown}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
              accessibilityRole="button"
              accessibilityLabel="Надіслати код повторно"
              accessibilityHint="Повторно надсилає OTP-код на email"
              accessibilityState={{ disabled: isAnyPending || isResendBlockedByCooldown }}
              importantForAccessibility="yes"
            >
              <Text style={styles.secondaryButtonText} allowFontScaling>
                {cooldownLeft > 0 ? `Надіслати код ще раз (${cooldownLeft}с)` : 'Надіслати код ще раз'}
              </Text>
            </Pressable>
          ) : null}

          {step !== 'request' ? (
            <Pressable
              onPress={() => {
                setStep('request');
                setOtpToken('');
                setNewPassword('');
                setConfirmPassword('');
                setError(null);
                setInfo(null);
              }}
              disabled={isAnyPending}
              style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
              android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
              accessibilityRole="button"
              accessibilityLabel="Почати знову"
              accessibilityHint="Повертає на перший крок відновлення"
              accessibilityState={{ disabled: isAnyPending }}
              importantForAccessibility="yes"
            >
              <Text style={styles.linkButtonText} allowFontScaling>
                Змінити email або почати спочатку
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() =>
                navigation.navigate('Login', {
                  initialEmail: email.trim().toLowerCase(),
                  redirectTo: route.params?.redirectTo ?? 'Profile',
                })
              }
              disabled={isAnyPending}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
              accessibilityRole="button"
              accessibilityLabel="Повернутися до входу"
              accessibilityHint="Переходить на екран входу"
              accessibilityState={{ disabled: isAnyPending }}
              importantForAccessibility="yes"
            >
              <Text style={styles.secondaryButtonText} allowFontScaling>
                До входу
              </Text>
            </Pressable>
          )}
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
    infoText: {
      color: '#165f2b',
      fontSize: 13,
      fontWeight: '500',
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
    linkButton: {
      borderRadius: 8,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 0,
    },
    linkButtonText: {
      color: '#ff2d55',
      fontSize: 14,
      fontWeight: '600',
    },
    pressed: {
      opacity: 0.9,
    },
  });

export default ResetPasswordScreen;
