import type {
  CapturedPhoto,
  ChildProfile,
  GeneratedPlan,
  LeaderboardItem,
  PlanRequest,
  ProgressSummary,
  Quest,
  QuestStatus,
  QuestStep,
  UserProfile,
} from '@/shared/models/mvp-contracts.model';
import {
  mockOfflineSeedAiResponses,
  mockOfflineSeedChildren,
  mockOfflineSeedLeaderboard,
  mockOfflineSeedPlanRequests,
  mockOfflineSeedPlans,
  mockOfflineSeedProgress,
  mockOfflineSeedQuests,
  mockOfflineSeedUsers,
  mockOfflineSeedVisionResponse,
} from '@/src/features/mvp/mocks/mockOfflineSeed';

const MOCK_DELAY_MS = 0;
const XP_PER_LEVEL = 300;

type MockState = {
  users: UserProfile[];
  children: ChildProfile[];
  planRequests: PlanRequest[];
  plans: GeneratedPlan[];
  quests: Quest[];
  progress: ProgressSummary[];
  leaderboard: LeaderboardItem[];
  aiResponses: string[];
  visionResponse: string;
};

export interface MockLayerSnapshot {
  version: 1;
  state: MockState;
  meIdState: string;
  childCounter: number;
  planRequestCounter: number;
  planCounter: number;
  aiResponseCursor: number;
}

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
  category?: string;
  intensity?: string;
  photo?: CapturedPhoto;
}

export interface GetPlansMockInput {
  targetUserId?: string;
  limit?: number;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const nowIso = () => new Date().toISOString();

const isArchivedQuestStatus = (status: QuestStatus) => status === 'archived' || status === 'completed';
const isApprovedPlanStatus = (status: string) => status.trim().toLowerCase() === 'approved';

const cloneQuestStep = (step: QuestStep): QuestStep => ({ ...step });

const buildDefaultStepsForQuest = (quest: Pick<Quest, 'id' | 'title' | 'description'>): QuestStep[] => [
  {
    id: `${quest.id}-step-1`,
    questId: quest.id,
    title: `Start: ${quest.title}`,
    description: 'Understand what needs to be done.',
    order: 1,
    status: 'pending',
  },
  {
    id: `${quest.id}-step-2`,
    questId: quest.id,
    title: 'Complete main task',
    description: quest.description,
    order: 2,
    status: 'pending',
  },
  {
    id: `${quest.id}-step-3`,
    questId: quest.id,
    title: 'Final check',
    description: 'Check quality and mark quest as done.',
    order: 3,
    status: 'pending',
  },
];

const normalizeQuest = (quest: Quest): Quest => {
  const createdAt = quest.createdAt ?? nowIso();
  const incomingStatus: QuestStatus = quest.status ?? 'draft';
  const statusFromLegacy: QuestStatus = incomingStatus === 'completed' ? 'archived' : incomingStatus;
  const sourceSteps =
    quest.steps && quest.steps.length > 0 ? [...quest.steps] : buildDefaultStepsForQuest(quest);
  const forceCompleted = isArchivedQuestStatus(statusFromLegacy);

  const normalizedSteps = sourceSteps
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    .map((step, index) => {
      const isCompleted = forceCompleted || step.status === 'completed';

      return {
        id: step.id?.trim() || `${quest.id}-step-${index + 1}`,
        questId: quest.id,
        title: step.title?.trim() || `Step ${index + 1}`,
        description: step.description?.trim() || undefined,
        order: Number.isFinite(step.order) ? step.order : index + 1,
        status: isCompleted ? 'completed' : 'pending',
        completedAt: isCompleted ? step.completedAt ?? quest.completedAt ?? quest.archivedAt ?? createdAt : undefined,
      } satisfies QuestStep;
    });

  const stepsCount = normalizedSteps.length;
  const completedStepsCount = normalizedSteps.filter((step) => step.status === 'completed').length;

  let normalizedStatus: QuestStatus = statusFromLegacy;
  let completedAt = quest.completedAt;
  let archivedAt = quest.archivedAt;

  if (normalizedStatus === 'active' && stepsCount > 0 && completedStepsCount === stepsCount) {
    normalizedStatus = 'archived';
  }

  if (normalizedStatus === 'archived') {
    const resolvedDoneAt = completedAt ?? archivedAt ?? createdAt;
    completedAt = resolvedDoneAt;
    archivedAt = archivedAt ?? resolvedDoneAt;
  }

  return {
    ...quest,
    createdAt,
    status: normalizedStatus,
    steps: normalizedSteps,
    stepsCount,
    completedStepsCount,
    completedAt,
    archivedAt,
  };
};

const cloneQuest = (quest: Quest): Quest => ({
  ...quest,
  steps: quest.steps?.map(cloneQuestStep),
});

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

const normalizePlan = (plan: GeneratedPlan): GeneratedPlan => ({
  ...plan,
  quests: plan.quests.map(normalizeQuest),
});

const cloneChild = (child: ChildProfile): ChildProfile => ({
  ...child,
  interests: child.interests ? [...child.interests] : undefined,
});

const cloneUser = (user: UserProfile): UserProfile => ({ ...user });
const cloneLeaderboardItem = (item: LeaderboardItem): LeaderboardItem => ({ ...item });

const getDefaultMeId = (users: UserProfile[]) =>
  users.find((user) => user.role === 'adult')?.id ?? users[0]?.id ?? 'adult-1';

const normalizeLeaderboard = (leaderboard: LeaderboardItem[]): LeaderboardItem[] =>
  [...leaderboard]
    .sort((left, right) => {
      if (right.xp === left.xp) {
        return right.fairScore - left.fairScore;
      }

      return right.xp - left.xp;
    })
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

const createInitialState = (): MockState => ({
  users: mockOfflineSeedUsers.map(cloneUser),
  children: mockOfflineSeedChildren.map(cloneChild),
  planRequests: mockOfflineSeedPlanRequests.map(clonePlanRequest),
  plans: mockOfflineSeedPlans.map(normalizePlan),
  quests: mockOfflineSeedQuests.map(normalizeQuest),
  progress: mockOfflineSeedProgress.map(cloneProgress),
  leaderboard: normalizeLeaderboard(mockOfflineSeedLeaderboard.map(cloneLeaderboardItem)),
  aiResponses: [...mockOfflineSeedAiResponses],
  visionResponse: mockOfflineSeedVisionResponse,
});

let state: MockState = createInitialState();
let meIdState = getDefaultMeId(state.users);
let aiResponseCursor = 0;

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
    if (!isArchivedQuestStatus(quest.status)) {
      return;
    }

