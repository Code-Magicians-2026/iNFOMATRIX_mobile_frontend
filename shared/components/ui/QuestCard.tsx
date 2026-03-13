import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Quest } from '@/shared/models/mvp-contracts.model';
import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import PrimaryButton from './PrimaryButton';

type QuestCardProps = {
  quest: Quest;
  onComplete?: (id: string) => void;
  onViewDetails?: (quest: Quest) => void;
  isCompleting?: boolean;
};

const QuestCard = ({ quest, onComplete, onViewDetails, isCompleting = false }: QuestCardProps) => {
  const colors = useThemeStore((s) => s.colors);
  const { isTablet } = useResponsiveLayout();
  const styles = React.useMemo(() => getStyles(isTablet), [isTablet]);

  const isCompleted = quest.status === 'completed';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]} allowFontScaling>
        {quest.title}
      </Text>
      <Text style={[styles.originalTask, { color: colors.textSecondary }]} allowFontScaling>
        Original task: {quest.originalTask}
      </Text>
      <Text style={[styles.description, { color: colors.text }]} allowFontScaling>
        {quest.description}
      </Text>

      <View style={styles.metaGrid}>
        <Text style={[styles.metaText, { color: colors.textSecondary }]} allowFontScaling>
          Difficulty: {quest.difficulty}
        </Text>
        <Text style={[styles.metaText, { color: colors.textSecondary }]} allowFontScaling>
          Category: {quest.category}
        </Text>
        <Text style={[styles.metaText, { color: colors.textSecondary }]} allowFontScaling>
          Reward XP: {quest.rewardXp}
        </Text>
        <Text style={[styles.metaText, { color: colors.textSecondary }]} allowFontScaling>
          Status: {quest.status}
        </Text>
      </View>

      {isCompleted ? (
        <View style={styles.completedBox}>
          <Text style={styles.completedBadge} allowFontScaling>
            COMPLETED
          </Text>
          <Text style={[styles.earnedXp, { color: colors.text }]} allowFontScaling>
            Earned XP: +{quest.rewardXp}
          </Text>
        </View>
      ) : (
        <View style={styles.actionsRow}>
          <PrimaryButton
            label="Complete"
            onPress={() => onComplete?.(quest.id)}
            loading={isCompleting}
            disabled={!onComplete}
            style={styles.actionButton}
          />
          <PrimaryButton
            label="View details"
            variant="secondary"
            onPress={() => onViewDetails?.(quest)}
            disabled={!onViewDetails}
            style={styles.actionButton}
          />
        </View>
      )}
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
    metaText: {
      fontSize: isTablet ? 14 : 13,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    actionButton: {
      flex: 1,
      minHeight: 44,
    },
    completedBox: {
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
    earnedXp: {
      fontSize: isTablet ? 15 : 13,
      fontWeight: '700',
    },
  });

export default QuestCard;
