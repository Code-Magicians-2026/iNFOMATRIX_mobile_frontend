import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Quest } from '@/shared/models/mvp-contracts.model';
import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';

type QuestCardProps = {
  quest: Quest;
  onViewDetails?: (quest: Quest) => void;
};

const QuestCard = ({ quest, onViewDetails }: QuestCardProps) => {
  const colors = useThemeStore((s) => s.colors);
  const { isTablet } = useResponsiveLayout();
  const styles = React.useMemo(() => getStyles(isTablet), [isTablet]);

  const isArchived = quest.status === 'archived' || quest.status === 'completed';
  const canViewDetails = typeof onViewDetails === 'function';
  const stepsCount = quest.stepsCount ?? quest.steps?.length ?? 0;
  const completedStepsCount =
    quest.completedStepsCount ?? quest.steps?.filter((step) => step.status === 'completed').length ?? 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]} allowFontScaling>
        {quest.title}
      </Text>
      {quest.originalTask ? (
        <Text style={[styles.originalTask, { color: colors.textSecondary }]} allowFontScaling>
          Original task: {quest.originalTask}
        </Text>
      ) : null}
      <Text style={[styles.description, { color: colors.text }]} allowFontScaling>
        {quest.description}
      </Text>

      <View style={styles.metaGrid}>
        <Text style={[styles.progressText, { color: colors.text }]} allowFontScaling>
          Progress: {completedStepsCount} / {stepsCount} steps
        </Text>
        <Text style={[styles.metaText, { color: colors.textSecondary }]} allowFontScaling>
          Difficulty: {quest.difficulty}
        </Text>
        <Text style={[styles.metaText, { color: colors.textSecondary }]} allowFontScaling>
          Reward: +{quest.rewardXp} XP
        </Text>
      </View>

      <View style={styles.footer}>
        {isArchived ? (
          <Text style={styles.completedBadge} allowFontScaling>
            ARCHIVED
          </Text>
        ) : null}
        {canViewDetails ? (
          <Pressable
            onPress={() => onViewDetails(quest)}
            style={[styles.detailsButton, { borderColor: colors.border, backgroundColor: colors.background }]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
          >
            <Text style={[styles.detailsButtonLabel, { color: colors.text }]} allowFontScaling>
              View details
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const getStyles = (isTablet: boolean) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderRadius: 12,
      padding: isTablet ? 18 : 14,
      gap: 10,
      elevation: 2,
    },
    title: {
      fontSize: isTablet ? 22 : 18,
      fontWeight: '700',
    },
    originalTask: {
      fontSize: isTablet ? 15 : 13,
      fontWeight: '500',
    },
    description: {
      fontSize: isTablet ? 16 : 14,
      lineHeight: isTablet ? 22 : 20,
    },
    metaGrid: {
      gap: 4,
    },
    progressText: {
      fontSize: isTablet ? 15 : 13,
      fontWeight: '700',
    },
    metaText: {
      fontSize: isTablet ? 14 : 13,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    completedBadge: {
      fontSize: 11,
      fontWeight: '700',
      color: '#1c8f4e',
      backgroundColor: '#d9f3e3',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      overflow: 'hidden',
    },
    detailsButton: {
      borderWidth: 1,
      borderRadius: 10,
      minHeight: 40,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    detailsButtonLabel: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: '700',
    },
  });

export default QuestCard;
