import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { GeneratedPlan, Quest, QuestStep } from '@/shared/models/mvp-contracts.model';

interface PlansState {
  plans: GeneratedPlan[];
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  getPlans: () => GeneratedPlan[];
  getApprovedQuestsByUser: (userId: string) => Quest[];
  upsertPlan: (plan: GeneratedPlan) => Promise<void>;
  upsertPlans: (plans: GeneratedPlan[]) => Promise<void>;
  approvePlan: (planId: string) => Promise<GeneratedPlan | null>;
  upsertQuestInPlans: (quest: Quest) => Promise<boolean>;
  clear: () => Promise<void>;
}

const STORAGE_KEY = 'AI_PLANS_CACHE_V1';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const toQuestStep = (value: unknown, fallbackQuestId: string, index: number): QuestStep | null => {
  if (!isObject(value) || !isNonEmptyString(value.title)) {
    return null;
  }

  return {
    id: isNonEmptyString(value.id) ? value.id : `${fallbackQuestId}-step-${index + 1}`,
    questId: isNonEmptyString(value.questId) ? value.questId : fallbackQuestId,
    title: value.title.trim(),
    description: isNonEmptyString(value.description) ? value.description.trim() : undefined,
    order: typeof value.order === 'number' && Number.isFinite(value.order) ? value.order : index + 1,
    status: value.status === 'completed' ? 'completed' : 'pending',
    completedAt: isNonEmptyString(value.completedAt) ? value.completedAt : undefined,
  };
};

const toQuest = (value: unknown, index: number): Quest | null => {
  if (!isObject(value)) {
    return null;
  }

  const id = isNonEmptyString(value.id) ? value.id : `quest-local-${Date.now()}-${index + 1}`;
  const assignedToUserId = isNonEmptyString(value.assignedToUserId) ? value.assignedToUserId : 'self-user';
  const title = isNonEmptyString(value.title) ? value.title : null;
  const description = isNonEmptyString(value.description) ? value.description : null;

  if (!title || !description) {
    return null;
  }

  const rawSteps = Array.isArray(value.steps) ? value.steps : [];
  const steps = rawSteps
    .map((step, stepIndex) => toQuestStep(step, id, stepIndex))
    .filter((step): step is QuestStep => step !== null);
  const completedStepsCount = steps.filter((step) => step.status === 'completed').length;

  return {
    id,
    assignedToUserId,
    title: title.trim(),
    description: description.trim(),
    category: isNonEmptyString(value.category) ? value.category : undefined,
    difficulty: isNonEmptyString(value.difficulty) ? value.difficulty : 'medium',
    rewardXp: typeof value.rewardXp === 'number' && Number.isFinite(value.rewardXp) ? value.rewardXp : 50,
    estimatedMinutes:
      typeof value.estimatedMinutes === 'number' && Number.isFinite(value.estimatedMinutes)
        ? value.estimatedMinutes
        : 15,
    status:
      value.status === 'active' ||
      value.status === 'completed' ||
      value.status === 'archived' ||
      value.status === 'draft'
        ? value.status
        : 'draft',
    steps: steps.length > 0 ? steps : undefined,
    stepsCount: steps.length > 0 ? steps.length : undefined,
    completedStepsCount: steps.length > 0 ? completedStepsCount : undefined,
    originalTask: isNonEmptyString(value.originalTask) ? value.originalTask : undefined,
    createdAt: isNonEmptyString(value.createdAt) ? value.createdAt : undefined,
    completedAt: isNonEmptyString(value.completedAt) ? value.completedAt : undefined,
    archivedAt: isNonEmptyString(value.archivedAt) ? value.archivedAt : undefined,
  };
};

const toGeneratedPlan = (value: unknown, index: number): GeneratedPlan | null => {
  if (!isObject(value) || !Array.isArray(value.quests)) {
    return null;
  }

  const quests = value.quests
    .map((quest, questIndex) => toQuest(quest, questIndex))
    .filter((quest): quest is Quest => quest !== null);
  if (quests.length === 0) {
    return null;
  }

  return {
    id: isNonEmptyString(value.id) ? value.id : `plan-local-${Date.now()}-${index + 1}`,
    title: isNonEmptyString(value.title) ? value.title : 'AI Plan',
    summary: isNonEmptyString(value.summary) ? value.summary : 'Generated plan',
    childMessage: isNonEmptyString(value.childMessage) ? value.childMessage : 'You can do it.',
    quests,
    totalEstimatedMinutes:
      typeof value.totalEstimatedMinutes === 'number' && Number.isFinite(value.totalEstimatedMinutes)
        ? value.totalEstimatedMinutes
        : quests.reduce((sum, quest) => sum + quest.estimatedMinutes, 0),
    status: isNonEmptyString(value.status) ? value.status : 'draft',
  };
};

