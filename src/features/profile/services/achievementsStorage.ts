import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAchievementDefinitionById } from '@/src/features/profile/services/achievement-definitions';

const STORAGE_KEY = 'ACHIEVEMENTS_V1';

export type UnlockedAchievement = {
  id: string;
  userId: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic';
  unlockedAt: string;
  isNew: boolean;
};

type UnlockAchievementInput = {
  userId: string;
  achievementId: string;
};

type UnlockAchievementResult = {
  achievement: UnlockedAchievement;
  isNewUnlock: boolean;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isRarity = (value: unknown): value is UnlockedAchievement['rarity'] =>
  value === 'common' || value === 'rare' || value === 'epic';

const normalizeIdForCompare = (value: string) => value.trim().toLowerCase();

const isSameEntityId = (left: string, right: string): boolean =>
  normalizeIdForCompare(left) === normalizeIdForCompare(right);

const isUnlockedAchievement = (value: unknown): value is UnlockedAchievement => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const achievement = value as Partial<UnlockedAchievement>;
  return (
    isNonEmptyString(achievement.id) &&
    isNonEmptyString(achievement.userId) &&
    isNonEmptyString(achievement.title) &&
    isNonEmptyString(achievement.description) &&
    isNonEmptyString(achievement.icon) &&
    isNonEmptyString(achievement.category) &&
    isRarity(achievement.rarity) &&
    isNonEmptyString(achievement.unlockedAt) &&
    typeof achievement.isNew === 'boolean'
  );
};

const readAll = async (): Promise<UnlockedAchievement[]> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    if (!value) {
      return [];
    }

    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is UnlockedAchievement => isUnlockedAchievement(item))
      .map((item) => ({
        ...item,
        id: item.id.trim(),
        userId: item.userId.trim(),
      }));
  } catch {
    return [];
  }
};

const writeAll = async (records: UnlockedAchievement[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {}
};

const sortByNewest = (records: UnlockedAchievement[]): UnlockedAchievement[] =>
  [...records].sort((left, right) => right.unlockedAt.localeCompare(left.unlockedAt));

const unlockAchievement = async ({
  userId,
  achievementId,
}: UnlockAchievementInput): Promise<UnlockAchievementResult> => {
  const normalizedUserId = userId.trim();
  const normalizedAchievementId = achievementId.trim();
  if (!normalizedUserId || !normalizedAchievementId) {
    throw new Error('Invalid achievement payload.');
  }

  const definition = getAchievementDefinitionById(normalizedAchievementId);
  if (!definition) {
    throw new Error(`Unknown achievement '${normalizedAchievementId}'.`);
  }

  const records = await readAll();
  const existing = records.find(
    (record) =>
      isSameEntityId(record.userId, normalizedUserId) &&
      isSameEntityId(record.id, normalizedAchievementId),
  );
  if (existing) {
    return { achievement: existing, isNewUnlock: false };
  }

  const nextRecord: UnlockedAchievement = {
    id: definition.id,
    userId: normalizedUserId,
    title: definition.title,
    description: definition.description,
    icon: definition.icon,
    category: definition.category,
    rarity: definition.rarity,
    unlockedAt: new Date().toISOString(),
    isNew: true,
  };

  const nextRecords = sortByNewest([nextRecord, ...records]);
  await writeAll(nextRecords);
  return { achievement: nextRecord, isNewUnlock: true };
};

const getUnlockedAchievementsByUser = async (userId: string): Promise<UnlockedAchievement[]> => {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return [];
  }

  const records = await readAll();
  return sortByNewest(records.filter((record) => isSameEntityId(record.userId, normalizedUserId)));
};

const getNewAchievementsCount = async (userId: string): Promise<number> => {
  const records = await getUnlockedAchievementsByUser(userId);
  return records.filter((record) => record.isNew).length;
};

const markAchievementsAsSeen = async (userId: string): Promise<void> => {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return;
  }

  const records = await readAll();
  let hasChanges = false;
  const nextRecords = records.map((record) => {
    if (!isSameEntityId(record.userId, normalizedUserId) || !record.isNew) {
      return record;
    }

    hasChanges = true;
    return {
      ...record,
      isNew: false,
    };
  });

  if (!hasChanges) {
    return;
  }

  await writeAll(sortByNewest(nextRecords));
};

const achievementsStorage = {
  unlockAchievement,
  getUnlockedAchievementsByUser,
  getNewAchievementsCount,
  markAchievementsAsSeen,
};

export default achievementsStorage;
