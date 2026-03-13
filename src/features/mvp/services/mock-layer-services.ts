import type {
  CapturedPhoto,
  ChildProfile,
  GeneratedPlan,
  PlanRequest,
  ProgressSummary,
  Quest,
  UserProfile,
} from '@/shared/models/mvp-contracts.model';
import { mockChildren } from '@/src/features/mvp/mocks/mockChildren';
import { mockPlanRequests } from '@/src/features/mvp/mocks/mockPlanRequests';
import { mockPlans } from '@/src/features/mvp/mocks/mockPlans';
import { mockProgress } from '@/src/features/mvp/mocks/mockProgress';
import { mockQuests } from '@/src/features/mvp/mocks/mockQuests';
import { mockUsers } from '@/src/features/mvp/mocks/mockUsers';

const MOCK_DELAY_MS = 180;
const XP_PER_LEVEL = 300;

type MockState = {
  users: UserProfile[];
  children: ChildProfile[];
  planRequests: PlanRequest[];
  plans: GeneratedPlan[];
  quests: Quest[];
  progress: ProgressSummary[];
};

export interface CreateChildMockInput {
  fullName: string;
  age: number;
  interests?: string[];
  notes?: string;
  createdByAdultId?: string;
}

export interface GeneratePlanMockInput {
  targetUserId: string;
  prompt: string;
  category: string;
  intensity: string;
  photo?: CapturedPhoto;
}

export interface GetPlansMockInput {
  targetUserId?: string;
  limit?: number;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const cloneQuest = (quest: Quest): Quest => ({ ...quest });

const cloneCapturedPhoto = (photo: CapturedPhoto): CapturedPhoto => ({ ...photo });

const clonePlanRequest = (request: PlanRequest): PlanRequest => ({
  ...request,
  photo: request.photo ? cloneCapturedPhoto(request.photo) : undefined,
});

const cloneProgress = (summary: ProgressSummary): ProgressSummary => ({
  ...summary,
  stats: { ...summary.stats },
});

const clonePlan = (plan: GeneratedPlan): GeneratedPlan => ({
  ...plan,
  quests: plan.quests.map(cloneQuest),
});

const cloneChild = (child: ChildProfile): ChildProfile => ({
  ...child,
  interests: child.interests ? [...child.interests] : undefined,
});

const cloneUser = (user: UserProfile): UserProfile => ({ ...user });

const getDefaultMeId = (users: UserProfile[]) =>
  users.find((user) => user.role === 'adult')?.id ?? users[0]?.id ?? 'adult-1';

const createInitialState = (): MockState => ({
  users: mockUsers.map(cloneUser),
  children: mockChildren.map(cloneChild),
  planRequests: mockPlanRequests.map(clonePlanRequest),
  plans: mockPlans.map(clonePlan),
  quests: mockQuests.map(cloneQuest),
  progress: mockProgress.map(cloneProgress),
});

let state: MockState = createInitialState();
let meIdState = getDefaultMeId(state.users);

let childCounter = state.children.length;
let planRequestCounter = state.planRequests.length;
let planCounter = state.plans.length;

const recalcLevelFromXp = (xp: number) => Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);

const getCurrentMeFromState = (): UserProfile => {
  const me = state.users.find((user) => user.id === meIdState) ?? state.users[0];
  if (!me) {
    throw new Error('Mock users are not initialized.');
  }

  return me;
};

const buildStatsFromCompletedQuests = (quests: Quest[]) => {
  const stats: Record<string, number> = {};

  quests.forEach((quest) => {
    if (quest.status !== 'completed') {
      return;
    }

    stats[quest.category] = (stats[quest.category] ?? 0) + 1;
  });

  return stats;
};

const summarizeQuestsForUser = (userId: string) => {
  const userQuests = state.quests.filter((quest) => quest.assignedToUserId === userId);

  return {
    quests: userQuests,
    activeCount: userQuests.filter((quest) => quest.status === 'active').length,
    completedCount: userQuests.filter((quest) => quest.status === 'completed').length,
  };
};

