import useAuthStore from '@/context/Auth-store';
import usePlansStore from '@/context/Plans-store';
import {
  completeQuestMock,
  getQuestsMock,
  toggleQuestStepMock,
  updateQuestRewardMock,
} from '@/src/features/mvp/services';
import {
  isOfflineTestingModeEnabled,
  persistOfflineStateIfEnabled,
  syncMockLayerContextFromAuth,
} from '@/src/integration/services/offline-mode';
import type { Quest, QuestRewardType, QuestStep } from '@/shared/models/mvp-contracts.model';
import { isQuestRewardType } from '@/shared/models/quest-reward.model';

const hasAuthenticatedSession = () => Boolean(useAuthStore.getState().session?.accessToken);

const isArchivedQuest = (quest: Quest) => quest.status === 'archived' || quest.status === 'completed';

const nowIso = () => new Date().toISOString();

export type UpdateQuestRewardInput = {
  rewardType: QuestRewardType;
  rewardTitle: string;
  rewardDescription?: string;
  rewardValue?: number | null;
  rewardCurrencyOrUnit?: string | null;
};

const buildDefaultSteps = (quest: Quest): QuestStep[] => [
  {
    id: `${quest.id}-step-1`,
    questId: quest.id,
    title: 'Start quest',
    description: 'Understand what should be done.',
    order: 1,
    status: 'pending',
  },
  {
    id: `${quest.id}-step-2`,
    questId: quest.id,
    title: 'Complete main action',
    description: quest.description,
    order: 2,
    status: 'pending',
  },
  {
    id: `${quest.id}-step-3`,
    questId: quest.id,
    title: 'Final check',
    description: 'Verify result and finish.',
    order: 3,
    status: 'pending',
  },
];

const normalizeQuestForLocal = (quest: Quest): Quest => {
  const steps: QuestStep[] = (quest.steps && quest.steps.length > 0 ? quest.steps : buildDefaultSteps(quest))
    .map((step, index) => ({
      ...step,
      id: step.id?.trim() || `${quest.id}-step-${index + 1}`,
      questId: quest.id,
      title: step.title?.trim() || `Step ${index + 1}`,
      order: Number.isFinite(step.order) ? step.order : index + 1,
      status: step.status === 'completed' ? ('completed' as const) : ('pending' as const),
    }))
    .sort((left, right) => left.order - right.order);

  const completedStepsCount = steps.filter((step) => step.status === 'completed').length;
  const stepsCount = steps.length;

  let status = quest.status;
  let completedAt = quest.completedAt;
  let archivedAt = quest.archivedAt;
  if (status === 'completed') {
    status = 'archived';
  }

  if (stepsCount > 0 && completedStepsCount === stepsCount && !isArchivedQuest({ ...quest, status })) {
    status = 'archived';
  }

  if (status === 'archived') {
    const doneAt = completedAt ?? archivedAt ?? nowIso();
    completedAt = doneAt;
    archivedAt = archivedAt ?? doneAt;
  }

  return {
    ...quest,
    status,
    steps,
    stepsCount,
    completedStepsCount,
    completedAt,
    archivedAt,
  };
};

const persistUpdatedQuestToPlansCache = async (quest: Quest) => {
  if (!hasAuthenticatedSession()) {
    return;
  }

  await usePlansStore.getState().upsertQuestInPlans(quest);
};

const sortQuests = (quests: Quest[]): Quest[] => {
  const rank: Record<string, number> = {
    active: 0,
    draft: 1,
    archived: 2,
    completed: 2,
  };

  return [...quests].sort((left, right) => {
    const leftRank = rank[left.status] ?? 10;
    const rightRank = rank[right.status] ?? 10;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    const leftTs = new Date(left.archivedAt ?? left.createdAt ?? 0).getTime();
    const rightTs = new Date(right.archivedAt ?? right.createdAt ?? 0).getTime();
    return rightTs - leftTs;
  });
};

const getQuestsFromPlansCache = (userId: string): Quest[] => {
  const quests = usePlansStore.getState().getApprovedQuestsByUser(userId).map(normalizeQuestForLocal);
  return sortQuests(quests);
};

const normalizeQuestRewardUpdateInput = (input: UpdateQuestRewardInput): UpdateQuestRewardInput => {
  if (!isQuestRewardType(input.rewardType)) {
    throw new Error('Reward type is invalid.');
  }

  const rewardTitle = input.rewardTitle.trim();
  if (!rewardTitle) {
    throw new Error('Reward title is required.');
  }

  const rewardDescription = input.rewardDescription?.trim();
  const rewardCurrencyOrUnit = input.rewardCurrencyOrUnit?.trim();

  return {
    rewardType: input.rewardType,
    rewardTitle,
    rewardDescription: rewardDescription || undefined,
    rewardValue:
      typeof input.rewardValue === 'number' && Number.isFinite(input.rewardValue)
        ? Math.max(1, Math.round(input.rewardValue))
        : null,
    rewardCurrencyOrUnit: rewardCurrencyOrUnit || null,
  };
};

