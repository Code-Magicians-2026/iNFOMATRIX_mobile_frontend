import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  completeQuestMock,
  getChildrenMock,
  getMeMock,
  getProgressMock,
  getQuestsMock,
  setMockMeId,
} from '@/src/features/mvp/services';

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
  const [completingQuestId, setCompletingQuestId] = React.useState<string | null>(null);
  const [detailsQuest, setDetailsQuest] = React.useState<Quest | null>(null);

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
        setMockMeId(targetMockUserId);
      } catch {
        setMockMeId(effectiveRole === 'adult' ? 'adult-1' : 'child-1');
      }

      if (effectiveRole === 'adult') {
        const [meData, childrenData] = await Promise.all([getMeMock(), getChildrenMock()]);
        setChildren(childrenData);

        if (childrenData.length === 0) {
          setTargetUserId(null);
          setTargetLabel(meData.fullName);
          setQuests([]);
          setProgress(null);
          return;
        }

        const selectedChildCandidate = preferredChildId ?? selectedChildId;
        const isSelectedChildValid = selectedChildCandidate
          ? childrenData.some((child) => child.id === selectedChildCandidate)
          : false;
        const resolvedSelectedChildId = isSelectedChildValid ? selectedChildCandidate : childrenData[0].id;

        if (resolvedSelectedChildId !== selectedChildId) {
          await setSelectedChildId(resolvedSelectedChildId);
        }

        const activeChild =
          childrenData.find((child) => child.id === resolvedSelectedChildId) ?? childrenData[0];
        const [questsData, progressData] = await Promise.all([
          getQuestsMock(activeChild.id),
          getProgressMock(activeChild.id),
        ]);

        setTargetUserId(activeChild.id);
        setTargetLabel(activeChild.fullName);
        setQuests(questsData);
        setProgress(progressData);

        return;
      }

      const meData = await getMeMock();
      const [questsData, progressData] = await Promise.all([
        getQuestsMock(meData.id),
        getProgressMock(meData.id),
      ]);

      setChildren([]);
      setTargetUserId(meData.id);
      setTargetLabel(meData.fullName);
      setQuests(questsData);
      setProgress(progressData);
    } catch {
      setScreenError('Failed to load assigned quests. Please try again.');
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

  const completedQuests = React.useMemo(
    () => quests.filter((quest) => quest.status === 'completed'),
    [quests],
  );

  const completedToday = React.useMemo(() => {
    const today = getTodayIsoDate();
    return completedQuests.filter((quest) => quest.createdAt?.slice(0, 10) === today).length;
  }, [completedQuests]);

  const xpToday = React.useMemo(() => {
    const today = getTodayIsoDate();
    return completedQuests
      .filter((quest) => quest.createdAt?.slice(0, 10) === today)
      .reduce((sum, quest) => sum + quest.rewardXp, 0);
  }, [completedQuests]);

  const handleCompleteQuest = async (id: string) => {
    setCompletingQuestId(id);
    setScreenError(null);

    try {
      await completeQuestMock(id);
      await refreshData(false);
    } catch {
      setScreenError('Could not complete quest. Please try again.');
    } finally {
      setCompletingQuestId(null);
    }
  };

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
      <SectionHeader
        title="Quests"
        subtitle={
          isChildExecutionMode
            ? 'Execution mode: complete assigned quests and earn XP'
            : 'Review mode: view assigned quests for selected child'
        }
      />

      {effectiveRole === 'adult' ? (
        <StatCard title="Target Child" subtitle="Quests are tied to selected profile">
          {children.length > 0 ? (
            <View style={styles.childList}>
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
        {!isChildExecutionMode ? (
          <Text style={[styles.progressText, { color: colors.textSecondary }]} allowFontScaling>
            Adult mode is read-only. Completion is available in child mode.
          </Text>
        ) : null}
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

      <PrimaryButton
        label={isRefreshing ? 'Refreshing...' : 'Refresh quests'}
        disabled={isRefreshing}
        onPress={() => {
          void refreshData(false);
        }}
      />

      {screenError ? <EmptyState title="Quest flow error" description={screenError} /> : null}

      {isLoading ? (
        <LoadingState label="Loading assigned quests..." />
      ) : (
        <View style={styles.listArea}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionBlock}>
              <SectionHeader title="Active Quests" />
              {targetUserId ? (
                activeQuests.length > 0 ? (
                  activeQuests.map((quest) => (
                    <QuestCard
                      key={quest.id}
                      quest={quest}
                      onComplete={isChildExecutionMode ? handleCompleteQuest : undefined}
                      onViewDetails={setDetailsQuest}
                      isCompleting={completingQuestId === quest.id}
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
              <SectionHeader title="Completed Quests" />
              {targetUserId ? (
                completedQuests.length > 0 ? (
                  completedQuests.map((quest) => (
                    <QuestCard key={quest.id} quest={quest} onViewDetails={setDetailsQuest} />
                  ))
                ) : (
                  <EmptyState
                    title="No completed quests yet"
                    description={
                      isChildExecutionMode
                        ? 'Complete active quests to move them here.'
                        : 'Child has no completed quests yet.'
                    }
                  />
                )
              ) : (
                <EmptyState
                  title="No completed quests"
                  description="Create child profile and approve a plan first."
                />
              )}
            </View>
          </ScrollView>
        </View>
      )}

      <Modal
        visible={Boolean(detailsQuest)}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsQuest(null)}
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
                  Category: {detailsQuest.category}
                </Text>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]} allowFontScaling>
                  Difficulty: {detailsQuest.difficulty}
                </Text>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]} allowFontScaling>
                  Reward XP: {detailsQuest.rewardXp}
                </Text>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]} allowFontScaling>
                  Estimated minutes: {detailsQuest.estimatedMinutes}
                </Text>
                <PrimaryButton
                  label="Close"
                  variant="secondary"
                  onPress={() => setDetailsQuest(null)}
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
      gap: 14,
    },
    progressText: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: '500',
    },
    childList: {
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
    listArea: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      gap: 18,
      paddingBottom: spacing,
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
  });

export default QuestsScreen;
