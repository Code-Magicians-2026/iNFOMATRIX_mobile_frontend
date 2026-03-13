import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import useAuthStore from '@/context/Auth-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import useThemeStore from '@/context/Theme-store';
import type { AppStackParamList } from '@/src/navigation/AppNavigator';
import type { ProgressSummary, UserProfile, UserRole } from '@/shared/models/mvp-contracts.model';
import {
  EmptyState,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from '@/shared/components/ui';
import {
  getChildrenMock,
  getMeMock,
  getPlansMock,
  getProgressMock,
  setMockMeId,
} from '@/src/features/mvp/services';

type ProfileNavigation = NativeStackNavigationProp<AppStackParamList>;

const XP_PER_LEVEL = 300;

const resolveMockUserId = (role: UserRole, currentUserId: string | undefined) => {
  if (role === 'adult') {
    return 'adult-1';
  }

  if (typeof currentUserId === 'string' && currentUserId.startsWith('child-')) {
    return currentUserId;
  }

  return 'child-1';
};

const toCategoryLabel = (value: string) => {
  const normalized = value.trim();
  if (!normalized) {
    return 'General';
  }

  return normalized[0].toUpperCase() + normalized.slice(1);
};

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileNavigation>();
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isTablet, spacing } = useResponsiveLayout();

  const session = useAuthStore((s) => s.session);
  const role = useAuthStore((s) => s.role);
  const currentUser = useAuthStore((s) => s.currentUser);
  const setRole = useAuthStore((s) => s.setRole);
  const logout = useAuthStore((s) => s.logout);

  const effectiveRole: UserRole = role ?? 'child';

  const styles = React.useMemo(() => getStyles(cardMaxWidth, isTablet, spacing), [cardMaxWidth, isTablet, spacing]);

  const [me, setMe] = React.useState<UserProfile | null>(null);
  const [progress, setProgress] = React.useState<ProgressSummary | null>(null);
  const [childrenCount, setChildrenCount] = React.useState(0);
  const [plansCount, setPlansCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!role) {
      void setRole('child');
    }
  }, [role, setRole]);

  const loadProfile = React.useCallback(async (showLoader = false) => {
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

      const meData = await getMeMock();
      const progressData = await getProgressMock(meData.id);

      setMe(meData);
      setProgress(progressData);

      if (effectiveRole === 'adult') {
        const [childrenData, plansData] = await Promise.all([getChildrenMock(), getPlansMock()]);
        const childIds = new Set(childrenData.map((child) => child.id));
        const assignedPlans = plansData.filter((plan) =>
          plan.quests.some((quest) => childIds.has(quest.assignedToUserId)),
        );

        setChildrenCount(childrenData.length);
        setPlansCount(assignedPlans.length);
      } else {
        setChildrenCount(0);
        setPlansCount(0);
      }
    } catch {
      setScreenError('Failed to load profile progress. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUser?.id, effectiveRole]);

  React.useEffect(() => {
    void loadProfile(true);
  }, [loadProfile]);

  useFocusEffect(
    React.useCallback(() => {
      if (!isLoading) {
        void loadProfile(false);
      }

      return undefined;
    }, [isLoading, loadProfile]),
  );

  const onLogoutPress = async () => {
    setIsSubmitting(true);
    try {
      await logout();
    } finally {
      setIsSubmitting(false);
    }
  };

  const level = progress?.level ?? me?.level ?? 1;
  const totalXp = progress?.xp ?? me?.xp ?? 0;
  const streak = progress?.streak ?? me?.streak ?? 0;
  const completedQuests = progress?.completedQuestsCount ?? 0;
  const activeQuests = progress?.activeQuestsCount ?? 0;

  const levelStartXp = Math.max(0, (level - 1) * XP_PER_LEVEL);
  const levelProgressPercent = Math.max(
    0,
    Math.min(100, Math.round(((totalXp - levelStartXp) / XP_PER_LEVEL) * 100)),
  );
  const xpToNextLevel = Math.max(0, level * XP_PER_LEVEL - totalXp);

  const categoryStats = React.useMemo(
    () =>
      Object.entries(progress?.stats ?? {})
        .filter(([, count]) => count > 0)
        .sort((left, right) => right[1] - left[1]),
    [progress?.stats],
  );

  const strongestCategory = categoryStats[0];

  const childBadges = React.useMemo(() => {
    const badges: string[] = [];

    if (completedQuests >= 1) {
      badges.push('First Quest');
    }
    if (streak >= 3) {
      badges.push('Consistency');
    }
    if (totalXp >= 500) {
      badges.push('XP Hunter');
    }
    if ((strongestCategory?.[1] ?? 0) >= 3) {
      badges.push(`${toCategoryLabel(strongestCategory?.[0] ?? 'focus')} Specialist`);
    }

    return badges;
  }, [completedQuests, streak, strongestCategory, totalXp]);

  if (isLoading) {
    return (
      <ScreenContainer centered>
        <LoadingState label="Loading profile progress..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader
        title="Profile"
        subtitle={
          effectiveRole === 'adult'
            ? 'Adult progress and family overview'
            : 'Child progress and achievements'
        }
      />

      {screenError ? <EmptyState title="Profile error" description={screenError} /> : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StatCard title={me?.fullName ?? 'Profile'} subtitle={me?.email ?? 'local profile'} style={styles.card}>
          <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
            Role: {effectiveRole}
          </Text>
          <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
            Total XP: {totalXp}
          </Text>
          <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
            Level: {level}
          </Text>
          <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
            Streak: {streak}
          </Text>
          <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
            Completed quests: {completedQuests}
          </Text>
          <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
            Active quests: {activeQuests}
          </Text>
        </StatCard>

        <StatCard title="Category Stats" subtitle="Completed quests by category" style={styles.card}>
          {categoryStats.length > 0 ? (
            categoryStats.map(([category, count]) => (
              <Text key={category} style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                {toCategoryLabel(category)}: {count}
              </Text>
            ))
          ) : (
            <Text style={[styles.metricText, { color: colors.textSecondary }]} allowFontScaling>
              Complete quests to build category stats.
            </Text>
          )}
        </StatCard>

        {effectiveRole === 'adult' ? (
          <StatCard title="Family Overview" subtitle="Adult-only metrics" style={styles.card}>
            <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
              Children count: {childrenCount}
            </Text>
            <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
              Plans count: {plansCount}
            </Text>
          </StatCard>
        ) : (
          <StatCard title="Child Progress" subtitle="Level growth and achievements" style={styles.card}>
            <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
              Progress to next level: {levelProgressPercent}% ({xpToNextLevel} XP left)
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${levelProgressPercent}%` }]} />
            </View>

            <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
              Strongest category: {strongestCategory ? toCategoryLabel(strongestCategory[0]) : 'Not enough data'}
            </Text>

            <View style={styles.badgesWrap}>
              {childBadges.length > 0 ? (
                childBadges.map((badge) => (
                  <View key={badge} style={[styles.badge, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <Text style={[styles.badgeText, { color: colors.text }]} allowFontScaling>
                      {badge}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.metricText, { color: colors.textSecondary }]} allowFontScaling>
                  Complete quests to unlock your first achievement.
                </Text>
              )}
            </View>
          </StatCard>
        )}

        <StatCard
          title={session ? 'Signed in account' : 'Guest mode'}
          subtitle={session ? 'Session active' : 'Sign in to sync progress'}
          style={styles.card}
        >
          {session ? (
            <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
              {session.email}
            </Text>
          ) : (
            <Text style={[styles.metricText, { color: colors.textSecondary }]} allowFontScaling>
              Use login or registration to sync profile data.
            </Text>
          )}
        </StatCard>

        {session ? (
          <PrimaryButton
            label="Вийти"
            onPress={() => {
              void onLogoutPress();
            }}
            loading={isSubmitting}
            style={styles.card}
          />
        ) : (
          <>
            <PrimaryButton
              label="Увійти"
              onPress={() => navigation.navigate('Login', { redirectTo: 'Profile' })}
              style={styles.card}
            />
            <PrimaryButton
              label="Реєстрація"
              variant="secondary"
              onPress={() =>
                navigation.navigate('Registration', {
                  redirectTo: 'Profile',
                })
              }
              style={styles.card}
            />
          </>
        )}

        <PrimaryButton
          label={isRefreshing ? 'Refreshing...' : 'Refresh progress'}
          variant="tertiary"
          disabled={isRefreshing}
          onPress={() => {
            void loadProfile(false);
          }}
          style={styles.card}
        />

        <PrimaryButton
          label="Налаштування"
          variant="secondary"
          onPress={() => navigation.navigate('Settings')}
          style={styles.card}
        />
      </ScrollView>
    </ScreenContainer>
  );
};

const getStyles = (cardMaxWidth: number, isTablet: boolean, spacing: number) =>
  StyleSheet.create({
    content: {
      gap: 12,
      paddingBottom: Math.max(16, Math.round(spacing * 1.1)),
    },
    card: {
      width: '100%',
      maxWidth: cardMaxWidth,
      alignSelf: 'center',
    },
    metricText: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: '600',
    },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      overflow: 'hidden',
      marginTop: 4,
      marginBottom: 4,
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: '#ff2d55',
    },
    badgesWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 2,
    },
    badge: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      elevation: 1,
    },
    badgeText: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: '700',
    },
  });

export default ProfileScreen;
