import { beforeEach, describe, expect, it, vi } from 'vitest';

import useAuthStore from '@/context/Auth-store';
import { resetMockLayerState, setMockMeId } from '@/src/features/mvp/services';

import { plansService } from './plansService';

const createResponse = (status: number, body: unknown, contentType = 'application/json') =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': contentType },
  });

describe('plansService.uploadPhotoAndGenerate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetMockLayerState();
    setMockMeId('adult-1');
    useAuthStore.setState({
      session: null,
      currentUser: null,
      role: null,
      selectedChildId: null,
      family: null,
      pendingFamilyName: null,
    });
  });

  it('generates plan when photo is provided', async () => {
    const plan = await plansService.uploadPhotoAndGenerate({
      targetUserId: 'child-1',
      prompt: 'Create tidy room and homework plan.',
      category: 'routine',
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
    });

    expect(plan.status).toBe('draft');
    expect(plan.summary).not.toContain('using camera context');
  });

  it('uses swagger contract /api/ai/quest with Prompt multipart and auth token', async () => {
    useAuthStore.setState({
      session: {
        email: 'adult@example.com',
        accessToken: 'token-quest',
        refreshToken: null,
        expiresIn: 3600,
        tokenType: 'Bearer',
      },
      currentUser: {
        id: 'adult-api-1',
        fullName: 'Adult API',
        email: 'adult@example.com',
        role: 'adult',
        level: 1,
        xp: 0,
        streak: 0,
        avatarType: 'mentor',
      },
      role: 'adult',
    });

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createResponse(200, {
        id: 'quest-api-1',
        title: 'Focus Sprint',
        description: 'Complete one focused study sprint.',
        difficulty: 'medium',
        rewardXp: 90,
        estimatedMinutes: 35,
        status: 'active',
      }),
    );

    const plan = await plansService.generatePlan({
      targetUserId: 'adult-api-1',
      prompt: 'Create a focused study quest.',
    });

    expect(plan.status).toBe('approved');
    expect(plan.quests).toHaveLength(1);
    expect(plan.quests[0]?.title).toBe('Focus Sprint');
    expect(plan.totalEstimatedMinutes).toBe(35);

    const [calledUrl, options] = fetchMock.mock.calls[0] ?? [];
    expect(calledUrl).toBe('https://infomatrix-api.azurewebsites.net/api/ai/quest');

    const headers = options?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer token-quest');

    const body = options?.body as FormData;
    expect(body.get('Prompt')).toBe('Create a focused study quest.');
    expect(body.get('prompt')).toBeNull();
  });
});
