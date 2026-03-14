import useAuthStore from '@/context/Auth-store';
import usePlansStore from '@/context/Plans-store';
import { generateSummaryVisionByPhotos } from '@/src/features/chat/api/quest';
import {
  completeQuestMock,
  getQuestsMock,
  toggleQuestStepMock,
  updateQuestAfterPhotoMock,
  updateQuestBeforePhotoMock,
  updateQuestRewardMock,
} from '@/src/features/mvp/services';
import {
  isOfflineTestingModeEnabled,
  persistOfflineStateIfEnabled,
  syncMockLayerContextFromAuth,
} from '@/src/integration/services/offline-mode';
import type {
  CapturedPhoto,
  Quest,
  QuestPhoto,
  QuestRewardType,
  QuestStep,
} from '@/shared/models/mvp-contracts.model';
import { isQuestRewardType } from '@/shared/models/quest-reward.model';

const hasAuthenticatedSession = () => Boolean(useAuthStore.getState().session?.accessToken);

const isArchivedQuest = (quest: Quest) => quest.status === 'archived' || quest.status === 'completed';

const nowIso = () => new Date().toISOString();

const hasQuestPhoto = (photo?: QuestPhoto | null) => Boolean(photo?.uri?.trim());

const toQuestPhoto = (photo: CapturedPhoto | QuestPhoto): QuestPhoto => {
  const uri = photo.uri?.trim();
  if (!uri) {
    throw new Error('Photo URI is required.');
  }

  return {
    uri,
    fileName: photo.fileName?.trim() || null,
    mimeType: photo.mimeType?.trim() || null,
    createdAt: 'createdAt' in photo && typeof photo.createdAt === 'string' ? photo.createdAt : nowIso(),
    syncStatus: 'not_sent',
  };
};

const toCapturedPhoto = (photo: QuestPhoto): CapturedPhoto => ({
  uri: photo.uri,
  fileName: photo.fileName ?? undefined,
  mimeType: photo.mimeType ?? undefined,
});

const normalizeQuestPhoto = (photo?: QuestPhoto | null): QuestPhoto | null => {
  if (!photo?.uri?.trim()) {
    return null;
  }

  return {
    uri: photo.uri.trim(),
    fileName: photo.fileName?.trim() || null,
    mimeType: photo.mimeType?.trim() || null,
    createdAt: photo.createdAt?.trim() || nowIso(),
    syncStatus:
      photo.syncStatus === 'pending' || photo.syncStatus === 'sent' || photo.syncStatus === 'not_sent'
        ? photo.syncStatus
        : 'not_sent',
  };
};

const getQuestProgress = (quest: Quest) => {
  const stepsCount = quest.stepsCount ?? quest.steps?.length ?? 0;
  const completedStepsCount =
    quest.completedStepsCount ?? quest.steps?.filter((step) => step.status === 'completed').length ?? 0;

  return { stepsCount, completedStepsCount };
};

const assertQuestCanBeCompleted = (quest: Quest) => {
  const { stepsCount, completedStepsCount } = getQuestProgress(quest);
  if (stepsCount > 0 && completedStepsCount !== stepsCount) {
    throw new Error('Complete all steps before finishing this quest.');
  }

  if (quest.reportPhotoRequired && !hasQuestPhoto(quest.afterPhoto)) {
    throw new Error('Quest report photo is required before completion.');
  }
};