    stats.quests = (stats.quests ?? 0) + 1;
  });

  return stats;
};

const summarizeQuestsForUser = (userId: string) => {
  const userQuests = state.quests.filter((quest) => quest.assignedToUserId === userId);

  return {
    quests: userQuests,
    activeCount: userQuests.filter((quest) => quest.status === 'active').length,
    completedCount: userQuests.filter((quest) => isArchivedQuestStatus(quest.status)).length,
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
    archived: 2,
    completed: 2,
  };

  return [...quests].sort((left, right) => {
    const leftRank = statusRank[left.status] ?? 10;
    const rightRank = statusRank[right.status] ?? 10;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    const rightCreated = right.archivedAt
      ? new Date(right.archivedAt).getTime()
      : right.createdAt
        ? new Date(right.createdAt).getTime()
        : 0;
    const leftCreated = left.archivedAt
      ? new Date(left.archivedAt).getTime()
      : left.createdAt
        ? new Date(left.createdAt).getTime()
        : 0;

    return rightCreated - leftCreated;
  });
};

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
  const questId = `${planId}-quest-1`;
  const normalizedPrompt = input.prompt.trim();

  return [
    normalizeQuest({
      id: questId,
      assignedToUserId: input.targetUserId,
      title: 'Main Mission',
      description: normalizedPrompt,
      difficulty: 'medium',
      rewardXp: 120,
      estimatedMinutes: 40,
      status: 'draft',
      createdAt: new Date().toISOString(),
      steps: [
        {
          id: `${questId}-step-1`,
          questId,
          title: 'Preparation',
          description: 'Review the objective and prepare resources.',
          order: 1,
          status: 'pending',
        },
        {
          id: `${questId}-step-2`,
          questId,
          title: 'Core action',
          description: normalizedPrompt,
          order: 2,
          status: 'pending',
        },
        {
          id: `${questId}-step-3`,
          questId,
          title: 'Validation',
          description: 'Check the result and mark the mission complete.',
          order: 3,
          status: 'pending',
        },
      ],
    }),
  ];
};

