import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import { ApiError, getApiErrorMessage } from '@/src/features/auth/api/client';
import { progressService, questsService, userService } from '@/src/integration/services';
import type { ProgressSummary, Quest, UserProfile } from '@/shared/models/mvp-contracts.model';
import {
  EmptyState,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from '@/shared/components/ui';

const XP_PER_LEVEL = 300;
const HOME_FOCUS_REFRESH_COOLDOWN_MS = 5000;

const ChildHomeScreen = () => {
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(
    () => getStyles(cardMaxWidth, isTablet, spacing),
    [cardMaxWidth, isTablet, spacing],
  );

  const [me, setMe] = React.useState<UserProfile | null>(null);
  const [todayQuests, setTodayQuests] = React.useState<Quest[]>([]);
  const [progress, setProgress] = React.useState<ProgressSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const lastDashboardRefreshAtRef = React.useRef(0);

  const loadDashboard = React.useCallback(async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      setScreenError(null);

      const meData = await userService.getMe();
      const [questData, progressData] = await Promise.all([
        questsService.getQuests(meData.id),
        progressService.getProgress(meData.id),
      ]);

      setMe(meData);
      setTodayQuests(questData.slice(0, 5));
      setProgress(progressData);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setScreenError('Session expired. Sign in again to load child dashboard data.');
      } else {
        setScreenError(getApiErrorMessage(error, 'Failed to load child dashboard data. Please try again.'));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      lastDashboardRefreshAtRef.current = Date.now();
    }
  }, []);

  React.useEffect(() => {
    void loadDashboard(true);
  }, [loadDashboard]);

  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      const isRefreshCooldownActive =
        now - lastDashboardRefreshAtRef.current < HOME_FOCUS_REFRESH_COOLDOWN_MS;

      if (!isLoading && !isRefreshCooldownActive) {
        void loadDashboard(false);
      }

      return undefined;
    }, [isLoading, loadDashboard]),
  );

  const completedToday = React.useMemo(
    () => todayQuests.filter((quest) => quest.status === 'archived' || quest.status === 'completed').length,
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

  if (isLoading) {
    return (
      <ScreenContainer centered>
        <LoadingState label="Loading child dashboard..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader title="Home" subtitle={`Hello, ${me?.fullName ?? 'Hero'}!`} />

      {screenError ? <EmptyState title="Dashboard error" description={screenError} /> : null}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
    </ScreenContainer>
  );
};

const getStyles = (cardMaxWidth: number, isTablet: boolean, spacing: number) =>
  StyleSheet.create({
    scrollContent: {
      gap: 12,
      paddingBottom: Math.max(16, Math.round(spacing * 1.1)),
    },
    card: {
      width: '100%',
      maxWidth: cardMaxWidth,
      alignSelf: 'center',
    },
    headingValue: {
      fontSize: isTablet ? 22 : 20,
      fontWeight: '700',
      marginBottom: 4,
    },
    metricText: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: '600',
    },
    questItem: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 6,
      marginBottom: 10,
      elevation: 1,
    },
    questTitle: {
      fontSize: isTablet ? 16 : 15,
      fontWeight: '700',
    },
    questMeta: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: '500',
    },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      overflow: 'hidden',
      marginTop: 6,
      marginBottom: 4,
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
    },
    progressHint: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: '500',
    },
    refreshButton: {
      marginTop: 2,
    },
  });

export default ChildHomeScreen;
