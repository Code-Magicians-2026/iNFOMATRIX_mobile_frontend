import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";

import useAuthStore from "@/context/Auth-store";
import useThemeStore from "@/context/Theme-store";
import useResponsiveLayout from "@/hooks/use-responsive-layout";
import { useI18n } from "@/src/i18n/useI18n";
import {
  CompletionBadge,
  EmptyState,
  LoadingState,
  PrimaryButton,
  QuestCard,
  QuestRewardEditor,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from "@/shared/components/ui";
import {
  pickRandomBadgeImageKey,
  type BadgeImageKey,
} from "@/shared/components/ui/badge-catalog";
import type {
  CapturedPhoto,
  ChildProfile,
  ProgressSummary,
  Quest,
  QuestPhoto,
  QuestStep,
  UserRole,
} from "@/shared/models/mvp-contracts.model";
import {
  buildQuestRewardFieldsFromDraft,
  buildQuestRewardPreviewFromDraft,
  createQuestRewardDraftFromQuest,
  getQuestRewardLabel,
  getQuestRewardTypeLabel,
  type QuestRewardDraft,
} from "@/shared/models/quest-reward.model";
import achievementsService from "@/src/features/profile/services/achievementsService";
import type { UnlockedAchievement } from "@/src/features/profile/services/achievementsStorage";
import earnedBadgesStorage from "@/src/features/profile/services/earnedBadgesStorage";
import {
  cameraService,
  childrenService,
  progressService,
  questsService,
  userService,
} from "@/src/integration/services";
import type { AppStackParamList } from "@/src/navigation/AppNavigator";

const getTodayIsoDate = () => new Date().toISOString().slice(0, 10);
const STEP_TOGGLE_VIBRATION_PATTERN = [0, 45, 25, 65];
const QUEST_VICTORY_VIBRATION_PATTERN = [0, 80, 60, 120, 80, 220];
const ACHIEVEMENT_UNLOCK_VIBRATION_PATTERN = [0, 40, 30, 60];
const ACHIEVEMENT_UNLOCK_DURATION_MS = 1900;
const QUESTS_FOCUS_REFRESH_COOLDOWN_MS = 5000;

const isQuestArchived = (quest: Quest) =>
  quest.status === "archived" || quest.status === "completed";
const hasQuestPhoto = (photo?: QuestPhoto | null) =>
  Boolean(photo?.uri?.trim());
const isReportPhotoRequired = (quest: Quest) =>
  hasQuestPhoto(quest.beforePhoto);

const getQuestCompletionDate = (quest: Quest) =>
  quest.archivedAt ?? quest.completedAt ?? quest.createdAt;

const getQuestProgress = (quest: Quest) => {
  const stepsCount = quest.stepsCount ?? quest.steps?.length ?? 0;
  const completedStepsCount =
    quest.completedStepsCount ??
    quest.steps?.filter((step) => step.status === "completed").length ??
    0;

  return { stepsCount, completedStepsCount };
};

const isQuestDone = (quest: Quest) => {
  return isQuestArchived(quest);
};

type CompletionFeedback = {
  questTitle: string;
  difficulty: string;
  badgeImageKey: BadgeImageKey;
  rewardXp: number;
  rewardLabel: string;
  totalXp: number;
  streak: number;
};

type DetailsSectionKey =
  | "overview"
  | "reward"
  | "beforePhoto"
  | "afterPhoto"
  | "steps"
  | "aiSummary";
type DetailsSectionsState = Record<DetailsSectionKey, boolean>;

const createDefaultDetailsSections = (
  quest?: Quest | null,
): DetailsSectionsState => ({
  overview: true,
  reward: false,
  beforePhoto: false,
  afterPhoto: false,
  steps: true,
  aiSummary: false,
});

type QuestsNavigation = NativeStackNavigationProp<AppStackParamList>;

const mergeUniqueAchievements = (
  current: UnlockedAchievement[],
  incoming: UnlockedAchievement[],
): UnlockedAchievement[] => {
  if (incoming.length === 0) {
    return current;
  }

  const existingIds = new Set(current.map((achievement) => achievement.id));
  const uniqueIncoming = incoming.filter(
    (achievement) => !existingIds.has(achievement.id),
  );

  return uniqueIncoming.length > 0 ? [...current, ...uniqueIncoming] : current;
};

const QuestsScreen = () => {
  const navigation = useNavigation<QuestsNavigation>();
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isTablet, spacing } = useResponsiveLayout();
  const { language } = useI18n();
  const isUk = language === "uk";
  const styles = React.useMemo(
    () => getStyles(cardMaxWidth, isTablet, spacing),
    [cardMaxWidth, isTablet, spacing],
  );
  const copy = React.useMemo(
    () =>
      isUk
        ? {
            myself: "Я",
            noActiveChild: "Немає активної дитини",
            failedToLoadAssignedQuests:
              "Не вдалося завантажити призначені квести. Спробуйте ще раз.",
            selectedQuestNotFound: "Обраний квест не знайдено.",
            couldNotUpdateStep: "Не вдалося оновити крок квесту. Спробуйте ще раз.",
            couldNotSwitchChildProfile: "Не вдалося перемкнути профіль дитини.",
            rewardLockedForCompleted: "Нагорода заблокована для завершених квестів.",
            parentsUpdatedReward: "Батьки оновили нагороду цього квесту.",
            rewardUpdated: "Нагороду оновлено.",
            couldNotUpdateReward:
              "Не вдалося оновити нагороду квесту. Спробуйте ще раз.",
            cameraPermissionRequired:
              "Потрібен доступ до камери, щоб додати фото квесту.",
            galleryPermissionRequired:
              "Потрібен доступ до галереї, щоб додати фото квесту.",
            beforePhotoAdded:
              "Фото до виконання додано. Після завершення потрібне звітне фото.",
            beforePhotoRemoved:
              "Фото до виконання видалено. Звітне фото тепер не обов’язкове.",
            couldNotUpdateBeforePhoto: "Не вдалося оновити фото до виконання.",
            reportPhotoAdded: "Звітне фото додано.",
            reportPhotoRemoved: "Звітне фото видалено.",
            couldNotUpdateReportPhoto: "Не вдалося оновити звітне фото.",
            completeAllSteps:
              "Завершіть усі кроки перед тим, як завершити квест.",
            addReportPhotoToComplete:
              "Щоб завершити цей квест, додайте звітне фото.",
            couldNotCompleteQuest: "Не вдалося завершити цей квест.",
            hide: "Сховати",
            show: "Показати",
            loadingAssignedQuests: "Завантаження призначених квестів...",
            questsTitle: "Квести",
            questsSubtitleChild:
              "Режим виконання: завершуйте призначені квести та отримуйте XP",
            questsSubtitleAdult:
              "Режим батьків: перегляд і редагування квестів обраної дитини",
            targetChildTitle: "Цільова дитина",
            targetChildSubtitle: "Квести прив’язані до обраного профілю",
            noActiveChildSelectedTitle: "Активну дитину не обрано",
            noActiveChildSelectedDescription:
              "Оберіть дитину, щоб переглянути її призначені квести.",
            selectFirstChild: "Обрати першу дитину",
            childMeta: (age: number, level: number) => `Вік ${age} | Рівень ${level}`,
            noChildProfilesTitle: "Немає профілів дітей",
            noChildProfilesDescription:
              "Створіть дитину на Головній, щоб призначати квести.",
            questProgressTitle: "Прогрес квестів",
            executionMetrics: "Метрики виконання",
            target: (label: string) => `Ціль: ${label}`,
            activeQuests: (value: number) => `Активні квести: ${value}`,
            completedToday: (value: number) => `Завершено сьогодні: ${value}`,
            xpToday: (value: number) => `XP за сьогодні: ${value}`,
            totalXp: (value: number) => `Загальний XP: ${value}`,
            streak: (value: number) => `Streak: ${value}`,
            questCompleted: "Квест завершено",
            rewardPendingParent: (label: string) =>
              `Нагорода очікує підтвердження батьків: ${label}`,
            rewardUnlocked: (label: string) => `Нагороду розблоковано: ${label}`,
            questFinalized: "Квест фіналізовано",
            questMovedToArchive: "Квест перенесено в Архів",
            totalXpAndStreak: (xp: number, streak: number) =>
              `Загальний XP: ${xp} | Streak: ${streak}`,
            refreshing: "Оновлення...",
            refreshQuests: "Оновити квести",
            questFlowError: "Помилка потоку квестів",
            activeQuestsSection: "Активні квести",
            noActiveQuestsTitle: "Немає активних квестів",
            noActiveQuestsDescription:
              "Підтвердьте AI-план, щоб перевести квести в активний стан.",
            noTargetSelectedTitle: "Ціль не обрано",
            noTargetSelectedDescription:
              "Оберіть профіль дитини, щоб завантажити призначені квести.",
            archivedSection: "Архів",
            archiveIsEmptyTitle: "Архів порожній",
            archiveIsEmptyDescription:
              "Завершуйте кроки і завершуйте квест у деталях, щоб перенести його сюди.",
            noArchivedQuestsTitle: "Немає архівних квестів",
            noArchivedQuestsDescription:
              "Спочатку створіть профіль дитини та підтвердьте план.",
            up: "Вгору",
            badgeUnlocked: "Бейдж розблоковано",
            achievementUnlocked: "Досягнення розблоковано!",
            questDetails: "Деталі квесту",
            tapSectionToToggle:
              "Торкніться назви секції, щоб розгорнути або згорнути деталі.",
            overview: "Огляд",
            progressCounter: (completed: number, total: number) =>
              `Прогрес ${completed}/${total}`,
            originalTask: "Початкове завдання",
            generatedFromPlan: "Згенеровано з підтвердженого AI-плану",
            difficulty: "Складність",
            estimatedMinutes: "Орієнтовні хвилини",
            reward: "Нагорода",
            rewardXp: (xp: number) => `Нагорода XP: +${xp} XP`,
            rewardLabel: (label: string) => `🎁 Нагорода: ${label}`,
            rewardType: "Тип нагороди",
            comment: "Коментар",
            rewardLockedAfterCompletion:
              "Нагорода блокується після завершення квесту.",
            savingReward: "Збереження нагороди...",
            saveReward: "Зберегти нагороду",
            rewardLock: "Блокування нагороди",
            locked: "Заблоковано",
            editable: "Редагується",
            beforeCompletion: "До завершення",
            photoAdded: "Фото додано",
            photoMissing: "Фото відсутнє",
            beforePhotoNotAdded: "Фото до виконання не додано.",
            reportPhoto: "Звітне фото",
            required: "обов’язкове",
            optional: "опційне",
            childMustSubmitAfter:
              "Після завершення дитина має надіслати фото результату.",
            loading: "Завантаження...",
            gallery: "Галерея",
            camera: "Камера",
            beforePhotoReplacementLocked:
              "Заміна фото до виконання блокується після старту квесту.",
            removeBeforePhotoA11y: "Видалити фото до виконання",
            reportPhotoSection: "Звітне фото",
            resultUploaded: "Результат завантажено",
            resultPending: "Результат очікується",
            resultPhotoNotAdded: "Фото результату ще не додано.",
            addResultPhotoToComplete:
              "Додайте фото результату, щоб завершити цей квест.",
            aiSummary: "AI підсумок",
            steps: "Кроки",
            completedCounter: (completed: number, total: number) =>
              `${completed}/${total} завершено`,
            questActions: "Дії з квестом",
            archivedReadOnly: "Архівні квести доступні лише для перегляду.",
            completingQuest: "Завершення квесту...",
            completeQuest: "Завершити квест",
            close: "Закрити",
          }
        : {
            myself: "Myself",
            noActiveChild: "No active child",
            failedToLoadAssignedQuests:
              "Failed to load assigned quests. Please try again.",
            selectedQuestNotFound: "Selected quest was not found.",
            couldNotUpdateStep: "Could not update quest step. Please try again.",
            couldNotSwitchChildProfile: "Could not switch child profile.",
            rewardLockedForCompleted: "Reward is locked for completed quests.",
            parentsUpdatedReward: "Parents updated this quest reward.",
            rewardUpdated: "Reward updated.",
            couldNotUpdateReward:
              "Could not update quest reward. Please try again.",
            cameraPermissionRequired:
              "Camera permission is required to add a quest photo.",
            galleryPermissionRequired:
              "Gallery permission is required to add a quest photo.",
            beforePhotoAdded:
              "Before photo added. Report photo after completion is required.",
            beforePhotoRemoved:
              "Before photo removed. Report photo is now optional.",
            couldNotUpdateBeforePhoto: "Could not update before photo.",
            reportPhotoAdded: "Report photo added.",
            reportPhotoRemoved: "Report photo removed.",
            couldNotUpdateReportPhoto: "Could not update report photo.",
            completeAllSteps:
              "Complete all steps before finishing this quest.",
            addReportPhotoToComplete:
              "To complete this quest, add a report photo.",
            couldNotCompleteQuest: "Could not complete this quest.",
            hide: "Hide",
            show: "Show",
            loadingAssignedQuests: "Loading assigned quests...",
            questsTitle: "Quests",
            questsSubtitleChild:
              "Execution mode: complete assigned quests and earn XP",
            questsSubtitleAdult:
              "Parent mode: review and update selected child quests",
            targetChildTitle: "Target Child",
            targetChildSubtitle: "Quests are tied to selected profile",
            noActiveChildSelectedTitle: "No active child selected",
            noActiveChildSelectedDescription:
              "Choose a child to preview their assigned quests.",
            selectFirstChild: "Select first child",
            childMeta: (age: number, level: number) => `Age ${age} | Level ${level}`,
            noChildProfilesTitle: "No child profiles",
            noChildProfilesDescription:
              "Create child from Home to assign quests.",
            questProgressTitle: "Quest Progress",
            executionMetrics: "Execution metrics",
            target: (label: string) => `Target: ${label}`,
            activeQuests: (value: number) => `Active quests: ${value}`,
            completedToday: (value: number) => `Completed today: ${value}`,
            xpToday: (value: number) => `XP earned today: ${value}`,
            totalXp: (value: number) => `Total XP: ${value}`,
            streak: (value: number) => `Streak: ${value}`,
            questCompleted: "Quest completed",
            rewardPendingParent: (label: string) =>
              `Reward pending parent confirmation: ${label}`,
            rewardUnlocked: (label: string) => `Reward unlocked: ${label}`,
            questFinalized: "Quest finalized",
            questMovedToArchive: "Quest moved to Archive",
            totalXpAndStreak: (xp: number, streak: number) =>
              `Total XP: ${xp} | Streak: ${streak}`,
            refreshing: "Refreshing...",
            refreshQuests: "Refresh quests",
            questFlowError: "Quest flow error",
            activeQuestsSection: "Active Quests",
            noActiveQuestsTitle: "No active quests",
            noActiveQuestsDescription:
              "Approve an AI plan to move quests into active state.",
            noTargetSelectedTitle: "No target selected",
            noTargetSelectedDescription:
              "Select child profile to load assigned quests.",
            archivedSection: "Archived",
            archiveIsEmptyTitle: "Archive is empty",
            archiveIsEmptyDescription:
              "Complete steps and finish the quest in Details to move it here.",
            noArchivedQuestsTitle: "No archived quests",
            noArchivedQuestsDescription:
              "Create child profile and approve a plan first.",
            up: "Up",
            badgeUnlocked: "Badge unlocked",
            achievementUnlocked: "Achievement unlocked!",
            questDetails: "Quest Details",
            tapSectionToToggle:
              "Tap section title to expand or collapse details.",
            overview: "Overview",
            progressCounter: (completed: number, total: number) =>
              `Progress ${completed}/${total}`,
            originalTask: "Original task",
            generatedFromPlan: "Generated from approved AI plan",
            difficulty: "Difficulty",
            estimatedMinutes: "Estimated minutes",
            reward: "Reward",
            rewardXp: (xp: number) => `Reward XP: +${xp} XP`,
            rewardLabel: (label: string) => `🎁 Reward: ${label}`,
            rewardType: "Reward type",
            comment: "Comment",
            rewardLockedAfterCompletion:
              "Reward is locked after quest completion.",
            savingReward: "Saving reward...",
            saveReward: "Save reward",
            rewardLock: "Reward lock",
            locked: "Locked",
            editable: "Editable",
            beforeCompletion: "Before Completion",
            photoAdded: "Photo added",
            photoMissing: "Photo missing",
            beforePhotoNotAdded: "Before photo not added.",
            reportPhoto: "Report photo",
            required: "required",
            optional: "optional",
            childMustSubmitAfter:
              "After completion, child must submit a result photo.",
            loading: "Loading...",
            gallery: "Gallery",
            camera: "Camera",
            beforePhotoReplacementLocked:
              "Before photo replacement is locked after quest start.",
            removeBeforePhotoA11y: "Remove before photo",
            reportPhotoSection: "Report Photo",
            resultUploaded: "Result uploaded",
            resultPending: "Result pending",
            resultPhotoNotAdded: "Result photo not added yet.",
            addResultPhotoToComplete:
              "Add a result photo to complete this quest.",
            aiSummary: "AI Summary",
            steps: "Steps",
            completedCounter: (completed: number, total: number) =>
              `${completed}/${total} completed`,
            questActions: "Quest actions",
            archivedReadOnly: "Archived quests are read-only.",
            completingQuest: "Completing quest...",
            completeQuest: "Complete quest",
            close: "Close",
          },
    [isUk],
  );

  const role = useAuthStore((s) => s.role);
  const selectedChildId = useAuthStore((s) => s.selectedChildId);
  const setSelectedChildId = useAuthStore((s) => s.setSelectedChildId);
  const setRole = useAuthStore((s) => s.setRole);

  const effectiveRole: UserRole = role ?? "child";
  const isChildExecutionMode = effectiveRole === "child";

  const [children, setChildren] = React.useState<ChildProfile[]>([]);
  const [targetUserId, setTargetUserId] = React.useState<string | null>(null);
  const [targetLabel, setTargetLabel] = React.useState<string>(copy.myself);
  const [quests, setQuests] = React.useState<Quest[]>([]);
  const [progress, setProgress] = React.useState<ProgressSummary | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [validationMessage, setValidationMessage] = React.useState<
    string | null
  >(null);
  const [togglingStepId, setTogglingStepId] = React.useState<string | null>(
    null,
  );
  const [isCompletingQuest, setIsCompletingQuest] = React.useState(false);
  const [photoUpdateAction, setPhotoUpdateAction] = React.useState<
    | "before_camera"
    | "before_gallery"
    | "before_remove"
    | "after_camera"
    | "after_gallery"
    | "after_remove"
    | null
  >(null);
  const [detailsQuestId, setDetailsQuestId] = React.useState<string | null>(
    null,
  );
  const [completionFeedback, setCompletionFeedback] =
    React.useState<CompletionFeedback | null>(null);
  const [rewardDraft, setRewardDraft] = React.useState<QuestRewardDraft | null>(
    null,
  );
  const [isSavingReward, setIsSavingReward] = React.useState(false);
  const [rewardSystemNote, setRewardSystemNote] = React.useState<string | null>(
    null,
  );
  const [expandedDetailsSections, setExpandedDetailsSections] =
    React.useState<DetailsSectionsState>(() =>
      createDefaultDetailsSections(null),
    );
  const [
    isCompletionBadgeSpotlightVisible,
    setIsCompletionBadgeSpotlightVisible,
  ] = React.useState(false);
  const [achievementUnlockQueue, setAchievementUnlockQueue] = React.useState<
    UnlockedAchievement[]
  >([]);
  const [activeAchievementUnlock, setActiveAchievementUnlock] =
    React.useState<UnlockedAchievement | null>(null);
  const [showScrollTop, setShowScrollTop] = React.useState(false);
  const scrollRef = React.useRef<ScrollView | null>(null);
  const initializedRewardDraftQuestIdRef = React.useRef<string | null>(null);
  const lastRefreshAtRef = React.useRef(0);
  const completionShakeX = React.useRef(new Animated.Value(0)).current;
  const completionScale = React.useRef(new Animated.Value(1)).current;
  const completionSpotlightScale = React.useRef(
    new Animated.Value(0.45),
  ).current;
  const completionSpotlightOpacity = React.useRef(
    new Animated.Value(0),
  ).current;
  const achievementUnlockOpacity = React.useRef(new Animated.Value(0)).current;
  const achievementUnlockScale = React.useRef(new Animated.Value(0.92)).current;

  React.useEffect(() => {
    if (!role) {
      void setRole("child");
    }
  }, [role, setRole]);

  const refreshData = React.useCallback(
    async (showLoader = false, preferredChildId?: string | null) => {
      if (showLoader) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        setScreenError(null);

        if (effectiveRole === "adult") {
          const [meData, childrenData] = await Promise.all([
            userService.getMe(),
            childrenService.getChildren(),
          ]);
          setChildren(childrenData);

          const selectedChildCandidate = preferredChildId ?? selectedChildId;
          const isSelfTarget = selectedChildCandidate === meData.id;
          const isSelectedChildValid = selectedChildCandidate
            ? childrenData.some((child) => child.id === selectedChildCandidate)
            : false;
          const resolvedSelectedChildId = isSelectedChildValid
            ? selectedChildCandidate
            : isSelfTarget
              ? meData.id
              : null;

          if (selectedChildId && !isSelectedChildValid && !isSelfTarget) {
            void setSelectedChildId(null).catch(() => {});
          }

          if (!resolvedSelectedChildId) {
            const [selfQuests, selfProgress] = await Promise.all([
              questsService.getQuests(meData.id),
              progressService.getProgress(meData.id),
            ]);

            if (selfQuests.length > 0) {
              setTargetUserId(meData.id);
              setTargetLabel(meData.fullName);
              setQuests(selfQuests);
              setProgress(selfProgress);
              return selfProgress;
            }

            setTargetUserId(null);
            setTargetLabel(
              childrenData.length === 0 ? meData.fullName : copy.noActiveChild,
            );
            setQuests([]);
            setProgress(childrenData.length === 0 ? selfProgress : null);
            return null;
          }

          if (resolvedSelectedChildId === meData.id) {
            const [selfQuests, selfProgress] = await Promise.all([
              questsService.getQuests(meData.id),
              progressService.getProgress(meData.id),
            ]);

            setTargetUserId(meData.id);
            setTargetLabel(meData.fullName);
            setQuests(selfQuests);
            setProgress(selfProgress);
            return selfProgress;
          }

          const activeChild = childrenData.find(
            (child) => child.id === resolvedSelectedChildId,
          );
          if (!activeChild) {
            setTargetUserId(null);
            setTargetLabel(copy.noActiveChild);
            setQuests([]);
            setProgress(null);
            return null;
          }
          const [questsData, progressData] = await Promise.all([
            questsService.getQuests(activeChild.id),
            progressService.getProgress(activeChild.id),
          ]);

          setTargetUserId(activeChild.id);
          setTargetLabel(activeChild.fullName);
          setQuests(questsData);
          setProgress(progressData);

          return progressData;
        }

        const meData = await userService.getMe();
        const [questsData, progressData] = await Promise.all([
          questsService.getQuests(meData.id),
          progressService.getProgress(meData.id),
        ]);

        setChildren([]);
        setTargetUserId(meData.id);
        setTargetLabel(meData.fullName);
        setQuests(questsData);
        setProgress(progressData);
        return progressData;
      } catch {
        setScreenError(copy.failedToLoadAssignedQuests);
        return null;
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        lastRefreshAtRef.current = Date.now();
      }
    },
    [copy.failedToLoadAssignedQuests, copy.noActiveChild, effectiveRole, selectedChildId, setSelectedChildId],
  );

  React.useEffect(() => {
    void refreshData(true);
  }, [refreshData]);

  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      const isRefreshCooldownActive =
        now - lastRefreshAtRef.current < QUESTS_FOCUS_REFRESH_COOLDOWN_MS;

      if (!isLoading && !isRefreshCooldownActive) {
        void refreshData(false);
      }

      return undefined;
    }, [isLoading, refreshData]),
  );

  const activeQuests = React.useMemo(
    () => quests.filter((quest) => quest.status === "active"),
    [quests],
  );

  const archivedQuests = React.useMemo(
    () => quests.filter((quest) => isQuestArchived(quest)),
    [quests],
  );

  const completedToday = React.useMemo(() => {
    const today = getTodayIsoDate();
    return archivedQuests.filter(
      (quest) => getQuestCompletionDate(quest)?.slice(0, 10) === today,
    ).length;
  }, [archivedQuests]);

  const xpToday = React.useMemo(() => {
    const today = getTodayIsoDate();
    return archivedQuests
      .filter((quest) => getQuestCompletionDate(quest)?.slice(0, 10) === today)
      .reduce((sum, quest) => sum + quest.rewardXp, 0);
  }, [archivedQuests]);

  const detailsQuest = React.useMemo(
    () => quests.find((quest) => quest.id === detailsQuestId) ?? null,
    [detailsQuestId, quests],
  );
  const detailsQuestProgress = React.useMemo(
    () =>
      detailsQuest
        ? getQuestProgress(detailsQuest)
        : { stepsCount: 0, completedStepsCount: 0 },
    [detailsQuest],
  );
  const isDetailsQuestReadyToComplete = React.useMemo(
    () =>
      detailsQuestProgress.stepsCount > 0 &&
      detailsQuestProgress.completedStepsCount ===
        detailsQuestProgress.stepsCount,
    [detailsQuestProgress],
  );
  const isDetailsQuestReportRequired = React.useMemo(
    () => (detailsQuest ? isReportPhotoRequired(detailsQuest) : false),
    [detailsQuest],
  );
  const hasDetailsQuestBeforePhoto = React.useMemo(
    () => (detailsQuest ? hasQuestPhoto(detailsQuest.beforePhoto) : false),
    [detailsQuest],
  );
  const hasDetailsQuestAfterPhoto = React.useMemo(
    () => (detailsQuest ? hasQuestPhoto(detailsQuest.afterPhoto) : false),
    [detailsQuest],
  );
  const canCompleteDetailsQuest = React.useMemo(
    () =>
      detailsQuest
        ? isDetailsQuestReadyToComplete &&
          (!isDetailsQuestReportRequired || hasDetailsQuestAfterPhoto)
        : false,
    [
      detailsQuest,
      hasDetailsQuestAfterPhoto,
      isDetailsQuestReadyToComplete,
      isDetailsQuestReportRequired,
    ],
  );
  const canEditBeforePhoto = React.useMemo(
    () =>
      detailsQuest
        ? !isQuestArchived(detailsQuest) &&
          detailsQuestProgress.completedStepsCount === 0 &&
          !hasDetailsQuestAfterPhoto
        : false,
    [
      detailsQuest,
      detailsQuestProgress.completedStepsCount,
      hasDetailsQuestAfterPhoto,
    ],
  );
  const canEditAfterPhoto = React.useMemo(
    () => (detailsQuest ? !isQuestArchived(detailsQuest) : false),
    [detailsQuest],
  );
  const canAddBeforePhoto = React.useMemo(
    () =>
      detailsQuest
        ? !isQuestArchived(detailsQuest) &&
          (!hasDetailsQuestBeforePhoto || canEditBeforePhoto)
        : false,
    [canEditBeforePhoto, detailsQuest, hasDetailsQuestBeforePhoto],
  );

  React.useEffect(() => {
    if (detailsQuestId && !detailsQuest) {
      setDetailsQuestId(null);
      setExpandedDetailsSections(createDefaultDetailsSections(null));
    }
  }, [detailsQuest, detailsQuestId]);

  const handleOpenQuestDetails = React.useCallback((quest: Quest) => {
    setDetailsQuestId(quest.id);
    setExpandedDetailsSections(createDefaultDetailsSections(quest));
    setValidationMessage(null);
  }, []);

  const handleCloseQuestDetails = React.useCallback(() => {
    setDetailsQuestId(null);
    setExpandedDetailsSections(createDefaultDetailsSections(null));
    setValidationMessage(null);
  }, []);

  const handleToggleDetailsSection = React.useCallback(
    (section: DetailsSectionKey) => {
      setExpandedDetailsSections((current) => ({
        ...current,
        [section]: !current[section],
      }));
    },
    [],
  );

  React.useEffect(() => {
    if (!detailsQuest) {
      setRewardDraft(null);
      setRewardSystemNote(null);
      setValidationMessage(null);
      initializedRewardDraftQuestIdRef.current = null;
      return;
    }

    if (initializedRewardDraftQuestIdRef.current === detailsQuest.id) {
      return;
    }

    initializedRewardDraftQuestIdRef.current = detailsQuest.id;
    setRewardDraft(createQuestRewardDraftFromQuest(detailsQuest));
    setRewardSystemNote(null);
  }, [detailsQuest]);

  const handleToggleStep = async (questId: string, step: QuestStep) => {
    const questToUpdate = quests.find((quest) => quest.id === questId);
    if (!questToUpdate) {
      setScreenError(copy.selectedQuestNotFound);
      return;
    }

    if (isQuestArchived(questToUpdate)) {
      return;
    }

    Vibration.vibrate(STEP_TOGGLE_VIBRATION_PATTERN);
    setTogglingStepId(step.id);
    setScreenError(null);
    setValidationMessage(null);

    try {
      const updatedQuest = await questsService.toggleQuestStep(
        questId,
        step.id,
      );
      setQuests((current) =>
        current.map((quest) => (quest.id === questId ? updatedQuest : quest)),
      );
      if (updatedQuest.status === "active") {
        setRewardSystemNote(null);
      }
    } catch {
      setScreenError(copy.couldNotUpdateStep);
    } finally {
      setTogglingStepId(null);
    }
  };

  React.useEffect(() => {
    if (!completionFeedback) {
      setIsCompletionBadgeSpotlightVisible(false);
      return undefined;
    }

    completionShakeX.setValue(0);
    completionScale.setValue(1);
    setIsCompletionBadgeSpotlightVisible(true);
    completionSpotlightScale.setValue(0.45);
    completionSpotlightOpacity.setValue(0);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(completionSpotlightOpacity, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(880),
        Animated.timing(completionSpotlightOpacity, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(completionSpotlightScale, {
          toValue: 1.18,
          duration: 230,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(completionSpotlightScale, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(640),
        Animated.timing(completionSpotlightScale, {
          toValue: 0.9,
          duration: 200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.parallel([
      Animated.sequence([
        Animated.timing(completionShakeX, {
          toValue: 14,
          duration: 55,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(completionShakeX, {
          toValue: -12,
          duration: 55,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(completionShakeX, {
          toValue: 10,
          duration: 48,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(completionShakeX, {
          toValue: -8,
          duration: 44,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(completionShakeX, {
          toValue: 0,
          duration: 42,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(completionScale, {
          toValue: 1.04,
          duration: 140,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(completionScale, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const spotlightTimer = setTimeout(() => {
      setIsCompletionBadgeSpotlightVisible(false);
      completionSpotlightScale.setValue(1);
      completionSpotlightOpacity.setValue(0);
    }, 1260);

    const timer = setTimeout(() => {
      setCompletionFeedback(null);
    }, 4200);

    return () => {
      clearTimeout(spotlightTimer);
      clearTimeout(timer);
    };
  }, [
    completionFeedback,
    completionScale,
    completionShakeX,
    completionSpotlightOpacity,
    completionSpotlightScale,
  ]);

  React.useEffect(() => {
    const isCompletionBadgeFlowActive =
      Boolean(completionFeedback) || isCompletionBadgeSpotlightVisible;

    if (
      activeAchievementUnlock ||
      achievementUnlockQueue.length === 0 ||
      isCompletionBadgeFlowActive
    ) {
      return;
    }

    const [nextAchievement, ...restQueue] = achievementUnlockQueue;
    setAchievementUnlockQueue(restQueue);
    setActiveAchievementUnlock(nextAchievement);
  }, [
    achievementUnlockQueue,
    activeAchievementUnlock,
    completionFeedback,
    isCompletionBadgeSpotlightVisible,
  ]);

  React.useEffect(() => {
    if (!activeAchievementUnlock) {
      return undefined;
    }

    Vibration.vibrate(ACHIEVEMENT_UNLOCK_VIBRATION_PATTERN);
    achievementUnlockOpacity.setValue(0);
    achievementUnlockScale.setValue(0.9);

    Animated.parallel([
      Animated.timing(achievementUnlockOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(achievementUnlockScale, {
          toValue: 1.05,
          duration: 210,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(achievementUnlockScale, {
          toValue: 1,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const timer = setTimeout(() => {
      setActiveAchievementUnlock(null);
      achievementUnlockOpacity.setValue(0);
      achievementUnlockScale.setValue(0.92);
    }, ACHIEVEMENT_UNLOCK_DURATION_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [
    achievementUnlockOpacity,
    achievementUnlockScale,
    activeAchievementUnlock,
  ]);

  const handleSelectChild = async (childId: string) => {
    setScreenError(null);
    try {
      await Promise.allSettled([
        setSelectedChildId(childId),
        refreshData(false, childId),
      ]);
    } catch {
      setScreenError(copy.couldNotSwitchChildProfile);
    }
  };

  const handleSaveReward = async () => {
    if (!detailsQuest || !rewardDraft || effectiveRole !== "adult") {
      return;
    }

    if (isQuestArchived(detailsQuest)) {
      setScreenError(copy.rewardLockedForCompleted);
      return;
    }

    setIsSavingReward(true);
    setScreenError(null);
    try {
      const updatedQuest = await questsService.updateQuestReward(
        detailsQuest.id,
        buildQuestRewardFieldsFromDraft(rewardDraft),
      );
      setQuests((current) =>
        current.map((quest) =>
          quest.id === updatedQuest.id ? updatedQuest : quest,
        ),
      );
      setRewardDraft(createQuestRewardDraftFromQuest(updatedQuest));
      const progress = getQuestProgress(updatedQuest);
      setRewardSystemNote(
        progress.completedStepsCount > 0
          ? copy.parentsUpdatedReward
          : copy.rewardUpdated,
      );
    } catch {
      setScreenError(copy.couldNotUpdateReward);
    } finally {
      setIsSavingReward(false);
    }
  };

  const resolveActionErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return fallback;
  };

  const pickQuestPhoto = async (
    source: "camera" | "gallery",
  ): Promise<CapturedPhoto | null> => {
    if (source === "camera") {
      const permission = await cameraService.requestCameraPermission();
      if (permission !== "granted") {
        throw new Error(copy.cameraPermissionRequired);
      }

      const photo = await cameraService.openCamera();
      if (!photo) {
        return null;
      }

      return cameraService.preparePhoto(photo);
    }

    const permission = await cameraService.requestGalleryPermission();
    if (permission !== "granted") {
      throw new Error(copy.galleryPermissionRequired);
    }

    const photo = await cameraService.openGallery();
    if (!photo) {
      return null;
    }

    return cameraService.preparePhoto(photo);
  };

  const handleUpdateBeforePhoto = async (
    action: "camera" | "gallery" | "remove",
  ) => {
    if (!detailsQuest) {
      return;
    }

    setScreenError(null);
    setValidationMessage(null);
    setPhotoUpdateAction(
      action === "camera"
        ? "before_camera"
        : action === "gallery"
          ? "before_gallery"
          : "before_remove",
    );
    try {
      const photo = action === "remove" ? null : await pickQuestPhoto(action);
      if (action !== "remove" && !photo) {
        return;
      }

      const updatedQuest = await questsService.updateQuestBeforePhoto(
        detailsQuest.id,
        photo,
      );
      setQuests((current) =>
        current.map((quest) =>
          quest.id === updatedQuest.id ? updatedQuest : quest,
        ),
      );
      setRewardSystemNote(
        updatedQuest.beforePhoto
          ? copy.beforePhotoAdded
          : copy.beforePhotoRemoved,
      );
    } catch (error) {
      setScreenError(
        resolveActionErrorMessage(error, copy.couldNotUpdateBeforePhoto),
      );
    } finally {
      setPhotoUpdateAction(null);
    }
  };

  const handleUpdateAfterPhoto = async (
    action: "camera" | "gallery" | "remove",
  ) => {
    if (!detailsQuest) {
      return;
    }

    setScreenError(null);
    setValidationMessage(null);
    setPhotoUpdateAction(
      action === "camera"
        ? "after_camera"
        : action === "gallery"
          ? "after_gallery"
          : "after_remove",
    );
    try {
      const photo = action === "remove" ? null : await pickQuestPhoto(action);
      if (action !== "remove" && !photo) {
        return;
      }

      const updatedQuest = await questsService.updateQuestAfterPhoto(
        detailsQuest.id,
        photo,
      );
      setQuests((current) =>
        current.map((quest) =>
          quest.id === updatedQuest.id ? updatedQuest : quest,
        ),
      );
      setRewardSystemNote(
        updatedQuest.afterPhoto
          ? copy.reportPhotoAdded
          : copy.reportPhotoRemoved,
      );
    } catch (error) {
      setScreenError(
        resolveActionErrorMessage(error, copy.couldNotUpdateReportPhoto),
      );
    } finally {
      setPhotoUpdateAction(null);
    }
  };

  const handleCompleteQuest = async () => {
    if (!detailsQuest || isQuestArchived(detailsQuest)) {
      return;
    }

    setScreenError(null);
    setValidationMessage(null);

    if (!isDetailsQuestReadyToComplete) {
      setValidationMessage(copy.completeAllSteps);
      return;
    }

    if (isDetailsQuestReportRequired && !hasDetailsQuestAfterPhoto) {
      setValidationMessage(copy.addReportPhotoToComplete);
      return;
    }

    setIsCompletingQuest(true);
    try {
      const updatedQuest = await questsService.completeQuest(detailsQuest.id);
      setQuests((current) =>
        current.map((quest) =>
          quest.id === detailsQuest.id ? updatedQuest : quest,
        ),
      );
      const refreshedProgress = await refreshData(false);
      const progressForAchievements = refreshedProgress ?? progress;

      let earnedBadgeImageKey = pickRandomBadgeImageKey();
      try {
        const earnedBadge = await earnedBadgesStorage.registerEarnedBadge({
          userId: updatedQuest.assignedToUserId,
          questId: updatedQuest.id,
          difficulty: updatedQuest.difficulty,
        });
        earnedBadgeImageKey = earnedBadge.imageKey;
      } catch {}

      if (progressForAchievements) {
        try {
          const unlockedAchievements =
            await achievementsService.unlockFromQuestCompletion({
              userId: updatedQuest.assignedToUserId,
              role: effectiveRole,
              quest: updatedQuest,
              progress: progressForAchievements,
            });
          if (unlockedAchievements.length > 0) {
            setAchievementUnlockQueue((current) =>
              mergeUniqueAchievements(current, unlockedAchievements),
            );
          }
        } catch {}
      }

      if (refreshedProgress) {
        Vibration.vibrate(QUEST_VICTORY_VIBRATION_PATTERN);
        setCompletionFeedback({
          questTitle: updatedQuest.title,
          difficulty: updatedQuest.difficulty,
          badgeImageKey: earnedBadgeImageKey,
          rewardXp: updatedQuest.rewardXp,
          rewardLabel: getQuestRewardLabel(updatedQuest),
          totalXp: refreshedProgress.xp,
          streak: refreshedProgress.streak,
        });
      }
    } catch (error) {
      const errorMessage = resolveActionErrorMessage(
        error,
        copy.couldNotCompleteQuest,
      );
      const normalizedErrorMessage = errorMessage.toLowerCase();
      if (
        normalizedErrorMessage.includes("report photo") ||
        normalizedErrorMessage.includes("звітне фото")
      ) {
        setValidationMessage(copy.addReportPhotoToComplete);
        return;
      }

      setScreenError(errorMessage);
    } finally {
      setIsCompletingQuest(false);
    }
  };

  const renderDetailsSection = (
    section: DetailsSectionKey,
    title: string,
    subtitle: string | null,
    children: React.ReactNode,
    headerAction?: React.ReactNode,
  ) => {
    const isExpanded = expandedDetailsSections[section];

    return (
      <View
        style={[
          styles.detailsSectionCard,
          {
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={styles.detailsSectionHeaderRow}>
          <Pressable
            style={[
              styles.detailsSectionToggle,
              styles.detailsSectionToggleMain,
            ]}
            android_ripple={{ color: "rgba(0, 0, 0, 0.1)" }}
            onPress={() => {
              handleToggleDetailsSection(section);
            }}
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpanded }}
          >
            <View style={styles.detailsSectionHeadingWrap}>
              <Text
                style={[styles.detailsSectionTitle, { color: colors.text }]}
                allowFontScaling
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={[
                    styles.detailsSectionHint,
                    { color: colors.textSecondary },
                  ]}
                  allowFontScaling
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <View style={styles.detailsSectionStateWrap}>
              <Text
                style={[
                  styles.detailsSectionStateText,
                  { color: colors.textSecondary },
                ]}
                allowFontScaling
              >
                {isExpanded ? copy.hide : copy.show}
              </Text>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={isTablet ? 18 : 16}
                color={colors.textSecondary}
              />
            </View>
          </Pressable>
          {headerAction ? (
            <View style={styles.detailsSectionHeaderActionWrap}>
              {headerAction}
            </View>
          ) : null}
        </View>
        {isExpanded ? (
          <View style={styles.detailsSectionContent}>{children}</View>
        ) : null}
      </View>
    );
  };

  return (
      <ScreenContainer contentStyle={styles.container}>
      {isLoading ? (
        <LoadingState label={copy.loadingAssignedQuests} />
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={(event) => {
            const y = event.nativeEvent.contentOffset.y;
            if (y > 260 && !showScrollTop) {
              setShowScrollTop(true);
            } else if (y <= 260 && showScrollTop) {
              setShowScrollTop(false);
            }
          }}
          scrollEventThrottle={16}
        >
          <SectionHeader
            title={copy.questsTitle}
            subtitle={
              isChildExecutionMode
                ? copy.questsSubtitleChild
                : copy.questsSubtitleAdult
            }
          />

          {effectiveRole === "adult" ? (
            <StatCard
              title={copy.targetChildTitle}
              subtitle={copy.targetChildSubtitle}
            >
              {children.length > 0 ? (
                <View style={styles.childList}>
                  {!targetUserId ? (
                    <View style={styles.noChildSelectedWrap}>
                      <EmptyState
                        title={copy.noActiveChildSelectedTitle}
                        description={copy.noActiveChildSelectedDescription}
                      />
                      <PrimaryButton
                        label={copy.selectFirstChild}
                        variant="secondary"
                        onPress={() => {
                          const firstChild = children[0];
                          if (firstChild) {
                            void handleSelectChild(firstChild.id);
                          }
                        }}
                      />
                    </View>
                  ) : null}
                  {children.map((child) => {
                    const isSelected = child.id === targetUserId;
                    return (
                      <Pressable
                        key={child.id}
                        onPress={() => {
                          void handleSelectChild(child.id);
                        }}
                        style={[
                          styles.childRow,
                          {
                            borderColor: isSelected ? "#ff2d55" : colors.border,
                            backgroundColor: isSelected
                              ? "#ff2d55"
                              : colors.background,
                          },
                        ]}
                        android_ripple={{ color: "rgba(0, 0, 0, 0.1)" }}
                      >
                        <Text
                          style={[
                            styles.childName,
                            { color: isSelected ? "#ffffff" : colors.text },
                          ]}
                          allowFontScaling
                        >
                          {child.fullName}
                        </Text>
                        <Text
                          style={[
                            styles.childMeta,
                            {
                              color: isSelected
                                ? "#ffe7ee"
                                : colors.textSecondary,
                            },
                          ]}
                          allowFontScaling
                        >
                          {copy.childMeta(child.age, child.level)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <EmptyState
                  title={copy.noChildProfilesTitle}
                  description={copy.noChildProfilesDescription}
                />
              )}
            </StatCard>
          ) : null}

          <StatCard
            title={copy.questProgressTitle}
            subtitle={
              isChildExecutionMode
                ? copy.executionMetrics
                : copy.target(targetLabel)
            }
          >
            <Text
              style={[styles.progressText, { color: colors.text }]}
              allowFontScaling
            >
              {copy.activeQuests(activeQuests.length)}
            </Text>
            <Text
              style={[styles.progressText, { color: colors.text }]}
              allowFontScaling
            >
              {copy.completedToday(completedToday)}
            </Text>
            <Text
              style={[styles.progressText, { color: colors.text }]}
              allowFontScaling
            >
              {copy.xpToday(xpToday)}
            </Text>
            <Text
              style={[styles.progressText, { color: colors.text }]}
              allowFontScaling
            >
              {copy.totalXp(progress?.xp ?? 0)}
            </Text>
            <Text
              style={[styles.progressText, { color: colors.text }]}
              allowFontScaling
            >
              {copy.streak(progress?.streak ?? 0)}
            </Text>
          </StatCard>

          {completionFeedback ? (
            <Animated.View
              style={[
                styles.completionAnimatedWrap,
                {
                  transform: [
                    { translateX: completionShakeX },
                    { scale: completionScale },
                  ],
                },
              ]}
            >
              <StatCard
                title={copy.questCompleted}
                subtitle={completionFeedback.questTitle}
              >
                <View style={styles.completionCheckWrap}>
                  <Text
                    style={styles.completionCheckLabel}
                    allowFontScaling={false}
                  >
                    ✓
                  </Text>
                </View>
                <Text
                  style={[styles.successXp, { color: "#1f9b54" }]}
                  allowFontScaling
                >
                  +{completionFeedback.rewardXp} XP
                </Text>
                <Text
                  style={[styles.progressText, { color: colors.text }]}
                  allowFontScaling
                >
                  {isChildExecutionMode
                    ? copy.rewardPendingParent(completionFeedback.rewardLabel)
                    : copy.rewardUnlocked(completionFeedback.rewardLabel)}
                </Text>
                <Text
                  style={[styles.progressText, { color: colors.text }]}
                  allowFontScaling
                >
                  {copy.questFinalized}
                </Text>
                <Text
                  style={[styles.progressText, { color: colors.text }]}
                  allowFontScaling
                >
                  {copy.questMovedToArchive}
                </Text>
                <Text
                  style={[styles.progressText, { color: colors.textSecondary }]}
                  allowFontScaling
                >
                  {copy.totalXpAndStreak(
                    completionFeedback.totalXp,
                    completionFeedback.streak,
                  )}
                </Text>
              </StatCard>
            </Animated.View>
          ) : null}

          <PrimaryButton
            label={isRefreshing ? copy.refreshing : copy.refreshQuests}
            disabled={isRefreshing}
            onPress={() => {
              void refreshData(false);
            }}
          />

          {screenError ? (
            <EmptyState title={copy.questFlowError} description={screenError} />
          ) : null}

          <View style={styles.sectionBlock}>
            <SectionHeader title={copy.activeQuestsSection} />
            {targetUserId ? (
              activeQuests.length > 0 ? (
                activeQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    onViewDetails={() => handleOpenQuestDetails(quest)}
                  />
                ))
              ) : (
                <EmptyState
                  title={copy.noActiveQuestsTitle}
                  description={copy.noActiveQuestsDescription}
                />
              )
            ) : (
              <EmptyState
                title={copy.noTargetSelectedTitle}
                description={copy.noTargetSelectedDescription}
              />
            )}
          </View>

          <View style={styles.sectionBlock}>
            <SectionHeader title={copy.archivedSection} />
            {targetUserId ? (
              archivedQuests.length > 0 ? (
                archivedQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    onViewDetails={() => handleOpenQuestDetails(quest)}
                  />
                ))
              ) : (
                <EmptyState
                  title={copy.archiveIsEmptyTitle}
                  description={copy.archiveIsEmptyDescription}
                />
              )
            ) : (
              <EmptyState
                title={copy.noArchivedQuestsTitle}
                description={copy.noArchivedQuestsDescription}
              />
            )}
          </View>
        </ScrollView>
      )}

      {showScrollTop && !isLoading ? (
        <Pressable
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          style={styles.scrollTopButton}
          android_ripple={{ color: "rgba(255, 255, 255, 0.16)" }}
        >
          <Text style={styles.scrollTopLabel} allowFontScaling>
            {copy.up}
          </Text>
        </Pressable>
      ) : null}

      {completionFeedback && isCompletionBadgeSpotlightVisible ? (
        <Modal visible transparent animationType="fade">
          <View style={styles.completionSpotlightBackdrop} pointerEvents="none">
            <Animated.View
              style={[
                styles.completionSpotlightCard,
                {
                  opacity: completionSpotlightOpacity,
                  transform: [{ scale: completionSpotlightScale }],
                },
              ]}
            >
              <CompletionBadge
                difficulty={completionFeedback.difficulty}
                imageKey={completionFeedback.badgeImageKey}
                imageSize={isTablet ? 150 : 136}
                showLabel={false}
                style={styles.completionSpotlightBadge}
              />
              <Text style={styles.completionSpotlightLabel} allowFontScaling>
                {copy.badgeUnlocked}
              </Text>
            </Animated.View>
          </View>
        </Modal>
      ) : null}

      {activeAchievementUnlock ? (
        <Modal visible transparent animationType="fade">
          <View style={styles.achievementUnlockBackdrop} pointerEvents="none">
            <Animated.View
              style={[
                styles.achievementUnlockCard,
                {
                  opacity: achievementUnlockOpacity,
                  transform: [{ scale: achievementUnlockScale }],
                },
              ]}
            >
              <Text style={styles.achievementUnlockCaption} allowFontScaling>
                {copy.achievementUnlocked}
              </Text>
              <View style={styles.achievementUnlockIconWrap}>
                <Ionicons
                  name={
                    activeAchievementUnlock.icon as keyof typeof Ionicons.glyphMap
                  }
                  size={isTablet ? 34 : 30}
                  color="#ff2d55"
                />
              </View>
              <Text style={styles.achievementUnlockTitle} allowFontScaling>
                {activeAchievementUnlock.title}
              </Text>
              <Text
                style={styles.achievementUnlockDescription}
                allowFontScaling
              >
                {activeAchievementUnlock.description}
              </Text>
            </Animated.View>
          </View>
        </Modal>
      ) : null}

      <Modal
        visible={Boolean(detailsQuestId)}
        transparent
        animationType="fade"
        onRequestClose={handleCloseQuestDetails}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={handleCloseQuestDetails}
        >
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
            }}
          >
            <Animated.View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  transform: [
                    { translateX: completionShakeX },
                    { scale: completionScale },
                  ],
                },
              ]}
            >
              {detailsQuest ? (
                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <SectionHeader
                    title={copy.questDetails}
                    subtitle={detailsQuest.title}
                  />
                  <Text
                    style={[
                      styles.detailsHintText,
                      { color: colors.textSecondary },
                    ]}
                    allowFontScaling
                  >
                    {copy.tapSectionToToggle}
                  </Text>

                  {renderDetailsSection(
                    "overview",
                    copy.overview,
                    copy.progressCounter(
                      detailsQuestProgress.completedStepsCount,
                      detailsQuestProgress.stepsCount,
                    ),
                    <>
                      <View style={styles.detailsTitleRow}>
                        <Text
                          style={[
                            styles.detailsTitleText,
                            { color: colors.text },
                          ]}
                          allowFontScaling
                        >
                          {detailsQuest.title}
                        </Text>
                        <View
                          style={[
                            styles.detailsDoneCheckWrap,
                            !isQuestDone(detailsQuest)
                              ? styles.detailsActiveCheckWrap
                              : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.detailsDoneCheckLabel,
                              !isQuestDone(detailsQuest)
                                ? styles.detailsActiveCheckLabel
                                : null,
                            ]}
                            allowFontScaling={false}
                          >
                            {isQuestDone(detailsQuest) ? "✓" : "•"}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.previewLabel,
                          { color: colors.textSecondary },
                        ]}
                        allowFontScaling
                      >
                        {copy.originalTask}:{" "}
                        {detailsQuest.originalTask ??
                          copy.generatedFromPlan}
                      </Text>
                      <Text
                        style={[styles.previewText, { color: colors.text }]}
                        allowFontScaling
                      >
                        {detailsQuest.description}
                      </Text>
                      <Text
                        style={[
                          styles.previewLabel,
                          { color: colors.textSecondary },
                        ]}
                        allowFontScaling
                      >
                        {copy.difficulty}: {detailsQuest.difficulty}
                      </Text>
                      <Text
                        style={[
                          styles.previewLabel,
                          { color: colors.textSecondary },
                        ]}
                        allowFontScaling
                      >
                        {copy.estimatedMinutes}: {detailsQuest.estimatedMinutes}
                      </Text>
                    </>,
                  )}

                  {renderDetailsSection(
                    "reward",
                    copy.reward,
                    getQuestRewardLabel(detailsQuest),
                    <>
                      <Text
                        style={[
                          styles.previewLabel,
                          { color: colors.textSecondary },
                        ]}
                        allowFontScaling
                      >
                        {copy.rewardXp(detailsQuest.rewardXp)}
                      </Text>
                      <Text
                        style={[styles.previewLabel, { color: colors.text }]}
                        allowFontScaling
                      >
                        {copy.rewardLabel(getQuestRewardLabel(detailsQuest))}
                      </Text>
                      <Text
                        style={[
                          styles.previewLabel,
                          { color: colors.textSecondary },
                        ]}
                        allowFontScaling
                      >
                        {copy.rewardType}:{" "}
                        {getQuestRewardTypeLabel(detailsQuest.rewardType)}
                      </Text>
                      {detailsQuest.rewardDescription ? (
                        <Text
                          style={[
                            styles.previewLabel,
                            { color: colors.textSecondary },
                          ]}
                          allowFontScaling
                        >
                          {copy.comment}: {detailsQuest.rewardDescription}
                        </Text>
                      ) : null}
                      {detailsQuest.rewardUpdatedAt &&
                      detailsQuestProgress.completedStepsCount > 0 ? (
                        <Text
                          style={[
                            styles.systemNoteText,
                            { color: colors.text },
                          ]}
                          allowFontScaling
                        >
                          {copy.parentsUpdatedReward}
                        </Text>
                      ) : null}
                      {rewardSystemNote ? (
                        <Text
                          style={[
                            styles.systemNoteText,
                            { color: colors.text },
                          ]}
                          allowFontScaling
                        >
                          {rewardSystemNote}
                        </Text>
                      ) : null}
                      {effectiveRole === "adult" && rewardDraft ? (
                        <>
                          <QuestRewardEditor
                            draft={rewardDraft}
                            previewText={buildQuestRewardPreviewFromDraft(
                              rewardDraft,
                            )}
                            onChangeType={(type) => {
                              setRewardDraft({
                                type,
                                valueInput: "",
                                noteInput: rewardDraft.noteInput,
                              });
                            }}
                            onChangeValue={(value) => {
                              setRewardDraft({
                                ...rewardDraft,
                                valueInput: value,
                              });
                            }}
                            onChangeNote={(value) => {
                              setRewardDraft({
                                ...rewardDraft,
                                noteInput: value,
                              });
                            }}
                            disabled={
                              isQuestArchived(detailsQuest) || isSavingReward
                            }
                          />
                          {isQuestArchived(detailsQuest) ? (
                            <Text
                              style={[
                                styles.previewLabel,
                                { color: colors.textSecondary },
                              ]}
                              allowFontScaling
                            >
                              {copy.rewardLockedAfterCompletion}
                            </Text>
                          ) : (
                            <PrimaryButton
                              label={
                                isSavingReward
                                  ? copy.savingReward
                                  : copy.saveReward
                              }
                              onPress={() => {
                                void handleSaveReward();
                              }}
                              disabled={isSavingReward}
                            />
                          )}
                        </>
                      ) : null}
                      <Text
                        style={[
                          styles.previewLabel,
                          { color: colors.textSecondary },
                        ]}
                        allowFontScaling
                      >
                        {copy.rewardLock}:{" "}
                        {isQuestArchived(detailsQuest) ? copy.locked : copy.editable}
                      </Text>
                    </>,
                  )}

                  {renderDetailsSection(
                    "beforePhoto",
                    copy.beforeCompletion,
                    hasDetailsQuestBeforePhoto
                      ? copy.photoAdded
                      : copy.photoMissing,
                    <>
                      {hasDetailsQuestBeforePhoto ? (
                        <Image
                          source={{ uri: detailsQuest.beforePhoto!.uri }}
                          style={styles.photoPreview}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text
                          style={[
                            styles.previewLabel,
                            { color: colors.textSecondary },
                          ]}
                          allowFontScaling
                        >
                          {copy.beforePhotoNotAdded}
                        </Text>
                      )}
                      <Text
                        style={[styles.previewLabel, { color: colors.text }]}
                        allowFontScaling
                      >
                        {copy.reportPhoto}:{" "}
                        {isDetailsQuestReportRequired ? copy.required : copy.optional}
                      </Text>
                      {isDetailsQuestReportRequired ? (
                        <Text
                          style={[
                            styles.previewLabel,
                            { color: colors.textSecondary },
                          ]}
                          allowFontScaling
                        >
                          {copy.childMustSubmitAfter}
                        </Text>
                      ) : null}
                      {canAddBeforePhoto ? (
                        <View style={styles.inlineActionRow}>
                          <Pressable
                            onPress={() => {
                              void handleUpdateBeforePhoto("gallery");
                            }}
                            style={[
                              styles.inlineActionButton,
                              {
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                              },
                              photoUpdateAction !== null
                                ? styles.inlineActionButtonDisabled
                                : null,
                            ]}
                            android_ripple={{ color: "rgba(0, 0, 0, 0.1)" }}
                            disabled={photoUpdateAction !== null}
                          >
                            <Text
                              style={[
                                styles.inlineActionLabel,
                                { color: colors.text },
                              ]}
                              allowFontScaling
                            >
                              {photoUpdateAction === "before_gallery"
                                ? copy.loading
                                : copy.gallery}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              void handleUpdateBeforePhoto("camera");
                            }}
                            style={[
                              styles.inlineActionButton,
                              {
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                              },
                              photoUpdateAction !== null
                                ? styles.inlineActionButtonDisabled
                                : null,
                            ]}
                            android_ripple={{ color: "rgba(0, 0, 0, 0.1)" }}
                            disabled={photoUpdateAction !== null}
                          >
                            <Text
                              style={[
                                styles.inlineActionLabel,
                                { color: colors.text },
                              ]}
                              allowFontScaling
                            >
                              {photoUpdateAction === "before_camera"
                                ? copy.loading
                                : copy.camera}
                            </Text>
                          </Pressable>
                        </View>
                      ) : null}
                      {!canEditBeforePhoto &&
                      hasDetailsQuestBeforePhoto &&
                      !isQuestArchived(detailsQuest) ? (
                        <Text
                          style={[
                            styles.previewLabel,
                            { color: colors.textSecondary },
                          ]}
                          allowFontScaling
                        >
                          {copy.beforePhotoReplacementLocked}
                        </Text>
                      ) : null}
                    </>,
                    hasDetailsQuestBeforePhoto &&
                      !isQuestArchived(detailsQuest) ? (
                      <Pressable
                        onPress={() => {
                          void handleUpdateBeforePhoto("remove");
                        }}
                        style={[
                          styles.detailsSectionIconButton,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                          },
                          photoUpdateAction !== null
                            ? styles.inlineActionButtonDisabled
                            : null,
                        ]}
                        android_ripple={{ color: "rgba(0, 0, 0, 0.1)" }}
                        disabled={photoUpdateAction !== null}
                        accessibilityRole="button"
                        accessibilityLabel={copy.removeBeforePhotoA11y}
                      >
                        <Ionicons
                          name={
                            photoUpdateAction === "before_remove"
                              ? "hourglass-outline"
                              : "trash-outline"
                          }
                          size={isTablet ? 18 : 16}
                          color={
                            photoUpdateAction === "before_remove"
                              ? colors.textSecondary
                              : "#c62828"
                          }
                        />
                      </Pressable>
                    ) : null,
                  )}

                  {isDetailsQuestReportRequired
                    ? renderDetailsSection(
                        "afterPhoto",
                        copy.reportPhotoSection,
                        hasQuestPhoto(detailsQuest.afterPhoto)
                          ? copy.resultUploaded
                          : copy.resultPending,
                        <>
                          {hasQuestPhoto(detailsQuest.afterPhoto) ? (
                            <Image
                              source={{ uri: detailsQuest.afterPhoto!.uri }}
                              style={styles.photoPreview}
                              resizeMode="cover"
                            />
                          ) : (
                            <Text
                              style={[
                                styles.previewLabel,
                                { color: colors.textSecondary },
                              ]}
                              allowFontScaling
                            >
                              {copy.resultPhotoNotAdded}
                            </Text>
                          )}
                          {!isQuestArchived(detailsQuest) &&
                          isDetailsQuestReadyToComplete &&
                          isDetailsQuestReportRequired &&
                          !hasDetailsQuestAfterPhoto ? (
                            <Text
                              style={[
                                styles.systemNoteText,
                                { color: colors.text },
                              ]}
                              allowFontScaling
                            >
                              {copy.addResultPhotoToComplete}
                            </Text>
                          ) : null}
                          {canEditAfterPhoto ? (
                            <View style={styles.inlineActionRow}>
                              <Pressable
                                onPress={() => {
                                  void handleUpdateAfterPhoto("gallery");
                                }}
                                style={[
                                  styles.inlineActionButton,
                                  {
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                  },
                                  photoUpdateAction !== null
                                    ? styles.inlineActionButtonDisabled
                                    : null,
                                ]}
                                android_ripple={{ color: "rgba(0, 0, 0, 0.1)" }}
                                disabled={photoUpdateAction !== null}
                              >
                                <Text
                                  style={[
                                    styles.inlineActionLabel,
                                    { color: colors.text },
                                  ]}
                                  allowFontScaling
                                >
                                  {photoUpdateAction === "after_gallery"
                                    ? copy.loading
                                    : copy.gallery}
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() => {
                                  void handleUpdateAfterPhoto("camera");
                                }}
                                style={[
                                  styles.inlineActionButton,
                                  {
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                  },
                                  photoUpdateAction !== null
                                    ? styles.inlineActionButtonDisabled
                                    : null,
                                ]}
                                android_ripple={{ color: "rgba(0, 0, 0, 0.1)" }}
                                disabled={photoUpdateAction !== null}
                              >
                                <Text
                                  style={[
                                    styles.inlineActionLabel,
                                    { color: colors.text },
                                  ]}
                                  allowFontScaling
                                >
                                  {photoUpdateAction === "after_camera"
                                    ? copy.loading
                                    : copy.camera}
                                </Text>
                              </Pressable>
                            </View>
                          ) : null}
                        </>,
                      )
                    : null}

                  {detailsQuest.visionSummary
                    ? renderDetailsSection(
                        "aiSummary",
                        copy.aiSummary,
                        null,
                        <View style={styles.visionSummaryWrap}>
                          <Text
                            style={[
                              styles.previewLabel,
                              { color: colors.textSecondary },
                            ]}
                            allowFontScaling
                          >
                            {detailsQuest.visionSummary}
                          </Text>
                        </View>,
                      )
                    : null}

                  {renderDetailsSection(
                    "steps",
                    copy.steps,
                    copy.completedCounter(
                      detailsQuestProgress.completedStepsCount,
                      detailsQuestProgress.stepsCount,
                    ),
                    <ScrollView
                      style={styles.stepsScroll}
                      contentContainerStyle={styles.stepsList}
                      showsVerticalScrollIndicator
                      nestedScrollEnabled
                    >
                      {[...(detailsQuest.steps ?? [])]
                        .sort((left, right) => left.order - right.order)
                        .map((step) => {
                          const isCompleted = step.status === "completed";
                          const isStepReadOnly = isQuestArchived(detailsQuest);
                          const isStepUpdating = togglingStepId === step.id;

                          return (
                            <Pressable
                              key={step.id}
                              style={[
                                styles.stepRow,
                                {
                                  borderColor: isCompleted
                                    ? "#1f9b54"
                                    : colors.border,
                                  backgroundColor: isCompleted
                                    ? "#e3f7ea"
                                    : colors.background,
                                },
                                isStepReadOnly || isStepUpdating
                                  ? styles.stepRowDisabled
                                  : null,
                              ]}
                              android_ripple={{ color: "rgba(0, 0, 0, 0.1)" }}
                              onPress={() => {
                                void handleToggleStep(detailsQuest.id, step);
                              }}
                              disabled={isStepReadOnly || isStepUpdating}
                              accessibilityRole="checkbox"
                              accessibilityState={{
                                checked: isCompleted,
                                disabled: isStepReadOnly || isStepUpdating,
                              }}
                            >
                              <View style={styles.stepTitleRow}>
                                <View
                                  style={[
                                    styles.stepCheckbox,
                                    {
                                      borderColor: isCompleted
                                        ? "#1f9b54"
                                        : colors.border,
                                      backgroundColor: isCompleted
                                        ? "#1f9b54"
                                        : "transparent",
                                    },
                                  ]}
                                >
                                  {isCompleted ? (
                                    <Text
                                      style={styles.stepCheckmark}
                                      allowFontScaling={false}
                                    >
                                      ✓
                                    </Text>
                                  ) : null}
                                </View>
                                <Text
                                  style={[
                                    styles.stepTitle,
                                    { color: colors.text },
                                  ]}
                                  allowFontScaling
                                >
                                  {step.title}
                                </Text>
                              </View>
                              {step.description ? (
                                <Text
                                  style={[
                                    styles.stepDescription,
                                    { color: colors.textSecondary },
                                  ]}
                                  allowFontScaling
                                >
                                  {step.description}
                                </Text>
                              ) : null}
                            </Pressable>
                          );
                        })}
                    </ScrollView>,
                  )}

                  <View
                    style={[
                      styles.detailsActionCard,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.detailsActionTitle,
                        { color: colors.text },
                      ]}
                      allowFontScaling
                    >
                      {copy.questActions}
                    </Text>
                    {isQuestArchived(detailsQuest) ? (
                      <Text
                        style={[
                          styles.previewLabel,
                          { color: colors.textSecondary },
                        ]}
                        allowFontScaling
                      >
                        {copy.archivedReadOnly}
                      </Text>
                    ) : (
                      <>
                        {validationMessage ? (
                          <Text style={styles.validationText} allowFontScaling>
                            {validationMessage}
                          </Text>
                        ) : null}
                        {!canCompleteDetailsQuest &&
                        isDetailsQuestReadyToComplete &&
                        isDetailsQuestReportRequired &&
                        !hasDetailsQuestAfterPhoto ? (
                          <Text style={styles.validationText} allowFontScaling>
                            {copy.addReportPhotoToComplete}
                          </Text>
                        ) : null}
                        <PrimaryButton
                          label={
                            isCompletingQuest
                              ? copy.completingQuest
                              : copy.completeQuest
                          }
                          onPress={() => {
                            void handleCompleteQuest();
                          }}
                          disabled={
                            isCompletingQuest || !canCompleteDetailsQuest
                          }
                        />
                      </>
                    )}
                  </View>

                  <PrimaryButton
                    label={copy.close}
                    variant="secondary"
                    onPress={handleCloseQuestDetails}
                  />
                </ScrollView>
              ) : null}
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
};

const getStyles = (cardMaxWidth: number, isTablet: boolean, spacing: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    progressText: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: "500",
    },
    successXp: {
      fontSize: isTablet ? 24 : 21,
      fontWeight: "800",
    },
    completionAnimatedWrap: {
      width: "100%",
    },
    completionCheckWrap: {
      width: isTablet ? 34 : 30,
      height: isTablet ? 34 : 30,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#1f9b54",
      elevation: 2,
      marginBottom: 4,
    },
    completionCheckLabel: {
      color: "#ffffff",
      fontSize: isTablet ? 22 : 20,
      fontWeight: "900",
      lineHeight: isTablet ? 24 : 22,
    },
    completionSpotlightBackdrop: {
      flex: 1,
      backgroundColor: "rgba(8, 11, 16, 0.45)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing,
      paddingVertical: spacing,
    },
    completionSpotlightCard: {
      width: isTablet ? 250 : 220,
      height: isTablet ? 250 : 220,
      borderRadius: 999,
      backgroundColor: "rgba(18, 22, 29, 0.94)",
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.28)",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 16,
      elevation: 14,
    },
    completionSpotlightBadge: {
      marginTop: 0,
      backgroundColor: "transparent",
      paddingHorizontal: 0,
      paddingVertical: 0,
      elevation: 0,
    },
    completionSpotlightLabel: {
      color: "#ffffff",
      fontSize: isTablet ? 18 : 16,
      fontWeight: "800",
    },
    achievementUnlockBackdrop: {
      flex: 1,
      backgroundColor: "rgba(8, 11, 16, 0.32)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing,
      paddingVertical: spacing,
    },
    achievementUnlockCard: {
      width: "100%",
      maxWidth: isTablet ? 360 : 320,
      borderRadius: 18,
      backgroundColor: "rgba(255, 255, 255, 0.97)",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 18,
      paddingVertical: 20,
      elevation: 12,
    },
    achievementUnlockCaption: {
      color: "#ff2d55",
      fontSize: isTablet ? 15 : 14,
      fontWeight: "800",
      textTransform: "uppercase",
    },
    achievementUnlockIconWrap: {
      width: isTablet ? 68 : 60,
      height: isTablet ? 68 : 60,
      borderRadius: 999,
      backgroundColor: "#ffe5ec",
      alignItems: "center",
      justifyContent: "center",
      elevation: 2,
      marginTop: 2,
      marginBottom: 2,
    },
    achievementUnlockTitle: {
      color: "#0d1117",
      fontSize: isTablet ? 24 : 21,
      fontWeight: "800",
      textAlign: "center",
    },
    achievementUnlockDescription: {
      color: "#3f4752",
      fontSize: isTablet ? 14 : 13,
      fontWeight: "600",
      textAlign: "center",
    },
    childList: {
      gap: 8,
    },
    noChildSelectedWrap: {
      gap: 8,
    },
    childRow: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 2,
      overflow: "hidden",
      elevation: 1,
    },
    childName: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: "700",
    },
    childMeta: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "500",
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      gap: 18,
      paddingBottom: Math.max(120, spacing + 88),
    },
    aiTopButton: {
      width: "100%",
      maxWidth: cardMaxWidth,
      alignSelf: "center",
    },
    scrollTopButton: {
      position: "absolute",
      right: spacing,
      bottom: Math.max(90, spacing + 58),
      minHeight: 42,
      minWidth: 64,
      borderRadius: 999,
      backgroundColor: "#ff2d55",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      elevation: 4,
      paddingHorizontal: 14,
    },
    scrollTopLabel: {
      color: "#ffffff",
      fontSize: isTablet ? 14 : 13,
      fontWeight: "700",
    },
    sectionBlock: {
      gap: 10,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing + 8,
      paddingVertical: spacing,
    },
    modalCard: {
      width: "100%",
      maxWidth: cardMaxWidth + 70,
      maxHeight: "92%",
      borderRadius: 14,
      borderWidth: 1,
      paddingVertical: isTablet ? 22 : 16,
      paddingHorizontal: isTablet ? 22 : 18,
      gap: 10,
      elevation: 3,
    },
    modalScroll: {
      width: "100%",
    },
    modalScrollContent: {
      gap: 10,
      paddingBottom: 4,
    },
    detailsHintText: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "500",
      marginBottom: 2,
    },
    detailsSectionCard: {
      borderWidth: 1,
      borderRadius: 12,
      overflow: "hidden",
      elevation: 1,
    },
    detailsSectionHeaderRow: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: 8,
      paddingRight: 10,
    },
    detailsSectionToggle: {
      minHeight: isTablet ? 56 : 50,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    detailsSectionToggleMain: {
      flex: 1,
    },
    detailsSectionHeadingWrap: {
      flex: 1,
      gap: 2,
    },
    detailsSectionTitle: {
      fontSize: isTablet ? 16 : 15,
      fontWeight: "700",
    },
    detailsSectionHint: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "500",
    },
    detailsSectionStateWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    detailsSectionStateText: {
      fontSize: isTablet ? 12 : 11,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    detailsSectionHeaderActionWrap: {
      justifyContent: "center",
    },
    detailsSectionIconButton: {
      width: isTablet ? 40 : 36,
      height: isTablet ? 40 : 36,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      elevation: 1,
    },
    detailsSectionContent: {
      borderTopWidth: 1,
      borderTopColor: "rgba(0, 0, 0, 0.08)",
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 12,
    },
    previewLabel: {
      fontSize: isTablet ? 15 : 13,
      fontWeight: "500",
    },
    validationText: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: "700",
      color: "#c62828",
    },
    systemNoteText: {
      fontSize: isTablet ? 14 : 12,
      fontWeight: "700",
      color: "#1f9b54",
    },
    photoPreview: {
      width: "100%",
      height: isTablet ? 220 : 180,
      borderRadius: 12,
      backgroundColor: "#dfe7f1",
    },
    inlineActionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    inlineActionButton: {
      minHeight: 38,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      elevation: 1,
    },
    inlineActionButtonDisabled: {
      opacity: 0.6,
    },
    inlineActionLabel: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "700",
    },
    visionSummaryWrap: {
      gap: 4,
    },
    detailsTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    detailsTitleText: {
      flex: 1,
      fontSize: isTablet ? 18 : 16,
      fontWeight: "700",
    },
    detailsDoneCheckWrap: {
      width: isTablet ? 24 : 22,
      height: isTablet ? 24 : 22,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#1f9b54",
      elevation: 1,
    },
    detailsActiveCheckWrap: {
      backgroundColor: "#d9f3e3",
    },
    detailsDoneCheckLabel: {
      color: "#ffffff",
      fontSize: isTablet ? 15 : 14,
      fontWeight: "900",
      lineHeight: isTablet ? 16 : 15,
    },
    detailsActiveCheckLabel: {
      color: "#1c8f4e",
      fontSize: isTablet ? 17 : 15,
      lineHeight: isTablet ? 18 : 16,
    },
    previewText: {
      fontSize: isTablet ? 16 : 14,
      lineHeight: isTablet ? 22 : 20,
    },
    stepsHeading: {
      fontSize: isTablet ? 18 : 16,
      fontWeight: "700",
    },
    stepsScroll: {
      maxHeight: isTablet ? 300 : 240,
    },
    stepsList: {
      gap: 8,
    },
    stepRow: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      overflow: "hidden",
      gap: 4,
      elevation: 1,
    },
    stepRowDisabled: {
      opacity: 0.7,
    },
    stepTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    stepCheckbox: {
      width: isTablet ? 22 : 20,
      height: isTablet ? 22 : 20,
      borderWidth: 2,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    stepCheckmark: {
      color: "#ffffff",
      fontSize: isTablet ? 14 : 13,
      fontWeight: "900",
    },
    stepTitle: {
      flex: 1,
      fontSize: isTablet ? 15 : 14,
      fontWeight: "600",
    },
    stepDescription: {
      fontSize: isTablet ? 13 : 12,
      lineHeight: isTablet ? 18 : 16,
      paddingLeft: 30,
    },
    detailsActionCard: {
      borderWidth: 1,
      borderRadius: 12,
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      elevation: 1,
    },
    detailsActionTitle: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: "700",
    },
  });

export default QuestsScreen;
