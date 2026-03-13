import type {
  AvatarStats,
  LeaderboardItem,
  Quest,
  UserProfile,
} from '@/shared/models/mvp-contracts.model';
import { mockLeaderboard } from '@/src/features/mvp/mocks/mockLeaderboard';
import { mockAvatarStats, mockUserProfile } from '@/src/features/mvp/mocks/mockUser';
import { mockQuests } from '@/src/features/mvp/mocks/mockQuests';

const MOCK_DELAY_MS = 220;
const XP_PER_LEVEL = 300;

export interface HomeSummaryMock {
  user: UserProfile;
  avatarStats: AvatarStats;
  questsCompletedToday: number;
  xpGainedToday: number;
  activeQuests: number;
  leaderboardTop: LeaderboardItem[];
}

export interface ProfileMock {
  user: UserProfile;
  avatarStats: AvatarStats;
  activeQuests: number;
  completedQuests: number;
}

export interface GenerateQuestInput {
  taskText: string;
  durationMinutes?: number;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const cloneUser = (user: UserProfile): UserProfile => ({ ...user });

const cloneAvatarStats = (stats: AvatarStats): AvatarStats => ({ ...stats });

const cloneQuest = (quest: Quest): Quest => ({ ...quest });

const cloneLeaderboardItem = (item: LeaderboardItem): LeaderboardItem => ({ ...item });

const normalizeLeaderboard = (items: LeaderboardItem[]): LeaderboardItem[] =>
  [...items]
    .sort((a, b) => {
      if (b.xp === a.xp) {
        return b.fairScore - a.fairScore;
      }
      return b.xp - a.xp;
    })
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

let userState: UserProfile = cloneUser(mockUserProfile);
let avatarStatsState: AvatarStats = cloneAvatarStats(mockAvatarStats);
let questsState: Quest[] = mockQuests.map(cloneQuest);
let leaderboardState: LeaderboardItem[] = normalizeLeaderboard(
  mockLeaderboard.map(cloneLeaderboardItem),
);
let generatedQuestCount = 0;

const normalizeGenerateInput = (input: string | GenerateQuestInput): GenerateQuestInput => {
  if (typeof input === 'string') {
    return { taskText: input };
  }

  return {
    taskText: input.taskText,
    durationMinutes: input.durationMinutes,
  };
};

const getDifficultyAndReward = (taskText: string, durationMinutes?: number) => {
  const durationFactor = durationMinutes ?? 0;
  const complexityScore = taskText.length + durationFactor;

  if (complexityScore > 140) {
    return { difficulty: 'hard', rewardXp: 130 };
  }

  if (complexityScore > 70) {
    return { difficulty: 'medium', rewardXp: 90 };
  }

  return { difficulty: 'easy', rewardXp: 60 };
};

const buildQuestTitle = (taskText: string) => {
  const trimmed = taskText.trim();
  if (trimmed.length <= 32) {
    return trimmed;
  }

  return `${trimmed.slice(0, 29)}...`;
};

const buildQuestDescription = (input: GenerateQuestInput) => {
  const durationPart = input.durationMinutes
    ? `Target duration: ${input.durationMinutes} min.`
    : 'No fixed duration.';

  return `${durationPart} Focus on completion quality and consistency.`;
};

const recalcLevelFromXp = (xp: number) => Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);

const recalcFairScore = (stats: AvatarStats) => {
  const total = stats.health + stats.study + stats.sport + stats.productivity;
  return Math.round(total / 4);
};

