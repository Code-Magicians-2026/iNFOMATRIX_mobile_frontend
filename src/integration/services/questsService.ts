import { completeQuestMock, getQuestsMock } from '@/src/features/mvp/services';
import type { Quest } from '@/shared/models/mvp-contracts.model';

export const questsService = {
  getQuests: async (userId: string): Promise<Quest[]> => getQuestsMock(userId),

  completeQuest: async (questId: string): Promise<Quest> => completeQuestMock(questId),
};