const ensureProgressState = (userId: string): ProgressSummary => {
  const existing = state.progress.find((summary) => summary.userId === userId);
  if (existing) {
    return existing;
  }

  const user = state.users.find((item) => item.id === userId);
  const summaryFromQuests = summarizeQuestsForUser(userId);
  const created: ProgressSummary = {
    userId,
    level: user?.level ?? 1,
    xp: user?.xp ?? 0,
    streak: user?.streak ?? 0,
    completedQuestsCount: summaryFromQuests.completedCount,
    activeQuestsCount: summaryFromQuests.activeCount,
    stats: buildStatsFromCompletedQuests(summaryFromQuests.quests),
  };

  state.progress = [created, ...state.progress];

  return created;
};

const syncUserFromProgress = (progress: ProgressSummary) => {
  const userIndex = state.users.findIndex((user) => user.id === progress.userId);
  if (userIndex < 0) {
    return;
  }

  const user = state.users[userIndex];
  state.users[userIndex] = {
    ...user,
    xp: progress.xp,
    level: progress.level,
    streak: progress.streak,
  };
};

const refreshProgressCounters = (userId: string): ProgressSummary => {
  const progress = ensureProgressState(userId);
  const summaryFromQuests = summarizeQuestsForUser(userId);

  progress.activeQuestsCount = summaryFromQuests.activeCount;
  progress.completedQuestsCount = summaryFromQuests.completedCount;

  return progress;
};

const sortQuests = (quests: Quest[]) => {
  const statusRank: Record<string, number> = {
    active: 0,
    draft: 1,
    completed: 2,
  };

  return [...quests].sort((left, right) => {
    const leftRank = statusRank[left.status] ?? 10;
    const rightRank = statusRank[right.status] ?? 10;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    const rightCreated = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    const leftCreated = left.createdAt ? new Date(left.createdAt).getTime() : 0;

    return rightCreated - leftCreated;
  });
};

const normalizeIntensity = (value: string) => value.trim().toLowerCase();

const normalizeCapturedPhoto = (photo?: CapturedPhoto): CapturedPhoto | undefined => {
  if (!photo?.uri.trim()) {
    return undefined;
  }

  return {
    uri: photo.uri.trim(),
    width: photo.width,
    height: photo.height,
    fileName: photo.fileName,
    mimeType: photo.mimeType,
    fileSize: photo.fileSize,
    previewUri: photo.previewUri ?? photo.uri.trim(),
  };
};

const buildPlanQuests = (input: GeneratePlanMockInput, planId: string): Quest[] => {
  const intensity = normalizeIntensity(input.intensity);

  const questCount = intensity === 'high' ? 4 : intensity === 'low' ? 2 : 3;
  const baseReward = intensity === 'high' ? 90 : intensity === 'low' ? 50 : 70;
  const baseDuration = intensity === 'high' ? 35 : intensity === 'low' ? 20 : 28;
  const difficulty = intensity === 'high' ? 'hard' : intensity === 'low' ? 'easy' : 'medium';
  const category = input.category.trim().toLowerCase() || 'productivity';
  const nowMs = Date.now();

  return Array.from({ length: questCount }, (_, index) => ({
    id: `${planId}-quest-${index + 1}`,
    assignedToUserId: input.targetUserId,
    title: `${category[0].toUpperCase()}${category.slice(1)} Mission ${index + 1}`,
    description: `${input.prompt.trim()} Step ${index + 1}: keep focus and complete with quality.`,
    category,
    difficulty,
    rewardXp: baseReward + index * 10,
    estimatedMinutes: baseDuration + index * 5,
    status: 'draft',
    createdAt: new Date(nowMs + index * 60_000).toISOString(),
  }));
};

export const resetMockLayerState = () => {
  state = createInitialState();
  meIdState = getDefaultMeId(state.users);
  childCounter = state.children.length;
  planRequestCounter = state.planRequests.length;
  planCounter = state.plans.length;
};

export const setMockMeId = (userId: string) => {
  const exists = state.users.some((user) => user.id === userId);
  if (!exists) {
    throw new Error(`User with id '${userId}' does not exist in mock state.`);
  }

  meIdState = userId;
};

export const getMeMock = async (): Promise<UserProfile> => {
  await wait(MOCK_DELAY_MS);

  return cloneUser(getCurrentMeFromState());
};

export const getPlansMock = async (input: GetPlansMockInput = {}): Promise<GeneratedPlan[]> => {
  await wait(MOCK_DELAY_MS);

  const filteredPlans = input.targetUserId
    ? state.plans.filter((plan) =>
        plan.quests.some((quest) => quest.assignedToUserId === input.targetUserId),
      )
    : [...state.plans];

  const limitedPlans =
    typeof input.limit === 'number' && input.limit > 0
      ? filteredPlans.slice(0, input.limit)
      : filteredPlans;

  return limitedPlans.map(clonePlan);
};

