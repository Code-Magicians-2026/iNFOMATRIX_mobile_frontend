import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import type { TabParamList } from '@/src/navigation/AppNavigator';
import GuideScreen from '@/src/screens/GuideScreen';
import MainScreen from '@/src/screens/MainScreen';
import useThemeStore from '@/context/Theme-store';

const Tab = createBottomTabNavigator<TabParamList>();

const getTabIcon = (
  routeName: keyof TabParamList,
): keyof typeof Ionicons.glyphMap => {
  switch (routeName) {
    case 'Main':
      return 'book-outline';
    case 'Guide':
      return 'compass-outline';
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
      <Tab.Screen name="Main" component={MainScreen} />
      <Tab.Screen name="Guide" component={GuideScreen} />
    </Tab.Navigator>
  );
}