const getNextAiResponse = () => {
  const fallback = 'AI demo: Plan generated from local offline seed.';
  const responses = state.aiResponses.length > 0 ? state.aiResponses : [fallback];
  const response = responses[aiResponseCursor % responses.length] ?? fallback;
  aiResponseCursor += 1;
  return response;
};

export const resetMockLayerState = () => {
  state = createInitialState();
  meIdState = getDefaultMeId(state.users);
  childCounter = state.children.length;
  planRequestCounter = state.planRequests.length;
  planCounter = state.plans.length;
  aiResponseCursor = 0;
};

export const setMockMeId = (userId: string) => {
  const exists = state.users.some((user) => user.id === userId);
  if (!exists) {
    throw new Error(`User with id '${userId}' does not exist in mock state.`);
  }

  meIdState = userId;
};

export const exportMockLayerSnapshot = (): MockLayerSnapshot => ({
  version: 1,
  state: {
    users: state.users.map(cloneUser),
    children: state.children.map(cloneChild),
    planRequests: state.planRequests.map(clonePlanRequest),
    plans: state.plans.map(normalizePlan),
    quests: state.quests.map(normalizeQuest),
    progress: state.progress.map(cloneProgress),
    leaderboard: state.leaderboard.map(cloneLeaderboardItem),
    aiResponses: [...state.aiResponses],
    visionResponse: state.visionResponse,
  },
  meIdState,
  childCounter,
  planRequestCounter,
  planCounter,
  aiResponseCursor,
});

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const importMockLayerSnapshot = (snapshot: unknown): boolean => {
  if (!isObject(snapshot)) {
    return false;
  }

  const stateCandidate = snapshot.state;
  if (!isObject(stateCandidate)) {
    return false;
  }

  const users = Array.isArray(stateCandidate.users) ? stateCandidate.users : null;
  const children = Array.isArray(stateCandidate.children) ? stateCandidate.children : null;
  const planRequests = Array.isArray(stateCandidate.planRequests) ? stateCandidate.planRequests : null;
  const plans = Array.isArray(stateCandidate.plans) ? stateCandidate.plans : null;
  const quests = Array.isArray(stateCandidate.quests) ? stateCandidate.quests : null;
  const progress = Array.isArray(stateCandidate.progress) ? stateCandidate.progress : null;
  const leaderboard = Array.isArray(stateCandidate.leaderboard)
    ? stateCandidate.leaderboard
    : mockOfflineSeedLeaderboard;
  const aiResponses = Array.isArray(stateCandidate.aiResponses)
    ? stateCandidate.aiResponses
    : mockOfflineSeedAiResponses;
  const visionResponse =
    typeof stateCandidate.visionResponse === 'string' && stateCandidate.visionResponse.trim().length > 0
      ? stateCandidate.visionResponse
      : mockOfflineSeedVisionResponse;

  if (!users || !children || !planRequests || !plans || !quests || !progress) {
    return false;
  }

  state = {
    users: users.map((user) => cloneUser(user as UserProfile)),
    children: children.map((child) => cloneChild(child as ChildProfile)),
    planRequests: planRequests.map((request) => clonePlanRequest(request as PlanRequest)),
    plans: plans.map((plan) => normalizePlan(plan as GeneratedPlan)),
    quests: quests.map((quest) => normalizeQuest(quest as Quest)),
    progress: progress.map((summary) => cloneProgress(summary as ProgressSummary)),
    leaderboard: normalizeLeaderboard(leaderboard.map((item) => cloneLeaderboardItem(item as LeaderboardItem))),
    aiResponses: aiResponses
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim()),
    visionResponse,
  };

  const meIdCandidate = typeof snapshot.meIdState === 'string' ? snapshot.meIdState.trim() : '';
  meIdState = meIdCandidate && state.users.some((user) => user.id === meIdCandidate)
    ? meIdCandidate
    : getDefaultMeId(state.users);

  childCounter =
    typeof snapshot.childCounter === 'number' && Number.isFinite(snapshot.childCounter)
      ? Math.max(0, Math.floor(snapshot.childCounter))
      : state.children.length;
  planRequestCounter =
    typeof snapshot.planRequestCounter === 'number' && Number.isFinite(snapshot.planRequestCounter)
      ? Math.max(0, Math.floor(snapshot.planRequestCounter))
      : state.planRequests.length;
  planCounter =
    typeof snapshot.planCounter === 'number' && Number.isFinite(snapshot.planCounter)
      ? Math.max(0, Math.floor(snapshot.planCounter))
      : state.plans.length;
  aiResponseCursor =
    typeof snapshot.aiResponseCursor === 'number' && Number.isFinite(snapshot.aiResponseCursor)
      ? Math.max(0, Math.floor(snapshot.aiResponseCursor))
      : 0;

  return true;
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

  const normalizedTargetUserId = input.targetUserId.trim();
  if (!normalizedTargetUserId) {
    throw new Error('Target user id is required.');
  }

  const targetUserFromState = state.users.find((user) => user.id === normalizedTargetUserId);
  const targetUser = targetUserFromState ?? (() => {
    const me = getCurrentMeFromState();
    const ownerAdultId = me.role === 'adult' ? me.id : me.createdByAdultId ?? 'adult-1';
    const syntheticName = `Target ${state.users.length + 1}`;

    const syntheticUser: UserProfile = {
      id: normalizedTargetUserId,
      fullName: syntheticName,
      email: `${normalizedTargetUserId}@mock.infomatrix.app`,
      role: 'child',
      createdByAdultId: ownerAdultId,
      level: 1,
      xp: 0,
      streak: 0,
      avatarType: 'adventurer',
    };

    const syntheticChild: ChildProfile = {
      id: normalizedTargetUserId,
      fullName: syntheticName,
      age: 10,
      createdByAdultId: ownerAdultId,
      level: 1,
      xp: 0,
      streak: 0,
    };

    state.users = [syntheticUser, ...state.users];
    if (!state.children.some((child) => child.id === normalizedTargetUserId)) {
      state.children = [syntheticChild, ...state.children];
    }
    ensureProgressState(normalizedTargetUserId);

    return syntheticUser;
  })();

  const normalizedPrompt = input.prompt.trim();
  if (!normalizedPrompt) {
    throw new Error('Plan prompt is required.');
  }

  const normalizedPhoto = normalizeCapturedPhoto(input.photo);
  const normalizedIntensity = input.intensity?.trim();

  planRequestCounter += 1;
  const request: PlanRequest = {
    id: `plan-request-${Date.now()}-${planRequestCounter}`,
    targetUserId: normalizedTargetUserId,
    prompt: normalizedPrompt,
    category: input.category?.trim() || undefined,
    ...(normalizedIntensity ? { intensity: normalizedIntensity } : {}),
    photo: normalizedPhoto,
    status: 'generated',
  };

  state.planRequests = [request, ...state.planRequests];

  planCounter += 1;
  const planId = `plan-${Date.now()}-${planCounter}`;
  const quests = buildPlanQuests(
    {
      ...input,
      targetUserId: normalizedTargetUserId,
      prompt: normalizedPrompt,
    },
    planId,
  );

  const generatedPlan: GeneratedPlan = {
    id: planId,
    title: `${targetUser.fullName}: AI Plan`,
    summary: (() => {
      const aiSummary = getNextAiResponse();
      if (normalizedPhoto) {
        return `${aiSummary} ${state.visionResponse}`;
      }

      return aiSummary;
    })(),
    childMessage: `Offline AI demo ready, ${targetUser.fullName}. Start with one quest and keep going.`,
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

  const activatedQuests = currentPlan.quests.map((quest) => {
    const normalized = normalizeQuest(quest);

    if (normalized.status === 'draft') {
      return normalizeQuest({ ...normalized, status: 'active' });
    }

    if (normalized.status === 'completed') {
      return normalizeQuest({ ...normalized, status: 'archived' });
    }

    return normalized;
  });

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
      state.quests[existingQuestIndex] = normalizeQuest({ ...state.quests[existingQuestIndex], ...quest });
      return;
    }

    state.quests = [cloneQuest(normalizeQuest(quest)), ...state.quests];
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

  return clonePlan(normalizePlan(approvedPlan));
};

