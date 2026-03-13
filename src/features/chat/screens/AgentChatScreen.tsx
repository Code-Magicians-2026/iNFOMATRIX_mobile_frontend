import React from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import useAuthStore from '@/context/Auth-store';
import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
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
import {
  PLAN_BUILDER_INPUT_SCHEMA,
  PLAN_BUILDER_OUTPUT_SCHEMA,
  PLAN_BUILDER_SAFETY_RULES,
  PLAN_BUILDER_SYSTEM_PROMPT,
  PLAN_BUILDER_TONE_RULES,
} from '@/src/features/chat/config/ai-transparency';
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

const CATEGORY_OPTIONS = ['study', 'routine', 'household', 'health'] as const;
const INTENSITY_OPTIONS = ['low', 'medium', 'high'] as const;

type TargetMode = 'myself' | 'child';

type ChatNavigation = NativeStackNavigationProp<AppStackParamList>;

const resolvePermissionDescription = (state: MediaPermissionState, source: 'camera' | 'gallery') => {
  if (state === 'granted') {
    return `${source === 'camera' ? 'Camera' : 'Gallery'} access granted.`;
  }

  if (state === 'blocked') {
    return `${source === 'camera' ? 'Camera' : 'Gallery'} access blocked. Open device settings.`;
  }

  if (state === 'undetermined') {
    return `${source === 'camera' ? 'Camera' : 'Gallery'} access not requested yet.`;
  }

  return `${source === 'camera' ? 'Camera' : 'Gallery'} access denied.`;
};

const resolveMockUserId = (role: UserRole, currentUserId: string | undefined) => {
  if (role === 'adult') {
    return 'adult-1';
  }

  if (typeof currentUserId === 'string' && currentUserId.startsWith('child-')) {
    return currentUserId;
  }

  return 'child-1';
};

