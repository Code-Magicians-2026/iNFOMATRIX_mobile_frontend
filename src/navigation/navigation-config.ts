import { Ionicons } from '@expo/vector-icons';

import type { LanguageCode } from '@/context/Language-store';
import { translate } from '@/src/i18n/translations';
import type { UserRole } from '@/shared/models/mvp-contracts.model';

export type NavigationRole = 'adult' | 'child';
export type NavigationRoleState = NavigationRole | 'loading';
export type MainTabRouteName = 'Home' | 'Quests' | 'Chat' | 'Profile';

const ADULT_TAB_TITLES = {
  Home: 'navigation.tab.adult.home',
  Quests: 'navigation.tab.adult.quests',
  Chat: 'navigation.tab.adult.chat',
  Profile: 'navigation.tab.adult.profile',
} as const;

const CHILD_TAB_TITLES = {
  Home: 'navigation.tab.child.home',
  Quests: 'navigation.tab.child.quests',
  Chat: 'navigation.tab.child.chat',
  Profile: 'navigation.tab.child.profile',
} as const;

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

export const getTabTitle = (
  routeName: MainTabRouteName,
  role: NavigationRole,
  language: LanguageCode = 'uk',
): string => {
  const key = role === 'adult' ? ADULT_TAB_TITLES[routeName] : CHILD_TAB_TITLES[routeName];
  return translate(language, key);
};

export const getMainHeaderTitle = (
  routeName: MainTabRouteName,
  role: NavigationRole,
  language: LanguageCode = 'uk',
): string => getTabTitle(routeName, role, language);

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
