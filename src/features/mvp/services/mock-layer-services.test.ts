import { beforeEach, describe, expect, it } from 'vitest';

import {
  applyDemoScenarioMock,
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
  toggleQuestStepMock,
  updateQuestAfterPhotoMock,
  updateQuestBeforePhotoMock,
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
      photo: {
        uri: 'file:///camera/photo-1.jpg',
        width: 1080,
        height: 1440,
        fileName: 'photo-1.jpg',
        mimeType: 'image/jpeg',
      },
    });

    expect(generatedPlan.status).toBe('draft');
    expect(generatedPlan.summary).toContain('AI demo');
    expect(generatedPlan.summary).toContain('Vision demo');
    expect(generatedPlan.quests[0]?.beforePhoto?.uri).toBe('file:///camera/photo-1.jpg');
    expect(generatedPlan.quests[0]?.reportPhotoRequired).toBe(true);

    const approvedPlan = await approvePlanMock(generatedPlan.id);
    const childQuests = await getQuestsMock('child-1');

    expect(approvedPlan.status).toBe('approved');
    expect(childQuests.some((quest) => quest.id === approvedPlan.quests[0]?.id)).toBe(true);
    expect(childQuests.some((quest) => quest.status === 'active')).toBe(true);
    const approvedQuest = childQuests.find((quest) => quest.id === approvedPlan.quests[0]?.id);
    expect(approvedQuest?.beforePhoto?.uri).toBe('file:///camera/photo-1.jpg');
    expect(approvedQuest?.reportPhotoRequired).toBe(true);
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

  it('generates plan for unknown API child id', async () => {
    const targetUserId = '1f9f6505-2d72-4712-8ca9-8189d7f6d18b';
    const generatedPlan = await generatePlanMock({
      targetUserId,
      prompt: 'Build a short after-school routine with focus and cleanup.',
      category: 'routine',
    });

    expect(generatedPlan.status).toBe('draft');
    expect(generatedPlan.quests.length).toBeGreaterThan(0);
    expect(generatedPlan.quests.every((quest) => quest.assignedToUserId === targetUserId)).toBe(true);
  });

  it('applies adult_no_children demo scenario with empty children list', async () => {
    const result = await applyDemoScenarioMock('adult_no_children');
    const me = await getMeMock();
    const children = await getChildrenMock();

    expect(result.role).toBe('adult');
    expect(result.selectedChildId).toBeNull();
    expect(me.role).toBe('adult');
    expect(children).toHaveLength(0);
  });

  it('applies generated_plan_preview scenario with draft plan payload', async () => {
    const result = await applyDemoScenarioMock('generated_plan_preview');
    const plans = await getPlansMock({ limit: 1 });

    expect(result.role).toBe('adult');
    expect(result.selectedChildId).toBe('child-1');
    expect(result.previewPlan?.status).toBe('draft');
    expect(result.previewRequest?.targetUserId).toBe('child-1');
    expect(result.previewRequest?.photo?.uri).toBe('file:///demo/room-scene.jpg');
    expect(plans[0]?.status).toBe('draft');
  });

  it('updates progress after quest completion', async () => {
    const questsBefore = await getQuestsMock('child-1');
    const questToComplete = questsBefore.find((quest) => quest.status === 'active');

    expect(questToComplete).toBeDefined();

    const progressBefore = await getProgressMock('child-1');
    const steps = [...(questToComplete?.steps ?? [])].sort((left, right) => left.order - right.order);
    for (const step of steps) {
      await toggleQuestStepMock(questToComplete!.id, step.id);
    }
    const completedQuest = await completeQuestMock(questToComplete!.id);
    const progressAfter = await getProgressMock('child-1');

    expect(completedQuest.status).toBe('archived');
    expect(progressAfter.xp).toBe(progressBefore.xp + completedQuest.rewardXp);
    expect(progressAfter.streak).toBe(progressBefore.streak + 1);
    expect(progressAfter.completedQuestsCount).toBeGreaterThanOrEqual(progressBefore.completedQuestsCount);
    expect(progressAfter.activeQuestsCount).toBeLessThanOrEqual(progressBefore.activeQuestsCount);
    expect(progressAfter.stats.quests).toBeGreaterThan(0);
  });

  it('keeps quest active after steps and archives only after explicit completion', async () => {
    const questsBefore = await getQuestsMock('child-1');
    const quest = questsBefore.find((item) => item.status === 'active' && (item.steps?.length ?? 0) > 1);
    expect(quest).toBeDefined();

    const steps = [...(quest?.steps ?? [])].sort((left, right) => left.order - right.order);
    expect(steps.length).toBeGreaterThan(1);

    const progressBefore = await getProgressMock('child-1');

    for (let index = 0; index < steps.length; index += 1) {
      const updatedQuest = await toggleQuestStepMock(quest!.id, steps[index]!.id);
      expect(updatedQuest.status).toBe('active');
    }

    const completedQuest = await completeQuestMock(quest!.id);
    const progressAfter = await getProgressMock('child-1');
    expect(completedQuest.status).toBe('archived');
    expect(progressAfter.xp).toBe(progressBefore.xp + quest!.rewardXp);
    expect(progressAfter.activeQuestsCount).toBeLessThan(progressBefore.activeQuestsCount);
    expect(progressAfter.completedQuestsCount).toBeGreaterThan(progressBefore.completedQuestsCount);
  });

  it('requires after photo on completion when before photo exists', async () => {
    const quest = (await getQuestsMock('child-1')).find((item) => item.status === 'active');
    expect(quest).toBeDefined();

    const withBeforePhoto = await updateQuestBeforePhotoMock(quest!.id, {
      uri: 'file:///photos/quest-before.jpg',
      fileName: 'quest-before.jpg',
      mimeType: 'image/jpeg',
    });

    expect(withBeforePhoto.reportPhotoRequired).toBe(true);
    expect(withBeforePhoto.beforePhoto?.uri).toContain('quest-before.jpg');

    const steps = [...(withBeforePhoto.steps ?? [])].sort((left, right) => left.order - right.order);
    for (const step of steps) {
      await toggleQuestStepMock(withBeforePhoto.id, step.id);
    }

    await expect(completeQuestMock(withBeforePhoto.id)).rejects.toThrow('Quest report photo is required');

    const withAfterPhoto = await updateQuestAfterPhotoMock(withBeforePhoto.id, {
      uri: 'file:///photos/quest-after.jpg',
      fileName: 'quest-after.jpg',
      mimeType: 'image/jpeg',
    });

    expect(withAfterPhoto.afterPhoto?.uri).toContain('quest-after.jpg');

    const completedQuest = await completeQuestMock(withBeforePhoto.id);
    expect(completedQuest.status).toBe('archived');
    expect(completedQuest.afterPhoto?.uri).toContain('quest-after.jpg');
  });

  it('updates before photo for draft quest in generated plan', async () => {
    const generatedPlan = await generatePlanMock({
      targetUserId: 'child-1',
      prompt: 'Create one draft mission.',
      category: 'study',
    });

    const draftQuest = generatedPlan.quests[0];
    expect(draftQuest).toBeDefined();

    await updateQuestBeforePhotoMock(draftQuest!.id, {
      uri: 'file:///photos/draft-before.jpg',
      fileName: 'draft-before.jpg',
      mimeType: 'image/jpeg',
    });

    const plans = await getPlansMock({ targetUserId: 'child-1', limit: 1 });
    const updatedDraftQuest = plans[0]?.quests.find((quest) => quest.id === draftQuest!.id);
    expect(updatedDraftQuest?.beforePhoto?.uri).toContain('draft-before.jpg');
    expect(updatedDraftQuest?.reportPhotoRequired).toBe(true);
  });
});
