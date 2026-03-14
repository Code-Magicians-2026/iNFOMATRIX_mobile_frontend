import type {
  ChildProfile,
  GeneratedPlan,
  LeaderboardItem,
  PlanRequest,
  ProgressSummary,
  Quest,
  UserProfile,
} from '@/shared/models/mvp-contracts.model';

const activeQuestOne: Quest = {
  id: 'offline-quest-1',
  assignedToUserId: 'child-1',
  title: 'Homework Focus Sprint',
  description: 'Complete two homework blocks with 10-minute breaks.',
  category: 'study',
  difficulty: 'medium',
  rewardXp: 80,
  estimatedMinutes: 35,
  status: 'active',
  createdAt: '2026-03-13T14:10:00.000Z',
};

const activeQuestTwo: Quest = {
  id: 'offline-quest-2',
  assignedToUserId: 'child-1',
  title: 'Room Clean-up Challenge',
  description: 'Clean desk and shelf zones before evening routine.',
  category: 'household',
  difficulty: 'easy',
  rewardXp: 50,
  estimatedMinutes: 20,
  status: 'active',
  createdAt: '2026-03-13T15:00:00.000Z',
};

const activeQuestThree: Quest = {
  id: 'offline-quest-3',
  assignedToUserId: 'child-1',
  title: 'Reading Confidence Block',
  description: 'Read one chapter and write a 3-line summary.',
  category: 'study',
  difficulty: 'medium',
  rewardXp: 70,
  estimatedMinutes: 30,
  status: 'active',
  createdAt: '2026-03-13T16:00:00.000Z',
};

const completedQuestOne: Quest = {
  id: 'offline-quest-4',
  assignedToUserId: 'child-1',
  title: 'Morning Stretch Routine',
  description: 'Complete short mobility and breathing routine.',
  category: 'health',
  difficulty: 'easy',
  rewardXp: 40,
  estimatedMinutes: 15,
  status: 'completed',
  createdAt: '2026-03-12T07:30:00.000Z',
  completedAt: '2026-03-12T07:55:00.000Z',
};

const completedQuestTwo: Quest = {
  id: 'offline-quest-5',
  assignedToUserId: 'child-1',
  title: 'Math Quick Mission',
  description: 'Solve 6 math tasks and verify each answer.',
  category: 'study',
  difficulty: 'medium',
  rewardXp: 65,
  estimatedMinutes: 25,
  status: 'completed',
  createdAt: '2026-03-11T17:10:00.000Z',
  completedAt: '2026-03-11T17:45:00.000Z',
};

const secondChildActiveQuest: Quest = {
  id: 'offline-quest-6',
  assignedToUserId: 'child-2',
  title: 'Science Recap',
  description: 'Review one science topic and record key points.',
  category: 'science',
  difficulty: 'medium',
  rewardXp: 75,
  estimatedMinutes: 35,
  status: 'active',
  createdAt: '2026-03-13T17:20:00.000Z',
};

export const mockOfflineSeedUsers: UserProfile[] = [
  {
    id: 'adult-1',
    fullName: 'Olena Mentor',
    email: 'olena.mentor@mock.infomatrix.app',
    role: 'adult',
    activeChildId: 'child-1',
    level: 8,
    xp: 2450,
    streak: 15,
    avatarType: 'mentor',
  },
  {
    id: 'child-1',
    fullName: 'Marta Horizon',
    email: 'marta.horizon@mock.infomatrix.app',
    role: 'child',
    createdByAdultId: 'adult-1',
    level: 3,
    xp: 620,
    streak: 6,
    avatarType: 'adventurer',
  },
  {
    id: 'child-2',
    fullName: 'Oleh Quester',
    email: 'oleh.quester@mock.infomatrix.app',
    role: 'child',
    createdByAdultId: 'adult-1',
    level: 2,
    xp: 280,
    streak: 2,
    avatarType: 'explorer',
  },
];

