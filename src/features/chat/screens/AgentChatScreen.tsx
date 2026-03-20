import React from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, Vibration, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import useAuthStore from '@/context/Auth-store';
import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import { useI18n } from '@/src/i18n/useI18n';
import { getApiErrorMessage } from '@/src/features/auth/api/client';
import type {
  CapturedPhoto,
  ChildProfile,
  UserProfile,
  UserRole,
} from '@/shared/models/mvp-contracts.model';
import {
  EmptyState,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from '@/shared/components/ui';
import achievementsStorage from '@/src/features/profile/services/achievementsStorage';
import { cameraService, childrenService, plansService, userService } from '@/src/integration/services';
import type { GeneratePlanInput } from '@/src/integration/services';
import type { MediaPermissionState } from '@/src/integration/services/cameraService';
import type { AppStackParamList } from '@/src/navigation/AppNavigator';

const QUICK_PROMPTS = [
  'Create an after-school routine',
  'Turn room cleaning into quests',
  'Create a calm evening plan',
  'Make homework feel like a game',
] as const;

const BRAND_RED = '#ff2d55';
const BRAND_RED_BORDER = 'rgba(255, 45, 85, 0.48)';
const CHAT_CONTEXT_REFRESH_COOLDOWN_MS = 5000;

type TargetMode = 'myself' | 'child';

type ChatNavigation = NativeStackNavigationProp<AppStackParamList>;

const resolvePermissionDescription = (
  state: MediaPermissionState,
  source: 'camera' | 'gallery',
  language: 'uk' | 'en',
) => {
  const sourceLabel =
    language === 'uk'
      ? source === 'camera'
        ? 'Камера'
        : 'Галерея'
      : source === 'camera'
        ? 'Camera'
        : 'Gallery';

  if (state === 'granted') {
    return language === 'uk'
      ? `${sourceLabel}: доступ надано.`
      : `${sourceLabel} access granted.`;
  }

  if (state === 'blocked') {
    return language === 'uk'
      ? `${sourceLabel}: доступ заблоковано. Відкрийте налаштування пристрою.`
      : `${sourceLabel} access blocked. Open device settings.`;
  }

  if (state === 'undetermined') {
    return language === 'uk'
      ? `${sourceLabel}: доступ ще не запитувався.`
      : `${sourceLabel} access not requested yet.`;
  }

  return language === 'uk'
    ? `${sourceLabel}: доступ відхилено.`
    : `${sourceLabel} access denied.`;
};

const buildFallbackMeProfile = (role: UserRole, language: 'uk' | 'en'): UserProfile => ({
  id: role === 'adult' ? 'adult-self' : 'child-self',
  fullName:
    language === 'uk'
      ? role === 'adult'
        ? 'Профіль дорослого'
        : 'Профіль дитини'
      : role === 'adult'
        ? 'Adult Profile'
        : 'Child Profile',
  email: `${role}@local.infomatrix`,
  role,
  level: 1,
  xp: 0,
  streak: 0,
  avatarType: role === 'adult' ? 'mentor' : 'adventurer',
});

const normalizePromptValue = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const resolvePromptPhotoAchievementId = (photo: CapturedPhoto): 'scene_scout' | 'detail_hunter' | 'eagle_eye' => {
  const width = photo.width ?? 0;
  const height = photo.height ?? 0;
  const megapixels = (width * height) / 1_000_000;
  const fileSizeMb = (photo.fileSize ?? 0) / (1024 * 1024);

  if (megapixels >= 6) {
    return 'eagle_eye';
  }

  if (fileSizeMb >= 4) {
    return 'detail_hunter';
  }

  return 'scene_scout';
};

const resolvePhotoAchievementLabel = (photo: CapturedPhoto, language: 'uk' | 'en'): string => {
  const achievementId = resolvePromptPhotoAchievementId(photo);

  if (achievementId === 'eagle_eye') {
    return language === 'uk' ? 'Досягнення: Eagle Eye' : 'Achievement: Eagle Eye';
  }

  if (achievementId === 'detail_hunter') {
    return language === 'uk' ? 'Досягнення: Detail Hunter' : 'Achievement: Detail Hunter';
  }

  return language === 'uk' ? 'Досягнення: Scene Scout' : 'Achievement: Scene Scout';
};

const AgentChatScreen = () => {
  const navigation = useNavigation<ChatNavigation>();
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isTablet, spacing } = useResponsiveLayout();
  const { language } = useI18n();
  const styles = React.useMemo(
    () => getStyles(cardMaxWidth, isTablet, spacing),
    [cardMaxWidth, isTablet, spacing],
  );
  const isUk = language === 'uk';

  const role = useAuthStore((s) => s.role);
  const session = useAuthStore((s) => s.session);
  const currentUser = useAuthStore((s) => s.currentUser);
  const selectedChildId = useAuthStore((s) => s.selectedChildId);
  const setSelectedChildId = useAuthStore((s) => s.setSelectedChildId);
  const setRole = useAuthStore((s) => s.setRole);

  const copy = React.useMemo(
    () =>
      isUk
        ? {
            activeTargetFallback: 'Немає активної дитини',
            myself: 'Я',
            child: 'Дитина',
            builderContextError: 'Не вдалося завантажити контекст AI Builder.',
            cameraBlocked: 'Доступ до камери заблоковано. Відкрийте налаштування.',
            cameraDenied: 'Доступ до камери відхилено. Можна продовжити з галереєю.',
            cameraRequestFailed: 'Не вдалося запитати доступ до камери.',
            galleryBlocked: 'Доступ до галереї заблоковано. Відкрийте налаштування.',
            galleryDenied: 'Доступ до галереї відхилено.',
            galleryRequestFailed: 'Не вдалося запитати доступ до галереї.',
            settingsOpenFailed: 'Не вдалося відкрити налаштування.',
            cameraBlockedUseGallery:
              'Доступ до камери заблоковано. Використайте галерею або відкрийте налаштування.',
            cameraRequired: 'Для фото потрібен доступ до камери. Можна обрати галерею.',
            captureFailed: 'Не вдалося зробити фото. Спробуйте ще раз.',
            galleryRequiredForPick: 'Для вибору фото потрібен доступ до галереї.',
            pickFailed: 'Не вдалося обрати фото з галереї.',
            promptRequired: 'Щоб згенерувати план, введіть запит.',
            profileNotLoaded: 'Активний профіль ще не завантажено. Оновіть і спробуйте знову.',
            noChildForGeneration: 'Не обрано активну дитину. Оберіть дитину перед генерацією.',
            generationFailed: 'Генерація не вдалася. Спробуйте ще раз.',
            loadingBuilder: 'Завантаження AI конструктора планів...',
            builderTitle: 'AI конструктор планів',
            builderSubtitle: 'Додайте фото, введіть запит і згенеруйте структурований AI-план',
            builderErrorTitle: 'Помилка білдера',
            generationErrorTitle: 'Помилка генерації',
            close: 'Закрити',
            tryAgain: 'Спробувати знову',
            selectedTarget: 'Обрана ціль',
            activeTarget: (label: string) => `Активна: ${label}`,
            noActiveChildTitle: 'Не обрано активну дитину',
            noActiveChildDescription: 'Оберіть профіль дитини для генерації плану.',
            selectFirstChild: 'Обрати першу дитину',
            ageLevel: (age: number, level: number) => `Вік ${age} | Рівень ${level}`,
            noChildProfilesTitle: 'Немає профілів дітей',
            noChildProfilesDescription: 'Створіть профіль дитини спочатку на Головній.',
            photoTitle: 'Фото кімнати / ситуації',
            photoSubtitle: 'Фото дає AI контекст для генерації плану',
            photoHint:
              'Додайте фото за бажанням, щоб AI отримав кращий контекст кімнати/ситуації.',
            allowCamera: 'Дозволити доступ до камери',
            chooseFromGallery: 'Обрати з галереї',
            allowGallery: 'Дозволити доступ до галереї',
            openSettings: 'Відкрити налаштування',
            noPhotoTitle: 'Фото не додано',
            noPhotoDescription: 'Натисніть Зробити фото або Обрати з галереї для AI-контексту.',
            lockedAchievement: 'Досягнення заблоковано: Scene Scout',
            replaceFromCamera: 'Замінити з камери',
            takePhoto: 'Зробити фото',
            replaceFromGallery: 'Замінити з галереї',
            removePhoto: 'Видалити фото',
            promptTitle: 'Запит',
            promptSubtitle: 'Опишіть план, який хочете отримати',
            promptPlaceholder: 'Опишіть, що має побудувати AI...',
            voiceNotReady: 'Голосовий ввід ще не налаштований. Поки використовуйте клавіатуру.',
            voiceInput: 'Голосовий ввід',
            quickPromptsTitle: 'Швидкі запити',
            quickPromptsSubtitle: 'Тапніть для автозаповнення',
            generating: 'Генерація...',
            generate: 'Згенерувати',
            generatingPlan: 'Генерація AI-плану...',
            resolution: 'Роздільна здатність',
            size: 'Розмір',
          }
        : {
            activeTargetFallback: 'No active child',
            myself: 'Myself',
            child: 'Child',
            builderContextError: 'Failed to load AI Builder context.',
            cameraBlocked: 'Camera permission is blocked. Open settings to enable it.',
            cameraDenied: 'Camera permission was denied. You can continue with gallery.',
            cameraRequestFailed: 'Failed to request camera permission.',
            galleryBlocked: 'Gallery permission is blocked. Open settings to enable it.',
            galleryDenied: 'Gallery permission was denied.',
            galleryRequestFailed: 'Failed to request gallery permission.',
            settingsOpenFailed: 'Failed to open settings.',
            cameraBlockedUseGallery: 'Camera permission is blocked. Use gallery or open settings.',
            cameraRequired: 'Camera permission is required. You can fallback to gallery.',
            captureFailed: 'Failed to capture photo. Please try again.',
            galleryRequiredForPick: 'Gallery permission is required to choose photo.',
            pickFailed: 'Failed to pick photo from gallery.',
            promptRequired: 'Prompt is required to generate a plan.',
            profileNotLoaded: 'Active profile not loaded yet. Refresh and try again.',
            noChildForGeneration: 'No active child selected. Select child target before generation.',
            generationFailed: 'Generation failed. Please try again.',
            loadingBuilder: 'Loading AI Plan Builder...',
            builderTitle: 'AI Plan Builder',
            builderSubtitle: 'Capture one photo, add prompt, and generate a structured AI plan',
            builderErrorTitle: 'Builder error',
            generationErrorTitle: 'Generation failed',
            close: 'Close',
            tryAgain: 'Try generate again',
            selectedTarget: 'Selected Target',
            activeTarget: (label: string) => `Active: ${label}`,
            noActiveChildTitle: 'No active child selected',
            noActiveChildDescription: 'Select child profile to generate a plan for them.',
            selectFirstChild: 'Select first child',
            ageLevel: (age: number, level: number) => `Age ${age} | Lvl ${level}`,
            noChildProfilesTitle: 'No child profiles',
            noChildProfilesDescription: 'Create child profile from Home first.',
            photoTitle: 'Room / Situation Photo',
            photoSubtitle: 'Photo is AI context for plan generation',
            photoHint: 'Add a photo optionally to give AI better room/situation context for generation.',
            allowCamera: 'Allow camera access',
            chooseFromGallery: 'Choose from gallery',
            allowGallery: 'Allow gallery access',
            openSettings: 'Open settings',
            noPhotoTitle: 'No photo attached',
            noPhotoDescription: 'Use Take photo or Choose from gallery to add AI context.',
            lockedAchievement: 'Achievement locked: Scene Scout',
            replaceFromCamera: 'Replace from camera',
            takePhoto: 'Take photo',
            replaceFromGallery: 'Replace from gallery',
            removePhoto: 'Remove photo',
            promptTitle: 'Prompt',
            promptSubtitle: 'Describe the plan you want',
            promptPlaceholder: 'Write what the AI should build...',
            voiceNotReady: 'Voice input is not configured yet. Use keyboard prompt for now.',
            voiceInput: 'Voice input',
            quickPromptsTitle: 'Quick Prompts',
            quickPromptsSubtitle: 'Tap to prefill',
            generating: 'Generating...',
            generate: 'Generate',
            generatingPlan: 'Generating AI plan...',
            resolution: 'Resolution',
            size: 'Size',
          },
    [isUk],
  );

  const quickPrompts = React.useMemo(
    () =>
      isUk
        ? [
            'Створи післяшкільну рутину',
            'Перетвори прибирання кімнати на квести',
            'Створи спокійний вечірній план',
            'Зроби домашні завдання схожими на гру',
          ]
        : [...QUICK_PROMPTS],
    [isUk],
  );

  const effectiveRole: UserRole = role ?? 'child';

  const [me, setMe] = React.useState<UserProfile | null>(null);
  const [children, setChildren] = React.useState<ChildProfile[]>([]);
  const [targetMode, setTargetMode] = React.useState<TargetMode>('myself');
  const hasManualTargetModeRef = React.useRef(false);

  const [prompt, setPrompt] = React.useState('');
  const [selectedQuickPromptIndex, setSelectedQuickPromptIndex] = React.useState<number | null>(null);
  const [capturedPhoto, setCapturedPhoto] = React.useState<CapturedPhoto | null>(null);
  const [cameraPermissionState, setCameraPermissionState] =
    React.useState<MediaPermissionState>('undetermined');
  const [galleryPermissionState, setGalleryPermissionState] =
    React.useState<MediaPermissionState>('undetermined');

  const [isLoading, setIsLoading] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [contextError, setContextError] = React.useState<string | null>(null);
  const [generationError, setGenerationError] = React.useState<string | null>(null);
  const hasLoadedContextRef = React.useRef(false);
  const lastContextRefreshAtRef = React.useRef(0);

  React.useEffect(() => {
    if (!role) {
      void setRole('child');
    }
  }, [role, setRole]);

  const refreshPermissionsState = React.useCallback(async () => {
    const status = await cameraService.getPermissionsStatus();
    setCameraPermissionState(status.camera);
    setGalleryPermissionState(status.gallery);
  }, []);

  const loadBuilderContext = React.useCallback(async (showLoader: boolean) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      setContextError(null);

      const isAuthenticated = Boolean(session?.accessToken);
      let meData: UserProfile | null = currentUser
        ? {
            ...currentUser,
            role: effectiveRole,
          }
        : null;
      let childrenData: ChildProfile[] = [];

      if (!meData) {
        meData = await userService.getMe();
      }

      if (effectiveRole === 'adult' && isAuthenticated) {
        try {
          childrenData = await childrenService.getChildren();
        } catch {
          childrenData = [];
        }
      }

      if (!meData) {
        meData = buildFallbackMeProfile(effectiveRole, isUk ? 'uk' : 'en');
      }

      setMe(meData);
      setChildren(childrenData);

      if (effectiveRole !== 'adult') {
        setTargetMode('myself');
        return;
      }

      if (childrenData.length === 0) {
        setTargetMode('myself');
        void setSelectedChildId(null).catch(() => {});
        return;
      }

      const isSelectedChildValid = selectedChildId
        ? childrenData.some((child) => child.id === selectedChildId)
        : false;
      const fallbackChildId = childrenData[0]?.id ?? null;
      const resolvedChildId = isSelectedChildValid ? selectedChildId : fallbackChildId;
      if (resolvedChildId !== selectedChildId) {
        void setSelectedChildId(resolvedChildId).catch(() => {});
      }
      setTargetMode((currentMode) => {
        if (hasManualTargetModeRef.current) {
          if (currentMode === 'child' && !resolvedChildId) {
            return 'myself';
          }

          return currentMode;
        }

        return resolvedChildId ? 'child' : 'myself';
      });
    } catch {
      setContextError(copy.builderContextError);
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
      lastContextRefreshAtRef.current = Date.now();
    }
  }, [copy.builderContextError, currentUser, effectiveRole, isUk, selectedChildId, session?.accessToken, setSelectedChildId]);

  useFocusEffect(
    React.useCallback(() => {
      const shouldShowLoader = !hasLoadedContextRef.current;
      const now = Date.now();
      const isRefreshCooldownActive =
        now - lastContextRefreshAtRef.current < CHAT_CONTEXT_REFRESH_COOLDOWN_MS;
      hasLoadedContextRef.current = true;

      if (shouldShowLoader || !isRefreshCooldownActive) {
        void loadBuilderContext(shouldShowLoader);
        void refreshPermissionsState();
      }

      return undefined;
    }, [loadBuilderContext, refreshPermissionsState]),
  );

  const selectedChild = React.useMemo(
    () => children.find((child) => child.id === selectedChildId) ?? null,
    [children, selectedChildId],
  );

  const canUseChildTarget = effectiveRole === 'adult' && children.length > 0;
  const activeTargetLabel = targetMode === 'myself'
    ? me?.fullName ?? copy.myself
    : selectedChild?.fullName ?? copy.activeTargetFallback;
  const isChildTargetWithoutSelection =
    targetMode === 'child' && canUseChildTarget && !selectedChild;
  const resolvedMyselfTargetUserId = me?.id ?? currentUser?.id ?? null;
  const isGenerateDisabled =
    isGenerating ||
    prompt.trim().length === 0 ||
    (targetMode === 'child' && !selectedChild) ||
    (targetMode === 'myself' && !resolvedMyselfTargetUserId);
  const isCameraBlocked = cameraPermissionState === 'blocked';
  const isGalleryBlocked = galleryPermissionState === 'blocked';
  const shouldShowPermissionHelp =
    cameraPermissionState !== 'granted' || galleryPermissionState !== 'granted';
  const activeQuickPromptIndex = React.useMemo(() => {
    const normalizedPrompt = normalizePromptValue(prompt);
    if (!normalizedPrompt) {
      return null;
    }

    const index = quickPrompts.findIndex(
      (item) => normalizePromptValue(item) === normalizedPrompt,
    );
    return index >= 0 ? index : null;
  }, [prompt, quickPrompts]);

  const resolvedQuickPromptIndex = selectedQuickPromptIndex ?? activeQuickPromptIndex;
  const photoAchievementLabel = React.useMemo(
    () => (capturedPhoto ? resolvePhotoAchievementLabel(capturedPhoto, isUk ? 'uk' : 'en') : null),
    [capturedPhoto, isUk],
  );

  const assignPreparedPhoto = async (photo: CapturedPhoto | null) => {
    if (!photo) {
      return;
    }

    const preparedPhoto = await cameraService.preparePhoto(photo);
    setCapturedPhoto(preparedPhoto);

    const actorUserId = me?.id ?? currentUser?.id ?? null;
    if (!actorUserId) {
      return;
    }

    try {
      const unlockResult = await achievementsStorage.unlockAchievement({
        userId: actorUserId,
        achievementId: resolvePromptPhotoAchievementId(preparedPhoto),
      });
      if (unlockResult.isNewUnlock) {
        Vibration.vibrate([0, 35, 20, 55]);
      }
    } catch {}
  };

  const handleAllowCameraAccess = async () => {
    try {
      const permissionState = await cameraService.requestCameraPermission();
      setCameraPermissionState(permissionState);

      if (permissionState === 'granted') {
        setGenerationError(null);
        return;
      }

      if (permissionState === 'blocked') {
        setGenerationError(copy.cameraBlocked);
        return;
      }

      setGenerationError(copy.cameraDenied);
    } catch {
      setGenerationError(copy.cameraRequestFailed);
    }
  };

  const handleAllowGalleryAccess = async () => {
    try {
      const permissionState = await cameraService.requestGalleryPermission();
      setGalleryPermissionState(permissionState);

      if (permissionState === 'granted') {
        setGenerationError(null);
        return;
      }

      if (permissionState === 'blocked') {
        setGenerationError(copy.galleryBlocked);
        return;
      }

      setGenerationError(copy.galleryDenied);
    } catch {
      setGenerationError(copy.galleryRequestFailed);
    }
  };

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
      await refreshPermissionsState();
    } catch {
      setGenerationError(copy.settingsOpenFailed);
    }
  };

  const handleCapturePhoto = async () => {
    try {
      setGenerationError(null);
      if (cameraPermissionState !== 'granted') {
        const permissionState = await cameraService.requestCameraPermission();
        setCameraPermissionState(permissionState);

        if (permissionState !== 'granted') {
          if (permissionState === 'blocked') {
            setGenerationError(copy.cameraBlockedUseGallery);
            return;
          }

          setGenerationError(copy.cameraRequired);
          return;
        }
      }

      const photo = await cameraService.openCamera();
      await assignPreparedPhoto(photo);
      await refreshPermissionsState();
    } catch {
      setGenerationError(copy.captureFailed);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      setGenerationError(null);
      if (galleryPermissionState !== 'granted') {
        const permissionState = await cameraService.requestGalleryPermission();
        setGalleryPermissionState(permissionState);

        if (permissionState !== 'granted') {
          if (permissionState === 'blocked') {
            setGenerationError(copy.galleryBlocked);
            return;
          }

          setGenerationError(copy.galleryRequiredForPick);
          return;
        }
      }

      const photo = await cameraService.openGallery();
      await assignPreparedPhoto(photo);
      await refreshPermissionsState();
    } catch {
      setGenerationError(copy.pickFailed);
    }
  };

  const handleGeneratePlan = async () => {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      setGenerationError(copy.promptRequired);
      return;
    }

    const targetUserId = targetMode === 'myself' ? resolvedMyselfTargetUserId : selectedChild?.id;
    if (!targetUserId) {
      setGenerationError(
        targetMode === 'myself'
          ? copy.profileNotLoaded
          : copy.noChildForGeneration,
      );
      return;
    }

    setIsGenerating(true);
    try {
      setGenerationError(null);

      const request: GeneratePlanInput = {
        targetUserId,
        prompt: normalizedPrompt,
        ...(capturedPhoto ? { photo: capturedPhoto } : {}),
      };

      const generatedPlan = capturedPhoto?.uri
        ? await plansService.uploadPhotoAndGenerate(request)
        : await plansService.generatePlan(request);

      navigation.navigate('PlanPreview', {
        plan: generatedPlan,
        request,
        targetLabel: activeTargetLabel,
      });
    } catch (error) {
      setGenerationError(
        getApiErrorMessage(error, copy.generationFailed, language),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer centered>
        <LoadingState label={copy.loadingBuilder} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader
        title={copy.builderTitle}
        subtitle={copy.builderSubtitle}
      />

      {contextError ? <EmptyState title={copy.builderErrorTitle} description={contextError} /> : null}
      {generationError ? (
        <View style={styles.card}>
          <EmptyState title={copy.generationErrorTitle} description={generationError} />
          <View style={styles.errorActions}>
            <PrimaryButton
              label={copy.close}
              variant="secondary"
              onPress={() => setGenerationError(null)}
              style={styles.retryButton}
            />
            <PrimaryButton
              label={copy.tryAgain}
              onPress={() => {
                void handleGeneratePlan();
              }}
              disabled={isGenerateDisabled}
              style={styles.retryButton}
            />
          </View>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {effectiveRole === 'adult' ? (
          <StatCard title={copy.selectedTarget} subtitle={copy.activeTarget(activeTargetLabel)} style={styles.card}>
            <View key={`target-mode-${targetMode}-${selectedChildId ?? 'none'}`} style={styles.optionRow}>
              <Pressable
                onPress={() => {
                  hasManualTargetModeRef.current = true;
                  setTargetMode('myself');
                  setGenerationError(null);
                }}
                style={[
                  styles.optionChip,
                  {
                    borderColor: targetMode === 'myself' ? BRAND_RED : BRAND_RED_BORDER,
                    backgroundColor: targetMode === 'myself' ? BRAND_RED : colors.background,
                  },
                ]}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
              >
                <Text
                  style={[styles.optionChipLabel, { color: targetMode === 'myself' ? '#ffffff' : BRAND_RED }]}
                  allowFontScaling
                >
                  {copy.myself}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!canUseChildTarget) {
                    return;
                  }
                  hasManualTargetModeRef.current = true;

                  if (!selectedChild && children[0]) {
                    void setSelectedChildId(children[0].id);
                  }

                  setTargetMode('child');
                  setGenerationError(null);
                }}
                style={[
                  styles.optionChip,
                  {
                    borderColor: targetMode === 'child' ? BRAND_RED : BRAND_RED_BORDER,
                    backgroundColor: targetMode === 'child' ? BRAND_RED : colors.background,
                    opacity: canUseChildTarget ? 1 : 0.6,
                  },
                ]}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
              >
                <Text
                  style={[styles.optionChipLabel, { color: targetMode === 'child' ? '#ffffff' : BRAND_RED }]}
                  allowFontScaling
                >
                  {copy.child}
                </Text>
              </Pressable>
            </View>

            {targetMode === 'child' ? (
              canUseChildTarget ? (
                isChildTargetWithoutSelection ? (
                  <View style={styles.childList}>
                    <EmptyState
                      title={copy.noActiveChildTitle}
                      description={copy.noActiveChildDescription}
                    />
                    <PrimaryButton
                      label={copy.selectFirstChild}
                      variant="secondary"
                      onPress={() => {
                        const firstChild = children[0];
                        if (firstChild) {
                          hasManualTargetModeRef.current = true;
                          void setSelectedChildId(firstChild.id);
                          setTargetMode('child');
                          setGenerationError(null);
                        }
                      }}
                    />
                  </View>
                ) : (
                  <View style={styles.childList}>
                    {children.map((child) => {
                      const isSelected = child.id === selectedChild?.id;

                      return (
                        <Pressable
                          key={child.id}
                          onPress={() => {
                            hasManualTargetModeRef.current = true;
                            void setSelectedChildId(child.id);
                            setTargetMode('child');
                            setGenerationError(null);
                          }}
                          style={[
                            styles.childRow,
                            {
                              borderColor: isSelected ? BRAND_RED : BRAND_RED_BORDER,
                              backgroundColor: isSelected ? BRAND_RED : colors.background,
                            },
                          ]}
                          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                        >
                          <Text style={[styles.childName, { color: isSelected ? '#ffffff' : colors.text }]} allowFontScaling>
                            {child.fullName}
                          </Text>
                          <Text
                            style={[styles.childMeta, { color: isSelected ? '#ffe7ee' : colors.textSecondary }]}
                            allowFontScaling
                          >
                            {copy.ageLevel(child.age, child.level)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )
              ) : (
                <EmptyState title={copy.noChildProfilesTitle} description={copy.noChildProfilesDescription} />
              )
            ) : null}
          </StatCard>
        ) : null}

        <StatCard title={copy.photoTitle} subtitle={copy.photoSubtitle} style={styles.card}>
          <Text style={[styles.photoHintText, { color: colors.textSecondary }]} allowFontScaling>
            {copy.photoHint}
          </Text>

          {shouldShowPermissionHelp ? (
            <View style={[styles.permissionCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={[styles.permissionStatusText, { color: colors.textSecondary }]} allowFontScaling>
                {resolvePermissionDescription(cameraPermissionState, 'camera', isUk ? 'uk' : 'en')}
              </Text>
              <Text style={[styles.permissionStatusText, { color: colors.textSecondary }]} allowFontScaling>
                {resolvePermissionDescription(galleryPermissionState, 'gallery', isUk ? 'uk' : 'en')}
              </Text>

              <View style={styles.photoActions}>
                <Pressable
                  onPress={() => {
                    void handleAllowCameraAccess();
                  }}
                  style={styles.cameraButton}
                  android_ripple={{ color: 'rgba(255, 255, 255, 0.16)' }}
                >
                  <Text style={styles.cameraButtonLabel} allowFontScaling>
                    {copy.allowCamera}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    void handlePickFromGallery();
                  }}
                  style={[styles.secondaryPhotoButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                  android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                >
                  <Text style={[styles.secondaryPhotoButtonLabel, { color: colors.text }]} allowFontScaling>
                    {copy.chooseFromGallery}
                  </Text>
                </Pressable>

                {galleryPermissionState !== 'granted' ? (
                  <Pressable
                    onPress={() => {
                      void handleAllowGalleryAccess();
                    }}
                    style={[styles.secondaryPhotoButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                    android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                  >
                    <Text style={[styles.secondaryPhotoButtonLabel, { color: colors.text }]} allowFontScaling>
                      {copy.allowGallery}
                    </Text>
                  </Pressable>
                ) : null}

                {isCameraBlocked || isGalleryBlocked ? (
                  <Pressable
                    onPress={() => {
                      void handleOpenSettings();
                    }}
                    style={[styles.secondaryPhotoButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                    android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                  >
                    <Text style={[styles.secondaryPhotoButtonLabel, { color: colors.text }]} allowFontScaling>
                      {copy.openSettings}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          {capturedPhoto ? (
            <View style={styles.photoContainer}>
              <View style={styles.photoPreviewRow}>
                <Image
                  source={{ uri: capturedPhoto.previewUri ?? capturedPhoto.uri }}
                  style={styles.photoThumbnail}
                />
                <View style={styles.photoMetaBlock}>
                  <Text style={[styles.photoMeta, { color: colors.textSecondary }]} allowFontScaling>
                    {copy.resolution}: {capturedPhoto.width ?? '?'} x {capturedPhoto.height ?? '?'}
                  </Text>
                  {capturedPhoto.fileSize ? (
                    <Text style={[styles.photoMeta, { color: colors.textSecondary }]} allowFontScaling>
                      {copy.size}: {(capturedPhoto.fileSize / 1024 / 1024).toFixed(2)} MB
                    </Text>
                  ) : null}
                </View>
              </View>
              {photoAchievementLabel ? (
                <View
                  style={[
                    styles.achievementChip,
                    { borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                >
                  <Text style={[styles.achievementText, { color: colors.text }]} allowFontScaling>
                    {photoAchievementLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.photoContainer}>
              <EmptyState
                title={copy.noPhotoTitle}
                description={copy.noPhotoDescription}
              />
              <View
                style={[
                  styles.achievementChip,
                  { borderColor: colors.border, backgroundColor: colors.background },
                ]}
              >
                <Text style={[styles.achievementText, { color: colors.textSecondary }]} allowFontScaling>
                  {copy.lockedAchievement}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.photoPrimaryActions}>
            <Pressable
              onPress={() => {
                void handleCapturePhoto();
              }}
              style={[styles.cameraButton, styles.photoHalfButton]}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.16)' }}
            >
              <Text style={styles.cameraButtonLabel} allowFontScaling>
                {capturedPhoto ? copy.replaceFromCamera : copy.takePhoto}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void handlePickFromGallery();
              }}
              style={[
                styles.secondaryPhotoButton,
                styles.photoHalfButton,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
              android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            >
              <Text style={[styles.secondaryPhotoButtonLabel, { color: colors.text }]} allowFontScaling>
                {capturedPhoto ? copy.replaceFromGallery : copy.chooseFromGallery}
              </Text>
            </Pressable>
          </View>
          {capturedPhoto ? (
            <View style={styles.photoSecondaryActions}>
              <Pressable
                onPress={() => {
                  setCapturedPhoto(null);
                  setGenerationError(null);
                }}
                style={[styles.secondaryPhotoButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
              >
                <Text style={[styles.secondaryPhotoButtonLabel, { color: colors.text }]} allowFontScaling>
                  {copy.removePhoto}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </StatCard>

        <StatCard title={copy.promptTitle} subtitle={copy.promptSubtitle} style={styles.card}>
          <TextInput
            value={prompt}
            onChangeText={(value) => {
              setPrompt(value);
              if (selectedQuickPromptIndex !== null) {
                const selectedValue = quickPrompts[selectedQuickPromptIndex] ?? '';
                if (normalizePromptValue(value) !== normalizePromptValue(selectedValue)) {
                  setSelectedQuickPromptIndex(null);
                }
              }
              if (generationError) {
                setGenerationError(null);
              }
            }}
            placeholder={copy.promptPlaceholder}
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[
              styles.promptInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          />
          <View style={styles.micButtonWrap}>
            <Pressable
              onPress={() => {
                setGenerationError(copy.voiceNotReady);
              }}
              disabled={isGenerating}
              style={[styles.micButton, isGenerating ? styles.micButtonDisabled : null]}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.16)' }}
            >
              <Ionicons name="mic" size={isTablet ? 20 : 18} color="#ffffff" />
              <Text style={styles.micButtonText} allowFontScaling>
                {copy.voiceInput}
              </Text>
            </Pressable>
          </View>
        </StatCard>

        <StatCard title={copy.quickPromptsTitle} subtitle={copy.quickPromptsSubtitle} style={styles.card}>
          <View key={`quick-prompts-${resolvedQuickPromptIndex ?? 'none'}`} style={styles.quickPromptList}>
            {quickPrompts.map((quickPrompt, index) => {
              const isSelected = resolvedQuickPromptIndex === index;

              return (
                <Pressable
                  key={`${quickPrompt}-${isSelected ? 'selected' : 'idle'}`}
                  onPress={() => {
                    setSelectedQuickPromptIndex(index);
                    setPrompt(quickPrompt);
                    setGenerationError(null);
                  }}
                  style={[
                    styles.quickPromptItem,
                    {
                      borderColor: isSelected ? BRAND_RED : colors.border,
                      backgroundColor: isSelected ? BRAND_RED : colors.background,
                    },
                  ]}
                  android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                >
                  <Text style={[styles.quickPromptText, { color: isSelected ? '#ffffff' : colors.text }]} allowFontScaling>
                    {quickPrompt}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </StatCard>

        <Pressable
          onPress={() => {
            void handleGeneratePlan();
          }}
          disabled={isGenerateDisabled}
          style={[styles.generateButton, isGenerateDisabled && styles.generateButtonDisabled]}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.16)' }}
        >
          <Text style={styles.generateButtonLabel} allowFontScaling>
            {isGenerating ? copy.generating : copy.generate}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal visible={isGenerating} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.loadingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <LoadingState label={copy.generatingPlan} />
          </View>
        </View>
      </Modal>

    </ScreenContainer>
  );
};

const getStyles = (cardMaxWidth: number, isTablet: boolean, spacing: number) =>
  StyleSheet.create({
    content: {
      gap: 12,
      paddingBottom: Math.max(14, Math.round(spacing * 1.1)),
    },
    card: {
      width: "100%",
      maxWidth: cardMaxWidth,
      alignSelf: "center",
    },
    retryButton: {
      marginTop: 8,
      flex: 1,
    },
    errorActions: {
      flexDirection: 'row',
      gap: 10,
    },
    optionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    optionChip: {
      borderWidth: 1,
      borderRadius: 999,
      minHeight: 36,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      elevation: 1,
    },
    optionChipLabel: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: "700",
      textTransform: "capitalize",
    },
    childList: {
      gap: 8,
      marginTop: 4,
    },
    childRow: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 2,
      overflow: "hidden",
      elevation: 1,
    },
    childName: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: "700",
    },
    childMeta: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "500",
    },
    photoHintText: {
      fontSize: isTablet ? 14 : 13,
      lineHeight: isTablet ? 20 : 18,
      fontWeight: "500",
    },
    permissionCard: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 6,
      marginTop: 8,
      elevation: 1,
    },
    permissionStatusText: {
      fontSize: isTablet ? 13 : 12,
      lineHeight: isTablet ? 18 : 16,
      fontWeight: "500",
    },
    photoContainer: {
      gap: 6,
      marginTop: 2,
    },
    photoPreviewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    photoThumbnail: {
      width: isTablet ? 124 : 108,
      height: isTablet ? 124 : 108,
      borderRadius: 10,
      backgroundColor: "#101214",
    },
    photoMetaBlock: {
      flex: 1,
      gap: 4,
    },
    photoMeta: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "500",
    },
    achievementChip: {
      borderWidth: 1,
      borderRadius: 999,
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 6,
      elevation: 1,
    },
    achievementText: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "700",
    },
    photoActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
    },
    photoPrimaryActions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 10,
    },
    photoSecondaryActions: {
      marginTop: 8,
    },
    photoHalfButton: {
      flex: 1,
      minWidth: 0,
    },
    cameraButton: {
      minWidth: isTablet ? 150 : 132,
      minHeight: 44,
      borderRadius: 10,
      backgroundColor: "#ff2d55",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      elevation: 2,
    },
    cameraButtonLabel: {
      color: "#ffffff",
      fontSize: isTablet ? 15 : 14,
      fontWeight: "700",
    },
    secondaryPhotoButton: {
      minWidth: isTablet ? 132 : 118,
      minHeight: 44,
      borderWidth: 1,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      elevation: 1,
    },
    secondaryPhotoButtonLabel: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: "700",
    },
    promptInput: {
      borderWidth: 1,
      borderRadius: 10,
      minHeight: isTablet ? 120 : 108,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: isTablet ? 15 : 14,
    },
    quickPromptList: {
      gap: 8,
    },
    quickPromptItem: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      overflow: "hidden",
      elevation: 1,
    },
    quickPromptText: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: "600",
    },
    generateButton: {
      width: "100%",
      maxWidth: cardMaxWidth,
      alignSelf: "center",
      minHeight: 46,
      borderRadius: 10,
      backgroundColor: "#ff2d55",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      elevation: 2,
    },
    generateButtonDisabled: {
      opacity: 0.7,
    },
    generateButtonLabel: {
      fontSize: isTablet ? 16 : 15,
      fontWeight: "700",
      color: "#ffffff",
    },
    micButtonWrap: {
      marginTop: 8,
      marginBottom: 2,
    },
    micButton: {
      width: "100%",
      minHeight: isTablet ? 52 : 48,
      borderRadius: 12,
      backgroundColor: "#ff2d55",
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      elevation: 3,
    },
    micButtonText: {
      color: "#ffffff",
      fontSize: isTablet ? 15 : 14,
      fontWeight: "700",
    },
    micButtonDisabled: {
      opacity: 0.7,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing,
      paddingVertical: spacing,
    },
    loadingCard: {
      width: "100%",
      maxWidth: cardMaxWidth,
      borderWidth: 1,
      borderRadius: 14,
      padding: isTablet ? 16 : 12,
      elevation: 4,
    },
  });

export default AgentChatScreen;
