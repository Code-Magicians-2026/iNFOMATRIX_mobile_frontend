import React from 'react';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TabNavigator from '@/src/navigation/TabNavigator';
import Header from '@/modules/Header/Header';
import ConfirmEmailScreen from '@/src/features/auth/screens/ConfirmEmailScreen';
import LoginScreen from '@/src/features/auth/screens/LoginScreen';
import ResetPasswordScreen from '@/src/features/auth/screens/ResetPasswordScreen';
import RegistrationScreen from '@/src/features/auth/screens/RegistrationScreen';
import AgentChatScreen from '@/src/features/chat/screens/AgentChatScreen';
import ProfileScreen from '@/src/features/profile/screens/ProfileScreen';
import SettingsScreen from '@/src/features/profile/screens/SettingsScreen';

export type TabParamList = {
  Main: undefined;
  Guide: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  AgentChat: undefined;
  Profile: undefined;
  Settings: undefined;
  Login: { initialEmail?: string; redirectTo?: 'Settings' | 'Profile' } | undefined;
  Registration: { redirectTo?: 'Settings' | 'Profile' } | undefined;
  ConfirmEmail: { initialEmail?: string; redirectTo?: 'Settings' | 'Profile' } | undefined;
  ResetPassword: { initialEmail?: string; redirectTo?: 'Settings' | 'Profile' } | undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

const getMainHeaderTitle = (route: unknown) => {
  const focusedRouteName = getFocusedRouteNameFromRoute(route as never) ?? 'Main';

  switch (focusedRouteName) {
    case 'Main':
      return 'Library';
    case 'Guide':
      return 'Guide';
    default:
      return 'Library';
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
              onAiPress={() => navigation.navigate('AgentChat')}
              onProfilePress={() => navigation.navigate('Profile')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="AgentChat"
        component={AgentChatScreen}
        options={({ navigation }) => ({
          header: () => (
            <Header
              title="AI Chat"
              showBackButton
              onBackPress={() => navigation.goBack()}
              onProfilePress={() => navigation.navigate('Profile')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={({ navigation }) => ({
          header: () => (
            <Header
              title="My Profile"
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
