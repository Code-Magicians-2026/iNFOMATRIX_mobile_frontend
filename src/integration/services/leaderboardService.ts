import type { LeaderboardItem } from '@/shared/models/mvp-contracts.model';
import { getLeaderboardMock, getLegacyLeaderboardMock } from '@/src/features/mvp/services';
import { isOfflineTestingModeEnabled, syncMockLayerContextFromAuth } from '@/src/integration/services/offline-mode';

export const leaderboardService = {
  getLeaderboard: async (): Promise<LeaderboardItem[]> => {
    if (isOfflineTestingModeEnabled()) {
      syncMockLayerContextFromAuth();
      return getLeaderboardMock();
    }

    return getLegacyLeaderboardMock();
  },
};
