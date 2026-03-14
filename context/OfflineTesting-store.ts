import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  hydrateOfflineMockLayerState,
  persistOfflineMockLayerState,
} from '@/src/integration/services/offline-testing-storage';

interface OfflineTestingState {
  isOfflineTestingMode: boolean;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setOfflineTestingMode: (enabled: boolean) => Promise<void>;
  toggleOfflineTestingMode: () => Promise<void>;
}

const STORAGE_KEY = 'OFFLINE_TESTING_MODE_V1';

const useOfflineTestingStore = create<OfflineTestingState>((set, get) => ({
  isOfflineTestingMode: false,
  isHydrated: false,

  hydrate: async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = value ? (JSON.parse(value) as { enabled?: unknown }) : null;
      const isOfflineTestingMode = parsed?.enabled === true;

      if (isOfflineTestingMode) {
        await hydrateOfflineMockLayerState();
      }

      set({
        isOfflineTestingMode,
        isHydrated: true,
      });
    } catch {
      set({
        isOfflineTestingMode: false,
        isHydrated: true,
      });
    }
  },

  setOfflineTestingMode: async (enabled: boolean) => {
    if (enabled) {
      await hydrateOfflineMockLayerState();
    }

    set({ isOfflineTestingMode: enabled });

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled }));
    } catch {}

    if (enabled) {
      await persistOfflineMockLayerState();
    }
  },

  toggleOfflineTestingMode: async () => {
    const next = !get().isOfflineTestingMode;
    await get().setOfflineTestingMode(next);
  },
}));

export default useOfflineTestingStore;
