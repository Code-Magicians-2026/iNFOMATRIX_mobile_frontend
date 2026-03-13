import { getProgressMock } from '@/src/features/mvp/services';
import type { ProgressSummary } from '@/shared/models/mvp-contracts.model';

export const progressService = {
  getProgress: async (userId: string): Promise<ProgressSummary> => getProgressMock(userId),
};