export const getChildrenMock = async (): Promise<ChildProfile[]> => {
  await wait(MOCK_DELAY_MS);

  const me = getCurrentMeFromState();
  if (me.role !== 'adult') {
    return [];
  }

  return state.children
    .filter((child) => child.createdByAdultId === me.id)
    .map(cloneChild);
};

export const createChildMock = async (input: CreateChildMockInput): Promise<ChildProfile> => {
  await wait(MOCK_DELAY_MS);

  const normalizedName = input.fullName.trim();
  if (!normalizedName) {
    throw new Error('Child fullName is required.');
  }

  if (!Number.isFinite(input.age) || input.age < 3 || input.age > 18) {
    throw new Error('Child age must be a number between 3 and 18.');
  }

  const me = getCurrentMeFromState();
  const adultId = input.createdByAdultId ?? (me.role === 'adult' ? me.id : me.createdByAdultId);

  if (!adultId) {
    throw new Error('Unable to resolve adult owner for this child profile.');
  }

  const adultUserIndex = state.users.findIndex((user) => user.id === adultId && user.role === 'adult');
  if (adultUserIndex < 0) {
    throw new Error(`Adult user '${adultId}' was not found.`);
  }

  childCounter += 1;
  const childId = `child-${Date.now()}-${childCounter}`;

  const childProfile: ChildProfile = {
    id: childId,
    fullName: normalizedName,
    age: Math.round(input.age),
    interests: input.interests ? [...input.interests] : undefined,
    notes: input.notes,
    createdByAdultId: adultId,
    level: 1,
    xp: 0,
    streak: 0,
  };

  const childUser: UserProfile = {
    id: childId,
    fullName: normalizedName,
    email: `${childId}@mock.infomatrix.app`,
    role: 'child',
    createdByAdultId: adultId,
    level: 1,
    xp: 0,
    streak: 0,
    avatarType: 'adventurer',
  };

  state.children = [childProfile, ...state.children];
  state.users = [childUser, ...state.users];

  const adultUser = state.users[adultUserIndex + 1] ?? state.users.find((user) => user.id === adultId);
  if (adultUser && !adultUser.activeChildId) {
    adultUser.activeChildId = childId;
  }

  ensureProgressState(childId);

  return cloneChild(childProfile);
};

export const generatePlanMock = async (input: GeneratePlanMockInput): Promise<GeneratedPlan> => {
  await wait(MOCK_DELAY_MS);

  const targetUser = state.users.find((user) => user.id === input.targetUserId && user.role === 'child');
  if (!targetUser) {
    throw new Error(`Target user '${input.targetUserId}' was not found or is not a child.`);
  }

  if (!input.prompt.trim()) {
    throw new Error('Plan prompt is required.');
  }

  const normalizedPhoto = normalizeCapturedPhoto(input.photo);

  planRequestCounter += 1;
  const request: PlanRequest = {
    id: `plan-request-${Date.now()}-${planRequestCounter}`,
    targetUserId: input.targetUserId,
    prompt: input.prompt.trim(),
    category: input.category.trim() || 'general',
    intensity: input.intensity.trim() || 'medium',
    photo: normalizedPhoto,
    status: 'generated',
  };

  state.planRequests = [request, ...state.planRequests];

  planCounter += 1;
  const planId = `plan-${Date.now()}-${planCounter}`;
  const quests = buildPlanQuests(input, planId);

  const generatedPlan: GeneratedPlan = {
    id: planId,
    title: `${targetUser.fullName}: AI Plan`,
    summary: `Generated ${quests.length} quests for ${request.category} with ${request.intensity} intensity${normalizedPhoto ? ' using camera context.' : '.'}`,
    childMessage: `You can do this, ${targetUser.fullName}. Start with one quest and keep going.`,
    quests,
    totalEstimatedMinutes: quests.reduce((sum, quest) => sum + quest.estimatedMinutes, 0),
    status: 'draft',
  };

  state.plans = [generatedPlan, ...state.plans];

  return clonePlan(generatedPlan);
};

