import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import { useI18n } from '@/src/i18n/useI18n';
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
  const { language } = useI18n();
  const styles = React.useMemo(
    () => getStyles(cardMaxWidth, isTablet, spacing),
    [cardMaxWidth, isTablet, spacing],
  );

  const copy = React.useMemo(
    () =>
      language === 'uk'
        ? {
            sessionExpired: 'Сесія завершилась. Увійдіть знову, щоб завантажити дашборд дитини.',
            loadError: 'Не вдалося завантажити дашборд дитини. Спробуйте ще раз.',
            loading: 'Завантаження дашборду дитини...',
            headerTitle: 'Головна',
            headerSubtitle: (name: string) => `Привіт, ${name}!`,
            heroFallback: 'Герой',
            dashboardErrorTitle: 'Помилка дашборду',
            greetingTitle: 'Вітання',
            greetingSubtitle: 'Ваш щоденний огляд',
            greetingLine: (name: string) => `Привіт, ${name}`,
            explorerFallback: 'Дослідник',
            greetingHint: 'Підтримуйте streak і завершуйте квести на сьогодні.',
            todayQuestsTitle: 'Квести на сьогодні',
            todayQuestsSubtitle: 'Попередній перегляд',
            noQuestsTitle: 'Квестів ще немає',
            noQuestsDescription: 'Попросіть дорослого згенерувати та підтвердити план.',
            questMeta: (quest: Quest) =>
              `${quest.status.toUpperCase()} | +${quest.rewardXp} XP | ${quest.estimatedMinutes} хв`,
            progressTitle: 'Прогрес',
            progressSubtitle: 'Ключові метрики',
            completedToday: (value: number) => `Завершено сьогодні: ${value}`,
            totalXp: (value: number) => `Загальний XP: ${value}`,
            streak: (value: number) => `Streak: ${value} дн.`,
            level: (value: number) => `Рівень: ${value}`,
            nextLevel: (percent: number, xp: number) =>
              `Прогрес до наступного рівня: ${percent}% (залишилось ${xp} XP)`,
            refreshing: 'Оновлення...',
            refresh: 'Оновити дашборд',
          }
        : {
            sessionExpired: 'Session expired. Sign in again to load child dashboard data.',
            loadError: 'Failed to load child dashboard data. Please try again.',
            loading: 'Loading child dashboard...',
            headerTitle: 'Home',
            headerSubtitle: (name: string) => `Hello, ${name}!`,
            heroFallback: 'Hero',
            dashboardErrorTitle: 'Dashboard error',
            greetingTitle: 'Greeting',
            greetingSubtitle: 'Your daily overview',
            greetingLine: (name: string) => `Hi, ${name}`,
            explorerFallback: 'Explorer',
            greetingHint: "Keep your streak alive and finish today's quests.",
            todayQuestsTitle: 'Today Quests',
            todayQuestsSubtitle: 'Preview',
            noQuestsTitle: 'No quests yet',
            noQuestsDescription: 'Ask adult to generate and approve a plan.',
            questMeta: (quest: Quest) =>
              `${quest.status.toUpperCase()} | +${quest.rewardXp} XP | ${quest.estimatedMinutes} min`,
            progressTitle: 'Progress',
            progressSubtitle: 'Core metrics',
            completedToday: (value: number) => `Completed today: ${value}`,
            totalXp: (value: number) => `Total XP: ${value}`,
            streak: (value: number) => `Streak: ${value} days`,
            level: (value: number) => `Level: ${value}`,
            nextLevel: (percent: number, xp: number) =>
              `Progress to next level: ${percent}% (${xp} XP left)`,
            refreshing: 'Refreshing...',
            refresh: 'Refresh dashboard',
          },
    [language],
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
        setScreenError(copy.sessionExpired);
      } else {
        setScreenError(getApiErrorMessage(error, copy.loadError, language));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      lastDashboardRefreshAtRef.current = Date.now();
    }
  }, [copy.loadError, copy.sessionExpired, language]);

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
        <LoadingState label={copy.loading} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader title={copy.headerTitle} subtitle={copy.headerSubtitle(me?.fullName ?? copy.heroFallback)} />

      {screenError ? <EmptyState title={copy.dashboardErrorTitle} description={screenError} /> : null}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <StatCard title={copy.greetingTitle} subtitle={copy.greetingSubtitle} style={styles.card}>
          <Text style={[styles.headingValue, { color: colors.text }]} allowFontScaling>
            {copy.greetingLine(me?.fullName ?? copy.explorerFallback)}
          </Text>
          <Text style={[styles.metricText, { color: colors.textSecondary }]} allowFontScaling>
            {copy.greetingHint}
          </Text>
        </StatCard>

        <StatCard title={copy.todayQuestsTitle} subtitle={copy.todayQuestsSubtitle} style={styles.card}>
          {todayQuests.length > 0 ? (
            todayQuests.map((quest) => (
              <View key={quest.id} style={[styles.questItem, { borderColor: colors.border }]}>
                <Text style={[styles.questTitle, { color: colors.text }]} allowFontScaling>
                  {quest.title}
                </Text>
                <Text style={[styles.questMeta, { color: colors.textSecondary }]} allowFontScaling>
                  {copy.questMeta(quest)}
                </Text>
              </View>
            ))
          ) : (
            <EmptyState title={copy.noQuestsTitle} description={copy.noQuestsDescription} />
          )}
        </StatCard>

        <StatCard title={copy.progressTitle} subtitle={copy.progressSubtitle} style={styles.card}>
          <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
            {copy.completedToday(completedToday)}
          </Text>
          <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
            {copy.totalXp(totalXp)}
          </Text>
          <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
            {copy.streak(streak)}
          </Text>
          <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
            {copy.level(level)}
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
            {copy.nextLevel(levelProgressPercent, xpToNextLevel)}
          </Text>
        </StatCard>

        <PrimaryButton
          label={isRefreshing ? copy.refreshing : copy.refresh}
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
