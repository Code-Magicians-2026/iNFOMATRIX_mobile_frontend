import { request } from '@/src/features/auth/api/client';
import { getAgentResponseMock } from '@/src/features/mvp/services';
import { isOfflineTestingModeEnabled, syncMockLayerContextFromAuth } from '@/src/integration/services/offline-mode';

const EMPTY_AI_RESPONSE_FALLBACK = 'Сервер не повернув текст відповіді.';

interface AgentRequestDto {
  prompt: string;
}

const extractTextFromResponse = (data: unknown): string => {
  if (typeof data === 'string') {
    const trimmed = data.trim();
    return trimmed.length > 0 ? trimmed : EMPTY_AI_RESPONSE_FALLBACK;
  }

  if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>;
    const candidateKeys = ['response', 'answer', 'message', 'content', 'text'];

    for (const key of candidateKeys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
  }

  return EMPTY_AI_RESPONSE_FALLBACK;
};

export const sendPromptToAgent = async (
  prompt: string,
  authorization?: string,
): Promise<string> => {
  if (isOfflineTestingModeEnabled()) {
    syncMockLayerContextFromAuth();
    return getAgentResponseMock(prompt);
  }

  const headers = authorization ? { Authorization: authorization } : undefined;
  const payload: AgentRequestDto = { prompt };

  const response = await request<unknown>('/api/ai', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  return extractTextFromResponse(response);
};

