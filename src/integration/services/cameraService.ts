import { Asset } from 'expo-asset';
import * as ImagePicker from 'expo-image-picker';

import type { CapturedPhoto } from '@/shared/models/mvp-contracts.model';

const DEFAULT_CAPTURE_QUALITY = 0.8;
const PROJECT_SAMPLE_PHOTO = require('../../../assets/images/react-logo.png');

const resolveMimeTypeFromUri = (uri: string): string => {
  const normalized = uri.toLowerCase();
  if (normalized.endsWith('.png')) {
    return 'image/png';
  }

  if (normalized.endsWith('.webp')) {
    return 'image/webp';
  }

  return 'image/jpeg';
};

const resolveFileNameFromUri = (uri: string, fallback: string) => {
  const cleanedUri = uri.split('?')[0] ?? uri;
  const fileName = cleanedUri.split('/').pop();
  return fileName && fileName.trim().length > 0 ? fileName : fallback;
};

const normalizePhoto = (
  input: {
    uri: string;
    width?: number;
    height?: number;
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
    previewUri?: string;
  },
  fallbackFileName: string,
): CapturedPhoto => {
  const normalizedUri = input.uri.trim();
  const resolvedFileName = input.fileName?.trim().length
    ? input.fileName.trim()
    : resolveFileNameFromUri(normalizedUri, fallbackFileName);

  return {
    uri: normalizedUri,
    width: input.width,
    height: input.height,
    fileName: resolvedFileName,
    mimeType: input.mimeType?.trim().length ? input.mimeType : resolveMimeTypeFromUri(normalizedUri),
    fileSize: input.fileSize,
    previewUri: input.previewUri ?? normalizedUri,
  };
};

const pickSingleImage = (result: ImagePicker.ImagePickerResult, fallbackFileName: string) => {
  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  if (!asset?.uri) {
    return null;
  }

  return normalizePhoto(
    {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      fileName: asset.fileName ?? undefined,
      mimeType: asset.mimeType ?? undefined,
      fileSize: asset.fileSize ?? undefined,
      previewUri: asset.uri,
    },
    fallbackFileName,
  );
};

export const cameraService = {
  requestPermissions: async () => {
    const [cameraPermission, mediaPermission] = await Promise.all([
      ImagePicker.requestCameraPermissionsAsync(),
      ImagePicker.requestMediaLibraryPermissionsAsync(),
    ]);

    return {
      cameraGranted: cameraPermission.granted,
      mediaLibraryGranted: mediaPermission.granted,
    };
  },

  openCamera: async (): Promise<CapturedPhoto | null> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Camera permission is required.');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: DEFAULT_CAPTURE_QUALITY,
      base64: false,
      exif: false,
    });

    return pickSingleImage(result, `camera-${Date.now()}.jpg`);
  },

  openGallery: async (): Promise<CapturedPhoto | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Gallery permission is required.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      allowsEditing: false,
      quality: DEFAULT_CAPTURE_QUALITY,
      base64: false,
      exif: false,
    });

    return pickSingleImage(result, `gallery-${Date.now()}.jpg`);
  },

  preparePhoto: async (photo: CapturedPhoto): Promise<CapturedPhoto> =>
    normalizePhoto(photo, `photo-${Date.now()}.jpg`),

  openProjectPhoto: async (): Promise<CapturedPhoto> => {
    const asset = Asset.fromModule(PROJECT_SAMPLE_PHOTO);
    if (!asset.localUri) {
      await asset.downloadAsync();
    }

    const resolvedUri = asset.localUri ?? asset.uri;
    if (!resolvedUri) {
      throw new Error('Project sample photo is unavailable.');
    }

    return normalizePhoto(
      {
        uri: resolvedUri,
        width: asset.width,
        height: asset.height,
        fileName: 'project-sample-react-logo.png',
        mimeType: 'image/png',
        previewUri: resolvedUri,
      },
      'project-sample-react-logo.png',
    );
  },
};