const AgentChatScreen = () => {
  const navigation = useNavigation<ChatNavigation>();
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(
    () => getStyles(cardMaxWidth, isTablet, spacing),
    [cardMaxWidth, isTablet, spacing],
  );

  const role = useAuthStore((s) => s.role);
  const currentUser = useAuthStore((s) => s.currentUser);
  const selectedChildId = useAuthStore((s) => s.selectedChildId);
  const setSelectedChildId = useAuthStore((s) => s.setSelectedChildId);
  const setRole = useAuthStore((s) => s.setRole);

  const effectiveRole: UserRole = role ?? 'child';

  const [me, setMe] = React.useState<UserProfile | null>(null);
  const [children, setChildren] = React.useState<ChildProfile[]>([]);
  const [targetMode, setTargetMode] = React.useState<TargetMode>(
    effectiveRole === 'adult' ? 'child' : 'myself',
  );

  const [prompt, setPrompt] = React.useState('');
  const [category, setCategory] = React.useState<string>('study');
  const [intensity, setIntensity] = React.useState<string>('medium');
  const [capturedPhoto, setCapturedPhoto] = React.useState<CapturedPhoto | null>(null);
  const [cameraPermissionState, setCameraPermissionState] =
    React.useState<MediaPermissionState>('undetermined');
  const [galleryPermissionState, setGalleryPermissionState] =
    React.useState<MediaPermissionState>('undetermined');

  const [isLoading, setIsLoading] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [contextError, setContextError] = React.useState<string | null>(null);
  const [generationError, setGenerationError] = React.useState<string | null>(null);
  const [isTransparencyVisible, setIsTransparencyVisible] = React.useState(false);

  const inputSchemaPreview = React.useMemo(
    () => JSON.stringify(PLAN_BUILDER_INPUT_SCHEMA, null, 2),
    [],
  );
  const outputSchemaPreview = React.useMemo(
    () => JSON.stringify(PLAN_BUILDER_OUTPUT_SCHEMA, null, 2),
    [],
  );

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

  React.useEffect(() => {
    void refreshPermissionsState();
  }, [refreshPermissionsState]);

  const loadBuilderContext = React.useCallback(async () => {
    setIsLoading(true);

    try {
      setContextError(null);

      const targetMockUserId = resolveMockUserId(effectiveRole, currentUser?.id);
      try {
        userService.setCurrentUserId(targetMockUserId);
      } catch {
        userService.setCurrentUserId(effectiveRole === 'adult' ? 'adult-1' : 'child-1');
      }

      const [meData, childrenData] = await Promise.all([
        userService.getMe(),
        effectiveRole === 'adult' ? childrenService.getChildren() : Promise.resolve([]),
      ]);

      setMe(meData);
      setChildren(childrenData);

      if (effectiveRole !== 'adult') {
        setTargetMode('myself');
        return;
      }

      if (childrenData.length === 0) {
        setTargetMode('myself');
        return;
      }

      const isSelectedChildValid = selectedChildId
        ? childrenData.some((child) => child.id === selectedChildId)
        : false;

      if (selectedChildId && !isSelectedChildValid) {
        await setSelectedChildId(null);
      }
    } catch {
      setContextError('Failed to load AI Plan Builder context.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, effectiveRole, selectedChildId, setSelectedChildId]);

  React.useEffect(() => {
    void loadBuilderContext();
  }, [loadBuilderContext]);

  const selectedChild = React.useMemo(
    () => children.find((child) => child.id === selectedChildId) ?? null,
    [children, selectedChildId],
  );

  const canUseChildTarget = effectiveRole === 'adult' && children.length > 0;
  const activeTargetLabel = targetMode === 'myself'
    ? me?.fullName ?? 'Myself'
    : selectedChild?.fullName ?? 'No active child';
  const isChildTargetWithoutSelection =
    targetMode === 'child' && canUseChildTarget && !selectedChild;
  const isGenerateDisabled = isGenerating || prompt.trim().length === 0 || !capturedPhoto?.uri;
  const isCameraBlocked = cameraPermissionState === 'blocked';
  const isGalleryBlocked = galleryPermissionState === 'blocked';
  const shouldShowPermissionHelp =
    cameraPermissionState !== 'granted' || galleryPermissionState !== 'granted';

  const assignPreparedPhoto = async (photo: CapturedPhoto | null) => {
    if (!photo) {
      return;
    }

    const preparedPhoto = await cameraService.preparePhoto(photo);
    setCapturedPhoto(preparedPhoto);
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
        setGenerationError('Camera permission is blocked. Open settings to enable it.');
        return;
      }

      setGenerationError('Camera permission was denied. You can continue with gallery.');
    } catch {
      setGenerationError('Failed to request camera permission.');
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
        setGenerationError('Gallery permission is blocked. Open settings to enable it.');
        return;
      }

      setGenerationError('Gallery permission was denied.');
    } catch {
      setGenerationError('Failed to request gallery permission.');
    }
  };

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
      await refreshPermissionsState();
    } catch {
      setGenerationError('Failed to open settings.');
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
            setGenerationError('Camera permission is blocked. Use gallery or open settings.');
            return;
          }

          setGenerationError('Camera permission is required. You can fallback to gallery.');
          return;
        }
      }

      const photo = await cameraService.openCamera();
      await assignPreparedPhoto(photo);
      await refreshPermissionsState();
    } catch {
      setGenerationError('Failed to capture photo. Please try again.');
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
            setGenerationError('Gallery permission is blocked. Open settings to enable it.');
            return;
          }

          setGenerationError('Gallery permission is required to choose photo.');
          return;
        }
      }

      const photo = await cameraService.openGallery();
      await assignPreparedPhoto(photo);
      await refreshPermissionsState();
    } catch {
      setGenerationError('Failed to pick photo from gallery.');
    }
  };

  const handleUseProjectPhoto = async () => {
    try {
      setGenerationError(null);
      const photo = await cameraService.openProjectPhoto();
      await assignPreparedPhoto(photo);
      await refreshPermissionsState();
    } catch {
      setGenerationError('Failed to load project photo.');
    }
  };

  const handleGeneratePlan = async () => {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      setGenerationError('Prompt is required to generate a plan.');
      return;
    }

    if (!capturedPhoto?.uri) {
      setGenerationError('Add one room/situation photo before generating a plan.');
      return;
    }

    const targetUserId = targetMode === 'myself' ? me?.id : selectedChild?.id;
    if (!targetUserId) {
      setGenerationError('No active child selected. Select child target before generation.');
      return;
    }

    setIsGenerating(true);
    try {
      setGenerationError(null);

      const request: GeneratePlanInput = {
        targetUserId,
        prompt: normalizedPrompt,
        category,
        intensity,
        photo: capturedPhoto,
      };

      const generatedPlan = await plansService.uploadPhotoAndGenerate(request);

      navigation.navigate('PlanPreview', {
        plan: generatedPlan,
        request,
        targetLabel: activeTargetLabel,
      });
    } catch {
      setGenerationError('Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer centered>
        <LoadingState label="Loading AI Plan Builder..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader
        title="AI Plan Builder"
        subtitle="Capture one photo, add prompt, and generate a structured AI plan"
      />

      {contextError ? <EmptyState title="Builder error" description={contextError} /> : null}
      {generationError ? (
        <View style={styles.card}>
          <EmptyState title="Generation failed" description={generationError} />
          <PrimaryButton
            label="Try generate again"
            onPress={() => {
              void handleGeneratePlan();
            }}
            disabled={isGenerateDisabled}
            style={styles.retryButton}
          />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StatCard title="Selected Target" subtitle={`Active: ${activeTargetLabel}`} style={styles.card}>
          <View style={styles.optionRow}>
            <Pressable
              onPress={() => {
                setTargetMode('myself');
                setGenerationError(null);
              }}
              style={[
                styles.optionChip,
                {
                  borderColor: targetMode === 'myself' ? '#ff2d55' : colors.border,
                  backgroundColor: targetMode === 'myself' ? '#ff2d55' : colors.background,
                },
              ]}
              android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            >
              <Text
                style={[styles.optionChipLabel, { color: targetMode === 'myself' ? '#ffffff' : colors.text }]}
                allowFontScaling
              >
                Myself
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (!canUseChildTarget) {
                  return;
                }

                setTargetMode('child');
                setGenerationError(null);
              }}
              style={[
                styles.optionChip,
                {
                  borderColor: targetMode === 'child' ? '#ff2d55' : colors.border,
                  backgroundColor: targetMode === 'child' ? '#ff2d55' : colors.background,
                  opacity: canUseChildTarget ? 1 : 0.6,
                },
              ]}
              android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            >
              <Text
                style={[styles.optionChipLabel, { color: targetMode === 'child' ? '#ffffff' : colors.text }]}
                allowFontScaling
              >
                Child
              </Text>
            </Pressable>
          </View>

          {targetMode === 'child' ? (
            canUseChildTarget ? (
              isChildTargetWithoutSelection ? (
                <View style={styles.childList}>
                  <EmptyState
                    title="No active child selected"
                    description="Select child profile to generate a plan for them."
                  />
                  <PrimaryButton
                    label="Select first child"
                    variant="secondary"
                    onPress={() => {
                      const firstChild = children[0];
                      if (firstChild) {
                        void setSelectedChildId(firstChild.id);
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
                          void setSelectedChildId(child.id);
                          setGenerationError(null);
                        }}
                        style={[
                          styles.childRow,
                          {
                            borderColor: isSelected ? '#ff2d55' : colors.border,
                            backgroundColor: isSelected ? '#ff2d55' : colors.background,
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
                          Age {child.age} | Lvl {child.level}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )
            ) : (
              <EmptyState title="No child profiles" description="Create child profile from Home first." />
            )
          ) : null}
        </StatCard>

        <StatCard title="Room / Situation Photo" subtitle="Photo is AI context for plan generation" style={styles.card}>
          <Text style={[styles.photoHintText, { color: colors.textSecondary }]} allowFontScaling>
            Add one photo so AI can understand the current room/situation before generating the plan.
          </Text>

          {shouldShowPermissionHelp ? (
            <View style={[styles.permissionCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={[styles.permissionStatusText, { color: colors.textSecondary }]} allowFontScaling>
                {resolvePermissionDescription(cameraPermissionState, 'camera')}
              </Text>
              <Text style={[styles.permissionStatusText, { color: colors.textSecondary }]} allowFontScaling>
                {resolvePermissionDescription(galleryPermissionState, 'gallery')}
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
                    Allow camera access
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
                    Choose from gallery
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
                      Allow gallery access
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
                      Open settings
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
                    Resolution: {capturedPhoto.width ?? '?'} x {capturedPhoto.height ?? '?'}
                  </Text>
                  {capturedPhoto.fileSize ? (
                    <Text style={[styles.photoMeta, { color: colors.textSecondary }]} allowFontScaling>
                      Size: {(capturedPhoto.fileSize / 1024 / 1024).toFixed(2)} MB
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          ) : (
            <EmptyState
              title="No photo attached"
              description="Use Take photo or Choose from gallery to add AI context."
            />
          )}

          <View style={styles.photoActions}>
            <Pressable
              onPress={() => {
                void handleCapturePhoto();
              }}
              style={styles.cameraButton}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.16)' }}
            >
              <Text style={styles.cameraButtonLabel} allowFontScaling>
                {capturedPhoto ? 'Replace from camera' : 'Take photo'}
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
                {capturedPhoto ? 'Replace from gallery' : 'Choose from gallery'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void handleUseProjectPhoto();
              }}
              style={[styles.secondaryPhotoButton, { borderColor: colors.border, backgroundColor: colors.background }]}
              android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            >
              <Text style={[styles.secondaryPhotoButtonLabel, { color: colors.text }]} allowFontScaling>
                From project
              </Text>
            </Pressable>
            {capturedPhoto ? (
              <Pressable
                onPress={() => {
                  setCapturedPhoto(null);
                  setGenerationError(null);
                }}
                style={[styles.secondaryPhotoButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
              >
                <Text style={[styles.secondaryPhotoButtonLabel, { color: colors.text }]} allowFontScaling>
                  Remove photo
                </Text>
              </Pressable>
            ) : null}
          </View>
        </StatCard>

        <StatCard title="Prompt" subtitle="Describe the plan you want" style={styles.card}>
          <TextInput
            value={prompt}
            onChangeText={(value) => {
              setPrompt(value);
              if (generationError) {
                setGenerationError(null);
              }
            }}
            placeholder="Write what the AI should build..."
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
        </StatCard>

        <StatCard title="Category" subtitle="Plan focus" style={styles.card}>
          <View style={styles.optionRow}>
            {CATEGORY_OPTIONS.map((item) => {
              const isSelected = category === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[
                    styles.optionChip,
                    {
                      borderColor: isSelected ? '#ff2d55' : colors.border,
                      backgroundColor: isSelected ? '#ff2d55' : colors.background,
                    },
                  ]}
                  android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                >
                  <Text
                    style={[styles.optionChipLabel, { color: isSelected ? '#ffffff' : colors.text }]}
                    allowFontScaling
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </StatCard>

        <StatCard title="Intensity" subtitle="How demanding the plan should be" style={styles.card}>
          <View style={styles.optionRow}>
            {INTENSITY_OPTIONS.map((item) => {
              const isSelected = intensity === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setIntensity(item)}
                  style={[
                    styles.optionChip,
                    {
                      borderColor: isSelected ? '#ff2d55' : colors.border,
                      backgroundColor: isSelected ? '#ff2d55' : colors.background,
                    },
                  ]}
                  android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                >
                  <Text
                    style={[styles.optionChipLabel, { color: isSelected ? '#ffffff' : colors.text }]}
                    allowFontScaling
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </StatCard>

        <StatCard title="Quick Prompts" subtitle="Tap to prefill" style={styles.card}>
          <View style={styles.quickPromptList}>
            {QUICK_PROMPTS.map((quickPrompt) => (
              <Pressable
                key={quickPrompt}
                onPress={() => setPrompt(quickPrompt)}
                style={[styles.quickPromptItem, { borderColor: colors.border, backgroundColor: colors.background }]}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
              >
                <Text style={[styles.quickPromptText, { color: colors.text }]} allowFontScaling>
                  {quickPrompt}
                </Text>
              </Pressable>
            ))}
          </View>
        </StatCard>

        <PrimaryButton
          label="AI Transparency (Debug)"
          variant="tertiary"
          onPress={() => setIsTransparencyVisible(true)}
          style={styles.card}
        />

        <Pressable
          onPress={() => {
            void handleGeneratePlan();
          }}
          disabled={isGenerateDisabled}
          style={[styles.generateButton, isGenerateDisabled && styles.generateButtonDisabled]}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.16)' }}
        >
          <Text style={styles.generateButtonLabel} allowFontScaling>
            {isGenerating ? 'Generating...' : 'Generate'}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal visible={isGenerating} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.loadingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <LoadingState label="Generating AI plan..." />
          </View>
        </View>
      </Modal>

      <Modal
        visible={isTransparencyVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTransparencyVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SectionHeader
              title="AI Transparency"
              subtitle="System prompt, schemas, and safety constraints"
            />

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
              <StatCard title="System Prompt Preview" subtitle="Instruction layer">
                <Text style={[styles.codeText, { color: colors.text }]} allowFontScaling>
                  {PLAN_BUILDER_SYSTEM_PROMPT}
                </Text>
              </StatCard>

              <StatCard title="Input Schema" subtitle="Prompt contract">
                <Text style={[styles.codeText, { color: colors.text }]} allowFontScaling>
                  {inputSchemaPreview}
                </Text>
              </StatCard>

              <StatCard title="Expected Output Schema" subtitle="Structured plan shape">
                <Text style={[styles.codeText, { color: colors.text }]} allowFontScaling>
                  {outputSchemaPreview}
                </Text>
              </StatCard>

              <StatCard title="Safety Rules" subtitle="Policy constraints">
                {PLAN_BUILDER_SAFETY_RULES.map((rule) => (
                  <Text key={rule} style={[styles.ruleText, { color: colors.text }]} allowFontScaling>
                    - {rule}
                  </Text>
                ))}
              </StatCard>

              <StatCard title="Child-Friendly Tone Rules" subtitle="Response style guardrails">
                {PLAN_BUILDER_TONE_RULES.map((rule) => (
                  <Text key={rule} style={[styles.ruleText, { color: colors.text }]} allowFontScaling>
                    - {rule}
                  </Text>
                ))}
              </StatCard>
            </ScrollView>

            <PrimaryButton
              label="Close"
              variant="secondary"
              onPress={() => setIsTransparencyVisible(false)}
            />
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
      width: '100%',
      maxWidth: cardMaxWidth,
      alignSelf: 'center',
    },
    retryButton: {
      marginTop: 8,
    },
    optionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    optionChip: {
      borderWidth: 1,
      borderRadius: 999,
      minHeight: 36,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      elevation: 1,
    },
    optionChipLabel: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: '700',
      textTransform: 'capitalize',
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
      overflow: 'hidden',
      elevation: 1,
    },
    childName: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: '700',
    },
    childMeta: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '500',
    },
    photoHintText: {
      fontSize: isTablet ? 14 : 13,
      lineHeight: isTablet ? 20 : 18,
      fontWeight: '500',
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
      fontWeight: '500',
    },
    photoContainer: {
      gap: 6,
      marginTop: 2,
    },
    photoPreviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    photoThumbnail: {
      width: isTablet ? 124 : 108,
      height: isTablet ? 124 : 108,
      borderRadius: 10,
      backgroundColor: '#101214',
    },
    photoMetaBlock: {
      flex: 1,
      gap: 4,
    },
    photoMeta: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '500',
    },
    photoActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
    },
    cameraButton: {
      minWidth: isTablet ? 150 : 132,
      minHeight: 44,
      borderRadius: 10,
      backgroundColor: '#ff2d55',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      elevation: 2,
    },
    cameraButtonLabel: {
      color: '#ffffff',
      fontSize: isTablet ? 15 : 14,
      fontWeight: '700',
    },
    secondaryPhotoButton: {
      minWidth: isTablet ? 132 : 118,
      minHeight: 44,
      borderWidth: 1,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      elevation: 1,
    },
    secondaryPhotoButtonLabel: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: '700',
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
      overflow: 'hidden',
      elevation: 1,
    },
    quickPromptText: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: '600',
    },
    generateButton: {
      width: '100%',
      maxWidth: cardMaxWidth,
      alignSelf: 'center',
      minHeight: 46,
      borderRadius: 10,
      backgroundColor: '#ff2d55',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      elevation: 2,
    },
    generateButtonDisabled: {
      opacity: 0.7,
    },
    generateButtonLabel: {
      fontSize: isTablet ? 16 : 15,
      fontWeight: '700',
      color: '#ffffff',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing,
      paddingVertical: spacing,
    },
    modalCard: {
      width: '100%',
      maxWidth: cardMaxWidth + 60,
      maxHeight: '90%',
      borderRadius: 14,
      borderWidth: 1,
      padding: isTablet ? 18 : 14,
      gap: 10,
      elevation: 4,
    },
    loadingCard: {
      width: '100%',
      maxWidth: cardMaxWidth,
      borderWidth: 1,
      borderRadius: 14,
      padding: isTablet ? 16 : 12,
      elevation: 4,
    },
    modalScroll: {
      flexGrow: 0,
    },
    modalContent: {
      gap: 10,
      paddingBottom: 4,
    },
    codeText: {
      fontFamily: 'monospace',
      fontSize: isTablet ? 13 : 12,
      lineHeight: isTablet ? 19 : 17,
      fontWeight: '500',
    },
    ruleText: {
      fontSize: isTablet ? 14 : 13,
      lineHeight: isTablet ? 20 : 18,
      fontWeight: '500',
    },
  });

export default AgentChatScreen;
