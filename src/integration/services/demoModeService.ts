import type { UserRole } from '@/shared/models/mvp-contracts.model';
import {
  applyDemoScenarioMock,
  type DemoScenarioApplyResult,
  type DemoScenarioKey,
} from '@/src/features/mvp/services/mock-layer-services';

export type DemoScenario = {
  key: DemoScenarioKey;
  title: string;
  description: string;
  role: UserRole;
};

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    key: 'adult_no_children',
    title: 'Adult: no children',
    description: 'Shows empty child state and blocked planning target.',
    role: 'adult',
  },
  {
    key: 'adult_one_child',
    title: 'Adult: one child',
    description: 'Shows selected child dashboard with plans and quests.',
    role: 'adult',
  },
  {
    key: 'child_active_quests',
    title: 'Child: active quests',
    description: 'Shows execution flow with active quests ready to complete.',
    role: 'child',
  },
  {
    key: 'child_completed_history',
    title: 'Child: completed history',
    description: 'Shows completed quests history and progress results.',
    role: 'child',
  },
  {
    key: 'generated_plan_preview',
    title: 'Generated plan preview',
    description: 'Opens a ready draft plan preview for demo walkthrough.',
    role: 'adult',
  },
];

export const demoModeService = {
  scenarios: DEMO_SCENARIOS,
  activateScenario: async (scenario: DemoScenarioKey): Promise<DemoScenarioApplyResult> =>
    applyDemoScenarioMock(scenario),
};

export type { DemoScenarioApplyResult, DemoScenarioKey };
