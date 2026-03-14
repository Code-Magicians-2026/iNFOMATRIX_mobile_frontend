import { getMeMock, setMockMeId } from '@/src/features/mvp/services';
import type { UserProfile } from '@/shared/models/mvp-contracts.model';

export const userService = {
  setCurrentUserId: (userId: string) => {
    setMockMeId(userId);
  },

  getMe: async (): Promise<UserProfile> => getMeMock(),
};
