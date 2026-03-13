import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import useAuthStore from '@/context/Auth-store';
import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import type {
  ChildProfile,
  GeneratedPlan,
  ProgressSummary,
  Quest,
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
  approvePlanMock,
  createChildMock,
  generatePlanMock,
  getChildrenMock,
  getMeMock,
  getPlansMock,
  getProgressMock,
  getQuestsMock,
  setMockMeId,
} from '@/src/features/mvp/services';

const XP_PER_LEVEL = 300;

const PLAN_PROMPTS = [
  'Build a balanced plan for school progress and healthy routine.',
  'Create a motivational quest sequence with short achievable steps.',
  'Generate a confidence plan focused on consistency and wins.',
] as const;

const resolveMockUserId = (role: UserRole, currentUserId: string | undefined) => {
  if (role === 'adult') {
    return 'adult-1';
  }

  if (typeof currentUserId === 'string' && currentUserId.startsWith('child-')) {
    return currentUserId;
  }

  return 'child-1';
};

const HomeScreen = () => {
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(
    () => getStyles(cardMaxWidth, isTablet, spacing),
    [cardMaxWidth, isTablet, spacing],
  );

  const role = useAuthStore((s) => s.role);
  const currentUser = useAuthStore((s) => s.currentUser);
  const selectedChildId = useAuthStore((s) => s.selectedChildId);
  const setRole = useAuthStore((s) => s.setRole);
  const setSelectedChildId = useAuthStore((s) => s.setSelectedChildId);

  const [me, setMe] = React.useState<UserProfile | null>(null);
  const [children, setChildren] = React.useState<ChildProfile[]>([]);
  const [recentPlans, setRecentPlans] = React.useState<GeneratedPlan[]>([]);
  const [todayQuests, setTodayQuests] = React.useState<Quest[]>([]);
  const [progress, setProgress] = React.useState<ProgressSummary | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [isCreatingChild, setIsCreatingChild] = React.useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = React.useState(false);
  const [approvingPlanId, setApprovingPlanId] = React.useState<string | null>(null);

  const [isCreateChildModalVisible, setIsCreateChildModalVisible] = React.useState(false);
  const [childFullName, setChildFullName] = React.useState('');
  const [childAge, setChildAge] = React.useState('');
  const [childInterests, setChildInterests] = React.useState('');
  const [childNotes, setChildNotes] = React.useState('');
  const [createChildError, setCreateChildError] = React.useState<string | null>(null);

  const effectiveRole: UserRole = role ?? 'child';

  React.useEffect(() => {
    if (!role) {
      void setRole('child');
    }
  }, [role, setRole]);

  const loadDashboard = React.useCallback(
    async (showLoader = false) => {
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
          const [meData, childrenData, planData] = await Promise.all([
            getMeMock(),
            getChildrenMock(),
            getPlansMock({ limit: 6 }),
          ]);

          const childIds = new Set(childrenData.map((child) => child.id));
          const filteredPlans = planData.filter((plan) =>
            plan.quests.some((quest) => childIds.has(quest.assignedToUserId)),
          );

          const resolvedSelectedChildId =
            selectedChildId && childIds.has(selectedChildId)
              ? selectedChildId
              : (childrenData[0]?.id ?? null);

          if (resolvedSelectedChildId !== selectedChildId) {
            await setSelectedChildId(resolvedSelectedChildId);
          }

          const selectedProgress = resolvedSelectedChildId
            ? await getProgressMock(resolvedSelectedChildId)
            : null;

          setMe(meData);
          setChildren(childrenData);
          setRecentPlans(filteredPlans);
          setProgress(selectedProgress);
          setTodayQuests([]);

          return;
        }

        const meData = await getMeMock();
        const [questData, progressData] = await Promise.all([
          getQuestsMock(meData.id),
          getProgressMock(meData.id),
        ]);

        setMe(meData);
        setChildren([]);
        setRecentPlans([]);
        setTodayQuests(questData.slice(0, 5));
        setProgress(progressData);
      } catch {
        setScreenError('Failed to load dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentUser?.id, effectiveRole, selectedChildId, setSelectedChildId],
  );

  React.useEffect(() => {
    void loadDashboard(true);
  }, [loadDashboard]);

  const selectedChild = React.useMemo(
    () => children.find((child) => child.id === selectedChildId) ?? children[0] ?? null,
    [children, selectedChildId],
  );

  const completedToday = React.useMemo(
    () => todayQuests.filter((quest) => quest.status === 'completed').length,
    [todayQuests],
  );

  const totalXp = progress?.xp ?? me?.xp ?? 0;
  const streak = progress?.streak ?? me?.streak ?? 0;
  const level = progress?.level ?? me?.level ?? 1;
  const levelStartXp = Math.max(0, (level - 1) * XP_PER_LEVEL);
  const xpToNextLevel = Math.max(0, level * XP_PER_LEVEL - totalXp);
  const levelProgressPercent = Math.max(
    0,
    Math.min(100, Math.round(((totalXp - levelStartXp) / XP_PER_LEVEL) * 100)),
  );

  const resetCreateChildForm = () => {
    setChildFullName('');
    setChildAge('');
    setChildInterests('');
    setChildNotes('');
    setCreateChildError(null);
  };

  const openCreateChildModal = () => {
    resetCreateChildForm();
    setIsCreateChildModalVisible(true);
  };

  const closeCreateChildModal = () => {
    if (isCreatingChild) {
      return;
    }

    setIsCreateChildModalVisible(false);
  };

  const handleCreateChild = async () => {
    const fullName = childFullName.trim();
    if (!fullName) {
      setCreateChildError('Name is required.');
      return;
    }

    const parsedAge = Number(childAge.trim());
    if (!Number.isFinite(parsedAge) || parsedAge < 3 || parsedAge > 18) {
      setCreateChildError('Age must be between 3 and 18.');
      return;
    }

    const interests = childInterests
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    setIsCreatingChild(true);
    setCreateChildError(null);
    try {
      const createdChild = await createChildMock({
        fullName,
        age: Math.round(parsedAge),
        interests: interests.length > 0 ? interests : undefined,
        notes: childNotes.trim() || undefined,
      });

      await setSelectedChildId(createdChild.id);
      setIsCreateChildModalVisible(false);
      resetCreateChildForm();
      await loadDashboard(false);
    } catch {
      setCreateChildError('Failed to create child profile. Please try again.');
    } finally {
      setIsCreatingChild(false);
    }
  };

  const handleCreateAiPlan = async () => {
    if (!selectedChild) {
      return;
    }

    setIsGeneratingPlan(true);
    try {
      const randomPrompt = PLAN_PROMPTS[Math.floor(Math.random() * PLAN_PROMPTS.length)] ?? PLAN_PROMPTS[0];
      const generatedPlan = await generatePlanMock({
        targetUserId: selectedChild.id,
        prompt: randomPrompt,
        category: 'study',
        intensity: 'medium',
      });

      setRecentPlans((prev) => [generatedPlan, ...prev.filter((plan) => plan.id !== generatedPlan.id)].slice(0, 6));
    } catch {
      setScreenError('Failed to generate AI plan.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleApprovePlan = async (planId: string) => {
    setApprovingPlanId(planId);
    try {
      const approvedPlan = await approvePlanMock(planId);
      setRecentPlans((prev) => prev.map((plan) => (plan.id === approvedPlan.id ? approvedPlan : plan)));

      if (selectedChild) {
        const selectedProgress = await getProgressMock(selectedChild.id);
        setProgress(selectedProgress);
      }
    } catch {
      setScreenError('Failed to approve generated plan.');
    } finally {
      setApprovingPlanId(null);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer centered>
        <LoadingState label="Loading role dashboard..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader
        title="Home"
        subtitle={
          effectiveRole === 'adult'
            ? `Adult dashboard: ${me?.fullName ?? 'Parent'}`
            : `Hello, ${me?.fullName ?? 'Hero'}!`
        }
      />

      <View style={[styles.roleSwitcher, { borderColor: colors.border, backgroundColor: colors.card }]}> 
        <Pressable
          onPress={() => {
            void setRole('adult');
          }}
          style={[
            styles.roleChip,
            {
              backgroundColor: effectiveRole === 'adult' ? '#ff2d55' : colors.background,
              borderColor: effectiveRole === 'adult' ? '#ff2d55' : colors.border,
            },
          ]}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
        >
          <Text
            style={[styles.roleChipLabel, { color: effectiveRole === 'adult' ? '#ffffff' : colors.text }]}
            allowFontScaling
          >
            Adult
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void setRole('child');
          }}
          style={[
            styles.roleChip,
            {
              backgroundColor: effectiveRole === 'child' ? '#ff2d55' : colors.background,
              borderColor: effectiveRole === 'child' ? '#ff2d55' : colors.border,
            },
          ]}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
        >
          <Text
            style={[styles.roleChipLabel, { color: effectiveRole === 'child' ? '#ffffff' : colors.text }]}
            allowFontScaling
          >
            Child
          </Text>
        </Pressable>
      </View>

      {screenError ? <EmptyState title="Dashboard error" description={screenError} /> : null}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {effectiveRole === 'adult' ? (
          <>
            <StatCard
              title="Selected Child"
              subtitle="Current focus profile"
              style={styles.card}
            >
              {selectedChild ? (
                <>
                  <Text style={[styles.headingValue, { color: colors.text }]} allowFontScaling>
                    {selectedChild.fullName}
                  </Text>
                  <Text style={[styles.metricText, { color: colors.textSecondary }]} allowFontScaling>
                    Age: {selectedChild.age} | Level: {progress?.level ?? selectedChild.level}
                  </Text>
                  <Text style={[styles.metricText, { color: colors.textSecondary }]} allowFontScaling>
                    XP: {progress?.xp ?? selectedChild.xp} | Streak: {progress?.streak ?? selectedChild.streak}
                  </Text>
                  <Text style={[styles.metricText, { color: colors.textSecondary }]} allowFontScaling>
                    Active quests: {progress?.activeQuestsCount ?? 0}
                  </Text>
                </>
              ) : (
                <EmptyState title="No selected child" description="Create a child profile to begin." />
              )}
            </StatCard>

            <StatCard title="Children" subtitle="Choose who you are planning for" style={styles.card}>
              {children.length > 0 ? (
                <View style={styles.childList}>
                  {children.map((child) => {
                    const isSelected = child.id === selectedChild?.id;
                    return (
                      <Pressable
                        key={child.id}
                        onPress={() => {
                          void setSelectedChildId(child.id);
                        }}
                        style={[
                          styles.childRow,
                          {
                            backgroundColor: isSelected ? '#ff2d55' : colors.background,
                            borderColor: isSelected ? '#ff2d55' : colors.border,
                          },
                        ]}
                        android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                      >
                        <Text
                          style={[styles.childName, { color: isSelected ? '#ffffff' : colors.text }]}
                          allowFontScaling
                        >
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
              ) : (
                <EmptyState title="No children yet" description="Create child to start planning." />
              )}

              <View style={styles.actionButtonsWrap}>
                <PrimaryButton
                  label="Create child"
                  onPress={openCreateChildModal}
                  variant="secondary"
                  style={styles.actionButton}
                />
                <PrimaryButton
                  label="Create AI plan"
                  onPress={() => {
                    void handleCreateAiPlan();
                  }}
                  loading={isGeneratingPlan}
                  disabled={!selectedChild}
                  style={styles.actionButton}
                />
              </View>
            </StatCard>

            <StatCard title="Recent Generated Plans" subtitle="Latest AI output" style={styles.card}>
              {recentPlans.length > 0 ? (
                recentPlans.map((plan) => {
                  const isDraft = plan.status === 'draft';
                  const targetChild = children.find((child) =>
                    plan.quests.some((quest) => quest.assignedToUserId === child.id),
                  );

                  return (
                    <View key={plan.id} style={[styles.planItem, { borderColor: colors.border }]}> 
                      <Text style={[styles.planTitle, { color: colors.text }]} allowFontScaling>
                        {plan.title}
                      </Text>
                      <Text style={[styles.planSummary, { color: colors.textSecondary }]} allowFontScaling>
                        {plan.summary}
                      </Text>
                      <Text style={[styles.planMeta, { color: colors.textSecondary }]} allowFontScaling>
                        Child: {targetChild?.fullName ?? 'Unknown'} | Quests: {plan.quests.length} | Status: {plan.status}
                      </Text>

                      {isDraft ? (
                        <Pressable
                          onPress={() => {
                            void handleApprovePlan(plan.id);
                          }}
                          style={[styles.approveButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                        >
                          <Text style={[styles.approveButtonLabel, { color: colors.text }]} allowFontScaling>
                            {approvingPlanId === plan.id ? 'Approving...' : 'Approve plan'}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })
              ) : (
                <EmptyState title="No generated plans" description="Press Create AI plan to generate one." />
              )}
            </StatCard>
          </>
        ) : (
          <>
            <StatCard title="Greeting" subtitle="Your daily overview" style={styles.card}>
              <Text style={[styles.headingValue, { color: colors.text }]} allowFontScaling>
                Hi, {me?.fullName ?? 'Explorer'}
              </Text>
              <Text style={[styles.metricText, { color: colors.textSecondary }]} allowFontScaling>
                Keep your streak alive and finish today&apos;s quests.
              </Text>
            </StatCard>

            <StatCard title="Today Quests" subtitle="Preview" style={styles.card}>
              {todayQuests.length > 0 ? (
                todayQuests.map((quest) => (
                  <View key={quest.id} style={[styles.questItem, { borderColor: colors.border }]}> 
                    <Text style={[styles.questTitle, { color: colors.text }]} allowFontScaling>
                      {quest.title}
                    </Text>
                    <Text style={[styles.questMeta, { color: colors.textSecondary }]} allowFontScaling>
                      {quest.status.toUpperCase()} | +{quest.rewardXp} XP | {quest.estimatedMinutes} min
                    </Text>
                  </View>
                ))
              ) : (
                <EmptyState title="No quests yet" description="Ask adult to generate and approve a plan." />
              )}
            </StatCard>

            <StatCard title="Progress" subtitle="Core metrics" style={styles.card}>
              <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                Completed today: {completedToday}
              </Text>
              <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                Total XP: {totalXp}
              </Text>
              <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                Streak: {streak} days
              </Text>
              <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                Level: {level}
              </Text>

              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}> 
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${levelProgressPercent}%`,
                      backgroundColor: '#ff2d55',
                    },
                  ]}
                />
              </View>

              <Text style={[styles.progressHint, { color: colors.textSecondary }]} allowFontScaling>
                Progress to next level: {levelProgressPercent}% ({xpToNextLevel} XP left)
              </Text>
            </StatCard>
          </>
        )}

        <PrimaryButton
          label={isRefreshing ? 'Refreshing...' : 'Refresh dashboard'}
          onPress={() => {
            void loadDashboard(false);
          }}
          variant="tertiary"
          disabled={isRefreshing}
          style={[styles.card, styles.refreshButton]}
        />
      </ScrollView>

      <Modal
        visible={isCreateChildModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeCreateChildModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.modalTitle, { color: colors.text }]} allowFontScaling>
              Create Child
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]} allowFontScaling>
              Add profile and set active target for planning.
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]} allowFontScaling>
              Name
            </Text>
            <TextInput
              value={childFullName}
              onChangeText={setChildFullName}
              placeholder="Child full name"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              editable={!isCreatingChild}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]} allowFontScaling>
              Age
            </Text>
            <TextInput
              value={childAge}
              onChangeText={setChildAge}
              placeholder="3-18"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              keyboardType="number-pad"
              editable={!isCreatingChild}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]} allowFontScaling>
              Interests
            </Text>
            <TextInput
              value={childInterests}
              onChangeText={setChildInterests}
              placeholder="math, science, reading"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              editable={!isCreatingChild}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]} allowFontScaling>
              Notes
            </Text>
            <TextInput
              value={childNotes}
              onChangeText={setChildNotes}
              placeholder="Any useful note for planning"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, styles.notesInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isCreatingChild}
            />

            {createChildError ? (
              <Text style={styles.errorText} allowFontScaling>
                {createChildError}
              </Text>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={closeCreateChildModal}
                disabled={isCreatingChild}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonSecondary,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    opacity: pressed && !isCreatingChild ? 0.9 : 1,
                  },
                ]}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
              >
                <Text style={[styles.modalButtonLabel, { color: colors.text }]} allowFontScaling>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  void handleCreateChild();
                }}
                disabled={isCreatingChild}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  isCreatingChild && styles.modalButtonDisabled,
                  { opacity: pressed && !isCreatingChild ? 0.9 : 1 },
                ]}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.16)' }}
              >
                <Text style={[styles.modalButtonLabel, styles.modalButtonLabelPrimary]} allowFontScaling>
                  {isCreatingChild ? 'Saving...' : 'Save child'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const getStyles = (cardMaxWidth: number, isTablet: boolean, spacing: number) =>
  StyleSheet.create({
    roleSwitcher: {
      flexDirection: 'row',
      borderWidth: 1,
      borderRadius: 12,
      padding: 6,
      gap: 8,
    },
    roleChip: {
      flex: 1,
      minHeight: 42,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    roleChipLabel: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: '700',
    },
    scrollContent: {
      gap: 14,
      paddingBottom: Math.max(18, Math.round(spacing * 1.2)),
    },
    card: {
      width: '100%',
      maxWidth: cardMaxWidth,
      alignSelf: 'center',
    },
    headingValue: {
      fontSize: isTablet ? 20 : 17,
      fontWeight: '700',
    },
    metricText: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: '600',
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
    },
    childName: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: '700',
    },
    childMeta: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '500',
    },
    actionButtonsWrap: {
      gap: 10,
      marginTop: 4,
    },
    actionButton: {
      width: '100%',
    },
    planItem: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
      gap: 6,
    },
    planTitle: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: '700',
    },
    planSummary: {
      fontSize: isTablet ? 14 : 12,
    },
    planMeta: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '500',
    },
    approveButton: {
      minHeight: 36,
      borderWidth: 1,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      paddingHorizontal: 12,
    },
    approveButtonLabel: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: '700',
    },
    questItem: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
      gap: 4,
    },
    questTitle: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: '700',
    },
    questMeta: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '500',
    },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      overflow: 'hidden',
      marginTop: 4,
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
    },
    progressHint: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '500',
    },
    refreshButton: {
      marginTop: 2,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.42)',
      paddingHorizontal: spacing,
      justifyContent: 'center',
    },
    modalCard: {
      width: '100%',
      maxWidth: cardMaxWidth,
      alignSelf: 'center',
      borderWidth: 1,
      borderRadius: 14,
      padding: isTablet ? 18 : 14,
      gap: 8,
      elevation: 8,
    },
    modalTitle: {
      fontSize: isTablet ? 20 : 18,
      fontWeight: '700',
    },
    modalSubtitle: {
      fontSize: isTablet ? 14 : 13,
      marginBottom: 2,
    },
    fieldLabel: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '600',
      marginTop: 4,
    },
    input: {
      minHeight: 42,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: isTablet ? 15 : 14,
    },
    notesInput: {
      minHeight: 84,
    },
    errorText: {
      color: '#d93a5a',
      fontSize: isTablet ? 13 : 12,
      fontWeight: '600',
      marginTop: 2,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
    },
    modalButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      elevation: 2,
    },
    modalButtonPrimary: {
      backgroundColor: '#ff2d55',
      borderColor: '#ff2d55',
    },
    modalButtonSecondary: {
      borderWidth: 1,
    },
    modalButtonDisabled: {
      opacity: 0.7,
    },
    modalButtonLabel: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: '700',
    },
    modalButtonLabelPrimary: {
      color: '#ffffff',
    },
  });

export default HomeScreen;