export const mockOfflineSeedChildren: ChildProfile[] = [
  {
    id: 'child-1',
    fullName: 'Marta Horizon',
    age: 10,
    interests: ['math', 'robotics'],
    notes: 'Works best with short gamified sessions.',
    createdByAdultId: 'adult-1',
    level: 3,
    xp: 620,
    streak: 6,
  },
  {
    id: 'child-2',
    fullName: 'Oleh Quester',
    age: 12,
    interests: ['science', 'reading'],
    notes: 'Responds well to challenge-based tasks.',
    createdByAdultId: 'adult-1',
    level: 2,
    xp: 280,
    streak: 2,
  },
];

export const mockOfflineSeedPlanRequests: PlanRequest[] = [
  {
    id: 'offline-plan-request-1',
    targetUserId: 'child-1',
    prompt: 'Create a focused after-school routine with study and tidy-up.',
    category: 'routine',
    intensity: 'medium',
    status: 'approved',
  },
  {
    id: 'offline-plan-request-2',
    targetUserId: 'child-2',
    prompt: 'Create a short science revision flow for today.',
    category: 'science',
    intensity: 'low',
    status: 'approved',
  },
];

export const mockOfflineSeedPlans: GeneratedPlan[] = [
  {
    id: 'offline-plan-1',
    title: 'Marta Daily Boost',
    summary: 'Three active quests plus archived wins from previous days.',
    childMessage: 'You already have momentum. Keep it up with one quest at a time.',
    quests: [
      activeQuestOne,
      activeQuestTwo,
      activeQuestThree,
      completedQuestOne,
      completedQuestTwo,
    ],
    totalEstimatedMinutes: 125,
    status: 'approved',
  },
  {
    id: 'offline-plan-2',
    title: 'Oleh Science Starter',
    summary: 'One focused active quest for quick science revision.',
    childMessage: 'Start small and finish strong.',
    quests: [secondChildActiveQuest],
    totalEstimatedMinutes: 35,
    status: 'approved',
  },
];

export const mockOfflineSeedQuests: Quest[] = [
  activeQuestOne,
  activeQuestTwo,
  activeQuestThree,
  completedQuestOne,
  completedQuestTwo,
  secondChildActiveQuest,
];

export const mockOfflineSeedProgress: ProgressSummary[] = [
  {
    userId: 'adult-1',
    level: 8,
    xp: 2450,
    streak: 15,
    completedQuestsCount: 0,
    activeQuestsCount: 0,
    stats: {
      planning: 7,
      coaching: 6,
    },
  },
  {
    userId: 'child-1',
    level: 3,
    xp: 620,
    streak: 6,
    completedQuestsCount: 2,
    activeQuestsCount: 3,
    stats: {
      study: 4,
      household: 2,
      health: 1,
    },
  },
  {
    userId: 'child-2',
    level: 2,
    xp: 280,
    streak: 2,
    completedQuestsCount: 0,
    activeQuestsCount: 1,
    stats: {
      science: 2,
      study: 1,
    },
  },
];

export const mockOfflineSeedLeaderboard: LeaderboardItem[] = [
  {
    userId: 'adult-1',
    name: 'Olena Mentor',
    rank: 1,
    xp: 2450,
    fairScore: 95,
  },
  {
    userId: 'child-1',
    name: 'Marta Horizon',
    rank: 2,
    xp: 620,
    fairScore: 89,
  },
  {
    userId: 'child-2',
    name: 'Oleh Quester',
    rank: 3,
    xp: 280,
    fairScore: 82,
  },
  {
    userId: 'guest-1',
    name: 'Ira Blaze',
    rank: 4,
    xp: 240,
    fairScore: 80,
  },
  {
    userId: 'guest-2',
    name: 'Roman Quest',
    rank: 5,
    xp: 210,
    fairScore: 78,
  },
];

export const mockOfflineSeedAiResponses: string[] = [
  'AI demo: План згенеровано. Почнемо з короткого фокус-блоку та легкої перемоги.',
  'AI demo: Рекомендую розбити задачу на 3 кроки і відмічати прогрес після кожного.',
  'AI demo: Добра стратегія для streak: 1 простий квест щодня в один і той самий час.',
];

export const mockOfflineSeedVisionResponse =
  'Vision demo: Фото підтверджено. Видно підготовлений робочий простір, можна починати квест.';
