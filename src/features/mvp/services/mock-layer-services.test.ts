import { beforeEach, describe, expect, it } from 'vitest';

import {
  approvePlanMock,
  completeQuestMock,
  createChildMock,
  generatePlanMock,
  getChildrenMock,
  getMeMock,
  getPlansMock,
  getProgressMock,
  getQuestsMock,
  resetMockLayerState,
  setMockMeId,
} from '@/src/features/mvp/services/mock-layer-services';

describe('mock-layer-services', () => {
  beforeEach(() => {
    resetMockLayerState();
    setMockMeId('adult-1');
  });

  it('returns current user for getMeMock', async () => {
    const me = await getMeMock();

    expect(me.id).toBe('adult-1');
    expect(me.role).toBe('adult');
  });

  it('creates child profile and exposes it in children list', async () => {
    const createdChild = await createChildMock({
      fullName: 'Nadia Quest',
      age: 11,
      interests: ['reading'],
    });

    const children = await getChildrenMock();

    expect(createdChild.createdByAdultId).toBe('adult-1');
    expect(children.some((child) => child.id === createdChild.id)).toBe(true);
  });

  it('generates draft plan and approves quests for child', async () => {
    const generatedPlan = await generatePlanMock({
      targetUserId: 'child-1',
      prompt: 'Build focus and consistency this week.',
      category: 'study',
      intensity: 'medium',
    });

    expect(generatedPlan.status).toBe('draft');

    const approvedPlan = await approvePlanMock(generatedPlan.id);
    const childQuests = await getQuestsMock('child-1');

    expect(approvedPlan.status).toBe('approved');
    expect(childQuests.some((quest) => quest.id === approvedPlan.quests[0]?.id)).toBe(true);
    expect(childQuests.some((quest) => quest.status === 'active')).toBe(true);
  });

  it('binds approved plan quests to the exact target child', async () => {
    const generatedPlan = await generatePlanMock({
      targetUserId: 'child-2',
      prompt: 'Build calm evening structure and short clean-up routine.',
      category: 'routine',
      intensity: 'medium',
    });

    const approvedPlan = await approvePlanMock(generatedPlan.id);
    const childOneQuests = await getQuestsMock('child-1');
    const childTwoQuests = await getQuestsMock('child-2');

    const approvedQuestIds = new Set(approvedPlan.quests.map((quest) => quest.id));

    expect(childTwoQuests.some((quest) => approvedQuestIds.has(quest.id))).toBe(true);
    expect(childOneQuests.some((quest) => approvedQuestIds.has(quest.id))).toBe(false);
  });

  it('returns latest plans for child through getPlansMock', async () => {
    const generatedPlan = await generatePlanMock({
      targetUserId: 'child-1',
      prompt: 'Keep steady study rhythm and confidence.',
      category: 'study',
      intensity: 'low',
    });

    const plans = await getPlansMock({ targetUserId: 'child-1', limit: 1 });

    expect(plans).toHaveLength(1);
    expect(plans[0]?.id).toBe(generatedPlan.id);
  });

  it('updates progress after quest completion', async () => {
    const questsBefore = await getQuestsMock('child-1');
    const questToComplete = questsBefore.find((quest) => quest.status === 'active');

    expect(questToComplete).toBeDefined();

    const progressBefore = await getProgressMock('child-1');
    const completedQuest = await completeQuestMock(questToComplete!.id);
    const progressAfter = await getProgressMock('child-1');

    expect(completedQuest.status).toBe('completed');
    expect(progressAfter.xp).toBe(progressBefore.xp + completedQuest.rewardXp);
    expect(progressAfter.completedQuestsCount).toBeGreaterThanOrEqual(progressBefore.completedQuestsCount);
    expect(progressAfter.stats[completedQuest.category]).toBeGreaterThan(0);
  });
});
