import {
  approvePlanMock,
  generatePlanMock,
  getPlansMock,
  type GeneratePlanMockInput,
  type GetPlansMockInput,
} from '@/src/features/mvp/services';
import type { GeneratedPlan } from '@/shared/models/mvp-contracts.model';

export type GeneratePlanInput = GeneratePlanMockInput;
export type GetPlansInput = GetPlansMockInput;

export const plansService = {
  getPlans: async (input: GetPlansInput = {}): Promise<GeneratedPlan[]> =>
    getPlansMock(input),

  generatePlan: async (input: GeneratePlanInput): Promise<GeneratedPlan> =>
    generatePlanMock(input),

  approvePlan: async (planId: string): Promise<GeneratedPlan> =>
    approvePlanMock(planId),
};
