import useAuthStore from '@/context/Auth-store';
import { generateQuestByPrompt } from '@/src/features/chat/api/quest';
import {
  approvePlanMock,
  generatePlanMock,
  getPlansMock,
  type GeneratePlanMockInput,
  type GetPlansMockInput,
} from '@/src/features/mvp/services';
import type { GeneratedPlan, Quest, QuestStatus } from '@/shared/models/mvp-contracts.model';

export type GeneratePlanInput = GeneratePlanMockInput;
export type GetPlansInput = GetPlansMockInput;

type UnknownRecord = Record<string, unknown>;

const isObject = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

const toNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const toFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const pickString = (source: UnknownRecord, keys: string[]): string | null => {
  for (const key of keys) {
    const value = toNonEmptyString(source[key]);
    if (value) {
      return value;
    }
  }

  return null;
};

const pickNumber = (source: UnknownRecord, keys: string[]): number | null => {
  for (const key of keys) {
    const value = toFiniteNumber(source[key]);
    if (value !== null) {
      return value;
    }
  }

  return null;
};

const toQuestStatus = (value: string | null): QuestStatus => {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === 'draft' ||
    normalized === 'active' ||
    normalized === 'completed' ||
    normalized === 'archived'
  ) {
    return normalized;
  }

  return 'draft';
};

const extractQuestPayload = (payload: unknown, depth = 0): UnknownRecord | null => {
  if (depth > 5 || payload === null || payload === undefined) {
    return null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const parsed = extractQuestPayload(item, depth + 1);
      if (parsed) {
        return parsed;
      }
    }
    return null;
  }

  if (!isObject(payload)) {
    return null;
  }

  const looksLikeQuest = [
    'id',
    'questId',
    'title',
    'name',
    'description',
    'rewardXp',
    'estimatedMinutes',
    'durationMinutes',
  ].some((key) => Object.prototype.hasOwnProperty.call(payload, key));
  if (looksLikeQuest) {
    return payload;
  }

  const nestedCandidates = [
    payload.quest,
    payload.item,
    payload.data,
    payload.result,
    payload.value,
    payload.response,
  ];
  for (const candidate of nestedCandidates) {
    const parsed = extractQuestPayload(candidate, depth + 1);
    if (parsed) {
      return parsed;
    }
  }

  return payload;
};

const extractResponseSummary = (payload: unknown): string | null => {
  if (!isObject(payload)) {
    return null;
  }

  return pickString(payload, ['summary', 'message', 'detail', 'response', 'text']);
};

const buildQuestTitleFromPrompt = (prompt: string) => {
  const trimmed = prompt.trim();
  if (trimmed.length <= 56) {
    return trimmed;
  }

  return `${trimmed.slice(0, 53)}...`;
};

const buildQuestFromApiResponse = (
  response: unknown,
  input: GeneratePlanInput,
): Quest => {
  const payload = extractQuestPayload(response) ?? {};
  const nowIso = new Date().toISOString();
  const normalizedPrompt = input.prompt.trim();
  const assignedToUserId =
    input.targetUserId.trim() ||
    useAuthStore.getState().currentUser?.id ||
    'self-user';
  const rewardXp = pickNumber(payload, ['rewardXp', 'xpReward', 'reward', 'xp']) ?? 70;
  const estimatedMinutes = pickNumber(payload, ['estimatedMinutes', 'durationMinutes', 'duration']) ?? 30;

  return {
    id: pickString(payload, ['id', 'questId', 'Id', 'QuestId']) ?? `quest-api-${Date.now()}`,
    assignedToUserId,
    title:
      pickString(payload, ['title', 'name', 'taskTitle', 'questTitle']) ??
      buildQuestTitleFromPrompt(normalizedPrompt),
    description:
      pickString(payload, ['description', 'details', 'text', 'content']) ??
      normalizedPrompt,
    category: pickString(payload, ['category', 'type']) ?? undefined,
    difficulty: pickString(payload, ['difficulty', 'level']) ?? 'medium',
    rewardXp: Math.max(1, Math.round(rewardXp)),
    estimatedMinutes: Math.max(1, Math.round(estimatedMinutes)),
    status: toQuestStatus(pickString(payload, ['status', 'questStatus'])),
    originalTask: normalizedPrompt,
    createdAt: pickString(payload, ['createdAt', 'createdOn']) ?? nowIso,
  };
};

const buildPlanFromApiQuest = (response: unknown, quest: Quest): GeneratedPlan => {
  const summary =
    extractResponseSummary(response) ??
    `Generated 1 quest from prompt.`;

  return {
    id: `plan-${quest.id}`,
    title: `AI Quest: ${quest.title}`,
    summary,
    childMessage: 'Quest generated. Start with the first step.',
    quests: [quest],
    totalEstimatedMinutes: quest.estimatedMinutes,
    // API endpoint creates a ready quest, so preview does not require separate approval.
    status: 'approved',
  };
};

// Swagger contract helper for /api/ai/quest multipart payload.
export const buildGeneratePlanFormData = (input: GeneratePlanInput): FormData => {
  const formData = new FormData();
  formData.append('Prompt', input.prompt);
  return formData;
};

const generatePlanViaApiContract = async (input: GeneratePlanInput): Promise<GeneratedPlan> => {
  const accessToken = useAuthStore.getState().session?.accessToken;
  if (!accessToken) {
    return generatePlanMock(input);
  }

  const normalizedPrompt = input.prompt.trim();
  if (!normalizedPrompt) {
    throw new Error('Prompt is required.');
  }

  const response = await generateQuestByPrompt(normalizedPrompt, accessToken);
  const quest = buildQuestFromApiResponse(response, {
    ...input,
    prompt: normalizedPrompt,
  });
  return buildPlanFromApiQuest(response, quest);
};

export const plansService = {
  getPlans: async (input: GetPlansInput = {}): Promise<GeneratedPlan[]> =>
    getPlansMock(input),

  generatePlan: async (input: GeneratePlanInput): Promise<GeneratedPlan> =>
    generatePlanViaApiContract(input),

  uploadPhotoAndGenerate: async (input: GeneratePlanInput): Promise<GeneratedPlan> => {
    // The current API contract accepts only Prompt + auth.
    return generatePlanViaApiContract(input);
  },

  approvePlan: async (planId: string): Promise<GeneratedPlan> =>
    approvePlanMock(planId),
};
