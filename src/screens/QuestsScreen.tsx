import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import useAuthStore from '@/context/Auth-store';
import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import type {
  ChildProfile,
  ProgressSummary,
  Quest,
  QuestStep,
  UserRole,
} from '@/shared/models/mvp-contracts.model';
import {
  EmptyState,
  LoadingState,
  PrimaryButton,
  QuestCard,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from '@/shared/components/ui';
import {
  childrenService,
  progressService,
  questsService,
  userService,
} from '@/src/integration/services';

const resolveMockUserId = (role: UserRole, currentUserId: string | undefined) => {
  if (role === 'adult') {
    return 'adult-1';
  }

  if (typeof currentUserId === 'string' && currentUserId.startsWith('child-')) {
    return currentUserId;
  }

  return 'child-1';
};

const getTodayIsoDate = () => new Date().toISOString().slice(0, 10);
const STEP_TOGGLE_VIBRATION_PATTERN = [0, 45, 25, 65];

const isQuestArchived = (quest: Quest) => quest.status === 'archived' || quest.status === 'completed';

const getQuestCompletionDate = (quest: Quest) => quest.archivedAt ?? quest.completedAt ?? quest.createdAt;

const getQuestProgress = (quest: Quest) => {
  const stepsCount = quest.stepsCount ?? quest.steps?.length ?? 0;
  const completedStepsCount =
    quest.completedStepsCount ?? quest.steps?.filter((step) => step.status === 'completed').length ?? 0;

  return { stepsCount, completedStepsCount };
};

type CompletionFeedback = {
  questTitle: string;
  rewardXp: number;
  category: string;
  categoryValue: number;
  totalXp: number;
  streak: number;
};

const QuestsScreen = () => {
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(() => getStyles(cardMaxWidth, isTablet, spacing), [cardMaxWidth, isTablet, spacing]);

  const role = useAuthStore((s) => s.role);
  const currentUser = useAuthStore((s) => s.currentUser);
  const selectedChildId = useAuthStore((s) => s.selectedChildId);
  const setSelectedChildId = useAuthStore((s) => s.setSelectedChildId);
  const setRole = useAuthStore((s) => s.setRole);

  const effectiveRole: UserRole = role ?? 'child';
  const isChildExecutionMode = effectiveRole === 'child';

  const [children, setChildren] = React.useState<ChildProfile[]>([]);
  const [targetUserId, setTargetUserId] = React.useState<string | null>(null);
  const [targetLabel, setTargetLabel] = React.useState<string>('Myself');
  const [quests, setQuests] = React.useState<Quest[]>([]);
  const [progress, setProgress] = React.useState<ProgressSummary | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [togglingStepId, setTogglingStepId] = React.useState<string | null>(null);
  const [detailsQuestId, setDetailsQuestId] = React.useState<string | null>(null);
  const [completionFeedback, setCompletionFeedback] = React.useState<CompletionFeedback | null>(null);
  const [showScrollTop, setShowScrollTop] = React.useState(false);
  const scrollRef = React.useRef<ScrollView | null>(null);

  React.useEffect(() => {
    if (!role) {
      void setRole('child');
    }
  }, [role, setRole]);

  const refreshData = React.useCallback(async (showLoader = false, preferredChildId?: string | null) => {
    if (showLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      setScreenError(null);

      const targetMockUserId = resolveMockUserId(effectiveRole, currentUser?.id);
      try {
        userService.setCurrentUserId(targetMockUserId);
      } catch {
        userService.setCurrentUserId(effectiveRole === 'adult' ? 'adult-1' : 'child-1');
      }

      if (effectiveRole === 'adult') {
        const [meData, childrenData] = await Promise.all([
          userService.getMe(),
          childrenService.getChildren(),
        ]);
        setChildren(childrenData);

        if (childrenData.length === 0) {
          setTargetUserId(null);
          setTargetLabel(meData.fullName);
          setQuests([]);
          setProgress(null);
          return null;
        }

        const selectedChildCandidate = preferredChildId ?? selectedChildId;
        const isSelectedChildValid = selectedChildCandidate
          ? childrenData.some((child) => child.id === selectedChildCandidate)
          : false;
        const resolvedSelectedChildId = isSelectedChildValid ? selectedChildCandidate : null;

        if (selectedChildId && !isSelectedChildValid) {
          await setSelectedChildId(null);
        }

        if (!resolvedSelectedChildId) {
          setTargetUserId(null);
          setTargetLabel('No active child');
          setQuests([]);
          setProgress(null);
          return null;
        }

        const activeChild = childrenData.find((child) => child.id === resolvedSelectedChildId);
        if (!activeChild) {
          setTargetUserId(null);
          setTargetLabel('No active child');
          setQuests([]);
          setProgress(null);
          return null;
        }
        const [questsData, progressData] = await Promise.all([
          questsService.getQuests(activeChild.id),
          progressService.getProgress(activeChild.id),
        ]);

        setTargetUserId(activeChild.id);
        setTargetLabel(activeChild.fullName);
        setQuests(questsData);
        setProgress(progressData);

        return progressData;
      }

      const meData = await userService.getMe();
      const [questsData, progressData] = await Promise.all([
        questsService.getQuests(meData.id),
        progressService.getProgress(meData.id),
      ]);

      setChildren([]);
      setTargetUserId(meData.id);
      setTargetLabel(meData.fullName);
      setQuests(questsData);
      setProgress(progressData);
      return progressData;
    } catch {
      setScreenError('Failed to load assigned quests. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUser?.id, effectiveRole, selectedChildId, setSelectedChildId]);

  React.useEffect(() => {
    void refreshData(true);
  }, [refreshData]);

  useFocusEffect(
    React.useCallback(() => {
      if (!isLoading) {
        void refreshData(false);
      }

      return undefined;
    }, [isLoading, refreshData]),
  );

  const activeQuests = React.useMemo(
    () => quests.filter((quest) => quest.status === 'active'),
    [quests],
  );

  const archivedQuests = React.useMemo(
    () => quests.filter((quest) => isQuestArchived(quest)),
    [quests],
  );

  const completedToday = React.useMemo(() => {
    const today = getTodayIsoDate();
    return archivedQuests.filter((quest) => getQuestCompletionDate(quest)?.slice(0, 10) === today).length;
  }, [archivedQuests]);

  const xpToday = React.useMemo(() => {
    const today = getTodayIsoDate();
    return archivedQuests
      .filter((quest) => getQuestCompletionDate(quest)?.slice(0, 10) === today)
      .reduce((sum, quest) => sum + quest.rewardXp, 0);
  }, [archivedQuests]);

  const detailsQuest = React.useMemo(
    () => quests.find((quest) => quest.id === detailsQuestId) ?? null,
    [detailsQuestId, quests],
  );

  React.useEffect(() => {
    if (detailsQuestId && !detailsQuest) {
      setDetailsQuestId(null);
    }
  }, [detailsQuest, detailsQuestId]);

  const handleToggleStep = async (questId: string, step: QuestStep) => {
    const questToUpdate = quests.find((quest) => quest.id === questId);
    if (!questToUpdate) {
      setScreenError('Selected quest was not found.');
      return;
    }

    if (isQuestArchived(questToUpdate)) {
      return;
    }

    Vibration.vibrate(STEP_TOGGLE_VIBRATION_PATTERN);
    setTogglingStepId(step.id);
    setScreenError(null);

    try {
      const updatedQuest = await questsService.toggleQuestStep(questId, step.id);
      const refreshedProgress = await refreshData(false);

      const movedToArchive = !isQuestArchived(questToUpdate) && isQuestArchived(updatedQuest);
      if (movedToArchive && refreshedProgress) {
        setCompletionFeedback({
          questTitle: updatedQuest.title,
          rewardXp: updatedQuest.rewardXp,
          category: updatedQuest.category,
          categoryValue: refreshedProgress.stats[updatedQuest.category] ?? 0,
          totalXp: refreshedProgress.xp,
          streak: refreshedProgress.streak,
        });
      }
    } catch {
      setScreenError('Could not update quest step. Please try again.');
    } finally {
      setTogglingStepId(null);
    }
  };

  React.useEffect(() => {
    if (!completionFeedback) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setCompletionFeedback(null);
    }, 4200);

    return () => clearTimeout(timer);
  }, [completionFeedback]);

  const handleSelectChild = async (childId: string) => {
    setScreenError(null);
    try {
      await setSelectedChildId(childId);
      await refreshData(false, childId);
    } catch {
      setScreenError('Could not switch child profile.');
    }
  };

  return (
    <ScreenContainer contentStyle={styles.container}>
      {isLoading ? (
        <LoadingState label="Loading assigned quests..." />
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={(event) => {
            const y = event.nativeEvent.contentOffset.y;
            if (y > 260 && !showScrollTop) {
              setShowScrollTop(true);
            } else if (y <= 260 && showScrollTop) {
              setShowScrollTop(false);
            }
          }}
          scrollEventThrottle={16}
        >
          <SectionHeader
            title="Quests"
            subtitle={
              isChildExecutionMode
                ? 'Execution mode: complete assigned quests and earn XP'
                : 'Parent mode: review and update selected child quests'
            }
          />

          {effectiveRole === 'adult' ? (
            <StatCard title="Target Child" subtitle="Quests are tied to selected profile">
              {children.length > 0 ? (
                <View style={styles.childList}>
                  {!targetUserId ? (
                    <View style={styles.noChildSelectedWrap}>
                      <EmptyState
                        title="No active child selected"
                        description="Choose a child to preview their assigned quests."
                      />
                      <PrimaryButton
                        label="Select first child"
                        variant="secondary"
                        onPress={() => {
                          const firstChild = children[0];
                          if (firstChild) {
                            void handleSelectChild(firstChild.id);
                          }
                        }}
                      />
                    </View>
                  ) : null}
                  {children.map((child) => {
                    const isSelected = child.id === targetUserId;
                    return (
                      <Pressable
                        key={child.id}
                        onPress={() => {
                          void handleSelectChild(child.id);
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
                          Age {child.age} | Level {child.level}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <EmptyState title="No child profiles" description="Create child from Home to assign quests." />
              )}
            </StatCard>
          ) : null}

          <StatCard
            title="Quest Progress"
            subtitle={isChildExecutionMode ? 'Execution metrics' : `Target: ${targetLabel}`}
          >
            <Text style={[styles.progressText, { color: colors.text }]} allowFontScaling>
              Active quests: {activeQuests.length}
            </Text>
            <Text style={[styles.progressText, { color: colors.text }]} allowFontScaling>
              Completed today: {completedToday}
            </Text>
            <Text style={[styles.progressText, { color: colors.text }]} allowFontScaling>
              XP earned today: {xpToday}
            </Text>
            <Text style={[styles.progressText, { color: colors.text }]} allowFontScaling>
              Total XP: {progress?.xp ?? 0}
            </Text>
            <Text style={[styles.progressText, { color: colors.text }]} allowFontScaling>
              Streak: {progress?.streak ?? 0}
            </Text>
          </StatCard>

          {completionFeedback ? (
            <StatCard title="Quest completed" subtitle={completionFeedback.questTitle}>
              <Text style={[styles.successXp, { color: '#1f9b54' }]} allowFontScaling>
                +{completionFeedback.rewardXp} XP
              </Text>
              <Text style={[styles.progressText, { color: colors.text }]} allowFontScaling>
                All steps completed
              </Text>
              <Text style={[styles.progressText, { color: colors.text }]} allowFontScaling>
                Quest moved to Archive, {completionFeedback.category} stat is now {completionFeedback.categoryValue}
              </Text>
              <Text style={[styles.progressText, { color: colors.textSecondary }]} allowFontScaling>
                Total XP: {completionFeedback.totalXp} | Streak: {completionFeedback.streak}
              </Text>
            </StatCard>
          ) : null}

          <PrimaryButton
            label={isRefreshing ? 'Refreshing...' : 'Refresh quests'}
            disabled={isRefreshing}
            onPress={() => {
              void refreshData(false);
            }}
          />

          {screenError ? <EmptyState title="Quest flow error" description={screenError} /> : null}

          <View style={styles.sectionBlock}>
            <SectionHeader title="Active Quests" />
            {targetUserId ? (
              activeQuests.length > 0 ? (
                activeQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    onViewDetails={() => setDetailsQuestId(quest.id)}
                  />
                ))
              ) : (
                <EmptyState
                  title="No active quests"
                  description="Approve an AI plan to move quests into active state."
                />
              )
            ) : (
              <EmptyState
                title="No target selected"
                description="Select child profile to load assigned quests."
              />
            )}
          </View>

          <View style={styles.sectionBlock}>
            <SectionHeader title="Archived" />
            {targetUserId ? (
              archivedQuests.length > 0 ? (
                archivedQuests.map((quest) => (
                  <QuestCard key={quest.id} quest={quest} onViewDetails={() => setDetailsQuestId(quest.id)} />
                ))
              ) : (
                <EmptyState
                  title="Archive is empty"
                  description="Complete all quest steps to move quests here."
                />
              )
            ) : (
              <EmptyState
                title="No archived quests"
                description="Create child profile and approve a plan first."
              />
            )}
          </View>
        </ScrollView>
      )}

      {showScrollTop && !isLoading ? (
        <Pressable
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          style={styles.scrollTopButton}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.16)' }}
        >
          <Text style={styles.scrollTopLabel} allowFontScaling>
            Up
          </Text>
        </Pressable>
      ) : null}

      <Modal
        visible={Boolean(detailsQuestId)}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsQuestId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {detailsQuest ? (
              <>
                <SectionHeader title="Quest Details" subtitle={detailsQuest.title} />
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]} allowFontScaling>
                  Original task: {detailsQuest.originalTask ?? 'Generated from approved AI plan'}
                </Text>
                <Text style={[styles.previewText, { color: colors.text }]} allowFontScaling>
                  {detailsQuest.description}
                </Text>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]} allowFontScaling>
                  Progress: {getQuestProgress(detailsQuest).completedStepsCount} / {getQuestProgress(detailsQuest).stepsCount} steps
                </Text>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]} allowFontScaling>
                  Difficulty: {detailsQuest.difficulty}
                </Text>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]} allowFontScaling>
                  Reward: +{detailsQuest.rewardXp} XP
                </Text>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]} allowFontScaling>
                  Estimated minutes: {detailsQuest.estimatedMinutes}
                </Text>

                <Text style={[styles.stepsHeading, { color: colors.text }]} allowFontScaling>
                  Steps
                </Text>

                <View style={styles.stepsList}>
                  {[...(detailsQuest.steps ?? [])]
                    .sort((left, right) => left.order - right.order)
                    .map((step) => {
                      const isCompleted = step.status === 'completed';
                      const isStepReadOnly = isQuestArchived(detailsQuest);
                      const isStepUpdating = togglingStepId === step.id;

                      return (
                        <Pressable
                          key={step.id}
                          style={[
                            styles.stepRow,
                            {
                              borderColor: isCompleted ? '#1f9b54' : colors.border,
                              backgroundColor: isCompleted ? '#e3f7ea' : colors.background,
                            },
                            (isStepReadOnly || isStepUpdating) ? styles.stepRowDisabled : null,
                          ]}
                          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                          onPress={() => {
                            void handleToggleStep(detailsQuest.id, step);
                          }}
                          disabled={isStepReadOnly || isStepUpdating}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: isCompleted, disabled: isStepReadOnly || isStepUpdating }}
                        >
                          <View style={styles.stepTitleRow}>
                            <View
                              style={[
                                styles.stepCheckbox,
                                {
                                  borderColor: isCompleted ? '#1f9b54' : colors.border,
                                  backgroundColor: isCompleted ? '#1f9b54' : 'transparent',
                                },
                              ]}
                            >
                              {isCompleted ? (
                                <Text style={styles.stepCheckmark} allowFontScaling={false}>
                                  ✓
                                </Text>
                              ) : null}
                            </View>
                            <Text style={[styles.stepTitle, { color: colors.text }]} allowFontScaling>
                              {step.title}
                            </Text>
                          </View>
                          {step.description ? (
                            <Text style={[styles.stepDescription, { color: colors.textSecondary }]} allowFontScaling>
                              {step.description}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                </View>

                {isQuestArchived(detailsQuest) ? (
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]} allowFontScaling>
                    Archived quests are read-only.
                  </Text>
                ) : null}

                <PrimaryButton
                  label="Close"
                  variant="secondary"
                  onPress={() => setDetailsQuestId(null)}
                />
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const getStyles = (cardMaxWidth: number, isTablet: boolean, spacing: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    progressText: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: '500',
    },
    successXp: {
      fontSize: isTablet ? 24 : 21,
      fontWeight: '800',
    },
    childList: {
      gap: 8,
    },
    noChildSelectedWrap: {
      gap: 8,
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
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      gap: 18,
      paddingBottom: Math.max(120, spacing + 88),
    },
    scrollTopButton: {
      position: 'absolute',
      right: spacing,
      bottom: Math.max(90, spacing + 58),
      minHeight: 42,
      minWidth: 64,
      borderRadius: 999,
      backgroundColor: '#ff2d55',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      elevation: 4,
      paddingHorizontal: 14,
    },
    scrollTopLabel: {
      color: '#ffffff',
      fontSize: isTablet ? 14 : 13,
      fontWeight: '700',
    },
    sectionBlock: {
      gap: 10,
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
      maxWidth: cardMaxWidth + 70,
      borderRadius: 14,
      borderWidth: 1,
      padding: isTablet ? 22 : 16,
      gap: 10,
      elevation: 3,
    },
    previewLabel: {
      fontSize: isTablet ? 15 : 13,
      fontWeight: '500',
    },
    previewText: {
      fontSize: isTablet ? 16 : 14,
      lineHeight: isTablet ? 22 : 20,
    },
    stepsHeading: {
      fontSize: isTablet ? 18 : 16,
      fontWeight: '700',
    },
    stepsList: {
      gap: 8,
    },
    stepRow: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      overflow: 'hidden',
      gap: 4,
      elevation: 1,
    },
    stepRowDisabled: {
      opacity: 0.7,
    },
    stepTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    stepCheckbox: {
      width: isTablet ? 22 : 20,
      height: isTablet ? 22 : 20,
      borderWidth: 2,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepCheckmark: {
      color: '#ffffff',
      fontSize: isTablet ? 14 : 13,
      fontWeight: '900',
    },
    stepTitle: {
      flex: 1,
      fontSize: isTablet ? 15 : 14,
      fontWeight: '600',
    },
    stepDescription: {
      fontSize: isTablet ? 13 : 12,
      lineHeight: isTablet ? 18 : 16,
      paddingLeft: 30,
    },
  });

export default QuestsScreen;
