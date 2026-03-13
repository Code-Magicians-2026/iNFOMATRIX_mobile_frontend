import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import useAuthStore from '@/context/Auth-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import useThemeStore from '@/context/Theme-store';
import type { AppStackParamList } from '@/src/navigation/AppNavigator';
import {
  EmptyState,
  PrimaryButton,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from '@/shared/components/ui';

type ProfileNavigation = NativeStackNavigationProp<AppStackParamList>;

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileNavigation>();
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isLandscape, isTablet } = useResponsiveLayout();
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const styles = React.useMemo(
    () => getStyles(cardMaxWidth, isLandscape, isTablet),
    [cardMaxWidth, isLandscape, isTablet],
  );
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
    <ScreenContainer centered contentStyle={styles.content}>
      <SectionHeader
        title="Profile"
        subtitle={session ? 'Manage your account and progress.' : 'Sign in to sync your progress.'}
      />

      <StatCard
        title={session ? 'Signed in account' : 'Guest mode'}
        style={styles.wideBlock}
      >
        {session ? (
          <Text style={[styles.accountEmail, { color: colors.text }]} allowFontScaling>
            {session.email}
          </Text>
        ) : (
          <EmptyState
            title="You are not signed in"
            description="Use login or registration to store your progress in cloud."
          />
        )}
      </StatCard>

      {session ? (
        <PrimaryButton
          label="Вийти"
          onPress={() => {
            void onLogoutPress();
          }}
          loading={isSubmitting}
          style={styles.wideBlock}
        />
      ) : (
        <>
          <PrimaryButton
            label="Увійти"
            onPress={() => navigation.navigate('Login', { redirectTo: 'Profile' })}
            style={styles.wideBlock}
          />
          <PrimaryButton
            label="Реєстрація"
            variant="secondary"
            onPress={() =>
              navigation.navigate('Registration', {
                redirectTo: 'Profile',
              })
            }
            style={styles.wideBlock}
          />
        </>
      )}

      <PrimaryButton
        label="Налаштування"
        variant="tertiary"
        onPress={() => navigation.navigate('Settings')}
        style={styles.wideBlock}
      />
    </ScreenContainer>
  );
};

const getStyles = (cardMaxWidth: number, isLandscape: boolean, isTablet: boolean) =>
  StyleSheet.create({
    content: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    wideBlock: {
      width: '100%',
      maxWidth: isLandscape ? cardMaxWidth + 40 : cardMaxWidth,
    },
    accountEmail: {
      textAlign: 'center',
      fontSize: isTablet ? 18 : 16,
      fontWeight: '700',
    },
  });

export default ProfileScreen;
