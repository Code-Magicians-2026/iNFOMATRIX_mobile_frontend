import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import useAuthStore from '@/context/Auth-store';
import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import type { ChildProfile, GeneratedPlan, Quest, UserRole } from '@/shared/models/mvp-contracts.model';
import {
  EmptyState,
  PrimaryButton,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from '@/shared/components/ui';

const INITIAL_CHILDREN: ChildProfile[] = [
  {
    id: 'child-1',
    fullName: 'Marta',
    age: 10,
    interests: ['math', 'robotics'],
    notes: 'Loves short gamified tasks.',
    createdByAdultId: 'local-adult',
    level: 3,
    xp: 320,
    streak: 4,
  },
  {
    id: 'child-2',
    fullName: 'Oleh',
    age: 12,
    interests: ['science', 'reading'],
    createdByAdultId: 'local-adult',
    level: 2,
    xp: 190,
    streak: 2,
  },
];

const INITIAL_RECENT_PLANS: GeneratedPlan[] = [
  {
    id: 'plan-initial-1',
    title: 'Marta: Starter Focus Plan',
    summary: '3 balanced quests for study and routine building.',
    childMessage: 'Small steps today = big wins tomorrow.',
    quests: [
      {
        id: 'plan-initial-1-q1',
        assignedToUserId: 'child-1',
        title: 'Math Sprint',
        description: 'Solve 10 practice tasks without rushing.',
        category: 'study',
        difficulty: 'medium',
        rewardXp: 70,
        estimatedMinutes: 30,
        status: 'active',
      },
      {
        id: 'plan-initial-1-q2',
        assignedToUserId: 'child-1',
        title: 'Movement Break',
        description: '20-minute outdoor walk and stretch.',
        category: 'health',
        difficulty: 'easy',
        rewardXp: 40,
        estimatedMinutes: 20,
        status: 'active',
      },
    ],
    totalEstimatedMinutes: 50,
    status: 'generated',
  },
];

const INITIAL_CHILD_QUESTS: Quest[] = [
  {
    id: 'child-quest-1',
    assignedToUserId: 'local-child',
    title: 'Morning Reading',
    description: 'Read 8 pages and write 2 key takeaways.',
    category: 'study',
    difficulty: 'easy',
    rewardXp: 45,
    estimatedMinutes: 25,
    status: 'active',
  },
  {
    id: 'child-quest-2',
    assignedToUserId: 'local-child',
    title: 'Logic Mini-Challenge',
    description: 'Solve one logic puzzle and explain the approach.',
    category: 'study',
    difficulty: 'medium',
    rewardXp: 65,
    estimatedMinutes: 30,
    status: 'active',
  },
  {
    id: 'child-quest-3',
    assignedToUserId: 'local-child',
    title: 'Daily Habit Check',
    description: 'Complete hydration and short movement routine.',
    category: 'health',
    difficulty: 'easy',
    rewardXp: 35,
    estimatedMinutes: 15,
    status: 'completed',
  },
];

const HomeScreen = () => {
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(
    () => getStyles(cardMaxWidth, isTablet, spacing),
    [cardMaxWidth, isTablet, spacing],
  );

  const sessionEmail = useAuthStore((s) => s.session?.email ?? 'guest@local.infomatrix');
  const currentUser = useAuthStore((s) => s.currentUser);
  const role = useAuthStore((s) => s.role);
  const selectedChildId = useAuthStore((s) => s.selectedChildId);
  const setRole = useAuthStore((s) => s.setRole);
  const setSelectedChildId = useAuthStore((s) => s.setSelectedChildId);

  const [children, setChildren] = React.useState<ChildProfile[]>(INITIAL_CHILDREN);
  const [recentPlans, setRecentPlans] = React.useState<GeneratedPlan[]>(INITIAL_RECENT_PLANS);
  const [childQuests] = React.useState<Quest[]>(INITIAL_CHILD_QUESTS);

  const effectiveRole: UserRole = role ?? 'child';

  React.useEffect(() => {
    if (!role) {
      void setRole('child');
    }
  }, [role, setRole]);

  React.useEffect(() => {
    if (effectiveRole !== 'adult' || selectedChildId || children.length === 0) {
      return;
    }

    void setSelectedChildId(children[0].id);
  }, [children, effectiveRole, selectedChildId, setSelectedChildId]);

  const activeChild = React.useMemo(
    () => children.find((child) => child.id === selectedChildId) ?? null,
    [children, selectedChildId],
  );

  const visiblePlans = React.useMemo(() => recentPlans.slice(0, 4), [recentPlans]);

  const todayQuests = React.useMemo(
    () => childQuests.filter((quest) => quest.assignedToUserId === 'local-child'),
    [childQuests],
  );

  const completedQuestsCount = React.useMemo(
    () => todayQuests.filter((quest) => quest.status === 'completed').length,
    [todayQuests],
  );

  const activeQuestsCount = React.useMemo(
    () => todayQuests.filter((quest) => quest.status === 'active').length,
    [todayQuests],
  );

  const progressPercent =
    todayQuests.length > 0 ? Math.round((completedQuestsCount / todayQuests.length) * 100) : 0;

  const handleCreateChild = () => {
    const nextIndex = children.length + 1;
    const newChild: ChildProfile = {
      id: `child-${Date.now()}`,
      fullName: `Child ${nextIndex}`,
      age: 8 + (nextIndex % 7),
      interests: ['focus', 'learning'],
      createdByAdultId: currentUser?.id ?? 'local-adult',
      level: 1,
      xp: 0,
      streak: 0,
      notes: 'Auto-created from adult dashboard.',
    };

    setChildren((prev) => [...prev, newChild]);
    void setSelectedChildId(newChild.id);
  };

  const handleCreatePlan = () => {
    if (!activeChild) {
      return;
    }

    const planId = `plan-${Date.now()}`;
    const quests: Quest[] = [
      {
        id: `${planId}-q1`,
        assignedToUserId: activeChild.id,
        title: 'Deep Study Sprint',
        description: 'Focus on one topic and finish a short recap.',
        category: 'study',
        difficulty: 'medium',
        rewardXp: 80,
        estimatedMinutes: 35,
        status: 'active',
      },
      {
        id: `${planId}-q2`,
        assignedToUserId: activeChild.id,
        title: 'Energy Recharge',
        description: 'Outdoor walk + quick breathing reset.',
        category: 'health',
        difficulty: 'easy',
        rewardXp: 45,
        estimatedMinutes: 20,
        status: 'active',
      },
    ];

    const totalEstimatedMinutes = quests.reduce((sum, quest) => sum + quest.estimatedMinutes, 0);

    const newPlan: GeneratedPlan = {
      id: planId,
      title: `${activeChild.fullName}: AI Focus Plan`,
      summary: `${quests.length} quests to keep steady progress this day.`,
      childMessage: `You can do this, ${activeChild.fullName}. One quest at a time.`,
      quests,
      totalEstimatedMinutes,
      status: 'generated',
    };

    setRecentPlans((prev) => [newPlan, ...prev]);
  };

  return (
    <ScreenContainer>
      <SectionHeader
        title="Home"
        subtitle={`Signed in as ${currentUser?.fullName ?? sessionEmail}`}
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
        >
          <Text
            style={[
              styles.roleChipLabel,
              { color: effectiveRole === 'adult' ? '#ffffff' : colors.text },
            ]}
            allowFontScaling
          >
            Adult view
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
        >
          <Text
            style={[
              styles.roleChipLabel,
              { color: effectiveRole === 'child' ? '#ffffff' : colors.text },
            ]}
            allowFontScaling
          >
            Child view
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {effectiveRole === 'adult' ? (
          <>
            <StatCard
              title="Adult Workspace"
              subtitle="Manage children and generate AI plans"
              style={styles.card}
            >
              <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                Selected child: {activeChild?.fullName ?? 'None'}
              </Text>
              <View style={styles.childSwitcherWrap}>
                {children.map((child) => {
                  const isActive = child.id === selectedChildId;
                  return (
                    <Pressable
                      key={child.id}
                      onPress={() => {
                        void setSelectedChildId(child.id);
                      }}
                      style={[
                        styles.childChip,
                        {
                          backgroundColor: isActive ? '#ff2d55' : colors.background,
                          borderColor: isActive ? '#ff2d55' : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.childChipLabel,
                          { color: isActive ? '#ffffff' : colors.text },
                        ]}
                        allowFontScaling
                      >
                        {child.fullName}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.actionButtonsWrap}>
                <PrimaryButton
                  label="Create child"
                  onPress={handleCreateChild}
                  variant="secondary"
                  style={styles.actionButton}
                />
                <PrimaryButton
                  label="Create AI plan"
                  onPress={handleCreatePlan}
                  disabled={!activeChild}
                  style={styles.actionButton}
                />
              </View>
            </StatCard>

            <StatCard
              title="Recent Plans"
              subtitle="Latest generated plans for children"
              style={styles.card}
            >
              {visiblePlans.length > 0 ? (
                visiblePlans.map((plan) => (
                  <View
                    key={plan.id}
                    style={[styles.planItem, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.planTitle, { color: colors.text }]} allowFontScaling>
                      {plan.title}
                    </Text>
                    <Text style={[styles.planSummary, { color: colors.textSecondary }]} allowFontScaling>
                      {plan.summary}
                    </Text>
                    <Text style={[styles.planMeta, { color: colors.textSecondary }]} allowFontScaling>
                      Quests: {plan.quests.length} | Est. minutes: {plan.totalEstimatedMinutes}
                    </Text>
                  </View>
                ))
              ) : (
                <EmptyState
                  title="No plans yet"
                  description="Generate the first AI plan for a selected child."
                />
              )}
            </StatCard>
          </>
        ) : (
          <>
            <StatCard
              title="Today's Quests"
              subtitle="Complete quests and keep your momentum"
              style={styles.card}
            >
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
                <EmptyState title="No quests for today" description="Ask adult to generate a new plan." />
              )}
            </StatCard>

            <StatCard title="Progress" subtitle="XP, streak and daily completion" style={styles.card}>
              <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                XP: {currentUser?.xp ?? 0}
              </Text>
              <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                Streak: {currentUser?.streak ?? 0} days
              </Text>
              <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                Active quests: {activeQuestsCount}
              </Text>
              <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                Completed quests: {completedQuestsCount}
              </Text>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]} allowFontScaling>
                Progress today: {progressPercent}%
              </Text>
            </StatCard>
          </>
        )}
      </ScrollView>
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
      paddingHorizontal: 10,
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
    metricText: {
      fontSize: isTablet ? 17 : 15,
      fontWeight: '600',
    },
    childSwitcherWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    childChip: {
      borderWidth: 1,
      borderRadius: 999,
      minHeight: 36,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    childChipLabel: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: '700',
    },
    actionButtonsWrap: {
      gap: 10,
    },
    actionButton: {
      width: '100%',
    },
    planItem: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
      gap: 4,
    },
    planTitle: {
      fontSize: isTablet ? 17 : 15,
      fontWeight: '700',
    },
    planSummary: {
      fontSize: isTablet ? 14 : 13,
    },
    planMeta: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '500',
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
    progressLabel: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: '600',
      marginTop: 4,
    },
  });

export default HomeScreen;