export const questsService = {
  getQuests: async (userId: string): Promise<Quest[]> => {
    if (isOfflineTestingModeEnabled()) {
      syncMockLayerContextFromAuth();
      return getQuestsMock(userId);
    }

    return getQuestsFromPlansCache(userId);
  },

  completeQuest: async (questId: string): Promise<Quest> => {
    if (isOfflineTestingModeEnabled()) {
      syncMockLayerContextFromAuth();
      const completed = await completeQuestMock(questId);
      await persistOfflineStateIfEnabled();
      return completed;
    }

    const planQuest = usePlansStore
      .getState()
      .getPlans()
      .flatMap((plan) => plan.quests)
      .find((quest) => quest.id === questId);

    if (!planQuest) {
      throw new Error(`Quest '${questId}' was not found.`);
    }

    const normalizedQuest = normalizeQuestForLocal(planQuest);
    if (isArchivedQuest(normalizedQuest)) {
      return normalizedQuest;
    }

    const doneAt = nowIso();
    const completedQuest: Quest = {
      ...normalizedQuest,
      status: 'archived',
      completedAt: normalizedQuest.completedAt ?? doneAt,
      archivedAt: normalizedQuest.archivedAt ?? doneAt,
      steps: (normalizedQuest.steps ?? []).map((step) => ({
        ...step,
        status: 'completed',
        completedAt: step.completedAt ?? doneAt,
      })),
      completedStepsCount: normalizedQuest.stepsCount ?? normalizedQuest.steps?.length ?? 0,
    };

    await persistUpdatedQuestToPlansCache(completedQuest);
    return completedQuest;
  },

  toggleQuestStep: async (questId: string, stepId: string): Promise<Quest> => {
    if (isOfflineTestingModeEnabled()) {
      syncMockLayerContextFromAuth();
      const updated = await toggleQuestStepMock(questId, stepId);
      await persistOfflineStateIfEnabled();
      return updated;
    }

    const planQuest = usePlansStore
      .getState()
      .getPlans()
      .flatMap((plan) => plan.quests)
      .find((quest) => quest.id === questId);

    if (!planQuest) {
      throw new Error(`Quest '${questId}' was not found.`);
    }

    const normalizedQuest = normalizeQuestForLocal(planQuest);
    if (isArchivedQuest(normalizedQuest)) {
      return normalizedQuest;
    }

    const steps = [...(normalizedQuest.steps ?? [])];
    const stepIndex = steps.findIndex((step) => step.id === stepId);
    if (stepIndex < 0) {
      throw new Error(`Step '${stepId}' was not found for quest '${questId}'.`);
    }

    const currentStep = steps[stepIndex];
    const nextCompleted = currentStep.status !== 'completed';
    steps[stepIndex] = {
      ...currentStep,
      status: nextCompleted ? 'completed' : 'pending',
      completedAt: nextCompleted ? nowIso() : undefined,
    };

    const completedStepsCount = steps.filter((step) => step.status === 'completed').length;
    const stepsCount = steps.length;
    const isDone = stepsCount > 0 && completedStepsCount === stepsCount;
    const doneAt = isDone ? nowIso() : undefined;

    const updatedQuest: Quest = {
      ...normalizedQuest,
      status: isDone ? 'archived' : 'active',
      steps,
      stepsCount,
      completedStepsCount,
      completedAt: isDone ? (normalizedQuest.completedAt ?? doneAt) : undefined,
      archivedAt: isDone ? (normalizedQuest.archivedAt ?? doneAt) : undefined,
    };

    await persistUpdatedQuestToPlansCache(updatedQuest);
    return updatedQuest;
  },

  updateQuestReward: async (questId: string, input: UpdateQuestRewardInput): Promise<Quest> => {
    const normalizedInput = normalizeQuestRewardUpdateInput(input);

    if (isOfflineTestingModeEnabled()) {
      syncMockLayerContextFromAuth();
      const updated = await updateQuestRewardMock(questId, normalizedInput);
      await persistOfflineStateIfEnabled();
      return updated;
    }

    const planQuest = usePlansStore
      .getState()
      .getPlans()
      .flatMap((plan) => plan.quests)
      .find((quest) => quest.id === questId);

    if (!planQuest) {
      throw new Error(`Quest '${questId}' was not found.`);
    }

    const normalizedQuest = normalizeQuestForLocal(planQuest);
    if (isArchivedQuest(normalizedQuest)) {
      throw new Error('Reward is locked for completed quests.');
    }

    const updatedQuest: Quest = normalizeQuestForLocal({
      ...normalizedQuest,
      ...normalizedInput,
      rewardUpdatedAt: nowIso(),
    });

    await persistUpdatedQuestToPlansCache(updatedQuest);
    return updatedQuest;
  },
};