export const syncApprovedPlanQuestsMock = (plans: GeneratedPlan[]) => {
  if (!Array.isArray(plans) || plans.length === 0) {
    return;
  }

  const approvedPlans = plans
    .filter((plan) => isApprovedPlanStatus(plan.status))
    .map((plan) => {
      const activatedQuests = plan.quests.map((quest) => {
        const normalized = normalizeQuest(quest);
        if (normalized.status === 'draft') {
          return normalizeQuest({ ...normalized, status: 'active' });
        }

        if (normalized.status === 'completed') {
          return normalizeQuest({ ...normalized, status: 'archived' });
        }

        return normalized;
      });

      return normalizePlan({
        ...plan,
        status: 'approved',
        quests: activatedQuests,
      });
    });

  if (approvedPlans.length === 0) {
    return;
  }

  const planById = new Map<string, GeneratedPlan>();
  state.plans.forEach((plan) => {
    planById.set(plan.id, plan);
  });
  approvedPlans.forEach((plan) => {
    planById.set(plan.id, plan);
  });
  state.plans = Array.from(planById.values()).map(normalizePlan);

  const impactedUserIds = new Set<string>();
  approvedPlans.forEach((plan) => {
    plan.quests.forEach((quest) => {
      impactedUserIds.add(quest.assignedToUserId);
      const existingQuestIndex = state.quests.findIndex((item) => item.id === quest.id);
      if (existingQuestIndex >= 0) {
        state.quests[existingQuestIndex] = normalizeQuest({
          ...state.quests[existingQuestIndex],
          ...quest,
        });
        return;
      }

      state.quests = [cloneQuest(normalizeQuest(quest)), ...state.quests];
    });
  });

  impactedUserIds.forEach((userId) => {
    refreshProgressCounters(userId);
  });
};

