import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import useAuthStore from '@/context/Auth-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import useThemeStore from '@/context/Theme-store';
import { useI18n } from '@/src/i18n/useI18n';
import type { AppStackParamList } from '@/src/navigation/AppNavigator';
import achievementsStorage from '@/src/features/profile/services/achievementsStorage';
import type { ChildProfile, ProgressSummary, UserProfile, UserRole } from '@/shared/models/mvp-contracts.model';
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

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileNavigation>();
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isTablet, spacing } = useResponsiveLayout();
  const { t } = useI18n();

  const session = useAuthStore((s) => s.session);
  const family = useAuthStore((s) => s.family);
  const role = useAuthStore((s) => s.role);
  const selectedChildId = useAuthStore((s) => s.selectedChildId);
  const refreshFamily = useAuthStore((s) => s.refreshFamily);
  const setRole = useAuthStore((s) => s.setRole);
  const logout = useAuthStore((s) => s.logout);

  const effectiveRole: UserRole = role ?? 'child';

  const styles = React.useMemo(
    () => getStyles(cardMaxWidth, isTablet, spacing),
    [cardMaxWidth, isTablet, spacing],
  );

  const toMetricLabel = React.useCallback(
    (value: string) => {
      const normalized = value.trim().toLowerCase();
      if (!normalized) {
        return t('profile.metric.default');
      }

      if (normalized === 'quests') {
        return t('profile.metric.quests');
      }

      return normalized[0].toUpperCase() + normalized.slice(1);
    },
    [t],
  );

  const [me, setMe] = React.useState<UserProfile | null>(null);
  const [progress, setProgress] = React.useState<ProgressSummary | null>(null);
  const [children, setChildren] = React.useState<ChildProfile[]>([]);
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

      if (effectiveRole === 'adult') {
        const [childrenData, plansData] = await Promise.all([
          childrenService.getChildren(),
          plansService.getPlans(),
        ]);
        setChildren(childrenData);

        const hasSelectedChild = selectedChildId
          ? childrenData.some((child) => child.id === selectedChildId)
          : false;
        const achievementsOwnerId =
          hasSelectedChild && selectedChildId ? selectedChildId : meData.id;
        await loadAchievementsMeta(achievementsOwnerId);

        const childIds = new Set(childrenData.map((child) => child.id));
        const assignedPlans = plansData.filter((plan) =>
          plan.quests.some((quest) => childIds.has(quest.assignedToUserId)),
        );

        setChildrenCount(childrenData.length);
        setPlansCount(assignedPlans.length);
      } else {
        setChildren([]);
        await loadAchievementsMeta(meData.id);
        setChildrenCount(0);
        setPlansCount(0);
      }
    } catch {
      setScreenError(t('profile.error.load'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      lastProfileRefreshAtRef.current = Date.now();
    }
  }, [effectiveRole, loadAchievementsMeta, refreshFamily, selectedChildId, session, t]);

  React.useEffect(() => {
    void loadProfile(true);
  }, [loadProfile]);

  const selectedChild = React.useMemo(
    () => children.find((child) => child.id === selectedChildId) ?? null,
    [children, selectedChildId],
  );

  const achievementsOwner = React.useMemo(() => {
    if (effectiveRole === 'adult' && selectedChild) {
      return {
        id: selectedChild.id,
        displayName: selectedChild.fullName,
      };
    }

    if (!me?.id) {
      return null;
    }

    return {
      id: me.id,
      displayName: me.fullName,
    };
  }, [effectiveRole, me?.fullName, me?.id, selectedChild]);

  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      const isRefreshCooldownActive =
        now - lastProfileRefreshAtRef.current < PROFILE_FOCUS_REFRESH_COOLDOWN_MS;

      if (!isLoading && !isRefreshCooldownActive) {
        void loadProfile(false);
      }

      if (achievementsOwner?.id) {
        void loadAchievementsMeta(achievementsOwner.id);
      }

      return undefined;
    }, [achievementsOwner?.id, isLoading, loadAchievementsMeta, loadProfile]),
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
  const canOpenEarnedBadges = Boolean(achievementsOwner?.id);
  const canOpenAchievements = Boolean(achievementsOwner?.id);

  const childBadges = React.useMemo(() => {
    const badges: string[] = [];

    if (completedQuests >= 1) {
      badges.push(t('profile.badges.firstQuest'));
    }
    if (streak >= 3) {
      badges.push(t('profile.badges.consistency'));
    }
    if (totalXp >= 500) {
      badges.push(t('profile.badges.xpHunter'));
    }
    if ((strongestMetric?.[1] ?? 0) >= 3) {
      badges.push(
        t('profile.badges.specialist', {
          metric: toMetricLabel(strongestMetric?.[0] ?? 'quests'),
        }),
      );
    }

    return badges;
  }, [completedQuests, streak, strongestMetric, t, toMetricLabel, totalXp]);

  if (isLoading) {
    return (
      <ScreenContainer centered>
        <LoadingState label={t('profile.loading')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader
        title={t('profile.title')}
        subtitle={
          effectiveRole === 'adult'
            ? t('profile.subtitle.adult')
            : t('profile.subtitle.child')
        }
      />

      {screenError ? (
        <EmptyState title={t('profile.error.title')} description={screenError} />
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <UpgradePlanBanner
          style={styles.card}
          onOpenFailed={() => {
            setScreenError(t('profile.error.pricing'));
          }}
        />

        <StatCard
          title={me?.fullName ?? t('profile.identity.defaultName')}
          subtitle={me?.email ?? t('profile.identity.defaultEmail')}
          style={styles.card}
        >
          <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
            {t('profile.metric.role', {
              role: effectiveRole === 'adult' ? t('common.roleAdult') : t('common.roleChild'),
            })}
          </Text>
          <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
            {t('profile.metric.totalXp', { value: totalXp })}
          </Text>
          <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
            {t('profile.metric.level', { value: level })}
          </Text>
          <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
            {t('profile.metric.streak', { value: streak })}
          </Text>
          <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
            {t('profile.metric.completedQuests', { value: completedQuests })}
          </Text>
          <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
            {t('profile.metric.activeQuests', { value: activeQuests })}
          </Text>
        </StatCard>

        <StatCard
          title={t('profile.questStats.title')}
          subtitle={t('profile.questStats.subtitle')}
          style={styles.card}
        >
          {categoryStats.length > 0 ? (
            categoryStats.map(([metric, count]) => (
              <Text
                key={metric}
                style={[styles.metricText, { color: colors.text }]}
                allowFontScaling
              >
                {t('profile.questStats.metric', {
                  metric: toMetricLabel(metric),
                  count,
                })}
              </Text>
            ))
          ) : (
            <Text
              style={[styles.metricText, { color: colors.textSecondary }]}
              allowFontScaling
            >
              {t('profile.questStats.empty')}
            </Text>
          )}
        </StatCard>

        {effectiveRole === 'adult' ? (
          <StatCard
            title={t('profile.familyOverview.title')}
            subtitle={t('profile.familyOverview.subtitle')}
            style={styles.card}
          >
            <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
              {t('profile.familyOverview.childrenCount', { value: childrenCount })}
            </Text>
            <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
              {t('profile.familyOverview.plansCount', { value: plansCount })}
            </Text>
          </StatCard>
        ) : (
          <StatCard
            title={t('profile.childProgress.title')}
            subtitle={t('profile.childProgress.subtitle')}
            style={styles.card}
          >
            <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
              {t('profile.childProgress.toNextLevel', {
                percent: levelProgressPercent,
                xp: xpToNextLevel,
              })}
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${levelProgressPercent}%` },
                ]}
              />
            </View>

            <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
              {t('profile.childProgress.topMetric', {
                metric: strongestMetric
                  ? toMetricLabel(strongestMetric[0])
                  : t('profile.childProgress.noData'),
              })}
            </Text>

            <View style={styles.badgesWrap}>
              {childBadges.length > 0 ? (
                childBadges.map((badge) => (
                  <View
                    key={badge}
                    style={[
                      styles.badge,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: colors.text }]} allowFontScaling>
                      {badge}
                    </Text>
                  </View>
                ))
              ) : (
                <Text
                  style={[styles.metricText, { color: colors.textSecondary }]}
                  allowFontScaling
                >
                  {t('profile.childProgress.emptyAchievements')}
                </Text>
              )}
            </View>
          </StatCard>
        )}

        <StatCard
          title={t('profile.achievements.title')}
          subtitle={t('profile.achievements.subtitle')}
          style={styles.card}
        >
          <Pressable
            style={[
              styles.achievementItem,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            onPress={() => {
              if (!achievementsOwner?.id) {
                return;
              }

              navigation.navigate('Achievements', {
                userId: achievementsOwner.id,
                displayName: achievementsOwner.displayName,
              });
            }}
            disabled={!canOpenAchievements}
          >
            <View style={styles.achievementItemLeft}>
              <View style={styles.achievementIconWrap}>
                <Ionicons
                  name="trophy-outline"
                  size={isTablet ? 22 : 20}
                  color="#ff2d55"
                />
              </View>
              <View style={styles.achievementTextWrap}>
                <Text style={[styles.achievementTitle, { color: colors.text }]} allowFontScaling>
                  {t('profile.achievements.itemTitle')}
                </Text>
                <Text
                  style={[styles.achievementSubtitle, { color: colors.textSecondary }]}
                  allowFontScaling
                >
                  {t('profile.achievements.unlocked', { value: unlockedAchievementsCount })}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.achievementMeta,
                {
                  color: newAchievementsCount > 0 ? '#ff2d55' : colors.textSecondary,
                },
              ]}
              allowFontScaling
            >
              {newAchievementsCount > 0
                ? t('profile.achievements.new', { value: newAchievementsCount })
                : t('common.open')}
            </Text>
          </Pressable>
        </StatCard>

        <StatCard
          title={t('profile.earnedBadges.title')}
          subtitle={t('profile.earnedBadges.subtitle')}
          style={styles.card}
        >
          <Text style={[styles.metricText, { color: colors.textSecondary }]} allowFontScaling>
            {t('profile.earnedBadges.description')}
          </Text>
          <PrimaryButton
            label={t('profile.earnedBadges.openButton')}
            variant="secondary"
            disabled={!canOpenEarnedBadges}
            onPress={() => {
              if (!achievementsOwner?.id) {
                return;
              }

              navigation.navigate('EarnedBadges', {
                userId: achievementsOwner.id,
                displayName: achievementsOwner.displayName,
              });
            }}
            style={styles.earnedBadgesButton}
          />
        </StatCard>

        <StatCard
          title={session ? t('profile.session.signedInTitle') : t('profile.session.guestTitle')}
          subtitle={session ? t('profile.session.signedInSubtitle') : t('profile.session.guestSubtitle')}
          style={styles.card}
        >
          {session ? (
            <>
              <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                {session.email}
              </Text>
              <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                {t('profile.session.familyId', {
                  value: family?.id ?? t('profile.session.notLinked'),
                })}
              </Text>
              <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                {t('profile.session.familyName', {
                  value: family?.name ?? t('profile.session.notSet'),
                })}
              </Text>
            </>
          ) : (
            <Text
              style={[styles.metricText, { color: colors.textSecondary }]}
              allowFontScaling
            >
              {t('profile.session.guestDescription')}
            </Text>
          )}
        </StatCard>

        {session ? (
          <PrimaryButton
            label={t('profile.auth.logout')}
            onPress={() => {
              void onLogoutPress();
            }}
            loading={isSubmitting}
            style={styles.card}
          />
        ) : (
          <>
            <PrimaryButton
              label={t('profile.auth.login')}
              onPress={() => navigation.navigate('Login', { redirectTo: 'Profile' })}
              style={styles.card}
            />
            <PrimaryButton
              label={t('profile.auth.register')}
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
          label={isRefreshing ? t('profile.refresh.refreshing') : t('profile.refresh.action')}
          variant="tertiary"
          disabled={isRefreshing}
          onPress={() => {
            void loadProfile(false);
          }}
          style={styles.card}
        />

        <PrimaryButton
          label={t('profile.settings')}
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
