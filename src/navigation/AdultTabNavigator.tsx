import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import useThemeStore from '@/context/Theme-store';
import AgentChatScreen from '@/src/features/chat/screens/AgentChatScreen';
import ProfileScreen from '@/src/features/profile/screens/ProfileScreen';
import type { AdultTabParamList } from '@/src/navigation/AppNavigator';
import { getTabIcon, getTabTitle } from '@/src/navigation/navigation-config';
import AdultHomeScreen from '@/src/screens/AdultHomeScreen';
import QuestsScreen from '@/src/screens/QuestsScreen';

const Tab = createBottomTabNavigator<AdultTabParamList>();

export default function AdultTabNavigator() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = useThemeStore((s) => s.colors);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        tabBarActiveTintColor: '#ff2d55',
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: isDark ? '#3a3a3c' : '#d8d8dc',
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={getTabIcon(route.name)} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={AdultHomeScreen} options={{ title: getTabTitle('Home', 'adult') }} />
      <Tab.Screen
        name="Quests"
        component={QuestsScreen}
        options={{ title: getTabTitle('Quests', 'adult') }}
      />
      <Tab.Screen name="Chat" component={AgentChatScreen} options={{ title: getTabTitle('Chat', 'adult') }} />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: getTabTitle('Profile', 'adult') }}
      />
    </Tab.Navigator>
  );
}
