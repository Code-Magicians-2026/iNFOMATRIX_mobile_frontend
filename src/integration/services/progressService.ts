import useAuthStore from '@/context/Auth-store';
import usePlansStore from '@/context/Plans-store';
import { getProgressMock } from '@/src/features/mvp/services';
import { runtimeModeService } from '@/src/integration/services/runtimeModeService';
import type { ProgressSummary } from '@/shared/models/mvp-contracts.model';

const XP_PER_LEVEL = 300;

const isArchivedQuestStatus = (status: string) => status === 'archived' || status === 'completed';

const buildProgressFromLocalPlans = (userId: string): ProgressSummary => {
  const quests = usePlansStore.getState().getApprovedQuestsByUser(userId);
  const archivedQuests = quests.filter((quest) => isArchivedQuestStatus(quest.status));
  const activeQuests = quests.filter((quest) => quest.status === 'active');
  const earnedXp = archivedQuests.reduce((sum, quest) => sum + quest.rewardXp, 0);

  const currentUser = useAuthStore.getState().currentUser;
  const baselineXp = currentUser?.id === userId ? currentUser.xp : 0;
  const baselineStreak = currentUser?.id === userId ? currentUser.streak : 0;
  const xp = Math.max(baselineXp, earnedXp);
  const level = Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);

  return {
    userId,
    level,
    xp,
    streak: baselineStreak,
    completedQuestsCount: archivedQuests.length,
    activeQuestsCount: activeQuests.length,
    stats: {
      quests: archivedQuests.length,
    },
  };
};

export const progressService = {
  getProgress: async (userId: string): Promise<ProgressSummary> => {
    if (runtimeModeService.isDemoModeEnabled()) {
      return getProgressMock(userId);
    }

    return buildProgressFromLocalPlans(userId);
  },
};
