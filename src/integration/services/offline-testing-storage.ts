import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MockLayerSnapshot } from '@/src/features/mvp/services';
import {
  exportMockLayerSnapshot,
  importMockLayerSnapshot,
  resetMockLayerState,
  setMockMeId,
} from '@/src/features/mvp/services';

const OFFLINE_MOCK_SNAPSHOT_KEY = 'OFFLINE_TESTING_MOCK_SNAPSHOT_V1';
const EARNED_BADGES_KEY = 'EARNED_BADGES_V1';

type OfflineSeedBadgeRecord = {
  id: string;
  userId: string;
  questId: string;
  difficulty: string;
  badgeType: 'basic' | 'fire';
  imageKey:
    | 'ref1'
    | 'ref2'
    | 'ref3'
    | 'ref4'
    | 'ref5'
    | 'ref6'
    | 'ref7'
    | 'ref8'
    | 'ref9'
    | 'ref10'
    | 'ref11'
    | 'ref12'
    | 'ref13'
    | 'ref14'
    | 'ref15';
  earnedAt: string;
};

const offlineSeedBadges: OfflineSeedBadgeRecord[] = [
  {
    id: 'badge-child-1-offline-quest-4',
    userId: 'child-1',
    questId: 'offline-quest-4',
    difficulty: 'easy',
    badgeType: 'basic',
    imageKey: 'ref1',
    earnedAt: '2026-03-12T07:56:00.000Z',
  },
  {
    id: 'badge-child-1-offline-quest-5',
    userId: 'child-1',
    questId: 'offline-quest-5',
    difficulty: 'medium',
    badgeType: 'fire',
    imageKey: 'ref4',
    earnedAt: '2026-03-11T17:46:00.000Z',
  },
  {
    id: 'badge-child-2-offline-quest-seed',
    userId: 'child-2',
    questId: 'offline-seed-achievement',
    difficulty: 'easy',
    badgeType: 'basic',
    imageKey: 'ref3',
    earnedAt: '2026-03-10T16:30:00.000Z',
  },
];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const loadSnapshot = async (): Promise<MockLayerSnapshot | null> => {
  try {
    const serialized = await AsyncStorage.getItem(OFFLINE_MOCK_SNAPSHOT_KEY);
    if (!serialized) {
      return null;
    }

    const parsed = JSON.parse(serialized) as unknown;
    if (!isObject(parsed)) {
      return null;
    }

    return parsed as unknown as MockLayerSnapshot;
  } catch {
    return null;
  }
};

const seedBadgesIfMissing = async () => {
  try {
    const value = await AsyncStorage.getItem(EARNED_BADGES_KEY);
    if (value) {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return;
      }
    }
  } catch {}

  try {
    await AsyncStorage.setItem(EARNED_BADGES_KEY, JSON.stringify(offlineSeedBadges));
  } catch {}
};

export const persistOfflineMockLayerState = async (): Promise<void> => {
  try {
    const snapshot = exportMockLayerSnapshot();
    await AsyncStorage.setItem(OFFLINE_MOCK_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {}
};

export const hydrateOfflineMockLayerState = async (): Promise<void> => {
  const snapshot = await loadSnapshot();
  if (snapshot && importMockLayerSnapshot(snapshot)) {
    return;
  }

  resetMockLayerState();
  setMockMeId('adult-1');
  await persistOfflineMockLayerState();
  await seedBadgesIfMissing();
};
