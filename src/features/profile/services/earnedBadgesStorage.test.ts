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

vi.mock('@/shared/components/ui/badge-catalog', () => ({
  isBadgeImageKey: (value: unknown) => typeof value === 'string' && value.startsWith('ref'),
  normalizeBadgeImageKey: () => 'ref1',
  pickRandomBadgeImageKey: () => 'ref1',
  resolveBadgeTypeFromDifficulty: (difficulty: string) =>
    difficulty.trim().toLowerCase() === 'hard' ? 'fire' : 'basic',
}));

import earnedBadgesStorage from '@/src/features/profile/services/earnedBadgesStorage';

describe('earnedBadgesStorage', () => {
  beforeEach(() => {
    memoryStorage.clear();
    vi.clearAllMocks();
  });

  it('matches user ids even when case/spacing differs', async () => {
    await earnedBadgesStorage.registerEarnedBadge({
      userId: ' Child-1 ',
      questId: ' quest-1 ',
      difficulty: 'easy',
    });

    const badges = await earnedBadgesStorage.getEarnedBadgesByUser('child-1');
    expect(badges).toHaveLength(1);
    expect(badges[0]?.userId).toBe('Child-1');
    expect(badges[0]?.questId).toBe('quest-1');
  });

  it('does not duplicate badge for same quest with differently formatted ids', async () => {
    const first = await earnedBadgesStorage.registerEarnedBadge({
      userId: 'Child-1',
      questId: 'Quest-1',
      difficulty: 'hard',
    });

    const second = await earnedBadgesStorage.registerEarnedBadge({
      userId: ' child-1 ',
      questId: ' quest-1 ',
      difficulty: 'hard',
    });

    const badges = await earnedBadgesStorage.getEarnedBadgesByUser('CHILD-1');
    expect(second.id).toBe(first.id);
    expect(badges).toHaveLength(1);
  });
});
