import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import useResponsiveLayout from '@/hooks/use-responsive-layout';
import useThemeStore from '@/context/Theme-store';
import type { AppStackParamList } from '@/src/navigation/AppNavigator';
import {
  CompletionBadge,
  EmptyState,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from '@/shared/components/ui';
import earnedBadgesStorage, {
  type EarnedBadgeRecord,
} from '@/src/features/profile/services/earnedBadgesStorage';

type EarnedBadgesRoute = RouteProp<AppStackParamList, 'EarnedBadges'>;

const formatEarnedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleString();
};

const EarnedBadgesScreen = () => {
  const route = useRoute<EarnedBadgesRoute>();
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(() => getStyles(cardMaxWidth, isTablet, spacing), [cardMaxWidth, isTablet, spacing]);

  const { userId, displayName } = route.params;

  const [badges, setBadges] = React.useState<EarnedBadgeRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [screenError, setScreenError] = React.useState<string | null>(null);

  const loadBadges = React.useCallback(async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      setScreenError(null);
      const earnedBadges = await earnedBadgesStorage.getEarnedBadgesByUser(userId);
      setBadges(earnedBadges);
    } catch {
      setScreenError('Failed to load earned badges. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId]);

  React.useEffect(() => {
    void loadBadges(true);
  }, [loadBadges]);

  useFocusEffect(
    React.useCallback(() => {
      if (!isLoading) {
        void loadBadges(false);
      }

      return undefined;
    }, [isLoading, loadBadges]),
  );

  if (isLoading) {
    return (
      <ScreenContainer centered>
        <LoadingState label="Loading earned badges..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader
        title="Earned Badges"
        subtitle={`Collected by ${displayName ?? 'current profile'}`}
      />

      {screenError ? <EmptyState title="Badges error" description={screenError} /> : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StatCard title="Collection" subtitle="Badges unlocked from completed quests" style={styles.card}>
          <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
            Total earned: {badges.length}
          </Text>
        </StatCard>

        <StatCard title="Received Badges" subtitle="Stored in local storage" style={styles.card}>
          {badges.length > 0 ? (
            <View style={styles.badgesList}>
              {badges.map((badge) => (
                <View
                  key={badge.id}
                  style={[styles.badgeRow, { borderColor: colors.border, backgroundColor: colors.background }]}
                >
                  <CompletionBadge
                    difficulty={badge.difficulty}
                    imageKey={badge.imageKey}
                    imageSize={isTablet ? 76 : 68}
                    showLabel={false}
                    style={styles.badgeVisual}
                  />
                  <View style={styles.badgeMeta}>
                    <Text style={[styles.badgeTitle, { color: colors.text }]} allowFontScaling>
                      {badge.badgeType === 'fire' ? 'Fire badge' : 'Basic badge'}
                    </Text>
                    <Text style={[styles.badgeInfo, { color: colors.textSecondary }]} allowFontScaling>
                      Difficulty: {badge.difficulty}
                    </Text>
                    <Text style={[styles.badgeInfo, { color: colors.textSecondary }]} allowFontScaling>
                      Received: {formatEarnedAt(badge.earnedAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              title="No earned badges yet"
              description="Complete quests to unlock and store your first badge."
            />
          )}
        </StatCard>

        <PrimaryButton
          label={isRefreshing ? 'Refreshing...' : 'Refresh badges'}
          variant="tertiary"
          disabled={isRefreshing}
          onPress={() => {
            void loadBadges(false);
          }}
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
    badgesList: {
      gap: 10,
    },
    badgeRow: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      elevation: 1,
    },
    badgeVisual: {
      marginTop: 0,
      minWidth: isTablet ? 88 : 80,
      minHeight: isTablet ? 88 : 80,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: 14,
      paddingHorizontal: 6,
      paddingVertical: 6,
      elevation: 1,
    },
    badgeMeta: {
      flex: 1,
      gap: 2,
    },
    badgeTitle: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: '700',
    },
    badgeInfo: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '500',
    },
  });

export default EarnedBadgesScreen;

