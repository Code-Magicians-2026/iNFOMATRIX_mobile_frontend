import React from 'react';
import { getFocusedRouteNameFromRoute, type NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import useAuthStore from '@/context/Auth-store';
import useLanguageStore from '@/context/Language-store';
import Header from '@/modules/Header/Header';
import ConfirmEmailScreen from '@/src/features/auth/screens/ConfirmEmailScreen';
import LoginScreen from '@/src/features/auth/screens/LoginScreen';
import ResetPasswordScreen from '@/src/features/auth/screens/ResetPasswordScreen';
import RegistrationScreen from '@/src/features/auth/screens/RegistrationScreen';
import AchievementsScreen from '@/src/features/profile/screens/AchievementsScreen';
import EarnedBadgesScreen from '@/src/features/profile/screens/EarnedBadgesScreen';
import SettingsScreen from '@/src/features/profile/screens/SettingsScreen';
import PlanPreviewScreen from '@/src/features/chat/screens/PlanPreviewScreen';
import { useI18n } from '@/src/i18n/useI18n';
import RoleBasedNavigator from '@/src/navigation/RoleBasedNavigator';
import { getMainHeaderTitle, resolveNavigationRole } from '@/src/navigation/navigation-config';
import type { GeneratedPlan } from '@/shared/models/mvp-contracts.model';
import type { GeneratePlanInput } from '@/src/integration/services';

export type AdultTabParamList = {
  Home: undefined;
  Quests: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type ChildTabParamList = {
  Home: undefined;
  Quests: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type MainTabParamList = AdultTabParamList & ChildTabParamList;

export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Settings: undefined;
  Achievements: { userId: string; displayName?: string };
  EarnedBadges: { userId: string; displayName?: string };
  PlanPreview: {
    plan: GeneratedPlan;
    request: GeneratePlanInput;
    targetLabel: string;
  };
  Login: { initialEmail?: string; redirectTo?: 'Settings' | 'Profile' } | undefined;
  Registration: { redirectTo?: 'Settings' | 'Profile' } | undefined;
  ConfirmEmail: { initialEmail?: string; redirectTo?: 'Settings' | 'Profile' } | undefined;
  ResetPassword: { initialEmail?: string; redirectTo?: 'Settings' | 'Profile' } | undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppNavigator() {
  const role = useAuthStore((s) => s.role);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const language = useLanguageStore((s) => s.language);
  const { t } = useI18n();
  const resolvedRoleState = resolveNavigationRole({ isHydrated, role });
  const resolvedRole = resolvedRoleState === 'loading' ? 'child' : resolvedRoleState;

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={RoleBasedNavigator}
        options={({ navigation, route }) => ({
          headerTitle: getMainHeaderTitle(
            (getFocusedRouteNameFromRoute(route as never) ?? 'Home') as keyof MainTabParamList,
            resolvedRole,
            language,
          ),
          header: () => (
            <Header
              title={getMainHeaderTitle(
                (getFocusedRouteNameFromRoute(route as never) ?? 'Home') as keyof MainTabParamList,
                resolvedRole,
                language,
              )}
              onAiPress={() =>
                navigation.navigate('MainTabs', {
                  screen: 'Chat',
                })
              }
              onProfilePress={() =>
                navigation.navigate('MainTabs', {
                  screen: 'Profile',
                })
              }
            />
          ),
        })}
      />
      <Stack.Screen
        name="PlanPreview"
        component={PlanPreviewScreen}
        options={({ navigation }) => ({
          header: () => (
            <Header
              title={t('navigation.planPreview')}
              showBackButton
              onBackPress={() => navigation.goBack()}
              onAiPress={() =>
                navigation.navigate('MainTabs', {
                  screen: 'Chat',
                })
              }
            />
          ),
        })}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={({ navigation }) => ({
          header: () => (
            <Header
              title={t('navigation.settings')}
              showBackButton
              onBackPress={() => navigation.goBack()}
              onAiPress={() =>
                navigation.navigate('MainTabs', {
                  screen: 'Chat',
                })
              }
            />
          ),
        })}
      />
      <Stack.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={({ navigation }) => ({
          header: () => (
            <Header
              title={t('navigation.achievements')}
              showBackButton
              onBackPress={() => navigation.goBack()}
              onAiPress={() =>
                navigation.navigate('MainTabs', {
                  screen: 'Chat',
                })
              }
            />
          ),
        })}
      />
      <Stack.Screen
        name="EarnedBadges"
        component={EarnedBadgesScreen}
        options={({ navigation }) => ({
          header: () => (
            <Header
              title={t('navigation.earnedBadges')}
              showBackButton
              onBackPress={() => navigation.goBack()}
              onAiPress={() =>
                navigation.navigate('MainTabs', {
                  screen: 'Chat',
                })
              }
            />
          ),
        })}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={({ navigation }) => ({
          header: () => (
            <Header
              title={t('navigation.login')}
              showBackButton
              onBackPress={() => navigation.goBack()}
              onAiPress={() =>
                navigation.navigate('MainTabs', {
                  screen: 'Chat',
                })
              }
            />
          ),
        })}
      />
      <Stack.Screen
        name="Registration"
        component={RegistrationScreen}
        options={({ navigation }) => ({
          header: () => (
            <Header
              title={t('navigation.registration')}
              showBackButton
              onBackPress={() => navigation.goBack()}
              onAiPress={() =>
                navigation.navigate('MainTabs', {
                  screen: 'Chat',
                })
              }
            />
          ),
        })}
      />
      <Stack.Screen
        name="ConfirmEmail"
        component={ConfirmEmailScreen}
        options={({ navigation }) => ({
          header: () => (
            <Header
              title={t('navigation.confirmEmail')}
              showBackButton
              onBackPress={() => navigation.goBack()}
              onAiPress={() =>
                navigation.navigate('MainTabs', {
                  screen: 'Chat',
                })
              }
            />
          ),
        })}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={({ navigation }) => ({
          header: () => (
            <Header
              title={t('navigation.resetPassword')}
              showBackButton
              onBackPress={() => navigation.goBack()}
              onAiPress={() =>
                navigation.navigate('MainTabs', {
                  screen: 'Chat',
                })
              }
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
}
