import { describe, expect, it } from 'vitest';

import {
  getMainHeaderTitle,
  getTabTitle,
  resolveNavigationRole,
  resolveRoleAfterHydration,
} from '@/src/navigation/navigation-config';

describe('navigation-config', () => {
  it('resolves loading role while auth store is not hydrated', () => {
    expect(resolveNavigationRole({ isHydrated: false, role: null })).toBe('loading');
    expect(resolveNavigationRole({ isHydrated: false, role: 'adult' })).toBe('loading');
  });

  it('resolves adult and child roles after hydration', () => {
    expect(resolveNavigationRole({ isHydrated: true, role: 'adult' })).toBe('adult');
    expect(resolveNavigationRole({ isHydrated: true, role: 'child' })).toBe('child');
  });

  it('falls back to child role when hydrated role is null', () => {
    expect(resolveNavigationRole({ isHydrated: true, role: null })).toBe('child');
    expect(resolveRoleAfterHydration(null)).toBe('child');
  });

  it('returns role-based tab and header titles', () => {
    expect(getTabTitle('Quests', 'adult')).toBe('Квести / Плани');
    expect(getTabTitle('Chat', 'adult')).toBe('AI помічник');
    expect(getTabTitle('Quests', 'child')).toBe('Квести');
    expect(getTabTitle('Chat', 'child')).toBe('Гайд / Чат');
    expect(getMainHeaderTitle('Chat', 'child')).toBe('Гайд / Чат');
    expect(getTabTitle('Quests', 'adult', 'en')).toBe('Quests / Plans');
    expect(getMainHeaderTitle('Chat', 'child', 'en')).toBe('Guide / Chat');
  });
});
