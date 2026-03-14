import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Quest } from '@/shared/models/mvp-contracts.model';
import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import { getQuestRewardLabel } from '@/shared/models/quest-reward.model';

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
  const isDone = isArchived;
  const rewardLabel = getQuestRewardLabel(quest);
  const reportPhotoRequired = Boolean(quest.beforePhoto?.uri);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]} allowFontScaling>
          {quest.title}
        </Text>
        {isDone ? (
          <View style={styles.doneCheckWrap}>
            <Text style={styles.doneCheckLabel} allowFontScaling={false}>
              ✓
            </Text>
          </View>
        ) : null}
      </View>
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
        <Text style={[styles.rewardHighlight, { color: colors.text }]} allowFontScaling>
          🎁 {rewardLabel}
        </Text>
        <Text style={[styles.metaText, { color: colors.textSecondary }]} allowFontScaling>
          Report photo: {reportPhotoRequired ? 'required' : 'optional'}
        </Text>
        {reportPhotoRequired ? (
          <Text style={styles.photoRequiredBadge} allowFontScaling>
            📷 Report required
          </Text>
        ) : null}
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
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    doneCheckWrap: {
      width: isTablet ? 24 : 22,
      height: isTablet ? 24 : 22,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1f9b54',
      elevation: 1,
    },
    doneCheckLabel: {
      color: '#ffffff',
      fontSize: isTablet ? 15 : 14,
      fontWeight: '900',
      lineHeight: isTablet ? 16 : 15,
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
    rewardHighlight: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: '700',
    },
    photoRequiredBadge: {
      alignSelf: 'flex-start',
      fontSize: isTablet ? 12 : 11,
      fontWeight: '700',
      color: '#8b1a2b',
      backgroundColor: '#ffe5eb',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      overflow: 'hidden',
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
