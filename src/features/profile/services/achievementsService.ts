import achievementsStorage, { type UnlockedAchievement } from '@/src/features/profile/services/achievementsStorage';
import type { ProgressSummary, Quest, UserRole } from '@/shared/models/mvp-contracts.model';

const getQuestProgress = (quest: Quest) => {
  const stepsCount = quest.stepsCount ?? quest.steps?.length ?? 0;
  const completedStepsCount =
    quest.completedStepsCount ?? quest.steps?.filter((step) => step.status === 'completed').length ?? 0;
  return { stepsCount, completedStepsCount };
};

const hasPhotoReport = (quest: Quest) => Boolean(quest.afterPhoto?.uri?.trim());

const hasRewardConfigured = (quest: Quest) =>
  Boolean(
    quest.rewardType ||
      quest.rewardTitle?.trim() ||
      quest.rewardDescription?.trim() ||
      (typeof quest.rewardValue === 'number' && Number.isFinite(quest.rewardValue)),
  );

const hasAiMarker = (quest: Quest) => {
  const source = [quest.title, quest.description, quest.originalTask].filter(Boolean).join(' ').toLowerCase();
  return source.includes('ai') || source.includes('gpt') || source.includes('generated');
};

type QuestCompletionAchievementContext = {
  userId: string;
  role: UserRole;
  quest: Quest;
  progress: ProgressSummary;
};

const resolveAchievementIds = ({ role, quest, progress }: QuestCompletionAchievementContext): string[] => {
  const { stepsCount, completedStepsCount } = getQuestProgress(quest);
  const achievements: string[] = [];

  if (progress.completedQuestsCount >= 1) {
    achievements.push('first_quest');
  }
  if (stepsCount > 0 && completedStepsCount === stepsCount) {
    achievements.push('step_master');
  }
  if (hasPhotoReport(quest)) {
    achievements.push('photo_reporter');
  }
  if (hasRewardConfigured(quest)) {
    achievements.push('reward_hunter');
  }
  if (progress.streak >= 3) {
    achievements.push('three_day_streak');
  }
  if (progress.completedQuestsCount >= 5) {
    achievements.push('quest_explorer');
  }
  if (role === 'child' && progress.completedQuestsCount >= 1) {
    achievements.push('family_helper');
  }
  if (hasAiMarker(quest)) {
    achievements.push('ai_adventurer');
  }

  return achievements;
};

const unlockFromQuestCompletion = async (
  context: QuestCompletionAchievementContext,
): Promise<UnlockedAchievement[]> => {
  const achievementIds = resolveAchievementIds(context);
  if (achievementIds.length === 0) {
    return [];
  }

  const newlyUnlocked: UnlockedAchievement[] = [];
  for (const achievementId of achievementIds) {
    try {
      const result = await achievementsStorage.unlockAchievement({
        userId: context.userId,
        achievementId,
      });
      if (result.isNewUnlock) {
        newlyUnlocked.push(result.achievement);
      }
    } catch {}
  }

  return newlyUnlocked;
};

const achievementsService = {
  unlockFromQuestCompletion,
};

export default achievementsService;