export const approvePlanMock = async (planId: string): Promise<GeneratedPlan> => {
  await wait(MOCK_DELAY_MS);

  const planIndex = state.plans.findIndex((plan) => plan.id === planId);
  if (planIndex < 0) {
    throw new Error(`Plan '${planId}' was not found.`);
  }

  const currentPlan = state.plans[planIndex];
  if (currentPlan.status === 'approved') {
    return clonePlan(currentPlan);
  }

  const activatedQuests = currentPlan.quests.map((quest) => ({
    ...quest,
    status: quest.status === 'completed' ? 'completed' : 'active',
  }));

  const approvedPlan: GeneratedPlan = {
    ...currentPlan,
    status: 'approved',
    quests: activatedQuests,
  };

  state.plans = [
    ...state.plans.slice(0, planIndex),
    approvedPlan,
    ...state.plans.slice(planIndex + 1),
  ];

  activatedQuests.forEach((quest) => {
    const existingQuestIndex = state.quests.findIndex((item) => item.id === quest.id);
    if (existingQuestIndex >= 0) {
      state.quests[existingQuestIndex] = { ...state.quests[existingQuestIndex], ...quest };
      return;
    }

    state.quests = [cloneQuest(quest), ...state.quests];
  });

  const firstQuest = activatedQuests[0];
  if (firstQuest) {
    const pendingRequestIndex = state.planRequests.findIndex(
      (request) => request.targetUserId === firstQuest.assignedToUserId && request.status !== 'approved',
    );

    if (pendingRequestIndex >= 0) {
      state.planRequests[pendingRequestIndex] = {
        ...state.planRequests[pendingRequestIndex],
        status: 'approved',
      };
    }

    refreshProgressCounters(firstQuest.assignedToUserId);
  }

  return clonePlan(approvedPlan);
};

export const getQuestsMock = async (userId: string): Promise<Quest[]> => {
  await wait(MOCK_DELAY_MS);

  return sortQuests(state.quests.filter((quest) => quest.assignedToUserId === userId)).map(cloneQuest);
};

export const completeQuestMock = async (id: string): Promise<Quest> => {
  await wait(MOCK_DELAY_MS);

  const questIndex = state.quests.findIndex((quest) => quest.id === id);
  if (questIndex < 0) {
    throw new Error(`Quest '${id}' was not found.`);
  }

  const currentQuest = state.quests[questIndex];
  if (currentQuest.status === 'completed') {
    return cloneQuest(currentQuest);
  }

  const completedQuest: Quest = {
    ...currentQuest,
    status: 'completed',
  };

  state.quests = [
    ...state.quests.slice(0, questIndex),
    completedQuest,
    ...state.quests.slice(questIndex + 1),
  ];

  state.plans = state.plans.map((plan) => ({
    ...plan,
    quests: plan.quests.map((quest) => (quest.id === id ? { ...quest, status: 'completed' } : quest)),
  }));

  const progress = ensureProgressState(completedQuest.assignedToUserId);
  progress.xp += completedQuest.rewardXp;
  progress.level = recalcLevelFromXp(progress.xp);
  progress.streak += 1;
  progress.stats = {
    ...progress.stats,
    [completedQuest.category]: (progress.stats[completedQuest.category] ?? 0) + 1,
  };

  refreshProgressCounters(completedQuest.assignedToUserId);
  syncUserFromProgress(progress);

  return cloneQuest(completedQuest);
};

export const getProgressMock = async (userId: string): Promise<ProgressSummary> => {
  await wait(MOCK_DELAY_MS);

  const progress = refreshProgressCounters(userId);

  return cloneProgress(progress);
};

export type DemoScenarioKey =
  | 'adult_no_children'
  | 'adult_one_child'
  | 'child_active_quests'
  | 'child_completed_history'
  | 'generated_plan_preview';

export interface DemoScenarioApplyResult {
  key: DemoScenarioKey;
  role: 'adult' | 'child';
  selectedChildId: string | null;
  previewPlan?: GeneratedPlan;
  previewRequest?: GeneratePlanMockInput;
  previewTargetLabel?: string;
}

const setScenarioState = (nextState: MockState, meId: string) => {
  state = {
    users: nextState.users.map(cloneUser),
    children: nextState.children.map(cloneChild),
    planRequests: nextState.planRequests.map(clonePlanRequest),
    plans: nextState.plans.map(clonePlan),
    quests: nextState.quests.map(cloneQuest),
    progress: nextState.progress.map(cloneProgress),
  };
  meIdState = meId;
  childCounter = state.children.length;
  planRequestCounter = state.planRequests.length;
  planCounter = state.plans.length;
};