export const getQuestsMock = async (userId: string): Promise<Quest[]> => {
  await wait(MOCK_DELAY_MS);

  const userQuests = state.quests
    .filter((quest) => quest.assignedToUserId === userId)
    .map(normalizeQuest);

  return sortQuests(userQuests).map(cloneQuest);
};

const syncQuestToPlans = (updatedQuest: Quest) => {
  state.plans = state.plans.map((plan) => ({
    ...plan,
    quests: plan.quests.map((quest) =>
      quest.id === updatedQuest.id ? normalizeQuest({ ...quest, ...updatedQuest }) : normalizeQuest(quest),
    ),
  }));
};

const applyQuestCompletionReward = (quest: Quest) => {
  const progress = ensureProgressState(quest.assignedToUserId);
  progress.xp += quest.rewardXp;
  progress.level = recalcLevelFromXp(progress.xp);
  progress.streak += 1;
  progress.stats = {
    ...progress.stats,
    quests: (progress.stats.quests ?? 0) + 1,
  };

  refreshProgressCounters(quest.assignedToUserId);
  syncUserFromProgress(progress);

  const user = state.users.find((item) => item.id === quest.assignedToUserId);
  if (user) {
    const existingEntry = state.leaderboard.find((item) => item.userId === user.id);
    const fairScore = Math.min(100, 70 + progress.level * 2 + Math.min(progress.streak, 10));

    if (existingEntry) {
      existingEntry.name = user.fullName;
      existingEntry.xp = progress.xp;
      existingEntry.fairScore = fairScore;
    } else {
      state.leaderboard = [
        ...state.leaderboard,
        {
          userId: user.id,
          name: user.fullName,
          rank: state.leaderboard.length + 1,
          xp: progress.xp,
          fairScore,
        },
      ];
    }

    state.leaderboard = normalizeLeaderboard(state.leaderboard);
  }
};

const archiveQuestWithCompletion = (quest: Quest): Quest => {
  const doneAt = nowIso();
  const completedSteps: QuestStep[] = (quest.steps ?? []).map((step) => ({
    ...step,
    status: 'completed',
    completedAt: step.completedAt ?? doneAt,
  }));

  return normalizeQuest({
    ...quest,
    status: 'archived',
    completedAt: quest.completedAt ?? doneAt,
    archivedAt: quest.archivedAt ?? doneAt,
    steps: completedSteps,
  });
};

const persistQuest = (questIndex: number, updatedQuest: Quest) => {
  state.quests = [
    ...state.quests.slice(0, questIndex),
    updatedQuest,
    ...state.quests.slice(questIndex + 1),
  ];

  syncQuestToPlans(updatedQuest);
};

