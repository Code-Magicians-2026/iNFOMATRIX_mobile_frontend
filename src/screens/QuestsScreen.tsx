import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import {
  acceptGeneratedQuestMock,
  completeQuestMock,
  generateQuestMock,
  getHomeSummaryMock,
  getQuestsMock,
} from '@/src/features/mvp/services/mock-services';
import type { Quest } from '@/shared/models/mvp-contracts.model';
import {
  EmptyState,
  LoadingState,
  PrimaryButton,
  QuestCard,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from '@/shared/components/ui';

type ModalStep = 'form' | 'preview';

const CATEGORY_OPTIONS = ['study', 'sport', 'productivity', 'health'] as const;

const QuestsScreen = () => {
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(() => getStyles(cardMaxWidth, isTablet, spacing), [cardMaxWidth, isTablet, spacing]);

  const [quests, setQuests] = React.useState<Quest[]>([]);
  const [totalXpToday, setTotalXpToday] = React.useState(0);
  const [completedToday, setCompletedToday] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [screenError, setScreenError] = React.useState<string | null>(null);

  const [isAddTaskOpen, setIsAddTaskOpen] = React.useState(false);
  const [modalStep, setModalStep] = React.useState<ModalStep>('form');
  const [taskText, setTaskText] = React.useState('');
  const [taskCategory, setTaskCategory] = React.useState<string>('study');
  const [durationMinutes, setDurationMinutes] = React.useState('');
  const [generatedQuest, setGeneratedQuest] = React.useState<Quest | null>(null);
  const [modalError, setModalError] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isAccepting, setIsAccepting] = React.useState(false);

  const [completingQuestId, setCompletingQuestId] = React.useState<string | null>(null);
  const [detailsQuest, setDetailsQuest] = React.useState<Quest | null>(null);

  const refreshData = React.useCallback(async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      setScreenError(null);
      const [questsData, homeSummary] = await Promise.all([getQuestsMock(), getHomeSummaryMock()]);
      setQuests(questsData);
      setTotalXpToday(homeSummary.xpGainedToday);
      setCompletedToday(homeSummary.questsCompletedToday);
    } catch {
      setScreenError('Failed to load quest data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshData(true);
  }, [refreshData]);

  const activeQuests = React.useMemo(
    () => quests.filter((quest) => quest.status === 'active'),
    [quests],
  );

  const completedQuests = React.useMemo(
    () => quests.filter((quest) => quest.status === 'completed'),
    [quests],
  );

  const resetTaskModal = () => {
    setModalStep('form');
    setTaskText('');
    setTaskCategory('study');
    setDurationMinutes('');
    setGeneratedQuest(null);
    setModalError(null);
    setIsGenerating(false);
    setIsAccepting(false);
  };

  const closeAddTaskModal = () => {
    setIsAddTaskOpen(false);
    resetTaskModal();
  };

  const parseDuration = () => {
    const normalized = durationMinutes.trim();
    if (!normalized) {
      return undefined;
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }

    return Math.round(parsed);
  };

  const handleGenerateQuest = async () => {
    const normalizedTask = taskText.trim();
    if (!normalizedTask) {
      setModalError('Please enter task text.');
      return;
    }

    const parsedDuration = parseDuration();
    if (parsedDuration === null) {
      setModalError('Duration must be a positive number of minutes.');
      return;
    }

    setModalError(null);
    setIsGenerating(true);

    try {
      const draftQuest = await generateQuestMock({
        taskText: normalizedTask,
        category: taskCategory,
        durationMinutes: parsedDuration,
      });
      setGeneratedQuest(draftQuest);
      setModalStep('preview');
    } catch {
      setModalError('Could not generate a quest. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptQuest = async () => {
    if (!generatedQuest) {
      return;
    }

    setIsAccepting(true);
    setModalError(null);

    try {
      await acceptGeneratedQuestMock(generatedQuest);
      await refreshData(false);
      closeAddTaskModal();
    } catch {
      setModalError('Could not accept the generated quest.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleCompleteQuest = async (id: string) => {
    setCompletingQuestId(id);
    setScreenError(null);

    try {
      await completeQuestMock(id);
      await refreshData(false);
    } catch {
      setScreenError('Could not complete quest. Please try again.');
    } finally {
      setCompletingQuestId(null);
    }
  };

  return (
    <ScreenContainer contentStyle={styles.container}>
      <SectionHeader
        title="Quests"
        subtitle="Add a task, generate AI quest, accept it and complete for rewards."
      />

      <StatCard title="Quest Progress Today" subtitle="Daily reward summary">
        <Text style={[styles.progressText, { color: colors.text }]} allowFontScaling>
          Total XP from quests today: {totalXpToday}
        </Text>
        <Text style={[styles.progressText, { color: colors.text }]} allowFontScaling>
          Completed quests today: {completedToday}
        </Text>
        <Text style={[styles.progressText, { color: colors.text }]} allowFontScaling>
          Active quests now: {activeQuests.length}
        </Text>
      </StatCard>

      <PrimaryButton
        label={isRefreshing ? 'Refreshing...' : 'Add Task'}
        disabled={isRefreshing}
        onPress={() => setIsAddTaskOpen(true)}
      />

      {screenError ? <EmptyState title="Quest flow error" description={screenError} /> : null}

      {isLoading ? (
        <LoadingState label="Loading quests..." />
      ) : (
        <View style={styles.listArea}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionBlock}>
              <SectionHeader title="Active Quests" />
              {activeQuests.length > 0 ? (
                activeQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    onComplete={handleCompleteQuest}
                    onViewDetails={setDetailsQuest}
                    isCompleting={completingQuestId === quest.id}
                  />
                ))
              ) : (
                <EmptyState
                  title="No active quests"
                  description="Generate and accept your first quest from Add Task."
                />
              )}
            </View>

            <View style={styles.sectionBlock}>
              <SectionHeader title="Completed Quests" />
              {completedQuests.length > 0 ? (
                completedQuests.map((quest) => <QuestCard key={quest.id} quest={quest} />)
              ) : (
                <EmptyState
                  title="No completed quests yet"
                  description="Complete an active quest to earn XP and see it here."
                />
              )}
            </View>
          </ScrollView>
        </View>
      )}

      <Modal
        visible={isAddTaskOpen}
        transparent
        animationType="slide"
        onRequestClose={closeAddTaskModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {modalStep === 'form' ? (
              <>
                <SectionHeader
                  title="Add Task"
                  subtitle="Describe a human task and convert it into an AI-generated quest."
                />

                <TextInput
                  value={taskText}
                  onChangeText={setTaskText}
                  placeholder="Finish math homework"
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.border,
                    },
                  ]}
                  multiline
                  numberOfLines={3}
                />

                <Text style={[styles.fieldLabel, { color: colors.text }]} allowFontScaling>
                  Category
                </Text>
                <View style={styles.categoryRow}>
                  {CATEGORY_OPTIONS.map((category) => {
                    const isSelected = taskCategory === category;
                    return (
                      <Pressable
                        key={category}
                        onPress={() => setTaskCategory(category)}
                        style={[
                          styles.categoryChip,
                          {
                            borderColor: isSelected ? '#ff2d55' : colors.border,
                            backgroundColor: isSelected ? '#ff2d55' : colors.card,
                          },
                        ]}
                        android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                      >
                        <Text
                          style={[styles.categoryChipText, { color: isSelected ? '#ffffff' : colors.text }]}
                          allowFontScaling
                        >
                          {category}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <TextInput
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                  placeholder="Optional duration (minutes)"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.border,
                    },
                  ]}
                />

                {modalError ? (
                  <Text style={styles.errorText} allowFontScaling>
                    {modalError}
                  </Text>
                ) : null}

                <View style={styles.modalActions}>
                  <PrimaryButton
                    label="Cancel"
                    variant="secondary"
                    onPress={closeAddTaskModal}
                    style={styles.modalButton}
                  />
                  <PrimaryButton
                    label="Generate Quest"
                    onPress={() => {
                      void handleGenerateQuest();
                    }}
                    loading={isGenerating}
                    style={styles.modalButton}
                  />
                </View>
              </>
            ) : generatedQuest ? (
              <>
                <SectionHeader
                  title="AI Generated Quest"
                  subtitle="Review generated quest and confirm it."
                />

                <StatCard title={generatedQuest.title} subtitle={`Difficulty: ${generatedQuest.difficulty}`}>
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]} allowFontScaling>
                    Original task: {generatedQuest.originalTask}
                  </Text>
                  <Text style={[styles.previewText, { color: colors.text }]} allowFontScaling>
                    {generatedQuest.description}
                  </Text>
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]} allowFontScaling>
                    Category: {generatedQuest.category}
                  </Text>
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]} allowFontScaling>
                    Reward XP: {generatedQuest.rewardXp}
                  </Text>
                </StatCard>

                {modalError ? (
                  <Text style={styles.errorText} allowFontScaling>
                    {modalError}
                  </Text>
                ) : null}

                <View style={styles.previewActions}>
                  <PrimaryButton
                    label="Accept Quest"
                    onPress={() => {
                      void handleAcceptQuest();
                    }}
                    loading={isAccepting}
                  />
                  <PrimaryButton
                    label="Regenerate"
                    variant="secondary"
                    onPress={() => {
                      void handleGenerateQuest();
                    }}
                    loading={isGenerating}
                  />
                  <PrimaryButton
                    label="Try another"
                    variant="tertiary"
                    onPress={() => {
                      setModalStep('form');
                      setGeneratedQuest(null);
                      setModalError(null);
                    }}
                  />
                </View>
              </>
            ) : (
              <LoadingState label="Preparing generated quest..." />
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(detailsQuest)}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsQuest(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {detailsQuest ? (
              <>
                <SectionHeader title="Quest Details" subtitle={detailsQuest.title} />
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]} allowFontScaling>
                  Original task: {detailsQuest.originalTask}
                </Text>
                <Text style={[styles.previewText, { color: colors.text }]} allowFontScaling>
                  {detailsQuest.description}
                </Text>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]} allowFontScaling>
                  Category: {detailsQuest.category}
                </Text>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]} allowFontScaling>
                  Difficulty: {detailsQuest.difficulty}
                </Text>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]} allowFontScaling>
                  Reward XP: {detailsQuest.rewardXp}
                </Text>
                <PrimaryButton
                  label="Close"
                  variant="secondary"
                  onPress={() => setDetailsQuest(null)}
                />
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const getStyles = (cardMaxWidth: number, isTablet: boolean, spacing: number) =>
  StyleSheet.create({
    container: {
      gap: 14,
    },
    progressText: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: '500',
    },
    listArea: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      gap: 18,
      paddingBottom: spacing,
    },
    sectionBlock: {
      gap: 10,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing,
      paddingVertical: spacing,
    },
    modalCard: {
      width: '100%',
      maxWidth: cardMaxWidth + 70,
      borderRadius: 14,
      borderWidth: 1,
      padding: isTablet ? 22 : 16,
      gap: 10,
      elevation: 3,
    },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: isTablet ? 16 : 14,
      textAlignVertical: 'top',
    },
    fieldLabel: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: '600',
    },
    categoryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryChip: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      minWidth: 96,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 1,
    },
    categoryChipText: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    errorText: {
      color: '#c11335',
      fontSize: isTablet ? 13 : 12,
      fontWeight: '600',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    modalButton: {
      flex: 1,
    },
    previewLabel: {
      fontSize: isTablet ? 15 : 13,
      fontWeight: '500',
    },
    previewText: {
      fontSize: isTablet ? 16 : 14,
      lineHeight: isTablet ? 22 : 20,
    },
    previewActions: {
      gap: 8,
      marginTop: 6,
    },
  });

export default QuestsScreen;