const buildAdultProgress = (xp = 2450, level = 8, streak = 15): ProgressSummary => ({
  userId: 'adult-1',
  level,
  xp,
  streak,
  completedQuestsCount: 0,
  activeQuestsCount: 0,
  stats: {
    planning: 8,
    coaching: 5,
  },
});

const buildChildOneProfile = (xp: number, level: number, streak: number): ChildProfile => ({
  id: 'child-1',
  fullName: 'Marta Horizon',
  age: 10,
  interests: ['math', 'robotics'],
  notes: 'Works best with short gamified sessions.',
  createdByAdultId: 'adult-1',
  level,
  xp,
  streak,
});

const buildAdultUser = (activeChildId?: string): UserProfile => ({
  id: 'adult-1',
  fullName: 'Olena Mentor',
  email: 'olena.mentor@mock.infomatrix.app',
  role: 'adult',
  activeChildId,
  level: 8,
  xp: 2450,
  streak: 15,
  avatarType: 'mentor',
});

const buildChildUser = (xp: number, level: number, streak: number): UserProfile => ({
  id: 'child-1',
  fullName: 'Marta Horizon',
  email: 'marta.horizon@mock.infomatrix.app',
  role: 'child',
  createdByAdultId: 'adult-1',
  level,
  xp,
  streak,
  avatarType: 'adventurer',
});

