import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isBadgeImageKey,
  normalizeBadgeImageKey,
  pickRandomBadgeImageKey,
  resolveBadgeTypeFromDifficulty,
  type BadgeImageKey,
  type BadgeType,
} from '@/shared/components/ui/badge-catalog';

const STORAGE_KEY = 'EARNED_BADGES_V1';

export type EarnedBadgeRecord = {
  id: string;
  userId: string;
  questId: string;
  difficulty: string;
  badgeType: BadgeType;
  imageKey: BadgeImageKey;
  earnedAt: string;
};

type RegisterEarnedBadgeInput = {
  userId: string;
  questId: string;
  difficulty: string;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isBadgeType = (value: unknown): value is BadgeType => value === 'basic' || value === 'fire';

const toEarnedBadgeRecord = (value: unknown): EarnedBadgeRecord | null => {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Partial<EarnedBadgeRecord>;
  if (
    !isNonEmptyString(record.id) ||
    !isNonEmptyString(record.userId) ||
    !isNonEmptyString(record.questId) ||
    !isNonEmptyString(record.difficulty) ||
    !isBadgeType(record.badgeType) ||
    !isNonEmptyString(record.imageKey) ||
    !isNonEmptyString(record.earnedAt)
  ) {
    return null;
  }

  const normalizedImageKey =
    isBadgeImageKey(record.imageKey)
      ? record.imageKey
      : normalizeBadgeImageKey(record.imageKey) ?? 'ref1';

  return {
    id: record.id,
    userId: record.userId,
    questId: record.questId,
    difficulty: record.difficulty,
    badgeType: record.badgeType,
    imageKey: normalizedImageKey,
    earnedAt: record.earnedAt,
  };
};

const readAll = async (): Promise<EarnedBadgeRecord[]> => {
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
      .map((item) => toEarnedBadgeRecord(item))
      .filter((item): item is EarnedBadgeRecord => item !== null);
  } catch {
    return [];
  }
};

const writeAll = async (records: EarnedBadgeRecord[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {}
};

const sortByNewest = (records: EarnedBadgeRecord[]): EarnedBadgeRecord[] =>
  [...records].sort((left, right) => right.earnedAt.localeCompare(left.earnedAt));

const registerEarnedBadge = async ({
  userId,
  questId,
  difficulty,
}: RegisterEarnedBadgeInput): Promise<EarnedBadgeRecord> => {
  const normalizedUserId = userId.trim();
  const normalizedQuestId = questId.trim();
  const normalizedDifficulty = difficulty.trim() || 'easy';
  if (!normalizedUserId || !normalizedQuestId) {
    throw new Error('Invalid badge source payload');
  }

  const records = await readAll();
  const existing = records.find(
    (record) => record.userId === normalizedUserId && record.questId === normalizedQuestId,
  );
  if (existing) {
    return existing;
  }

  const badgeType = resolveBadgeTypeFromDifficulty(normalizedDifficulty);
  const nextRecord: EarnedBadgeRecord = {
    id: `badge-${normalizedUserId}-${normalizedQuestId}`,
    userId: normalizedUserId,
    questId: normalizedQuestId,
    difficulty: normalizedDifficulty,
    badgeType,
    imageKey: pickRandomBadgeImageKey(),
    earnedAt: new Date().toISOString(),
  };

  const nextRecords = sortByNewest([nextRecord, ...records]);
  await writeAll(nextRecords);
  return nextRecord;
};

const getEarnedBadgesByUser = async (userId: string): Promise<EarnedBadgeRecord[]> => {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return [];
  }

  const records = await readAll();
  return sortByNewest(records.filter((record) => record.userId === normalizedUserId));
};

const earnedBadgesStorage = {
  registerEarnedBadge,
  getEarnedBadgesByUser,
};

export default earnedBadgesStorage;


