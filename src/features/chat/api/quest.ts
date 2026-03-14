import { request } from '@/src/features/auth/api/client';
import { getAgentResponseMock, getVisionVerificationMock } from '@/src/features/mvp/services';
import { isOfflineTestingModeEnabled, syncMockLayerContextFromAuth } from '@/src/integration/services/offline-mode';
import type { CapturedPhoto } from '@/shared/models/mvp-contracts.model';

type ReactNativeFormFile = {
  uri: string;
  name: string;
  type: string;
};

const resolvePhotoFileName = (photo: CapturedPhoto) => {
  if (photo.fileName && photo.fileName.trim().length > 0) {
    return photo.fileName.trim();
  }

  const normalizedUri = photo.uri.split('?')[0] ?? photo.uri;
  const fromUri = normalizedUri.split('/').pop();
  if (fromUri && fromUri.trim().length > 0) {
    return fromUri.trim();
  }

  return `photo-${Date.now()}.jpg`;
};

const resolvePhotoMimeType = (photo: CapturedPhoto) => {
  if (photo.mimeType && photo.mimeType.trim().length > 0) {
    return photo.mimeType.trim();
  }

  const normalizedUri = photo.uri.toLowerCase();
  if (normalizedUri.endsWith('.png')) {
    return 'image/png';
  }

  if (normalizedUri.endsWith('.webp')) {
    return 'image/webp';
  }

  return 'image/jpeg';
};

const toReactNativeFormFile = (photo: CapturedPhoto): ReactNativeFormFile => ({
  uri: photo.uri,
  name: resolvePhotoFileName(photo),
  type: resolvePhotoMimeType(photo),
});

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readStringField = (source: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};

const extractSummaryVisionText = (payload: unknown): string => {
  if (typeof payload === 'string' && payload.trim().length > 0) {
    return payload.trim();
  }

  if (!isObject(payload)) {
    return 'Vision summary is unavailable.';
  }

  const direct =
    readStringField(payload, ['summary', 'visionSummary', 'message', 'response', 'detail']) ??
    readStringField(payload, ['result', 'text']);
  if (direct) {
    return direct;
  }

  const nestedCandidates = [payload.data, payload.result, payload.value, payload.response];
  for (const candidate of nestedCandidates) {
    if (isObject(candidate)) {
      const nested = readStringField(candidate, ['summary', 'visionSummary', 'message', 'response', 'detail']);
      if (nested) {
        return nested;
      }
    }
  }

  return JSON.stringify(payload);
};

export const generateQuestByPrompt = async (
  prompt: string,
  accessToken: string,
): Promise<unknown> => {
  if (isOfflineTestingModeEnabled()) {
    syncMockLayerContextFromAuth();
    const response = await getAgentResponseMock(prompt);
    return { summary: response, source: 'offline-demo' };
  }

  const formData = new FormData();
  formData.append('Prompt', prompt);

  return request<unknown>('/api/ai/quest', {
    method: 'POST',
    body: formData,
    accessToken,
    timeoutMs: 120000,
  });
};

export const generateQuestByPromptWithPhoto = async (
  prompt: string,
  photo: CapturedPhoto,
  accessToken: string,
): Promise<unknown> => {
  if (isOfflineTestingModeEnabled()) {
    syncMockLayerContextFromAuth();
    const [response, vision] = await Promise.all([
      getAgentResponseMock(prompt),
      getVisionVerificationMock(),
    ]);
    return {
      summary: response,
      vision,
      photoUri: photo.uri,
      source: 'offline-demo',
    };
  }

  const formData = new FormData();
  formData.append('Prompt', prompt);

  const file = toReactNativeFormFile(photo);

  // React Native FormData accepts { uri, name, type } payload for file fields.
  formData.append('file', file as unknown as Blob);

  return request<unknown>('/api/ai/quest-vision', {
    method: 'POST',
    body: formData,
    accessToken,
    timeoutMs: 120000,
  });
};

export const generateSummaryVisionByPhotos = async (
  image1: CapturedPhoto,
  image2: CapturedPhoto,
  accessToken: string,
): Promise<string> => {
  if (isOfflineTestingModeEnabled()) {
    syncMockLayerContextFromAuth();
    return getVisionVerificationMock();
  }

  const formData = new FormData();
  const beforeFile = toReactNativeFormFile(image1);
  const afterFile = toReactNativeFormFile(image2);

  // Endpoint contract:
  // - image1: before photo
  // - image2: after photo
  formData.append('image1', beforeFile as unknown as Blob);
  formData.append('image2', afterFile as unknown as Blob);

  const response = await request<unknown>('/api/ai/summary-vision', {
    method: 'POST',
    body: formData,
    accessToken,
    timeoutMs: 120000,
  });

  return extractSummaryVisionText(response);
};
