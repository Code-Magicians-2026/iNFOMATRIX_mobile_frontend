import React from 'react';
import { getFocusedRouteNameFromRoute, type NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TabNavigator from '@/src/navigation/TabNavigator';
import Header from '@/modules/Header/Header';
import ConfirmEmailScreen from '@/src/features/auth/screens/ConfirmEmailScreen';
import LoginScreen from '@/src/features/auth/screens/LoginScreen';
import ResetPasswordScreen from '@/src/features/auth/screens/ResetPasswordScreen';
import RegistrationScreen from '@/src/features/auth/screens/RegistrationScreen';
import EarnedBadgesScreen from '@/src/features/profile/screens/EarnedBadgesScreen';
import SettingsScreen from '@/src/features/profile/screens/SettingsScreen';
import PlanPreviewScreen from '@/src/features/chat/screens/PlanPreviewScreen';
import type { GeneratedPlan } from '@/shared/models/mvp-contracts.model';
import type { GeneratePlanInput } from '@/src/integration/services';

export type TabParamList = {
  Home: undefined;
  Quests: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  Settings: undefined;
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

const getMainHeaderTitle = (route: unknown) => {
  const focusedRouteName = getFocusedRouteNameFromRoute(route as never) ?? 'Home';

  switch (focusedRouteName) {
    case 'Home':
      return 'Home';
    case 'Quests':
      return 'Quests';
    case 'Chat':
      return 'AI Builder';
    case 'Profile':
      return 'Profile';
    default:
      return 'Home';
  }
};

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={({ navigation, route }) => ({
          header: () => (
            <Header
              title={getMainHeaderTitle(route)}
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
              title="Plan Preview"
              showBackButton
              onBackPress={() => navigation.goBack()}
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
              title="Settings"
              showBackButton
              onBackPress={() => navigation.goBack()}
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
              title="Earned Badges"
              showBackButton
              onBackPress={() => navigation.goBack()}
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
              title="Увійти"
              showBackButton
              onBackPress={() => navigation.goBack()}
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
              title="Реєстрація"
              showBackButton
              onBackPress={() => navigation.goBack()}
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
              title="Підтвердження пошти"
              showBackButton
              onBackPress={() => navigation.goBack()}
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
              title="Відновлення пароля"
              showBackButton
              onBackPress={() => navigation.goBack()}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
}