export const applyDemoScenarioMock = async (
  scenario: DemoScenarioKey,
): Promise<DemoScenarioApplyResult> => {
  await wait(MOCK_DELAY_MS);

  if (scenario === 'adult_no_children') {
    const nextState: MockState = {
      users: [buildAdultUser()],
      children: [],
      planRequests: [],
      plans: [],
      quests: [],
      progress: [buildAdultProgress()],
    };

    setScenarioState(nextState, 'adult-1');

    return {
      key: scenario,
      role: 'adult',
      selectedChildId: null,
    };
  }

  if (scenario === 'adult_one_child') {
    const questA: Quest = {
      id: 'demo-a1-quest-1',
      assignedToUserId: 'child-1',
      title: 'Homework Sprint',
      description: 'Complete 3 homework tasks with focused timer blocks.',
      category: 'study',
      difficulty: 'medium',
      rewardXp: 70,
      estimatedMinutes: 30,
      status: 'active',
      createdAt: '2026-03-13T15:00:00.000Z',
    };

    const questB: Quest = {
      id: 'demo-a1-quest-2',
      assignedToUserId: 'child-1',
      title: 'Room Reset Challenge',
      description: 'Tidy room zones for 20 minutes and mark done.',
      category: 'household',
      difficulty: 'easy',
      rewardXp: 45,
      estimatedMinutes: 20,
      status: 'active',
      createdAt: '2026-03-13T15:30:00.000Z',
    };

    const questC: Quest = {
      id: 'demo-a1-quest-3',
      assignedToUserId: 'child-1',
      title: 'Stretch and Recover',
      description: 'Complete a short stretch and breathing routine.',
      category: 'health',
      difficulty: 'easy',
      rewardXp: 35,
      estimatedMinutes: 15,
      status: 'completed',
      createdAt: '2026-03-12T18:30:00.000Z',
    };

    const nextState: MockState = {
      users: [buildAdultUser('child-1'), buildChildUser(420, 3, 5)],
      children: [buildChildOneProfile(420, 3, 5)],
      planRequests: [
        {
          id: 'demo-a1-request-1',
          targetUserId: 'child-1',
          prompt: 'Create one focused after-school routine.',
          category: 'study',
          intensity: 'medium',
          status: 'approved',
        },
      ],
      plans: [
        {
          id: 'demo-a1-plan-1',
          title: 'Marta Focus Starter',
          summary: 'Two active quests to keep momentum this evening.',
          childMessage: 'Great job so far. Keep building your streak.',
          quests: [questA, questB],
          totalEstimatedMinutes: 50,
          status: 'approved',
        },
      ],
      quests: [questA, questB, questC],
      progress: [
        buildAdultProgress(),
        {
          userId: 'child-1',
          level: 3,
          xp: 420,
          streak: 5,
          completedQuestsCount: 1,
          activeQuestsCount: 2,
          stats: {
            study: 2,
            household: 1,
            health: 1,
          },
        },
      ],
    };

    setScenarioState(nextState, 'adult-1');

    return {
      key: scenario,
      role: 'adult',
      selectedChildId: 'child-1',
    };
  }

  if (scenario === 'child_active_quests') {
    const questA: Quest = {
      id: 'demo-ca-quest-1',
      assignedToUserId: 'child-1',
      title: 'Math Mission',
      description: 'Solve 8 math exercises and check mistakes.',
      category: 'study',
      difficulty: 'medium',
      rewardXp: 65,
      estimatedMinutes: 25,
      status: 'active',
      createdAt: '2026-03-13T09:10:00.000Z',
    };

    const questB: Quest = {
      id: 'demo-ca-quest-2',
      assignedToUserId: 'child-1',
      title: 'Focus Cleanup',
      description: 'Clean your desk and shelf area before study block.',
      category: 'household',
      difficulty: 'easy',
      rewardXp: 40,
      estimatedMinutes: 15,
      status: 'active',
      createdAt: '2026-03-13T10:00:00.000Z',
    };

    const questC: Quest = {
      id: 'demo-ca-quest-3',
      assignedToUserId: 'child-1',
      title: 'Hydration Check',
      description: 'Drink water and complete a short body reset.',
      category: 'health',
      difficulty: 'easy',
      rewardXp: 30,
      estimatedMinutes: 10,
      status: 'active',
      createdAt: '2026-03-13T11:00:00.000Z',
    };

    const nextState: MockState = {
      users: [buildAdultUser('child-1'), buildChildUser(330, 2, 3)],
      children: [buildChildOneProfile(330, 2, 3)],
      planRequests: [
        {
          id: 'demo-ca-request-1',
          targetUserId: 'child-1',
          prompt: 'Build active quests for today after school.',
          category: 'study',
          intensity: 'medium',
          status: 'approved',
        },
      ],
      plans: [
        {
          id: 'demo-ca-plan-1',
          title: 'Today Quest Pack',
          summary: 'Three active quests to keep progress rolling.',
          childMessage: 'One by one. You are on track today.',
          quests: [questA, questB, questC],
          totalEstimatedMinutes: 50,
          status: 'approved',
        },
      ],
      quests: [questA, questB, questC],
      progress: [
        buildAdultProgress(),
        {
          userId: 'child-1',
          level: 2,
          xp: 330,
          streak: 3,
          completedQuestsCount: 0,
          activeQuestsCount: 3,
          stats: {
            study: 1,
            household: 1,
            health: 1,
          },
        },
      ],
    };

    setScenarioState(nextState, 'child-1');

    return {
      key: scenario,
      role: 'child',
      selectedChildId: null,
    };
  }

  if (scenario === 'child_completed_history') {
    const questA: Quest = {
      id: 'demo-ch-quest-1',
      assignedToUserId: 'child-1',
      title: 'Reading Quest',
      description: 'Read one chapter and write two key takeaways.',
      category: 'study',
      difficulty: 'medium',
      rewardXp: 70,
      estimatedMinutes: 30,
      status: 'completed',
      createdAt: '2026-03-10T16:00:00.000Z',
    };

    const questB: Quest = {
      id: 'demo-ch-quest-2',
      assignedToUserId: 'child-1',
      title: 'Workout Mini Set',
      description: 'Complete 20 minutes of movement and stretching.',
      category: 'sport',
      difficulty: 'easy',
      rewardXp: 50,
      estimatedMinutes: 20,
      status: 'completed',
      createdAt: '2026-03-11T16:30:00.000Z',
    };

    const questC: Quest = {
      id: 'demo-ch-quest-3',
      assignedToUserId: 'child-1',
      title: 'Room Organization',
      description: 'Organize your desk and backpack for tomorrow.',
      category: 'household',
      difficulty: 'easy',
      rewardXp: 45,
      estimatedMinutes: 15,
      status: 'completed',
      createdAt: '2026-03-12T17:00:00.000Z',
    };

    const questD: Quest = {
      id: 'demo-ch-quest-4',
      assignedToUserId: 'child-1',
      title: 'Calm Evening Reset',
      description: 'Do a calm breathing and journaling routine.',
      category: 'health',
      difficulty: 'easy',
      rewardXp: 40,
      estimatedMinutes: 15,
      status: 'completed',
      createdAt: '2026-03-13T18:00:00.000Z',
    };

    const nextState: MockState = {
      users: [buildAdultUser('child-1'), buildChildUser(780, 3, 9)],
      children: [buildChildOneProfile(780, 3, 9)],
      planRequests: [
        {
          id: 'demo-ch-request-1',
          targetUserId: 'child-1',
          prompt: 'Plan a weekly completion streak.',
          category: 'routine',
          intensity: 'medium',
          status: 'approved',
        },
      ],
      plans: [
        {
          id: 'demo-ch-plan-1',
          title: 'Completed Week Plan',
          summary: 'All assigned quests were completed.',
          childMessage: 'You finished everything. Great consistency.',
          quests: [questA, questB, questC, questD],
          totalEstimatedMinutes: 80,
          status: 'approved',
        },
      ],
      quests: [questA, questB, questC, questD],
      progress: [
        buildAdultProgress(),
        {
          userId: 'child-1',
          level: 3,
          xp: 780,
          streak: 9,
          completedQuestsCount: 4,
          activeQuestsCount: 0,
          stats: {
            study: 3,
            sport: 2,
            household: 2,
            health: 2,
          },
        },
      ],
    };

    setScenarioState(nextState, 'child-1');

    return {
      key: scenario,
      role: 'child',
      selectedChildId: null,
    };
  }

  const previewQuestA: Quest = {
    id: 'demo-gp-quest-1',
    assignedToUserId: 'child-1',
    title: 'After-school Focus Block',
    description: 'Start with a 20-minute focused study sprint.',
    category: 'study',
    difficulty: 'medium',
    rewardXp: 75,
    estimatedMinutes: 20,
    status: 'draft',
    createdAt: '2026-03-13T12:00:00.000Z',
  };

  const previewQuestB: Quest = {
    id: 'demo-gp-quest-2',
    assignedToUserId: 'child-1',
    title: 'Room Quest',
    description: 'Turn room cleanup into a timed mini challenge.',
    category: 'household',
    difficulty: 'easy',
    rewardXp: 45,
    estimatedMinutes: 15,
    status: 'draft',
    createdAt: '2026-03-13T12:15:00.000Z',
  };

  const previewRequest: GeneratePlanMockInput = {
    targetUserId: 'child-1',
    prompt: 'Create an after-school plan with study and room cleanup quests.',
    category: 'routine',
    intensity: 'medium',
    photo: {
      uri: 'file:///demo/room-scene.jpg',
      width: 1080,
      height: 1440,
      fileName: 'room-scene.jpg',
      mimeType: 'image/jpeg',
      fileSize: 240000,
      previewUri: 'file:///demo/room-scene.jpg',
    },
  };

  const previewPlan: GeneratedPlan = {
    id: 'demo-gp-plan-1',
    title: 'Marta: AI Draft Preview',
    summary: 'Draft generated plan ready for adult review.',
    childMessage: 'You can do this. Let us start with one simple quest.',
    quests: [previewQuestA, previewQuestB],
    totalEstimatedMinutes: 35,
    status: 'draft',
  };

  const nextState: MockState = {
    users: [buildAdultUser('child-1'), buildChildUser(360, 3, 4)],
    children: [buildChildOneProfile(360, 3, 4)],
    planRequests: [
      {
        id: 'demo-gp-request-1',
        targetUserId: 'child-1',
        prompt: previewRequest.prompt,
        category: previewRequest.category,
        intensity: previewRequest.intensity,
        photo: previewRequest.photo,
        status: 'generated',
      },
    ],
    plans: [previewPlan],
    quests: [],
    progress: [
      buildAdultProgress(),
      {
        userId: 'child-1',
        level: 3,
        xp: 360,
        streak: 4,
        completedQuestsCount: 1,
        activeQuestsCount: 0,
        stats: {
          study: 2,
          household: 1,
        },
      },
    ],
  };

  setScenarioState(nextState, 'adult-1');

  return {
    key: scenario,
    role: 'adult',
    selectedChildId: 'child-1',
    previewPlan: clonePlan(previewPlan),
    previewRequest,
    previewTargetLabel: 'Marta Horizon',
  };
};
