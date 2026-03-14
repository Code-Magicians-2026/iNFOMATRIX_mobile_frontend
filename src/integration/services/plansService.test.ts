import { beforeEach, describe, expect, it } from 'vitest';

import { resetMockLayerState, setMockMeId } from '@/src/features/mvp/services';

import { plansService } from './plansService';

describe('plansService.uploadPhotoAndGenerate', () => {
  beforeEach(() => {
    resetMockLayerState();
    setMockMeId('adult-1');
  });

  it('generates plan when photo is provided', async () => {
    const plan = await plansService.uploadPhotoAndGenerate({
      targetUserId: 'child-1',
      prompt: 'Create tidy room and homework plan.',
      category: 'routine',
      intensity: 'medium',
      photo: {
        uri: 'file:///camera/room.jpg',
        mimeType: 'image/jpeg',
        fileName: 'room.jpg',
      },
    });

    expect(plan.status).toBe('draft');
    expect(plan.summary).toContain('using camera context');
  });

  it('generates plan when photo is missing', async () => {
    const plan = await plansService.uploadPhotoAndGenerate({
      targetUserId: 'child-1',
      prompt: 'Create tidy room and homework plan.',
      category: 'routine',
      intensity: 'medium',
    });

    expect(plan.status).toBe('draft');
    expect(plan.summary).not.toContain('using camera context');
  });
});
