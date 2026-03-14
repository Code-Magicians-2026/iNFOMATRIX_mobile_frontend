import useAuthStore from '@/context/Auth-store';
import useOfflineTestingStore from '@/context/OfflineTesting-store';
import { setMockMeId } from '@/src/features/mvp/services';
import { persistOfflineMockLayerState } from '@/src/integration/services/offline-testing-storage';

const resolvePreferredMockUserId = () => {
  const auth = useAuthStore.getState();

  if (auth.role === 'adult') {
    return 'adult-1';
  }

  if (auth.selectedChildId && auth.selectedChildId.trim().length > 0) {
    return auth.selectedChildId.trim();
  }

  if (auth.currentUser?.id && auth.currentUser.role === 'child') {
    return auth.currentUser.id;
  }

  return 'child-1';
};

export const isOfflineTestingModeEnabled = () =>
  useOfflineTestingStore.getState().isOfflineTestingMode;

export const syncMockLayerContextFromAuth = () => {
  if (!isOfflineTestingModeEnabled()) {
    return;
  }

  const preferredUserId = resolvePreferredMockUserId();

  try {
    setMockMeId(preferredUserId);
  } catch {
    try {
      setMockMeId(preferredUserId === 'adult-1' ? 'child-1' : 'adult-1');
    } catch {}
  }
};

export const persistOfflineStateIfEnabled = async () => {
  if (!isOfflineTestingModeEnabled()) {
    return;
  }

  await persistOfflineMockLayerState();
};
