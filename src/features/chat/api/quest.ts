import { request } from '@/src/features/auth/api/client';

export const generateQuestByPrompt = async (
  prompt: string,
  accessToken: string,
): Promise<unknown> => {
  const formData = new FormData();
  formData.append('Prompt', prompt);

  return request<unknown>('/api/ai/quest', {
    method: 'POST',
    body: formData,
    accessToken,
    timeoutMs: 120000,
  });
};
