import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import { getApiErrorMessage } from '@/src/features/auth/api/client';
import {
  EmptyState,
  LoadingState,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from '@/shared/components/ui';
import { plansService } from '@/src/integration/services';
import type { AppStackParamList } from '@/src/navigation/AppNavigator';

type PlanPreviewRoute = RouteProp<AppStackParamList, 'PlanPreview'>;
type PlanPreviewNavigation = NativeStackNavigationProp<AppStackParamList>;

const PlanPreviewScreen = () => {
  const route = useRoute<PlanPreviewRoute>();
  const navigation = useNavigation<PlanPreviewNavigation>();
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(
    () => getStyles(cardMaxWidth, isTablet, spacing),
    [cardMaxWidth, isTablet, spacing],
  );

  const [plan, setPlan] = React.useState(route.params.plan);
  const [isApproving, setIsApproving] = React.useState(false);
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const canApprove = plan.status === 'draft';

  const handleApprove = async () => {
    if (!canApprove) {
      return;
    }

    setIsApproving(true);
    try {
      setScreenError(null);
      const approved = await plansService.approvePlan(plan.id);
      setPlan(approved);
      setFeedback('Plan approved and quests activated.');
    } catch (error) {
      setScreenError(getApiErrorMessage(error, 'Failed to approve this plan.'));
    } finally {
      setIsApproving(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      setScreenError(null);
      const regenerated = await plansService.generatePlan(route.params.request);
      setPlan(regenerated);
      setFeedback('Plan regenerated. Review new quests below.');
    } catch (error) {
      setScreenError(getApiErrorMessage(error, 'Failed to regenerate plan.'));
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isApproving || isRegenerating) {
    return (
      <ScreenContainer centered>
        <LoadingState label={isApproving ? 'Approving plan...' : 'Regenerating plan...'} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader
        title="Plan Preview"
        subtitle={`Target: ${route.params.targetLabel}`}
      />

      {screenError ? <EmptyState title="Plan action error" description={screenError} /> : null}
      {feedback ? <EmptyState title={feedback} /> : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StatCard title={plan.title} subtitle={`Status: ${plan.status}`} style={styles.card}>
          <Text style={[styles.text, { color: colors.text }]} allowFontScaling>
            {plan.summary}
          </Text>
          <Text style={[styles.childMessage, { color: colors.textSecondary }]} allowFontScaling>
            {plan.childMessage}
          </Text>
        </StatCard>

        <StatCard title="Quests" subtitle={`${plan.quests.length} generated quests`} style={styles.card}>
          {plan.quests.length > 0 ? (
            plan.quests.map((quest) => (
              <View key={quest.id} style={[styles.questItem, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.questTitle, { color: colors.text }]} allowFontScaling>
                  {quest.title}
                </Text>
                <Text style={[styles.questMeta, { color: colors.textSecondary }]} allowFontScaling>
                  Difficulty: {quest.difficulty}
                </Text>
                <Text style={[styles.questMeta, { color: colors.textSecondary }]} allowFontScaling>
                  Reward XP: {quest.rewardXp}
                </Text>
                <Text style={[styles.questMeta, { color: colors.textSecondary }]} allowFontScaling>
                  Estimated minutes: {quest.estimatedMinutes}
                </Text>
              </View>
            ))
          ) : (
            <EmptyState title="No quests generated" description="Regenerate plan to create quests." />
          )}
        </StatCard>

        <StatCard title="Total Estimated Minutes" subtitle="Overall workload" style={styles.card}>
          <Text style={[styles.totalMinutes, { color: colors.text }]} allowFontScaling>
            {plan.totalEstimatedMinutes} min
          </Text>
        </StatCard>

        <View style={[styles.actionsRow, styles.card]}>
          {canApprove ? (
            <Pressable
              onPress={handleApprove}
              style={styles.approveButton}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.16)' }}
            >
              <Text style={styles.approveButtonLabel} allowFontScaling>
                Approve
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={handleRegenerate}
            style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.background }]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
          >
            <Text style={[styles.secondaryButtonLabel, { color: colors.text }]} allowFontScaling>
              Regenerate
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.background }]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
          >
            <Text style={[styles.secondaryButtonLabel, { color: colors.text }]} allowFontScaling>
              Back
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const getStyles = (cardMaxWidth: number, isTablet: boolean, spacing: number) =>
  StyleSheet.create({
    content: {
      gap: 12,
      paddingBottom: Math.max(14, Math.round(spacing * 1.1)),
    },
    card: {
      width: '100%',
      maxWidth: cardMaxWidth,
      alignSelf: 'center',
    },
    text: {
      fontSize: isTablet ? 15 : 14,
      lineHeight: isTablet ? 22 : 20,
    },
    childMessage: {
      fontSize: isTablet ? 14 : 13,
      lineHeight: isTablet ? 21 : 19,
      fontStyle: 'italic',
    },
    questItem: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 2,
      elevation: 1,
    },
    questTitle: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: '700',
      marginBottom: 2,
    },
    questMeta: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '500',
    },
    totalMinutes: {
      fontSize: isTablet ? 22 : 20,
      fontWeight: '700',
    },
    actionsRow: {
      gap: 10,
    },
    approveButton: {
      minHeight: 46,
      borderRadius: 10,
      backgroundColor: '#ff2d55',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      elevation: 2,
    },
    approveButtonLabel: {
      color: '#ffffff',
      fontSize: isTablet ? 16 : 15,
      fontWeight: '700',
    },
    secondaryButton: {
      minHeight: 44,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      elevation: 1,
    },
    secondaryButtonLabel: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: '700',
    },
  });

export default PlanPreviewScreen;
