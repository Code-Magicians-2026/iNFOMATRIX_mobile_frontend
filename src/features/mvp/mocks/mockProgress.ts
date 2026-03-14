import type { ProgressSummary } from '@/shared/models/mvp-contracts.model';

export const mockProgress: ProgressSummary[] = [
  {
    userId: 'child-1',
    level: 3,
    xp: 360,
    streak: 4,
    completedQuestsCount: 1,
    activeQuestsCount: 4,
    stats: {
      study: 3,
      sport: 1,
      health: 1,
      productivity: 1,
    },
  },
  {
    userId: 'child-2',
    level: 2,
    xp: 190,
    streak: 2,
    completedQuestsCount: 0,
    activeQuestsCount: 1,
    stats: {
      study: 1,
      science: 1,
    },
  },
  {
    userId: 'adult-1',
    level: 8,
    xp: 2450,
    streak: 15,
    completedQuestsCount: 0,
    activeQuestsCount: 0,
    stats: {
      planning: 8,
      coaching: 5,
    },
  },
];
