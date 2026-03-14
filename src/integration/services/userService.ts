import useAuthStore from '@/context/Auth-store';
import type { UserProfile } from '@/shared/models/mvp-contracts.model';
import { getMeMock } from '@/src/features/mvp/services';
import { isOfflineTestingModeEnabled, syncMockLayerContextFromAuth } from '@/src/integration/services/offline-mode';

const buildFallbackUser = (): UserProfile => {
  const authState = useAuthStore.getState();
  const role = authState.role ?? 'child';
  const email = authState.session?.email ?? `${role}@local.infomatrix`;

  return {
    id: authState.currentUser?.id ?? `local-${role}`,
    fullName: authState.currentUser?.fullName ?? (role === 'adult' ? 'Parent Profile' : 'Child Profile'),
    email,
    role,
    createdByAdultId: authState.currentUser?.createdByAdultId,
    activeChildId: authState.currentUser?.activeChildId,
    level: authState.currentUser?.level ?? 1,
    xp: authState.currentUser?.xp ?? 0,
    streak: authState.currentUser?.streak ?? 0,
    avatarType: authState.currentUser?.avatarType ?? (role === 'adult' ? 'mentor' : 'adventurer'),
  };
};

export const userService = {
  getMe: async (): Promise<UserProfile> => {
    if (isOfflineTestingModeEnabled()) {
      syncMockLayerContextFromAuth();
      return getMeMock();
    }

    const authUser = useAuthStore.getState().currentUser;
    if (authUser) {
      return { ...authUser };
    }

    return buildFallbackUser();
  },
};