const applyQuestReward = (quest: Quest) => {
  const nextXp = userState.xp + quest.rewardXp;

  userState = {
    ...userState,
    xp: nextXp,
    streak: userState.streak + 1,
    level: recalcLevelFromXp(nextXp),
  };

  const targetStat: keyof AvatarStats = 'productivity';
  const statIncrease = Math.max(1, Math.round(quest.rewardXp / 20));

  avatarStatsState = {
    ...avatarStatsState,
    health: Math.min(100, avatarStatsState.health + 1),
    [targetStat]: Math.min(100, avatarStatsState[targetStat] + statIncrease),
  };

  const fairScore = recalcFairScore(avatarStatsState);
  const existingUser = leaderboardState.find((item) => item.userId === userState.id);

  if (existingUser) {
    existingUser.xp = userState.xp;
    existingUser.fairScore = fairScore;
    existingUser.name = userState.fullName;
  } else {
    leaderboardState.push({
      userId: userState.id,
      name: userState.fullName,
      rank: leaderboardState.length + 1,
      xp: userState.xp,
      fairScore,
    });
  }

  leaderboardState = normalizeLeaderboard(leaderboardState);
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const cloneHomeSummary = (summary: HomeSummaryMock): HomeSummaryMock => ({
  user: cloneUser(summary.user),
  avatarStats: cloneAvatarStats(summary.avatarStats),
  questsCompletedToday: summary.questsCompletedToday,
  xpGainedToday: summary.xpGainedToday,
  activeQuests: summary.activeQuests,
  leaderboardTop: summary.leaderboardTop.map(cloneLeaderboardItem),
});

const createGeneratedQuest = (input: GenerateQuestInput): Quest => {
  generatedQuestCount += 1;

  const normalizedTask = input.taskText.trim();
  const { difficulty, rewardXp } = getDifficultyAndReward(normalizedTask, input.durationMinutes);

  return {
    id: `quest-generated-${Date.now()}-${generatedQuestCount}`,
    assignedToUserId: userState.id,
    title: buildQuestTitle(normalizedTask),
    originalTask: normalizedTask,
    description: buildQuestDescription(input),
    difficulty,
    rewardXp,
    estimatedMinutes: input.durationMinutes ?? 30,
    status: 'draft',
    createdAt: new Date().toISOString(),
  };
};

export const getHomeSummaryMock = async (): Promise<HomeSummaryMock> => {
  await wait(MOCK_DELAY_MS);

  const today = todayIsoDate();
  const todayCompleted = questsState.filter(
    (quest) => quest.status === 'completed' && quest.createdAt?.slice(0, 10) === today,
  );

  const summary: HomeSummaryMock = {
    user: cloneUser(userState),
    avatarStats: cloneAvatarStats(avatarStatsState),
    questsCompletedToday: todayCompleted.length,
    xpGainedToday: todayCompleted.reduce((sum, quest) => sum + quest.rewardXp, 0),
    activeQuests: questsState.filter((quest) => quest.status === 'active').length,
    leaderboardTop: normalizeLeaderboard(leaderboardState).slice(0, 5).map(cloneLeaderboardItem),
  };

  return cloneHomeSummary(summary);
};

export const getQuestsMock = async (): Promise<Quest[]> => {
  await wait(MOCK_DELAY_MS);

  return [...questsState]
    .sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0))
    .map(cloneQuest);
};

export const generateQuestMock = async (input: string | GenerateQuestInput): Promise<Quest> => {
  await wait(MOCK_DELAY_MS);

  const normalizedInput = normalizeGenerateInput(input);
  if (!normalizedInput.taskText.trim()) {
    throw new Error('Task text is required to generate a quest.');
  }

  return createGeneratedQuest(normalizedInput);
};

export const acceptGeneratedQuestMock = async (quest: Quest): Promise<Quest> => {
  await wait(MOCK_DELAY_MS);

  const acceptedQuest: Quest = {
    ...quest,
    status: 'active',
  };

  const existingQuest = questsState.find((item) => item.id === acceptedQuest.id);
  if (!existingQuest) {
    questsState = [acceptedQuest, ...questsState];
  }

  return cloneQuest(acceptedQuest);
};

export const completeQuestMock = async (id: string): Promise<Quest> => {
  await wait(MOCK_DELAY_MS);

  const questIndex = questsState.findIndex((quest) => quest.id === id);
  if (questIndex < 0) {
    throw new Error(`Quest with id '${id}' was not found.`);
  }

  const currentQuest = questsState[questIndex];
  if (currentQuest.status === 'completed') {
    return cloneQuest(currentQuest);
  }

  const completedQuest: Quest = {
    ...currentQuest,
    status: 'completed',
  };

  questsState = [...questsState.slice(0, questIndex), completedQuest, ...questsState.slice(questIndex + 1)];

  applyQuestReward(completedQuest);

  return cloneQuest(completedQuest);
};

export const getLeaderboardMock = async (): Promise<LeaderboardItem[]> => {
  await wait(MOCK_DELAY_MS);

  return normalizeLeaderboard(leaderboardState).map(cloneLeaderboardItem);
};

export const getProfileMock = async (): Promise<ProfileMock> => {
  await wait(MOCK_DELAY_MS);

  return {
    user: cloneUser(userState),
    avatarStats: cloneAvatarStats(avatarStatsState),
    activeQuests: questsState.filter((quest) => quest.status === 'active').length,
    completedQuests: questsState.filter((quest) => quest.status === 'completed').length,
  };
};