const cloneStep = (step: QuestStep): QuestStep => ({ ...step });

const cloneQuest = (quest: Quest): Quest => ({
  ...quest,
  steps: quest.steps?.map(cloneStep),
});

const clonePlan = (plan: GeneratedPlan): GeneratedPlan => ({
  ...plan,
  quests: plan.quests.map(cloneQuest),
});

const isApprovedPlan = (plan: GeneratedPlan) => plan.status.trim().toLowerCase() === 'approved';

const persistPlans = async (plans: GeneratedPlan[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch {}
};

const upsertMany = (current: GeneratedPlan[], incoming: GeneratedPlan[]): GeneratedPlan[] => {
  const byId = new Map<string, GeneratedPlan>();

  current.forEach((plan) => {
    byId.set(plan.id, clonePlan(plan));
  });
  incoming.forEach((plan) => {
    byId.set(plan.id, clonePlan(plan));
  });

  const merged = Array.from(byId.values());
  return merged.sort((left, right) => right.id.localeCompare(left.id));
};

const activatePlan = (plan: GeneratedPlan): GeneratedPlan => ({
  ...plan,
  status: 'approved',
  quests: plan.quests.map((quest) => ({
    ...quest,
    status: quest.status === 'draft' ? 'active' : quest.status,
  })),
});

const usePlansStore = create<PlansState>((set, get) => ({
  plans: [],
  isHydrated: false,

  hydrate: async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      if (!value) {
        set({ plans: [], isHydrated: true });
        return;
      }

      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) {
        set({ plans: [], isHydrated: true });
        return;
      }

      const plans = parsed
        .map((item, index) => toGeneratedPlan(item, index))
        .filter((plan): plan is GeneratedPlan => plan !== null);

      set({ plans, isHydrated: true });
    } catch {
      set({ plans: [], isHydrated: true });
    }
  },

  getPlans: () => get().plans.map(clonePlan),

  getApprovedQuestsByUser: (userId: string) => {
    const normalizedUserId = userId.trim();
    if (!normalizedUserId) {
      return [];
    }

    return get()
      .plans
      .filter((plan) => isApprovedPlan(plan))
      .flatMap((plan) =>
        plan.quests
          .filter((quest) => quest.assignedToUserId === normalizedUserId)
          .map(cloneQuest),
      );
  },

  upsertPlan: async (plan: GeneratedPlan) => {
    const merged = upsertMany(get().plans, [plan]);
    set({ plans: merged });
    await persistPlans(merged);
  },

  upsertPlans: async (plans: GeneratedPlan[]) => {
    if (plans.length === 0) {
      return;
    }

    const merged = upsertMany(get().plans, plans);
    set({ plans: merged });
    await persistPlans(merged);
  },

  approvePlan: async (planId: string) => {
    const current = get().plans;
    const index = current.findIndex((plan) => plan.id === planId);
    if (index < 0) {
      return null;
    }

    const activated = activatePlan(current[index]);
    const next = [
      ...current.slice(0, index),
      activated,
      ...current.slice(index + 1),
    ];

    set({ plans: next });
    await persistPlans(next);
    return clonePlan(activated);
  },

  upsertQuestInPlans: async (quest: Quest) => {
    const current = get().plans;
    let hasChanges = false;
    const next = current.map((plan) => {
      const questIndex = plan.quests.findIndex((planQuest) => planQuest.id === quest.id);
      if (questIndex < 0) {
        return plan;
      }

      hasChanges = true;
      const updatedQuests = [
        ...plan.quests.slice(0, questIndex),
        cloneQuest(quest),
        ...plan.quests.slice(questIndex + 1),
      ];

      return {
        ...plan,
        quests: updatedQuests,
      };
    });

    if (!hasChanges) {
      return false;
    }

    set({ plans: next });
    await persistPlans(next);
    return true;
  },

  clear: async () => {
    set({ plans: [] });
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
  },
}));

export default usePlansStore;
