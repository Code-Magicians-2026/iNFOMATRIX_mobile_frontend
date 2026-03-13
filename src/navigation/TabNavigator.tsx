import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import type { TabParamList } from '@/src/navigation/AppNavigator';
import AgentChatScreen from '@/src/features/chat/screens/AgentChatScreen';
import ProfileScreen from '@/src/features/profile/screens/ProfileScreen';
import HomeScreen from '@/src/screens/HomeScreen';
import QuestsScreen from '@/src/screens/QuestsScreen';
import useThemeStore from '@/context/Theme-store';

const Tab = createBottomTabNavigator<TabParamList>();

const getTabIcon = (
  routeName: keyof TabParamList,
): keyof typeof Ionicons.glyphMap => {
  switch (routeName) {
    case 'Home':
      return 'home-outline';
    case 'Quests':
      return 'list-outline';
    case 'Chat':
      return 'sparkles-outline';
    case 'Profile':
      return 'person-outline';
    default:
      return 'ellipse-outline';
  }
};

export default function TabNavigator() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = useThemeStore((s) => s.colors);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#ff2d55',
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: isDark ? '#3a3a3c' : '#d8d8dc',
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={getTabIcon(route.name as keyof TabParamList)}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Quests" component={QuestsScreen} options={{ title: 'Quests' }} />
      <Tab.Screen name="Chat" component={AgentChatScreen} options={{ title: 'AI Builder' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
