import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import useAuthStore from '@/context/Auth-store';
import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import { useI18n } from '@/src/i18n/useI18n';
import { getApiErrorMessage } from '@/src/features/auth/api/client';
import {
  EmptyState,
  LoadingState,
  QuestRewardEditor,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from '@/shared/components/ui';
import {
  buildQuestRewardFieldsFromDraft,
  buildQuestRewardPreviewFromDraft,
  createQuestRewardDraftFromQuest,
  getQuestRewardLabel,
  type QuestRewardDraft,
} from '@/shared/models/quest-reward.model';
import type { CapturedPhoto, GeneratedPlan, Quest } from '@/shared/models/mvp-contracts.model';
import { cameraService, plansService, questsService } from '@/src/integration/services';
import type { AppStackParamList } from '@/src/navigation/AppNavigator';

type PlanPreviewRoute = RouteProp<AppStackParamList, 'PlanPreview'>;
type PlanPreviewNavigation = NativeStackNavigationProp<AppStackParamList>;
const PLAN_PREVIEW_SELECTED_REWARD_TYPE_COLOR = '#ff0000';

const createRewardDraftMap = (quests: Quest[]): Record<string, QuestRewardDraft> =>
  quests.reduce<Record<string, QuestRewardDraft>>((result, quest) => {
    result[quest.id] = createQuestRewardDraftFromQuest(quest);
    return result;
  }, {});

const PlanPreviewScreen = () => {
  const route = useRoute<PlanPreviewRoute>();
  const navigation = useNavigation<PlanPreviewNavigation>();
  const colors = useThemeStore((s) => s.colors);
  const role = useAuthStore((s) => s.role);
  const setSelectedChildId = useAuthStore((s) => s.setSelectedChildId);
  const { cardMaxWidth, isTablet, spacing } = useResponsiveLayout();
  const { language } = useI18n();
  const styles = React.useMemo(
    () => getStyles(cardMaxWidth, isTablet, spacing),
    [cardMaxWidth, isTablet, spacing],
  );

  const copy = React.useMemo(
    () =>
      language === 'uk'
        ? {
            cameraPermissionRequired: 'Потрібен доступ до камери, щоб додати фото квесту.',
            galleryPermissionRequired: 'Потрібен доступ до галереї, щоб додати фото квесту.',
            beforePhotoAdded: 'Фото до виконання додано. Для завершення буде потрібне звітне фото.',
            beforePhotoRemoved: 'Фото до виконання видалено. Звітне фото тепер необовʼязкове.',
            beforePhotoUpdateError: 'Не вдалося оновити фото до виконання.',
            approvedFeedback: 'План підтверджено, квести активовано.',
            approveError: 'Не вдалося підтвердити цей план.',
            regeneratedFeedback: 'План згенеровано повторно. Перевірте нові квести нижче.',
            regenerateError: 'Не вдалося перегенерувати план.',
            approving: 'Підтвердження плану...',
            regenerating: 'Перегенерація плану...',
            title: 'Попередній перегляд плану',
            targetSubtitle: (label: string) => `Ціль: ${label}`,
            actionErrorTitle: 'Помилка дії з планом',
            statusSubtitle: (status: string) => `Статус: ${status}`,
            questsTitle: 'Квести',
            questsSubtitle: (count: number) => `${count} згенерованих квестів`,
            difficulty: (value: string) => `Складність: ${value}`,
            rewardXp: (value: number) => `Нагорода XP: ${value}`,
            rewardActive: (label: string) => `Активна нагорода: ${label}`,
            estimatedMinutes: (value: number) => `Орієнтовно хвилин: ${value}`,
            reportPhoto: (required: boolean) => `Звітне фото: ${required ? 'обовʼязково' : 'необовʼязково'}`,
            beforePhotoTitle: 'Фото до виконання',
            beforePhotoNotAdded: 'Фото до виконання не додано.',
            beforePhotoRequiredHint: 'Після завершення дитина має надіслати фото результату.',
            loading: 'Завантаження...',
            gallery: 'Галерея',
            camera: 'Камера',
            removing: 'Видалення...',
            remove: 'Видалити',
            steps: 'Кроки',
            noQuestsTitle: 'Квести не згенеровано',
            noQuestsDescription: 'Перегенеруйте план, щоб створити квести.',
            totalMinutesTitle: 'Загальна орієнтовна тривалість',
            totalMinutesSubtitle: 'Загальне навантаження',
            minutes: (value: number) => `${value} хв`,
            approve: 'Підтвердити',
            regenerate: 'Перегенерувати',
            back: 'Назад',
          }
        : {
            cameraPermissionRequired: 'Camera permission is required to add a quest photo.',
            galleryPermissionRequired: 'Gallery permission is required to add a quest photo.',
            beforePhotoAdded: 'Before photo added. Report photo will be required on completion.',
            beforePhotoRemoved: 'Before photo removed. Report photo is now optional.',
            beforePhotoUpdateError: 'Failed to update quest before photo.',
            approvedFeedback: 'Plan approved and quests activated.',
            approveError: 'Failed to approve this plan.',
            regeneratedFeedback: 'Plan regenerated. Review new quests below.',
            regenerateError: 'Failed to regenerate plan.',
            approving: 'Approving plan...',
            regenerating: 'Regenerating plan...',
            title: 'Plan Preview',
            targetSubtitle: (label: string) => `Target: ${label}`,
            actionErrorTitle: 'Plan action error',
            statusSubtitle: (status: string) => `Status: ${status}`,
            questsTitle: 'Quests',
            questsSubtitle: (count: number) => `${count} generated quests`,
            difficulty: (value: string) => `Difficulty: ${value}`,
            rewardXp: (value: number) => `Reward XP: ${value}`,
            rewardActive: (label: string) => `Active reward: ${label}`,
            estimatedMinutes: (value: number) => `Estimated minutes: ${value}`,
            reportPhoto: (required: boolean) => `Report photo: ${required ? 'required' : 'optional'}`,
            beforePhotoTitle: 'Before photo',
            beforePhotoNotAdded: 'Before photo not added.',
            beforePhotoRequiredHint: 'After completion, child must submit a result photo.',
            loading: 'Loading...',
            gallery: 'Gallery',
            camera: 'Camera',
            removing: 'Removing...',
            remove: 'Remove',
            steps: 'Steps',
            noQuestsTitle: 'No quests generated',
            noQuestsDescription: 'Regenerate plan to create quests.',
            totalMinutesTitle: 'Total Estimated Minutes',
            totalMinutesSubtitle: 'Overall workload',
            minutes: (value: number) => `${value} min`,
            approve: 'Approve',
            regenerate: 'Regenerate',
            back: 'Back',
          },
    [language],
  );

  const [plan, setPlan] = React.useState(route.params.plan);
  const [isApproving, setIsApproving] = React.useState(false);
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [photoActionQuestId, setPhotoActionQuestId] = React.useState<string | null>(null);
  const [photoActionType, setPhotoActionType] = React.useState<'camera' | 'gallery' | 'remove' | null>(null);
  const [rewardDraftsByQuestId, setRewardDraftsByQuestId] = React.useState<Record<string, QuestRewardDraft>>(
    () => createRewardDraftMap(route.params.plan.quests),
  );
  const [dirtyRewardQuestIds, setDirtyRewardQuestIds] = React.useState<Record<string, true>>({});
  const canApprove = plan.status === 'draft';

  React.useEffect(() => {
    setRewardDraftsByQuestId(createRewardDraftMap(plan.quests));
    setDirtyRewardQuestIds({});
  }, [plan.id]);

  const updateRewardDraft = React.useCallback(
    (quest: Quest, updater: (currentDraft: QuestRewardDraft) => QuestRewardDraft) => {
      setRewardDraftsByQuestId((current) => {
        const currentDraft = current[quest.id] ?? createQuestRewardDraftFromQuest(quest);
        const nextDraft = updater(currentDraft);
        return {
          ...current,
          [quest.id]: nextDraft,
        };
      });
      setDirtyRewardQuestIds((current) => ({
        ...current,
        [quest.id]: true,
      }));
    },
    [],
  );

  const applyEditedRewardsAfterApprove = React.useCallback(async (approvedPlan: GeneratedPlan) => {
    const editedQuestIds = Object.keys(dirtyRewardQuestIds);
    if (editedQuestIds.length === 0) {
      return;
    }

    await Promise.all(
      editedQuestIds.map(async (questId) => {
        const approvedQuest = approvedPlan.quests.find((quest) => quest.id === questId);
        const draft = rewardDraftsByQuestId[questId];
        if (!approvedQuest || !draft) {
          return;
        }

        await questsService.updateQuestReward(approvedQuest.id, buildQuestRewardFieldsFromDraft(draft));
      }),
    );
  }, [dirtyRewardQuestIds, rewardDraftsByQuestId]);

  const resolveActionErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return fallback;
  };

  const pickQuestPhoto = async (source: 'camera' | 'gallery'): Promise<CapturedPhoto | null> => {
    if (source === 'camera') {
      const permission = await cameraService.requestCameraPermission();
      if (permission !== 'granted') {
        throw new Error(copy.cameraPermissionRequired);
      }

      const photo = await cameraService.openCamera();
      if (!photo) {
        return null;
      }

      return cameraService.preparePhoto(photo);
    }

    const permission = await cameraService.requestGalleryPermission();
    if (permission !== 'granted') {
      throw new Error(copy.galleryPermissionRequired);
    }

    const photo = await cameraService.openGallery();
    if (!photo) {
      return null;
    }

    return cameraService.preparePhoto(photo);
  };

  const handleQuestBeforePhoto = async (quest: Quest, action: 'camera' | 'gallery' | 'remove') => {
    if (!canApprove) {
      return;
    }

    setScreenError(null);
    setPhotoActionQuestId(quest.id);
    setPhotoActionType(action);

    try {
      const photo = action === 'remove' ? null : await pickQuestPhoto(action);
      if (action !== 'remove' && !photo) {
        return;
      }

      const updatedQuest = await questsService.updateQuestBeforePhoto(quest.id, photo);
      setPlan((currentPlan) => ({
        ...currentPlan,
        quests: currentPlan.quests.map((item) => (item.id === updatedQuest.id ? updatedQuest : item)),
      }));
      setFeedback(updatedQuest.beforePhoto ? copy.beforePhotoAdded : copy.beforePhotoRemoved);
    } catch (error) {
      setScreenError(resolveActionErrorMessage(error, copy.beforePhotoUpdateError));
    } finally {
      setPhotoActionQuestId(null);
      setPhotoActionType(null);
    }
  };

  const handleApprove = async () => {
    if (!canApprove) {
      return;
    }

    setIsApproving(true);
    try {
      setScreenError(null);
      const approved = await plansService.approvePlan(plan.id);
      await applyEditedRewardsAfterApprove(approved);
      setPlan(approved);
      const targetChildId =
        approved.quests.find((quest) => quest.assignedToUserId.trim().length > 0)?.assignedToUserId.trim() ?? null;
      if (role === 'adult' && targetChildId) {
        await setSelectedChildId(targetChildId);
      }
      setFeedback(copy.approvedFeedback);
      navigation.navigate('MainTabs', { screen: 'Quests' });
    } catch (error) {
      setScreenError(getApiErrorMessage(error, copy.approveError, language));
    } finally {
      setIsApproving(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      setScreenError(null);
      const regenerated = await plansService.generatePlan(route.params.request);
      setPlan(regenerated);
      setFeedback(copy.regeneratedFeedback);
    } catch (error) {
      setScreenError(getApiErrorMessage(error, copy.regenerateError, language));
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isApproving || isRegenerating) {
    return (
      <ScreenContainer centered>
        <LoadingState label={isApproving ? copy.approving : copy.regenerating} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader
        title={copy.title}
        subtitle={copy.targetSubtitle(route.params.targetLabel)}
      />

      {screenError ? <EmptyState title={copy.actionErrorTitle} description={screenError} /> : null}
      {feedback ? <EmptyState title={feedback} /> : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StatCard title={plan.title} subtitle={copy.statusSubtitle(plan.status)} style={styles.card}>
          <Text style={[styles.text, { color: colors.text }]} allowFontScaling>
            {plan.summary}
          </Text>
          <Text style={[styles.childMessage, { color: colors.textSecondary }]} allowFontScaling>
            {plan.childMessage}
          </Text>
        </StatCard>

        <StatCard title={copy.questsTitle} subtitle={copy.questsSubtitle(plan.quests.length)} style={styles.card}>
          {plan.quests.length > 0 ? (
            plan.quests.map((quest) => {
              const rewardDraft =
                rewardDraftsByQuestId[quest.id] ?? createQuestRewardDraftFromQuest(quest);
              const rewardPreview = buildQuestRewardPreviewFromDraft(rewardDraft);

              return (
                <View key={quest.id} style={[styles.questItem, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Text style={[styles.questTitle, { color: colors.text }]} allowFontScaling>
                    {quest.title}
                  </Text>
                  <Text style={[styles.questDescription, { color: colors.textSecondary }]} allowFontScaling>
                    {quest.description}
                  </Text>
                  <Text style={[styles.questMeta, { color: colors.textSecondary }]} allowFontScaling>
                    {copy.difficulty(quest.difficulty)}
                  </Text>
                  <Text style={[styles.questMeta, { color: colors.textSecondary }]} allowFontScaling>
                    {copy.rewardXp(quest.rewardXp)}
                  </Text>
                  <Text style={[styles.questMeta, { color: colors.text }]} allowFontScaling>
                    🎁 {canApprove ? rewardPreview : getQuestRewardLabel(quest)}
                  </Text>
                  <Text style={[styles.questMeta, { color: colors.textSecondary }]} allowFontScaling>
                    {copy.rewardActive(canApprove ? rewardPreview : getQuestRewardLabel(quest))}
                  </Text>
                  <Text style={[styles.questMeta, { color: colors.textSecondary }]} allowFontScaling>
                    {copy.estimatedMinutes(quest.estimatedMinutes)}
                  </Text>
                  <Text style={[styles.questMeta, { color: colors.text }]} allowFontScaling>
                    {copy.reportPhoto(Boolean(quest.beforePhoto?.uri))}
                  </Text>

                  <View style={styles.beforePhotoWrap}>
                    <Text style={[styles.stepsHeading, { color: colors.text }]} allowFontScaling>
                      {copy.beforePhotoTitle}
                    </Text>
                    {quest.beforePhoto?.uri ? (
                      <Image source={{ uri: quest.beforePhoto.uri }} style={styles.beforePhotoPreview} resizeMode="cover" />
                    ) : (
                      <Text style={[styles.questMeta, { color: colors.textSecondary }]} allowFontScaling>
                        {copy.beforePhotoNotAdded}
                      </Text>
                    )}
                    {quest.beforePhoto?.uri ? (
                      <Text style={[styles.questMeta, { color: colors.textSecondary }]} allowFontScaling>
                        {copy.beforePhotoRequiredHint}
                      </Text>
                    ) : null}
                    {canApprove ? (
                      <View style={styles.photoActionsRow}>
                        <Pressable
                          onPress={() => {
                            void handleQuestBeforePhoto(quest, 'gallery');
                          }}
                          style={[
                            styles.photoActionButton,
                            { borderColor: colors.border, backgroundColor: colors.background },
                            photoActionQuestId === quest.id ? styles.photoActionDisabled : null,
                          ]}
                          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                          disabled={photoActionQuestId === quest.id}
                        >
                          <Text style={[styles.photoActionLabel, { color: colors.text }]} allowFontScaling>
                            {photoActionQuestId === quest.id && photoActionType === 'gallery' ? copy.loading : copy.gallery}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            void handleQuestBeforePhoto(quest, 'camera');
                          }}
                          style={[
                            styles.photoActionButton,
                            { borderColor: colors.border, backgroundColor: colors.background },
                            photoActionQuestId === quest.id ? styles.photoActionDisabled : null,
                          ]}
                          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                          disabled={photoActionQuestId === quest.id}
                        >
                          <Text style={[styles.photoActionLabel, { color: colors.text }]} allowFontScaling>
                            {photoActionQuestId === quest.id && photoActionType === 'camera' ? copy.loading : copy.camera}
                          </Text>
                        </Pressable>
                        {quest.beforePhoto?.uri ? (
                          <Pressable
                            onPress={() => {
                              void handleQuestBeforePhoto(quest, 'remove');
                            }}
                            style={[
                              styles.photoActionButton,
                              { borderColor: colors.border, backgroundColor: colors.background },
                              photoActionQuestId === quest.id ? styles.photoActionDisabled : null,
                            ]}
                            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                            disabled={photoActionQuestId === quest.id}
                          >
                            <Text style={[styles.photoActionLabel, { color: colors.text }]} allowFontScaling>
                              {photoActionQuestId === quest.id && photoActionType === 'remove' ? copy.removing : copy.remove}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ) : null}
                  </View>

                  {canApprove ? (
                    <QuestRewardEditor
                      draft={rewardDraft}
                      previewText={rewardPreview}
                      selectedTypeColor={PLAN_PREVIEW_SELECTED_REWARD_TYPE_COLOR}
                      onChangeType={(type) => {
                        updateRewardDraft(quest, (currentDraft) => ({
                          type,
                          valueInput: '',
                          noteInput: currentDraft.noteInput,
                        }));
                      }}
                      onChangeValue={(value) => {
                        updateRewardDraft(quest, (currentDraft) => ({ ...currentDraft, valueInput: value }));
                      }}
                      onChangeNote={(value) => {
                        updateRewardDraft(quest, (currentDraft) => ({ ...currentDraft, noteInput: value }));
                      }}
                    />
                  ) : null}

                  {(quest.steps?.length ?? 0) > 0 ? (
                    <View style={styles.stepsWrap}>
                      <Text style={[styles.stepsHeading, { color: colors.text }]} allowFontScaling>
                        {copy.steps}
                      </Text>
                      {[...(quest.steps ?? [])]
                        .sort((left, right) => left.order - right.order)
                        .map((step, index) => (
                          <View key={step.id} style={[styles.stepItem, { borderColor: colors.border }]}>
                            <Text style={[styles.stepTitle, { color: colors.text }]} allowFontScaling>
                              {index + 1}. {step.title}
                            </Text>
                            {step.description ? (
                              <Text style={[styles.stepDescription, { color: colors.textSecondary }]} allowFontScaling>
                                {step.description}
                              </Text>
                            ) : null}
                          </View>
                        ))}
                    </View>
                  ) : null}
                </View>
              );
            })
          ) : (
            <EmptyState title={copy.noQuestsTitle} description={copy.noQuestsDescription} />
          )}
        </StatCard>

        <StatCard title={copy.totalMinutesTitle} subtitle={copy.totalMinutesSubtitle} style={styles.card}>
          <Text style={[styles.totalMinutes, { color: colors.text }]} allowFontScaling>
            {copy.minutes(plan.totalEstimatedMinutes)}
          </Text>
        </StatCard>

        <View style={[styles.actionsRow, styles.card]}>
          {canApprove ? (
            <Pressable
              onPress={handleApprove}
              style={styles.approveButton}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.16)' }}
            >
              <Text style={styles.approveButtonLabel} allowFontScaling>
                {copy.approve}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={handleRegenerate}
            style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.background }]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
          >
            <Text style={[styles.secondaryButtonLabel, { color: colors.text }]} allowFontScaling>
              {copy.regenerate}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.background }]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
          >
            <Text style={[styles.secondaryButtonLabel, { color: colors.text }]} allowFontScaling>
              {copy.back}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
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
    text: {
      fontSize: isTablet ? 15 : 14,
      lineHeight: isTablet ? 22 : 20,
    },
    childMessage: {
      fontSize: isTablet ? 14 : 13,
      lineHeight: isTablet ? 21 : 19,
      fontStyle: 'italic',
    },
    questItem: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 2,
      elevation: 1,
    },
    questTitle: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: '700',
      marginBottom: 2,
    },
    questDescription: {
      fontSize: isTablet ? 13 : 12,
      lineHeight: isTablet ? 19 : 17,
      marginBottom: 2,
    },
    questMeta: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '500',
    },
    beforePhotoWrap: {
      marginTop: 8,
      gap: 6,
    },
    beforePhotoPreview: {
      width: '100%',
      height: isTablet ? 200 : 165,
      borderRadius: 10,
      backgroundColor: '#dfe7f1',
    },
    photoActionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    photoActionButton: {
      minHeight: 38,
      borderWidth: 1,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      overflow: 'hidden',
      elevation: 1,
    },
    photoActionDisabled: {
      opacity: 0.6,
    },
    photoActionLabel: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '700',
    },
    stepsWrap: {
      marginTop: 8,
      gap: 6,
    },
    stepsHeading: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: '700',
    },
    stepItem: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 2,
    },
    stepTitle: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '700',
    },
    stepDescription: {
      fontSize: isTablet ? 12 : 11,
      lineHeight: isTablet ? 17 : 15,
    },
    totalMinutes: {
      fontSize: isTablet ? 22 : 20,
      fontWeight: '700',
    },
    actionsRow: {
      gap: 10,
    },
    approveButton: {
      minHeight: 46,
      borderRadius: 10,
      backgroundColor: '#ff2d55',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      elevation: 2,
    },
    approveButtonLabel: {
      color: '#ffffff',
      fontSize: isTablet ? 16 : 15,
      fontWeight: '700',
    },
    secondaryButton: {
      minHeight: 44,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      elevation: 1,
    },
    secondaryButtonLabel: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: '700',
    },
  });

export default PlanPreviewScreen;