const assertBeforePhotoIsEditable = (quest: Quest) => {
  if (isArchivedQuest(quest)) {
    throw new Error('Before photo is locked for completed quests.');
  }

  if ((quest.completedStepsCount ?? 0) > 0 || hasQuestPhoto(quest.afterPhoto)) {
    throw new Error('Before photo cannot be changed after quest progress starts.');
  }
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

  if (status === 'archived') {
    const doneAt = completedAt ?? archivedAt ?? nowIso();
    completedAt = doneAt;
    archivedAt = archivedAt ?? doneAt;
  }

  const beforePhoto = normalizeQuestPhoto(quest.beforePhoto);
  const afterPhoto = normalizeQuestPhoto(quest.afterPhoto);

  return {
    ...quest,
    status,
    beforePhoto,
    afterPhoto,
    reportPhotoRequired: Boolean(beforePhoto?.uri),
    photosSyncStatus:
      quest.photosSyncStatus === 'pending_sync' || quest.photosSyncStatus === 'synced'
        ? quest.photosSyncStatus
        : 'local_only',
    visionSummary: typeof quest.visionSummary === 'string' && quest.visionSummary.trim().length > 0
      ? quest.visionSummary.trim()
      : null,
    visionSummaryCheckedAt:
      typeof quest.visionSummaryCheckedAt === 'string' && quest.visionSummaryCheckedAt.trim().length > 0
        ? quest.visionSummaryCheckedAt
        : null,
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

const getQuestFromPlans = (questId: string): Quest => {
  const planQuest = usePlansStore
    .getState()
    .getPlans()
    .flatMap((plan) => plan.quests)
    .find((quest) => quest.id === questId);

  if (!planQuest) {
    throw new Error(`Quest '${questId}' was not found.`);
  }

  return normalizeQuestForLocal(planQuest);
};

type NormalizedQuestRewardUpdateInput = {
  rewardType: QuestRewardType;
  rewardTitle: string;
  rewardDescription?: string;
  rewardValue?: number | null;
  rewardCurrencyOrUnit?: string | null;
};

const normalizeQuestRewardUpdateInput = (input: UpdateQuestRewardInput): NormalizedQuestRewardUpdateInput => {
  if (!isQuestRewardType(input.rewardType)) {
    throw new Error('Reward type is invalid.');
  }

  const rewardTitle = input.rewardTitle?.trim() ?? '';
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

export type UpdateQuestRewardInput = {
  rewardType?: QuestRewardType;
  rewardTitle?: string;
  rewardDescription?: string;
  rewardValue?: number | null;
  rewardCurrencyOrUnit?: string | null;
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

    const normalizedQuest = getQuestFromPlans(questId);
    if (isArchivedQuest(normalizedQuest)) {
      return normalizedQuest;
    }

    assertQuestCanBeCompleted(normalizedQuest);

    const doneAt = nowIso();
    let visionSummary = normalizedQuest.visionSummary ?? null;
    let visionSummaryCheckedAt = normalizedQuest.visionSummaryCheckedAt ?? null;

    const accessToken = useAuthStore.getState().session?.accessToken ?? null;
    const beforePhoto = normalizedQuest.beforePhoto;
    const afterPhoto = normalizedQuest.afterPhoto;
    if (accessToken && beforePhoto && afterPhoto && hasQuestPhoto(beforePhoto) && hasQuestPhoto(afterPhoto)) {
      try {
        visionSummary = await generateSummaryVisionByPhotos(
          toCapturedPhoto(beforePhoto),
          toCapturedPhoto(afterPhoto),
          accessToken,
        );
        visionSummaryCheckedAt = doneAt;
      } catch {}
    }

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
      photosSyncStatus: 'local_only',
      visionSummary,
      visionSummaryCheckedAt,
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

    const normalizedQuest = getQuestFromPlans(questId);
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
    const updatedQuest: Quest = {
      ...normalizedQuest,
      status: 'active',
      steps,
      stepsCount,
      completedStepsCount,
      completedAt: undefined,
      archivedAt: undefined,
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

    const normalizedQuest = getQuestFromPlans(questId);
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

  updateQuestBeforePhoto: async (questId: string, photo: CapturedPhoto | QuestPhoto | null): Promise<Quest> => {
    if (isOfflineTestingModeEnabled()) {
      syncMockLayerContextFromAuth();
      const updated = await updateQuestBeforePhotoMock(questId, photo);
      await persistOfflineStateIfEnabled();
      return updated;
    }

    const normalizedQuest = getQuestFromPlans(questId);
    assertBeforePhotoIsEditable(normalizedQuest);

    const beforePhoto = photo ? toQuestPhoto(photo) : null;
    const updatedQuest = normalizeQuestForLocal({
      ...normalizedQuest,
      beforePhoto,
      reportPhotoRequired: Boolean(beforePhoto?.uri),
      photosSyncStatus: 'local_only',
    });

    await persistUpdatedQuestToPlansCache(updatedQuest);
    return updatedQuest;
  },

  updateQuestAfterPhoto: async (questId: string, photo: CapturedPhoto | QuestPhoto | null): Promise<Quest> => {
    if (isOfflineTestingModeEnabled()) {
      syncMockLayerContextFromAuth();
      const updated = await updateQuestAfterPhotoMock(questId, photo);
      await persistOfflineStateIfEnabled();
      return updated;
    }

    const normalizedQuest = getQuestFromPlans(questId);
    if (isArchivedQuest(normalizedQuest)) {
      throw new Error('Quest report photo is locked for completed quests.');
    }

    const afterPhoto = photo ? toQuestPhoto(photo) : null;
    const updatedQuest = normalizeQuestForLocal({
      ...normalizedQuest,
      afterPhoto,
      photosSyncStatus: 'local_only',
    });

    await persistUpdatedQuestToPlansCache(updatedQuest);
    return updatedQuest;
  },
};
