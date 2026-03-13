import type { PlanRequest } from '@/shared/models/mvp-contracts.model';

export const mockPlanRequests: PlanRequest[] = [
  {
    id: 'plan-request-1',
    targetUserId: 'child-1',
    prompt: 'Prepare a balanced after-school routine with study and movement.',
    category: 'study',
    intensity: 'medium',
    status: 'approved',
  },
  {
    id: 'plan-request-2',
    targetUserId: 'child-2',
    prompt: 'Build a confidence plan for science and daily consistency.',
    category: 'science',
    intensity: 'high',
    status: 'generated',
  },
];
