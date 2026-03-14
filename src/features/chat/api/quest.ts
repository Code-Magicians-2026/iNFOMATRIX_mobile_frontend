import { request } from '@/src/features/auth/api/client';
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

export const generateQuestByPromptWithPhoto = async (
  prompt: string,
  photo: CapturedPhoto,
  accessToken: string,
): Promise<unknown> => {
  const formData = new FormData();
  formData.append('Prompt', prompt);

  const file: ReactNativeFormFile = {
    uri: photo.uri,
    name: resolvePhotoFileName(photo),
    type: resolvePhotoMimeType(photo),
  };

  // React Native FormData accepts { uri, name, type } payload for file fields.
  formData.append('file', file as unknown as Blob);

  return request<unknown>('/api/ai/quest-vision', {
    method: 'POST',
    body: formData,
    accessToken,
    timeoutMs: 120000,
  });
};
