import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import useResponsiveLayout from '@/hooks/use-responsive-layout';
import useThemeStore from '@/context/Theme-store';
import type { AppStackParamList } from '@/src/navigation/AppNavigator';
import achievementsStorage, {
  type UnlockedAchievement,
} from '@/src/features/profile/services/achievementsStorage';
import {
  EmptyState,
  LoadingState,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from '@/shared/components/ui';

type AchievementsRoute = RouteProp<AppStackParamList, 'Achievements'>;

const formatUnlockedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleString();
};

const AchievementsScreen = () => {
  const route = useRoute<AchievementsRoute>();
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(() => getStyles(cardMaxWidth, isTablet, spacing), [cardMaxWidth, isTablet, spacing]);

  const { userId, displayName } = route.params;

  const [achievements, setAchievements] = React.useState<UnlockedAchievement[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [screenError, setScreenError] = React.useState<string | null>(null);

  const loadAchievements = React.useCallback(async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      setScreenError(null);
      const unlockedAchievements = await achievementsStorage.getUnlockedAchievementsByUser(userId);
      setAchievements(unlockedAchievements);

      if (unlockedAchievements.some((achievement) => achievement.isNew)) {
        await achievementsStorage.markAchievementsAsSeen(userId);
        setAchievements((current) =>
          current.map((achievement) => ({
            ...achievement,
            isNew: false,
          })),
        );
      }
    } catch {
      setScreenError('Failed to load achievements. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId]);

  React.useEffect(() => {
    void loadAchievements(true);
  }, [loadAchievements]);

  useFocusEffect(
    React.useCallback(() => {
      if (!isLoading) {
        void loadAchievements(false);
      }

      return undefined;
    }, [isLoading, loadAchievements]),
  );

  if (isLoading) {
    return (
      <ScreenContainer centered>
        <LoadingState label="Loading achievements..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader
        title="Achievements"
        subtitle={`Unlocked by ${displayName ?? 'current profile'}`}
      />

      {screenError ? <EmptyState title="Achievements error" description={screenError} /> : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StatCard title="Collection" subtitle="Only unlocked achievements are visible" style={styles.card}>
          <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
            Unlocked: {achievements.length}
          </Text>
          <Text style={[styles.hintText, { color: colors.textSecondary }]} allowFontScaling>
            Locked achievements stay hidden to keep the surprise effect.
          </Text>
        </StatCard>

        <StatCard title="Unlocked Achievements" subtitle="Newest first" style={styles.card}>
          {achievements.length > 0 ? (
            <View style={styles.achievementList}>
              {achievements.map((achievement) => (
                <View
                  key={`${achievement.userId}-${achievement.id}`}
                  style={[styles.achievementCard, { borderColor: colors.border, backgroundColor: colors.background }]}
                >
                  <View style={styles.iconWrap}>
                    <Ionicons
                      name={achievement.icon as keyof typeof Ionicons.glyphMap}
                      size={isTablet ? 26 : 22}
                      color="#ff2d55"
                    />
                  </View>

                  <View style={styles.achievementMeta}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.achievementTitle, { color: colors.text }]} allowFontScaling>
                        {achievement.title}
                      </Text>
                      <View style={[styles.rarityChip, { borderColor: colors.border }]}>
                        <Text style={[styles.rarityText, { color: colors.textSecondary }]} allowFontScaling>
                          {achievement.rarity}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.achievementDescription, { color: colors.textSecondary }]} allowFontScaling>
                      {achievement.description}
                    </Text>
                    <Text style={[styles.achievementMetaText, { color: colors.textSecondary }]} allowFontScaling>
                      Category: {achievement.category}
                    </Text>
                    <Text style={[styles.achievementMetaText, { color: colors.textSecondary }]} allowFontScaling>
                      Unlocked: {formatUnlockedAt(achievement.unlockedAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              title="No achievements unlocked yet"
              description="Complete quests to discover your first achievement."
            />
          )}
        </StatCard>

        <Pressable
          style={[styles.refreshButton, { borderColor: colors.border, backgroundColor: colors.background }]}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
          onPress={() => {
            void loadAchievements(false);
          }}
          disabled={isRefreshing}
        >
          <Text style={[styles.refreshButtonText, { color: colors.text }]} allowFontScaling>
            {isRefreshing ? 'Refreshing...' : 'Refresh achievements'}
          </Text>
        </Pressable>
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
      fontWeight: '700',
    },
    hintText: {
      marginTop: 4,
      fontSize: isTablet ? 13 : 12,
      fontWeight: '500',
    },
    achievementList: {
      gap: 10,
    },
    achievementCard: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      elevation: 1,
    },
    iconWrap: {
      width: isTablet ? 46 : 40,
      height: isTablet ? 46 : 40,
      borderRadius: 999,
      backgroundColor: '#ffe5ec',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 1,
    },
    achievementMeta: {
      flex: 1,
      gap: 2,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    achievementTitle: {
      flex: 1,
      fontSize: isTablet ? 16 : 14,
      fontWeight: '700',
    },
    rarityChip: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      elevation: 1,
    },
    rarityText: {
      fontSize: isTablet ? 11 : 10,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    achievementDescription: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '500',
    },
    achievementMetaText: {
      fontSize: isTablet ? 12 : 11,
      fontWeight: '500',
    },
    refreshButton: {
      width: '100%',
      maxWidth: cardMaxWidth,
      alignSelf: 'center',
      minHeight: 42,
      borderWidth: 1,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      elevation: 1,
      paddingHorizontal: 14,
    },
    refreshButtonText: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: '700',
    },
  });

export default AchievementsScreen;
