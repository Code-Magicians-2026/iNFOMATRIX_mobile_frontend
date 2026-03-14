import type { Quest, QuestRewardType } from '@/shared/models/mvp-contracts.model';

type RewardEditorOption = {
  type: QuestRewardType;
  label: string;
  placeholder: string;
  defaultTitle: string;
  isNumeric: boolean;
  unit: string | null;
};

export type QuestRewardDraft = {
  type: QuestRewardType;
  valueInput: string;
  noteInput: string;
};

export const QUEST_REWARD_EDITOR_OPTIONS: readonly RewardEditorOption[] = [
  {
    type: 'money',
    label: 'Гроші',
    placeholder: 'Наприклад: 50',
    defaultTitle: 'Грошова нагорода',
    isNumeric: true,
    unit: 'грн',
  },
  {
    type: 'screen_time',
    label: 'Час на гру',
    placeholder: 'Наприклад: 20',
    defaultTitle: 'Час на гру',
    isNumeric: true,
    unit: 'хв',
  },
  {
    type: 'treat',
    label: 'Смаколик',
    placeholder: 'Наприклад: Смаколик',
    defaultTitle: 'Смаколик',
    isNumeric: false,
    unit: null,
  },
  {
    type: 'activity',
    label: 'Активність',
    placeholder: 'Наприклад: Похід у парк',
    defaultTitle: 'Активність разом',
    isNumeric: false,
    unit: null,
  },
  {
    type: 'custom',
    label: 'Інше',
    placeholder: 'Наприклад: Похід у кіно',
    defaultTitle: 'Нагорода',
    isNumeric: false,
    unit: null,
  },
];

const rewardTypeSet = new Set<QuestRewardType>(QUEST_REWARD_EDITOR_OPTIONS.map((option) => option.type));

export const isQuestRewardType = (value: unknown): value is QuestRewardType =>
  typeof value === 'string' && rewardTypeSet.has(value as QuestRewardType);

export const getQuestRewardOption = (type: QuestRewardType): RewardEditorOption =>
  QUEST_REWARD_EDITOR_OPTIONS.find((option) => option.type === type) ?? QUEST_REWARD_EDITOR_OPTIONS[0];

const parseInteger = (value: string): number | null => {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(1, Math.round(parsed));
};

const parseFirstIntegerFromText = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }

  const match = value.match(/\d+/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[0], 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(1, parsed);
};

export const buildQuestRewardFieldsFromDraft = (
  draft: QuestRewardDraft,
): Pick<Quest, 'rewardType' | 'rewardTitle' | 'rewardDescription' | 'rewardValue' | 'rewardCurrencyOrUnit'> => {
  const option = getQuestRewardOption(draft.type);
  const trimmedValue = draft.valueInput.trim();
  const trimmedNote = draft.noteInput.trim();

  if (option.isNumeric) {
    const value = parseInteger(trimmedValue);
    const normalizedUnit = option.unit ?? undefined;
    const title = value ? `${value} ${normalizedUnit}` : option.defaultTitle;
    const unitSuffix = draft.type === 'screen_time' && value ? ' гри' : '';

    return {
      rewardType: draft.type,
      rewardTitle: value ? `${title}${unitSuffix}` : option.defaultTitle,
      rewardDescription: trimmedNote || undefined,
      rewardValue: value,
      rewardCurrencyOrUnit: normalizedUnit,
    };
  }

  return {
    rewardType: draft.type,
    rewardTitle: trimmedValue || option.defaultTitle,
    rewardDescription: trimmedNote || undefined,
    rewardValue: null,
    rewardCurrencyOrUnit: null,
  };
};

export const buildQuestRewardPreviewFromDraft = (draft: QuestRewardDraft): string =>
  buildQuestRewardFieldsFromDraft(draft).rewardTitle ?? 'Не вказано';

export const getQuestRewardTypeLabel = (type: QuestRewardType | undefined): string => {
  if (!type) {
    return 'Не вказано';
  }

  return getQuestRewardOption(type).label;
};

export const getQuestRewardLabel = (
  quest: Pick<Quest, 'rewardXp' | 'rewardType' | 'rewardTitle' | 'rewardValue' | 'rewardCurrencyOrUnit'>,
): string => {
  const title = quest.rewardTitle?.trim();
  if (title) {
    return title;
  }

  if (quest.rewardType === 'money' && typeof quest.rewardValue === 'number' && Number.isFinite(quest.rewardValue)) {
    const unit = quest.rewardCurrencyOrUnit?.trim() || 'грн';
    return `${Math.max(1, Math.round(quest.rewardValue))} ${unit}`;
  }

  if (
    quest.rewardType === 'screen_time' &&
    typeof quest.rewardValue === 'number' &&
    Number.isFinite(quest.rewardValue)
  ) {
    const unit = quest.rewardCurrencyOrUnit?.trim() || 'хв';
    return `${Math.max(1, Math.round(quest.rewardValue))} ${unit} гри`;
  }

  return `+${Math.max(1, Math.round(quest.rewardXp))} XP`;
};

export const createQuestRewardDraftFromQuest = (
  quest: Pick<Quest, 'rewardType' | 'rewardTitle' | 'rewardDescription' | 'rewardValue'>,
): QuestRewardDraft => {
  const type = isQuestRewardType(quest.rewardType) ? quest.rewardType : 'custom';
  const option = getQuestRewardOption(type);
  const rewardTitle = quest.rewardTitle?.trim() ?? '';
  const rewardDescription = quest.rewardDescription?.trim() ?? '';

  if (option.isNumeric) {
    const numericValue =
      typeof quest.rewardValue === 'number' && Number.isFinite(quest.rewardValue)
        ? Math.max(1, Math.round(quest.rewardValue))
        : parseFirstIntegerFromText(rewardTitle);

    return {
      type,
      valueInput: numericValue ? String(numericValue) : '',
      noteInput: rewardDescription,
    };
  }

  return {
    type,
    valueInput: rewardTitle,
    noteInput: rewardDescription,
  };
};
