import { Ionicons } from '@expo/vector-icons';

import type { UserRole } from '@/shared/models/mvp-contracts.model';

export type NavigationRole = 'adult' | 'child';
export type NavigationRoleState = NavigationRole | 'loading';
export type MainTabRouteName = 'Home' | 'Quests' | 'Chat' | 'Profile';

const ADULT_TAB_TITLES: Record<MainTabRouteName, string> = {
  Home: 'Home',
  Quests: 'Quests / Plans',
  Chat: 'AI Builder',
  Profile: 'Profile',
};

const CHILD_TAB_TITLES: Record<MainTabRouteName, string> = {
  Home: 'Home',
  Quests: 'Quests',
  Chat: 'Guide / Chat',
  Profile: 'Profile',
};

export const resolveNavigationRole = (input: {
  isHydrated: boolean;
  role: UserRole | null;
}): NavigationRoleState => {
  if (!input.isHydrated) {
    return 'loading';
  }

  return input.role === 'adult' ? 'adult' : 'child';
};

export const resolveRoleAfterHydration = (role: UserRole | null): NavigationRole =>
  role === 'adult' ? 'adult' : 'child';

export const getTabTitle = (routeName: MainTabRouteName, role: NavigationRole): string =>
  role === 'adult' ? ADULT_TAB_TITLES[routeName] : CHILD_TAB_TITLES[routeName];

export const getMainHeaderTitle = (routeName: MainTabRouteName, role: NavigationRole): string =>
  getTabTitle(routeName, role);

export const getTabIcon = (
  routeName: MainTabRouteName,
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
