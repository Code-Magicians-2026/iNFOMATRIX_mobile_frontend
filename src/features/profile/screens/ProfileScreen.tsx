import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import useAuthStore from '@/context/Auth-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import useThemeStore from '@/context/Theme-store';
import type { AppStackParamList } from '@/src/navigation/AppNavigator';
import achievementsStorage from '@/src/features/profile/services/achievementsStorage';
import type { ProgressSummary, UserProfile, UserRole } from '@/shared/models/mvp-contracts.model';
import {
  EmptyState,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SectionHeader,
  StatCard,
  UpgradePlanBanner,
} from '@/shared/components/ui';
import {
  childrenService,
  plansService,
  progressService,
  userService,
} from '@/src/integration/services';

type ProfileNavigation = NativeStackNavigationProp<AppStackParamList>;

const XP_PER_LEVEL = 300;
const PROFILE_FOCUS_REFRESH_COOLDOWN_MS = 5000;

const toMetricLabel = (value: string) => {
  const normalized = value.trim();
  if (!normalized) {
    return 'Quests';
  }

  return normalized[0].toUpperCase() + normalized.slice(1);
};

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileNavigation>();
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isTablet, spacing } = useResponsiveLayout();

  const session = useAuthStore((s) => s.session);
  const family = useAuthStore((s) => s.family);
  const role = useAuthStore((s) => s.role);
  const refreshFamily = useAuthStore((s) => s.refreshFamily);
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
  const [unlockedAchievementsCount, setUnlockedAchievementsCount] = React.useState(0);
  const [newAchievementsCount, setNewAchievementsCount] = React.useState(0);
  const lastProfileRefreshAtRef = React.useRef(0);

  const loadAchievementsMeta = React.useCallback(async (userId: string) => {
    try {
      const [unlockedAchievements, newCount] = await Promise.all([
        achievementsStorage.getUnlockedAchievementsByUser(userId),
        achievementsStorage.getNewAchievementsCount(userId),
      ]);
      setUnlockedAchievementsCount(unlockedAchievements.length);
      setNewAchievementsCount(newCount);
    } catch {
      setUnlockedAchievementsCount(0);
      setNewAchievementsCount(0);
    }
  }, []);

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

      const meData = await userService.getMe();
      const progressData = await progressService.getProgress(meData.id);

      if (session) {
        void refreshFamily().catch(() => {});
      }

      setMe(meData);
      setProgress(progressData);
      await loadAchievementsMeta(meData.id);

      if (effectiveRole === 'adult') {
        const [childrenData, plansData] = await Promise.all([
          childrenService.getChildren(),
          plansService.getPlans(),
        ]);
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
      lastProfileRefreshAtRef.current = Date.now();
    }
  }, [effectiveRole, loadAchievementsMeta, refreshFamily, session]);

  React.useEffect(() => {
    void loadProfile(true);
  }, [loadProfile]);

  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      const isRefreshCooldownActive =
        now - lastProfileRefreshAtRef.current < PROFILE_FOCUS_REFRESH_COOLDOWN_MS;

      if (!isLoading && !isRefreshCooldownActive) {
        void loadProfile(false);
      }

      if (me?.id) {
        void loadAchievementsMeta(me.id);
      }

      return undefined;
    }, [isLoading, loadAchievementsMeta, loadProfile, me?.id]),
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

  const strongestMetric = categoryStats[0];
  const canOpenEarnedBadges = Boolean(me?.id);
  const canOpenAchievements = Boolean(me?.id);

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
    if ((strongestMetric?.[1] ?? 0) >= 3) {
      badges.push(`${toMetricLabel(strongestMetric?.[0] ?? 'quests')} Specialist`);
    }

    return badges;
  }, [completedQuests, streak, strongestMetric, totalXp]);

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
        <UpgradePlanBanner
          style={styles.card}
          onOpenFailed={() => {
            setScreenError('Failed to open pricing page. Please try again.');
          }}
        />

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

        <StatCard title="Quest Stats" subtitle="Completed quest metrics" style={styles.card}>
          {categoryStats.length > 0 ? (
            categoryStats.map(([metric, count]) => (
              <Text key={metric} style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                {toMetricLabel(metric)}: {count}
              </Text>
            ))
          ) : (
            <Text style={[styles.metricText, { color: colors.textSecondary }]} allowFontScaling>
              Complete quests to build quest stats.
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
              Top quest metric: {strongestMetric ? toMetricLabel(strongestMetric[0]) : 'Not enough data'}
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

        <StatCard title="Achievements" subtitle="Unlock surprises as you complete quests" style={styles.card}>
          <Pressable
            style={[styles.achievementItem, { borderColor: colors.border, backgroundColor: colors.background }]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            onPress={() => {
              if (!me?.id) {
                return;
              }

              navigation.navigate('Achievements', {
                userId: me.id,
                displayName: me.fullName,
              });
            }}
            disabled={!canOpenAchievements}
          >
            <View style={styles.achievementItemLeft}>
              <View style={styles.achievementIconWrap}>
                <Ionicons name="trophy-outline" size={isTablet ? 22 : 20} color="#ff2d55" />
              </View>
              <View style={styles.achievementTextWrap}>
                <Text style={[styles.achievementTitle, { color: colors.text }]} allowFontScaling>
                  Achievements
                </Text>
                <Text style={[styles.achievementSubtitle, { color: colors.textSecondary }]} allowFontScaling>
                  Unlocked: {unlockedAchievementsCount}
                </Text>
              </View>
            </View>
            <Text style={[styles.achievementMeta, { color: newAchievementsCount > 0 ? '#ff2d55' : colors.textSecondary }]} allowFontScaling>
              {newAchievementsCount > 0 ? `• ${newAchievementsCount} new` : 'Open'}
            </Text>
          </Pressable>
        </StatCard>

        <StatCard title="Earned Badges" subtitle="Saved badge collection" style={styles.card}>
          <Text style={[styles.metricText, { color: colors.textSecondary }]} allowFontScaling>
            Open your saved badges collected from completed quests.
          </Text>
          <PrimaryButton
            label="Переглянути отримані бейджі"
            variant="secondary"
            disabled={!canOpenEarnedBadges}
            onPress={() => {
              if (!me?.id) {
                return;
              }

              navigation.navigate('EarnedBadges', {
                userId: me.id,
                displayName: me.fullName,
              });
            }}
            style={styles.earnedBadgesButton}
          />
        </StatCard>

        <StatCard
          title={session ? 'Signed in account' : 'Guest mode'}
          subtitle={session ? 'Session active' : 'Sign in to sync progress'}
          style={styles.card}
        >
          {session ? (
            <>
              <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                {session.email}
              </Text>
              <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                Family ID: {family?.id ?? 'not linked'}
              </Text>
              <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                Family Name: {family?.name ?? 'not set'}
              </Text>
            </>
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
    earnedBadgesButton: {
      marginTop: 6,
    },
    achievementItem: {
      borderWidth: 1,
      borderRadius: 12,
      minHeight: isTablet ? 64 : 58,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      overflow: 'hidden',
      elevation: 1,
    },
    achievementItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    achievementIconWrap: {
      width: isTablet ? 40 : 36,
      height: isTablet ? 40 : 36,
      borderRadius: 999,
      backgroundColor: '#ffe5ec',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 1,
    },
    achievementTextWrap: {
      flex: 1,
      gap: 2,
    },
    achievementTitle: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: '700',
    },
    achievementSubtitle: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '500',
    },
    achievementMeta: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '800',
    },
  });

export default ProfileScreen;
