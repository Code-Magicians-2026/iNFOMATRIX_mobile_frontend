import React from 'react';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TabNavigator from '@/src/navigation/TabNavigator';
import Header from '@/modules/Header/Header';
import ProfileScreen from '@/src/screens/ProfileScreen';
import SettingsScreen from '@/src/screens/SettingsScreen';
import LoginScreen from '@/src/screens/LoginScreen';
import RegistrationScreen from '@/src/screens/RegistrationScreen';
import AgentChatScreen from '@/src/screens/AgentChatScreen';

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
    </Stack.Navigator>
  );
}
