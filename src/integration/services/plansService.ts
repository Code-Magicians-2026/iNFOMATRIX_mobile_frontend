import useAuthStore from '@/context/Auth-store';
import usePlansStore from '@/context/Plans-store';
import { generateQuestByPrompt, generateQuestByPromptWithPhoto } from '@/src/features/chat/api/quest';
import {
  approvePlanMock,
  generatePlanMock,
  getPlansMock,
  syncApprovedPlanQuestsMock,
  type GeneratePlanMockInput,
  type GetPlansMockInput,
} from '@/src/features/mvp/services';
import type { GeneratedPlan, Quest, QuestStatus, QuestStep } from '@/shared/models/mvp-contracts.model';

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

const pickArray = (source: UnknownRecord, keys: string[]): unknown[] | null => {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
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
  if (depth > 6 || payload === null || payload === undefined) {
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
    'steps',
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

const extractPlanPayload = (payload: unknown, depth = 0): UnknownRecord | null => {
  if (depth > 6 || payload === null || payload === undefined) {
    return null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const parsed = extractPlanPayload(item, depth + 1);
      if (parsed) {
        return parsed;
      }
    }
    return null;
  }

  if (!isObject(payload)) {
    return null;
  }

  const hasPlanLikeShape =
    Array.isArray(payload.quests) ||
    Object.prototype.hasOwnProperty.call(payload, 'totalEstimatedMinutes') ||
    Object.prototype.hasOwnProperty.call(payload, 'childMessage') ||
    Object.prototype.hasOwnProperty.call(payload, 'summary');

  if (hasPlanLikeShape) {
    return payload;
  }

  const nestedCandidates = [
    payload.plan,
    payload.data,
    payload.result,
    payload.value,
    payload.response,
    payload.item,
  ];
  for (const candidate of nestedCandidates) {
    const parsed = extractPlanPayload(candidate, depth + 1);
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

const buildFallbackStepTitlesFromDescription = (description: string): string[] => {
  const fragments = description
    .split(/[.;]\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 3);

  if (fragments.length >= 2) {
    return fragments;
  }

  return [
    'Prepare for the quest',
    'Complete the main action',
    'Review and finalize',
  ];
};

const buildStepsFromPayload = (
  payload: UnknownRecord,
  questId: string,
  questTitle: string,
  questDescription: string,
): QuestStep[] => {
  const stepCandidates = pickArray(payload, ['steps', 'questSteps', 'subtasks', 'tasks']) ?? [];
  const parsedSteps = stepCandidates
    .map((step, index) => {
      if (typeof step === 'string') {
        const trimmed = step.trim();
        if (!trimmed) {
          return null;
        }

        return {
          id: `${questId}-step-${index + 1}`,
          questId,
          title: trimmed,
          order: index + 1,
          status: 'pending' as const,
        };
      }

      if (!isObject(step)) {
        return null;
      }

      const title = pickString(step, ['title', 'name', 'task', 'label']) ?? `Step ${index + 1}`;
      const description = pickString(step, ['description', 'details', 'text']) ?? undefined;
      const order = pickNumber(step, ['order', 'index', 'position']) ?? index + 1;

      return {
        id: pickString(step, ['id', 'stepId']) ?? `${questId}-step-${index + 1}`,
        questId,
        title,
        description,
        order: Math.max(1, Math.round(order)),
        status: toQuestStatus(pickString(step, ['status'])) === 'completed' ? 'completed' : 'pending',
        completedAt: pickString(step, ['completedAt']) ?? undefined,
      };
    })
    .filter((step): step is QuestStep => step !== null)
    .sort((left, right) => left.order - right.order);

  if (parsedSteps.length > 0) {
    return parsedSteps;
  }

  const fallbackTitles = buildFallbackStepTitlesFromDescription(questDescription);
  return fallbackTitles.map((title, index) => ({
    id: `${questId}-step-${index + 1}`,
    questId,
    title: title || `${questTitle} step ${index + 1}`,
    order: index + 1,
    status: 'pending',
  }));
};

const buildQuestFromPayload = (
  payload: UnknownRecord,
  input: GeneratePlanInput,
  index: number,
  defaultStatus: QuestStatus,
): Quest => {
  const nowIso = new Date().toISOString();
  const normalizedPrompt = input.prompt.trim();
  const assignedToUserId =
    input.targetUserId.trim() ||
    useAuthStore.getState().currentUser?.id ||
    'self-user';
  const rewardXp = pickNumber(payload, ['rewardXp', 'xpReward', 'reward', 'xp']) ?? 70;
  const estimatedMinutes = pickNumber(payload, ['estimatedMinutes', 'durationMinutes', 'duration']) ?? 30;
  const id =
    pickString(payload, ['id', 'questId', 'Id', 'QuestId']) ?? `quest-api-${Date.now()}-${index + 1}`;
  const title =
    pickString(payload, ['title', 'name', 'taskTitle', 'questTitle']) ??
    `${buildQuestTitleFromPrompt(normalizedPrompt)} #${index + 1}`;
  const description =
    pickString(payload, ['description', 'details', 'text', 'content']) ??
    normalizedPrompt;
  const steps = buildStepsFromPayload(payload, id, title, description);
  const completedStepsCount = steps.filter((step) => step.status === 'completed').length;

  return {
    id,
    assignedToUserId,
    title,
    description,
    category: pickString(payload, ['category', 'type']) ?? undefined,
    difficulty: pickString(payload, ['difficulty', 'level']) ?? 'medium',
    rewardXp: Math.max(1, Math.round(rewardXp)),
    estimatedMinutes: Math.max(1, Math.round(estimatedMinutes)),
    status: (() => {
      const rawStatus = pickString(payload, ['status', 'questStatus']);
      return rawStatus ? toQuestStatus(rawStatus) : defaultStatus;
    })(),
    steps,
    stepsCount: steps.length,
    completedStepsCount,
    originalTask: normalizedPrompt,
    createdAt: pickString(payload, ['createdAt', 'createdOn']) ?? nowIso,
  };
};

const buildPlanFromApiResponse = (
  response: unknown,
  input: GeneratePlanInput,
): GeneratedPlan => {
  const planPayload = extractPlanPayload(response) ?? {};
  const questCandidates =
    pickArray(planPayload, ['quests', 'items', 'tasks', 'missions']) ??
    pickArray(planPayload, ['data']) ??
    null;
  const hasQuestArray = Array.isArray(questCandidates) && questCandidates.length > 0;
  const defaultPlanStatus = hasQuestArray ? 'draft' : 'approved';

  const questPayloads: UnknownRecord[] = hasQuestArray
    ? questCandidates
        .filter((item): item is UnknownRecord => isObject(item))
    : [extractQuestPayload(response) ?? planPayload];

  const quests = questPayloads.map((payload, index) =>
    buildQuestFromPayload(payload, input, index, 'draft'),
  );

  const summary =
    pickString(planPayload, ['summary']) ??
    extractResponseSummary(planPayload) ??
    extractResponseSummary(response) ??
    `Generated ${quests.length} quest${quests.length > 1 ? 's' : ''} from prompt.`;
  const totalEstimatedMinutes =
    pickNumber(planPayload, ['totalEstimatedMinutes', 'estimatedMinutes', 'durationMinutes']) ??
    quests.reduce((sum, quest) => sum + quest.estimatedMinutes, 0);
  const rawPlanId =
    pickString(planPayload, ['id', 'planId', 'Id', 'PlanId']) ??
    quests[0]?.id ??
    `${Date.now()}`;
  const planId = rawPlanId.startsWith('plan-') ? rawPlanId : `plan-${rawPlanId}`;
  const title =
    pickString(planPayload, ['title', 'name']) ??
    (quests.length === 1 ? `AI Quest: ${quests[0].title}` : `AI Quest Plan (${quests.length})`);
  const childMessage =
    pickString(planPayload, ['childMessage', 'message', 'heroMessage']) ??
    'Quest plan generated. Start with the first step.';
  const status = hasQuestArray
    ? pickString(planPayload, ['status', 'planStatus']) ?? defaultPlanStatus
    : defaultPlanStatus;

  return {
    id: planId,
    title,
    summary,
    childMessage,
    quests,
    totalEstimatedMinutes: Math.max(1, Math.round(totalEstimatedMinutes)),
    status,
  };
};

const applyGetPlansFilters = (plans: GeneratedPlan[], input: GetPlansInput = {}): GeneratedPlan[] => {
  const filteredPlans = input.targetUserId
    ? plans.filter((plan) =>
        plan.quests.some((quest) => quest.assignedToUserId === input.targetUserId),
      )
    : plans;

  return typeof input.limit === 'number' && input.limit > 0
    ? filteredPlans.slice(0, input.limit)
    : filteredPlans;
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

  const normalizedPhoto = input.photo?.uri?.trim() ? input.photo : undefined;
  const response = normalizedPhoto
    ? await generateQuestByPromptWithPhoto(normalizedPrompt, normalizedPhoto, accessToken)
    : await generateQuestByPrompt(normalizedPrompt, accessToken);
  const plan = buildPlanFromApiResponse(response, {
    ...input,
    prompt: normalizedPrompt,
  });
  await usePlansStore.getState().upsertPlan(plan);
  return plan;
};

export const plansService = {
  getPlans: async (input: GetPlansInput = {}): Promise<GeneratedPlan[]> => {
    const accessToken = useAuthStore.getState().session?.accessToken;
    if (!accessToken) {
      return getPlansMock(input);
    }

    const plans = usePlansStore.getState().getPlans();
    return applyGetPlansFilters(plans, input);
  },

  generatePlan: async (input: GeneratePlanInput): Promise<GeneratedPlan> =>
    generatePlanViaApiContract(input),

  uploadPhotoAndGenerate: async (input: GeneratePlanInput): Promise<GeneratedPlan> => {
    return generatePlanViaApiContract(input);
  },

  approvePlan: async (planId: string): Promise<GeneratedPlan> => {
    const accessToken = useAuthStore.getState().session?.accessToken;
    if (accessToken) {
      const approvedPlan = await usePlansStore.getState().approvePlan(planId);
      if (approvedPlan) {
        syncApprovedPlanQuestsMock([approvedPlan]);
        return approvedPlan;
      }
    }

    return approvePlanMock(planId);
  },
};
