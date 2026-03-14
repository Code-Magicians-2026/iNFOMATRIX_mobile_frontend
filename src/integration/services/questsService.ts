import useAuthStore from '@/context/Auth-store';
import usePlansStore from '@/context/Plans-store';
import {
  completeQuestMock,
  getQuestsMock,
  syncApprovedPlanQuestsMock,
  toggleQuestStepMock,
} from '@/src/features/mvp/services';
import type { Quest } from '@/shared/models/mvp-contracts.model';

const hasAuthenticatedSession = () => Boolean(useAuthStore.getState().session?.accessToken);

const syncRuntimeQuestsFromPlansCache = () => {
  if (!hasAuthenticatedSession()) {
    return;
  }

  const cachedPlans = usePlansStore.getState().getPlans();
  syncApprovedPlanQuestsMock(cachedPlans);
};

const persistUpdatedQuestToPlansCache = async (quest: Quest) => {
  if (!hasAuthenticatedSession()) {
    return;
  }

  await usePlansStore.getState().upsertQuestInPlans(quest);
};

export const questsService = {
  getQuests: async (userId: string): Promise<Quest[]> => {
    syncRuntimeQuestsFromPlansCache();
    return getQuestsMock(userId);
  },

  completeQuest: async (questId: string): Promise<Quest> => {
    syncRuntimeQuestsFromPlansCache();
    const updatedQuest = await completeQuestMock(questId);
    await persistUpdatedQuestToPlansCache(updatedQuest);
    return updatedQuest;
  },

  toggleQuestStep: async (questId: string, stepId: string): Promise<Quest> => {
    syncRuntimeQuestsFromPlansCache();
    const updatedQuest = await toggleQuestStepMock(questId, stepId);
    await persistUpdatedQuestToPlansCache(updatedQuest);
    return updatedQuest;
  },
};
