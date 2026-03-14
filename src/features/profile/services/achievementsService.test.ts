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

import achievementsService from '@/src/features/profile/services/achievementsService';
import achievementsStorage from '@/src/features/profile/services/achievementsStorage';
import type { ProgressSummary, Quest, UserRole } from '@/shared/models/mvp-contracts.model';

const buildQuest = (overrides: Partial<Quest> = {}): Quest => ({
  id: 'quest-1',
  assignedToUserId: 'child-1',
  title: 'Clean room',
  description: 'Put everything in place',
  difficulty: 'easy',
  rewardXp: 50,
  estimatedMinutes: 20,
  status: 'archived',
  stepsCount: 3,
  completedStepsCount: 3,
  createdAt: '2026-03-14T10:00:00.000Z',
  completedAt: '2026-03-14T10:10:00.000Z',
  archivedAt: '2026-03-14T10:10:00.000Z',
  ...overrides,
});

const buildProgress = (overrides: Partial<ProgressSummary> = {}): ProgressSummary => ({
  userId: 'child-1',
  level: 1,
  xp: 100,
  streak: 1,
  completedQuestsCount: 1,
  activeQuestsCount: 0,
  stats: {},
  ...overrides,
});

const unlockFromQuestCompletion = async (role: UserRole, quest: Quest, progress: ProgressSummary) =>
  achievementsService.unlockFromQuestCompletion({
    userId: progress.userId,
    role,
    quest,
    progress,
  });

describe('achievementsService', () => {
  beforeEach(() => {
    memoryStorage.clear();
    vi.clearAllMocks();
  });

  it('unlocks first quest only once', async () => {
    const quest = buildQuest();
    const progress = buildProgress({ completedQuestsCount: 1 });

    const firstUnlocks = await unlockFromQuestCompletion('child', quest, progress);
    const secondUnlocks = await unlockFromQuestCompletion('child', quest, progress);

    expect(firstUnlocks.some((achievement) => achievement.id === 'first_quest')).toBe(true);
    expect(secondUnlocks).toHaveLength(0);

    const unlocked = await achievementsStorage.getUnlockedAchievementsByUser(progress.userId);
    const firstQuestAchievements = unlocked.filter((achievement) => achievement.id === 'first_quest');
    expect(firstQuestAchievements).toHaveLength(1);
  });

  it('unlocks multiple achievements based on completion context', async () => {
    const quest = buildQuest({
      title: 'AI generated kitchen cleanup',
      rewardType: 'treat',
      rewardTitle: 'Ice cream',
      reportPhotoRequired: true,
      afterPhoto: {
        uri: 'file://photo-after.jpg',
        createdAt: '2026-03-14T10:10:00.000Z',
      },
    });
    const progress = buildProgress({
      streak: 3,
      completedQuestsCount: 5,
    });

    const unlocks = await unlockFromQuestCompletion('child', quest, progress);
    const ids = unlocks.map((achievement) => achievement.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        'first_quest',
        'step_master',
        'photo_reporter',
        'reward_hunter',
        'three_day_streak',
        'quest_explorer',
        'family_helper',
        'ai_adventurer',
      ]),
    );
  });

  it('marks new achievements as seen', async () => {
    const quest = buildQuest();
    const progress = buildProgress({ completedQuestsCount: 1 });

    await unlockFromQuestCompletion('child', quest, progress);
    const newCountBefore = await achievementsStorage.getNewAchievementsCount(progress.userId);
    expect(newCountBefore).toBeGreaterThan(0);

    await achievementsStorage.markAchievementsAsSeen(progress.userId);
    const newCountAfter = await achievementsStorage.getNewAchievementsCount(progress.userId);
    expect(newCountAfter).toBe(0);
  });
});
