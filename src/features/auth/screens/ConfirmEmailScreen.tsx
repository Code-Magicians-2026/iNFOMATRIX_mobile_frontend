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
import { ApiError, getApiErrorMessage } from '@/src/features/auth/api/client';
import type { AppStackParamList } from '@/src/navigation/AppNavigator';
import type { ThemeColors } from '@/shared/styles/theme';

type ConfirmEmailNavigation = NativeStackNavigationProp<AppStackParamList, 'ConfirmEmail'>;
type ConfirmEmailRoute = RouteProp<AppStackParamList, 'ConfirmEmail'>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ConfirmEmailScreen = () => {
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isLandscape, isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(
    () => getStyles(colors, spacing, cardMaxWidth, isTablet, isLandscape),
    [cardMaxWidth, colors, isLandscape, isTablet, spacing],
  );
  const confirmEmail = useAuthStore((s) => s.confirmEmail);
  const navigation = useNavigation<ConfirmEmailNavigation>();
  const route = useRoute<ConfirmEmailRoute>();

  const [email, setEmail] = React.useState(route.params?.initialEmail ?? '');
  const [token, setToken] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [didTimeoutOnce, setDidTimeoutOnce] = React.useState(false);

  const confirmEmailMutation = useMutation({
    mutationKey: ['auth', 'confirm-email'],
    mutationFn: ({ email, token: code }: { email: string; token: string }) =>
      confirmEmail(email, code),
  });

  const onConfirmPress = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedToken = token.replace(/\s+/g, '').trim();

    if (!emailPattern.test(normalizedEmail)) {
      setError('Введіть коректну електронну пошту.');
      return;
    }

    if (!normalizedToken) {
      setError('Введіть код підтвердження з листа.');
      return;
    }

    setError(null);

    try {
      await confirmEmailMutation.mutateAsync({
        email: normalizedEmail,
        token: normalizedToken,
      });
      setDidTimeoutOnce(false);
      const redirectTo = route.params?.redirectTo ?? 'Profile';
      if (redirectTo === 'Settings') {
        navigation.dispatch(StackActions.popTo('Settings'));
        return;
      }

      navigation.dispatch(StackActions.popTo('MainTabs'));
      navigation.navigate('MainTabs', { screen: 'Profile' });
    } catch (confirmError) {
      if (confirmError instanceof ApiError && (confirmError.status === 504 || confirmError.status === 408)) {
        setDidTimeoutOnce(true);
        setError(
          'Підтвердження ще обробляється на сервері. Не відправляйте код повторно одразу. Зачекайте 30-60 с і спробуйте увійти.',
        );
        return;
      }

      if (confirmError instanceof ApiError && confirmError.status === 401 && didTimeoutOnce) {
        setError(
          'Ймовірно попередня спроба вже підтвердила пошту, а код став одноразовим. Спробуйте увійти.',
        );
        return;
      }

      setError(getApiErrorMessage(confirmError, 'Не вдалося підтвердити пошту.'));
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
          accessibilityLabel="Форма підтвердження пошти"
        >
          <Text style={styles.title} allowFontScaling>
            Підтвердження пошти
          </Text>
          <Text style={styles.subtitle} allowFontScaling>
            Введіть email і код з листа для активації акаунта.
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
              editable={!confirmEmailMutation.isPending}
              accessibilityLabel="Електронна пошта"
              accessibilityHint="Email, на який отримано код підтвердження"
              importantForAccessibility="yes"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label} allowFontScaling>
              Код підтвердження
            </Text>
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="one-time-code"
              placeholder="Введіть код із листа"
              placeholderTextColor={colors.textSecondary}
              editable={!confirmEmailMutation.isPending}
              accessibilityLabel="Код підтвердження"
              accessibilityHint="Поле для коду підтвердження email"
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
              void onConfirmPress();
            }}
            disabled={confirmEmailMutation.isPending}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            accessibilityRole="button"
            accessibilityLabel="Підтвердити пошту"
            accessibilityHint="Надсилає код підтвердження"
            accessibilityState={{ disabled: confirmEmailMutation.isPending }}
            importantForAccessibility="yes"
          >
            {confirmEmailMutation.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText} allowFontScaling>
                Підтвердити
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() =>
              navigation.navigate('Login', {
                initialEmail: email.trim().toLowerCase(),
                redirectTo: route.params?.redirectTo ?? 'Profile',
              })
            }
            disabled={confirmEmailMutation.isPending}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            accessibilityRole="button"
            accessibilityLabel="Повернутися до входу"
            accessibilityHint="Переходить на екран входу"
            accessibilityState={{ disabled: confirmEmailMutation.isPending }}
            importantForAccessibility="yes"
          >
            <Text style={styles.secondaryButtonText} allowFontScaling>
              До входу
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

export default ConfirmEmailScreen;
