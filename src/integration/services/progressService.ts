import useAuthStore from '@/context/Auth-store';
import usePlansStore from '@/context/Plans-store';
import { getProgressMock, syncApprovedPlanQuestsMock } from '@/src/features/mvp/services';
import type { ProgressSummary } from '@/shared/models/mvp-contracts.model';

export const progressService = {
  getProgress: async (userId: string): Promise<ProgressSummary> => {
    if (useAuthStore.getState().session?.accessToken) {
      syncApprovedPlanQuestsMock(usePlansStore.getState().getPlans());
    }

    return getProgressMock(userId);
  },
};
