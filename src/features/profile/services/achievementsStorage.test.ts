import { beforeEach, describe, expect, it, vi } from 'vitest';

const memoryStorage = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => memoryStorage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      memoryStorage.set(key, value);
    }),
  },
}));

import achievementsStorage from '@/src/features/profile/services/achievementsStorage';

describe('achievementsStorage', () => {
  beforeEach(() => {
    memoryStorage.clear();
    vi.clearAllMocks();
  });

  it('matches user ids even when case/spacing differs', async () => {
    await achievementsStorage.unlockAchievement({
      userId: '  Child-1  ',
      achievementId: 'first_quest',
    });

    const unlocked = await achievementsStorage.getUnlockedAchievementsByUser('child-1');
    expect(unlocked).toHaveLength(1);
    expect(unlocked[0]?.userId).toBe('Child-1');
    expect(unlocked[0]?.id).toBe('first_quest');
  });

  it('marks achievements as seen for normalized user id', async () => {
    await achievementsStorage.unlockAchievement({
      userId: 'Child-1',
      achievementId: 'first_quest',
    });

    await achievementsStorage.markAchievementsAsSeen('  child-1  ');
    const newCount = await achievementsStorage.getNewAchievementsCount('CHILD-1');

    expect(newCount).toBe(0);
  });
});