export const toggleQuestStepMock = async (questId: string, stepId: string): Promise<Quest> => {
  await wait(MOCK_DELAY_MS);

  const questIndex = state.quests.findIndex((quest) => quest.id === questId);
  if (questIndex < 0) {
    throw new Error(`Quest '${questId}' was not found.`);
  }

  const currentQuest = normalizeQuest(state.quests[questIndex]);
  if (isArchivedQuestStatus(currentQuest.status)) {
    return cloneQuest(currentQuest);
  }

  const steps = currentQuest.steps ?? [];
  const stepIndex = steps.findIndex((step) => step.id === stepId);
  if (stepIndex < 0) {
    throw new Error(`Step '${stepId}' was not found for quest '${questId}'.`);
  }

  const step = steps[stepIndex];
  const nextStatus = step.status === 'completed' ? 'pending' : 'completed';
  const updatedStep: QuestStep = {
    ...step,
    status: nextStatus,
    completedAt: nextStatus === 'completed' ? nowIso() : undefined,
  };

  const updatedSteps = [
    ...steps.slice(0, stepIndex),
    updatedStep,
    ...steps.slice(stepIndex + 1),
  ];

  let updatedQuest = normalizeQuest({
    ...currentQuest,
    status: 'active',
    steps: updatedSteps,
  });

  if (updatedQuest.stepsCount && updatedQuest.completedStepsCount === updatedQuest.stepsCount) {
    updatedQuest = archiveQuestWithCompletion(updatedQuest);
    applyQuestCompletionReward(updatedQuest);
  }

  persistQuest(questIndex, updatedQuest);
  refreshProgressCounters(updatedQuest.assignedToUserId);

  return cloneQuest(updatedQuest);
};

export const completeQuestMock = async (id: string): Promise<Quest> => {
  await wait(MOCK_DELAY_MS);

  const questIndex = state.quests.findIndex((quest) => quest.id === id);
  if (questIndex < 0) {
    throw new Error(`Quest '${id}' was not found.`);
  }

  const currentQuest = normalizeQuest(state.quests[questIndex]);
  if (isArchivedQuestStatus(currentQuest.status)) {
    return cloneQuest(currentQuest);
  }

  const completedQuest = archiveQuestWithCompletion(currentQuest);
  persistQuest(questIndex, completedQuest);
  applyQuestCompletionReward(completedQuest);
  refreshProgressCounters(completedQuest.assignedToUserId);

  return cloneQuest(completedQuest);
};

export const getProgressMock = async (userId: string): Promise<ProgressSummary> => {
  await wait(MOCK_DELAY_MS);

  const progress = refreshProgressCounters(userId);

  return cloneProgress(progress);
};

export const getLeaderboardMock = async (): Promise<LeaderboardItem[]> => {
  await wait(MOCK_DELAY_MS);

  return normalizeLeaderboard(state.leaderboard).map(cloneLeaderboardItem);
};

export const getAgentResponseMock = async (prompt: string): Promise<string> => {
  await wait(MOCK_DELAY_MS);

  const normalizedPrompt = prompt.trim();
  const response = getNextAiResponse();

  if (!normalizedPrompt) {
    return response;
  }

  return `${response} Prompt: "${normalizedPrompt.slice(0, 96)}"`;
};

export const getVisionVerificationMock = async (): Promise<string> => {
  await wait(MOCK_DELAY_MS);
  return state.visionResponse;
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
    plans: nextState.plans.map(normalizePlan),
    quests: nextState.quests.map(normalizeQuest),
    progress: nextState.progress.map(cloneProgress),
    leaderboard: normalizeLeaderboard(nextState.leaderboard.map(cloneLeaderboardItem)),
    aiResponses: [...nextState.aiResponses],
    visionResponse: nextState.visionResponse,
  };
  meIdState = meId;
  childCounter = state.children.length;
  planRequestCounter = state.planRequests.length;
  planCounter = state.plans.length;
  aiResponseCursor = 0;
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

const buildScenarioExtras = () => ({
  leaderboard: normalizeLeaderboard(mockOfflineSeedLeaderboard.map(cloneLeaderboardItem)),
  aiResponses: [...mockOfflineSeedAiResponses],
  visionResponse: mockOfflineSeedVisionResponse,
});

export const applyDemoScenarioMock = async (
  scenario: DemoScenarioKey,
): Promise<DemoScenarioApplyResult> => {
  await wait(MOCK_DELAY_MS);

  if (scenario === 'adult_no_children') {
    const nextState: MockState = {
      ...buildScenarioExtras(),
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
      ...buildScenarioExtras(),
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
      ...buildScenarioExtras(),
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
      ...buildScenarioExtras(),
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
    ...buildScenarioExtras(),
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
