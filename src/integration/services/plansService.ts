import {
  approvePlanMock,
  generatePlanMock,
  getPlansMock,
  type GeneratePlanMockInput,
  type GetPlansMockInput,
} from '@/src/features/mvp/services';
import type { GeneratedPlan } from '@/shared/models/mvp-contracts.model';

export type GeneratePlanInput = GeneratePlanMockInput;
export type GetPlansInput = GetPlansMockInput;

const resolvePhotoMimeType = (mimeType: string | undefined) => mimeType?.trim() || 'image/jpeg';

const resolvePhotoFileName = (input: GeneratePlanInput) =>
  input.photo?.fileName?.trim() || `captured-photo-${Date.now()}.jpg`;

type ReactNativeFilePart = {
  uri: string;
  name: string;
  type: string;
};

// Contract helper for real backend integration (file upload without base64).
export const buildGeneratePlanFormData = (input: GeneratePlanInput): FormData => {
  const formData = new FormData();
  formData.append('targetUserId', input.targetUserId);
  formData.append('prompt', input.prompt);
  formData.append('category', input.category);
  formData.append('intensity', input.intensity);

  if (input.photo?.uri) {
    const photoPart: ReactNativeFilePart = {
      uri: input.photo.uri,
      name: resolvePhotoFileName(input),
      type: resolvePhotoMimeType(input.photo.mimeType),
    };
    formData.append('photo', photoPart as unknown as Blob);
  }

  return formData;
};

const postPlanGenerationMultipart = async (
  formData: FormData,
  input: GeneratePlanInput,
): Promise<GeneratedPlan> => {
  // API endpoint integration point: submit multipart/form-data here when backend is wired.
  void formData;
  return generatePlanMock(input);
};

export const plansService = {
  getPlans: async (input: GetPlansInput = {}): Promise<GeneratedPlan[]> =>
    getPlansMock(input),

  generatePlan: async (input: GeneratePlanInput): Promise<GeneratedPlan> =>
    generatePlanMock(input),

  uploadPhotoAndGenerate: async (input: GeneratePlanInput): Promise<GeneratedPlan> => {
    if (!input.photo?.uri) {
      throw new Error('Photo is required for uploadPhotoAndGenerate.');
    }

    const formData = buildGeneratePlanFormData(input);
    return postPlanGenerationMultipart(formData, input);
  },

  approvePlan: async (planId: string): Promise<GeneratedPlan> =>
    approvePlanMock(planId),
};
