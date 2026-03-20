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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import useAuthStore from '@/context/Auth-store';
import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import { useI18n } from '@/src/i18n/useI18n';
import { ApiError, getApiErrorMessage } from '@/src/features/auth/api/client';
import type {
  ChildProfile,
  GeneratedPlan,
  ProgressSummary,
  Quest,
  UserProfile,
} from '@/shared/models/mvp-contracts.model';
import {
  EmptyState,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SectionHeader,
  StatCard,
  UpgradePlanBanner,
} from '@/shared/components/ui';
import {
  childrenService,
  plansService,
  progressService,
  questsService,
  userService,
} from '@/src/integration/services';
import { authService } from '@/src/integration/services/authService';
import type { AppStackParamList } from '@/src/navigation/AppNavigator';

const XP_PER_LEVEL = 300;
const HOME_FOCUS_REFRESH_COOLDOWN_MS = 5000;

const DEFAULT_PLAN_PROMPTS = [
  'Build a balanced plan for school progress and healthy routine.',
  'Create a motivational quest sequence with short achievable steps.',
  'Generate a confidence plan focused on consistency and wins.',
] as const;

type HomeNavigation = NativeStackNavigationProp<AppStackParamList>;

const INVALID_LAST_NAME_TOKENS = new Set([
  'profile',
  'user',
  'parent',
  'adult',
  'child',
  'local',
]);

const extractLastNameFromFullName = (fullName: string | null | undefined): string => {
  if (!fullName) {
    return '';
  }

  const normalizedFullName = fullName.trim();
  if (!normalizedFullName) {
    return '';
  }

  if (normalizedFullName.toLowerCase().includes('profile')) {
    return '';
  }

  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);

  if (parts.length < 2) {
    return '';
  }

  const candidate = (parts[parts.length - 1] ?? '').trim();
  if (!candidate || INVALID_LAST_NAME_TOKENS.has(candidate.toLowerCase())) {
    return '';
  }

  return candidate;
};

const extractLastNameFromFamilyName = (familyName: string | null | undefined): string => {
  if (!familyName) {
    return '';
  }

  const normalized = familyName
    .trim()
    .replace(/['’]s$/i, '')
    .replace(/\s+family$/i, '')
    .trim();

  if (!normalized) {
    return '';
  }

  const parts = normalized.split(/\s+/).filter((part) => part.length > 0);
  const candidate = (parts[parts.length - 1] ?? '').trim();
  if (!candidate || INVALID_LAST_NAME_TOKENS.has(candidate.toLowerCase())) {
    return '';
  }

  return candidate;
};

const isRecoverableCreateChildError = (error: unknown): boolean => {
  if (error instanceof ApiError) {
    return [400, 408, 409, 500, 502, 503, 504].includes(error.status);
  }

  if (error instanceof Error) {
    const normalized = error.message.trim().toLowerCase();
    return (
      normalized.includes('already') ||
      normalized.includes('exist') ||
      normalized.includes('timeout') ||
      normalized.includes('timed out')
    );
  }

  return false;
};

const isFamilyNotFoundError = (error: unknown): boolean => {
  if (error instanceof ApiError) {
    const normalized = error.message.trim().toLowerCase();
    return normalized.includes('family') && normalized.includes('not found');
  }

  if (error instanceof Error) {
    const normalized = error.message.trim().toLowerCase();
    return normalized.includes('family') && normalized.includes('not found');
  }

  return false;
};

const toTrimmedOrNull = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const formatDebugPayload = (payload: unknown, maxLength = 360): string => {
  if (payload === null || payload === undefined) {
    return 'null';
  }

  try {
    const normalized =
      typeof payload === 'string' ? payload : JSON.stringify(payload);
    if (!normalized) {
      return 'empty';
    }

    return normalized.length > maxLength
      ? `${normalized.slice(0, maxLength)}...`
      : normalized;
  } catch {
    return '[unserializable payload]';
  }
};

type FamilyResolutionDebug = {
  familyId: string | null;
  storeFamilyId: string | null;
  refreshedFamilyId: string | null;
  rawFamilyPayload: unknown;
  refreshFamilyError: string | null;
  getFamilyError: string | null;
};

const formatChildAge = (age: number): string => (age > 0 ? String(age) : 'x');

const normalizeEmailAliasChunk = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'child';
};

const buildChildLoginEmailFallback = (
  parentEmail: string | null | undefined,
  firstName: string,
): string | null => {
  if (!parentEmail) {
    return null;
  }

  const normalizedEmail = parentEmail.trim().toLowerCase();
  const atIndex = normalizedEmail.indexOf('@');
  if (atIndex <= 0 || atIndex === normalizedEmail.length - 1) {
    return null;
  }

  const local = normalizedEmail.slice(0, atIndex);
  const domain = normalizedEmail.slice(atIndex + 1);
  const localWithoutAlias = local.split('+')[0] ?? local;
  const alias = normalizeEmailAliasChunk(firstName);

  if (!localWithoutAlias || !domain) {
    return null;
  }

  return `${localWithoutAlias}+${alias}@${domain}`;
};

type ChildLoginSummary = {
  fullName: string;
  email: string;
};

const AdultHomeScreen = () => {
  const navigation = useNavigation<HomeNavigation>();
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
            signInToLoadFamilyDashboard: 'Увійдіть, щоб завантажити дані сімейної панелі.',
            sessionExpired: 'Сесія завершилась. Увійдіть знову, щоб завантажити панель.',
            failedToLoadDashboard: 'Не вдалося завантажити панель. Спробуйте ще раз.',
            refreshFamilyFailed: 'Помилка refreshFamily',
            getFamiliesFailed: 'Помилка GET /api/families',
            signInToCreateChild: 'Спочатку увійдіть, щоб створити профіль дитини.',
            firstNameRequired: "Ім'я обов'язкове.",
            lastNameRequired: 'Прізвище обовʼязкове.',
            childPasswordTooShort: 'Пароль дитини має містити щонайменше 6 символів.',
            failedToCreateChild: 'Не вдалося створити профіль дитини. Спробуйте ще раз.',
            failedToCollectDiagnostics: 'Не вдалося зібрати діагностику сімʼї.',
            diagnosticsTitle: 'Діагностика:',
            diagnosticsPostFamilyId: (value: string) => `POST /api/children familyId: ${value}`,
            diagnosticsCreateStrategy: (value: string) => `стратегія створення: ${value}`,
            diagnosticsStoreFamilyId: (value: string) => `store family.id: ${value}`,
            diagnosticsRefreshFamilyId: (value: string) => `refreshFamily family.id: ${value}`,
            diagnosticsGetFamiliesPayload: (value: string) => `GET /api/families payload: ${value}`,
            diagnosticsRefreshFamilyError: (value: string) => `refreshFamily помилка: ${value}`,
            diagnosticsGetFamiliesError: (value: string) => `GET /api/families помилка: ${value}`,
            selectChildProfileFirst: 'Спочатку оберіть профіль дитини.',
            promptRequired: "Поле prompt обов'язкове.",
            failedToGeneratePlan: 'Не вдалося згенерувати AI план. Спробуйте інші параметри.',
            failedToApprovePlan: 'Не вдалося підтвердити згенерований план.',
            failedToOpenPricingPage: 'Не вдалося відкрити сторінку тарифів. Спробуйте ще раз.',
            loadingDashboard: 'Завантаження панелі...',
            headerTitle: 'Головна',
            headerSubtitle: (name: string) => `Панель дорослого: ${name}`,
            parentFallback: 'Батько/Мати',
            dashboardErrorTitle: 'Помилка панелі',
            selectedChildTitle: 'Обрана дитина',
            selectedChildSubtitle: 'Поточний профіль фокусу',
            ageLabel: 'Вік',
            levelLabel: 'Рівень',
            xpLabel: 'XP',
            streakLabel: 'Streak',
            activeQuestsLabel: 'Активні квести',
            noActiveChildTitle: 'Активну дитину не обрано',
            selectChildBelowDescription: 'Оберіть дитину нижче, щоб активувати ціль планування.',
            createChildFirstDescription: 'Створіть профіль дитини, щоб почати.',
            childrenTitle: 'Діти',
            childrenSubtitle: 'Оберіть, для кого ви плануєте',
            childRowMeta: (age: string, level: number) => `Вік ${age} | Рів. ${level}`,
            noChildrenTitle: 'Ще немає дітей',
            noChildrenDescription: 'Створіть дитину, щоб почати планування.',
            createChildButton: 'Створити дитину',
            openAiBuilderButton: 'Відкрити AI конструктор',
            noActiveChildForPlanDescription: 'Оберіть дитину зі списку, щоб увімкнути AI генерацію плану.',
            recentPlansTitle: 'Останні згенеровані плани',
            recentPlansSubtitle: 'Останній AI результат',
            childLabel: 'Дитина',
            unknownChild: 'Невідомо',
            questsLabel: 'Квести',
            statusLabel: 'Статус',
            approvingPlan: 'Підтвердження...',
            approvePlan: 'Підтвердити план',
            noPlansTitle: 'Немає згенерованих планів',
            noPlansDescription: 'Натисніть "Створити AI план", щоб згенерувати план.',
            greetingTitle: 'Вітання',
            greetingSubtitle: 'Ваш щоденний огляд',
            greetingLine: (name: string) => `Привіт, ${name}`,
            explorerFallback: 'Дослідник',
            greetingHint: 'Підтримуйте streak і завершуйте квести на сьогодні.',
            todayQuestsTitle: 'Квести на сьогодні',
            preview: 'Попередній перегляд',
            questMeta: (quest: Quest) =>
              `${quest.status.toUpperCase()} | +${quest.rewardXp} XP | ${quest.estimatedMinutes} хв`,
            noQuestsTitle: 'Квестів ще немає',
            noQuestsDescription: 'Попросіть дорослого згенерувати та підтвердити план.',
            progressTitle: 'Прогрес',
            coreMetrics: 'Ключові метрики',
            completedToday: (value: number) => `Завершено сьогодні: ${value}`,
            totalXp: (value: number) => `Загальний XP: ${value}`,
            streak: (value: number) => `Streak: ${value} дн.`,
            level: (value: number) => `Рівень: ${value}`,
            progressToNextLevel: (percent: number, xp: number) =>
              `Прогрес до наступного рівня: ${percent}% (залишилось ${xp} XP)`,
            refreshing: 'Оновлення...',
            refreshDashboard: 'Оновити панель',
            createChildModalTitle: 'Створити дитину',
            createChildModalSubtitle: 'Додайте профіль і встановіть активну ціль планування.',
            firstNameLabel: "Ім'я",
            firstNamePlaceholder: "Ім'я дитини",
            lastNameLabel: 'Прізвище',
            lastNamePlaceholder: 'Прізвище дитини',
            childPasswordLabel: 'Пароль дитини',
            childPasswordPlaceholder: 'Мінімум 6 символів',
            cancel: 'Скасувати',
            saving: 'Збереження...',
            saveChild: 'Зберегти дитину',
            childLoginTitle: 'Вхід дитини',
            childLoginSubtitle: 'Профіль дитини створено. Використовуйте ці дані для входу:',
            nameLabel: "Ім'я",
            emailLabel: 'Email',
            done: 'Готово',
            aiBuilderTitle: 'AI Конструктор',
            aiBuilderSubtitle: (name: string) => `Створіть план квестів для ${name} з власними налаштуваннями.`,
            selectedChildFallback: 'обраної дитини',
            quickTemplates: 'Швидкі шаблони',
            promptLabel: 'Запит',
            promptPlaceholder: 'Опишіть план і очікуваний результат квестів...',
            generating: 'Генерація...',
            generatePlan: 'Згенерувати план',
            planPrompts: [
              'Створи збалансований план для прогресу в школі та здорового режиму.',
              'Створи мотиваційну послідовність квестів із короткими досяжними кроками.',
              'Згенеруй план впевненості з фокусом на стабільність і маленькі перемоги.',
            ],
            planStatus: (status: string) => {
              const normalized = status.trim().toLowerCase();
              if (normalized === 'draft') {
                return 'чернетка';
              }
              if (normalized === 'approved') {
                return 'підтверджено';
              }
              if (normalized === 'active') {
                return 'активний';
              }
              if (normalized === 'completed') {
                return 'завершено';
              }
              if (normalized === 'archived') {
                return 'архів';
              }
              return status;
            },
          }
        : {
            signInToLoadFamilyDashboard: 'Sign in to load family dashboard data.',
            sessionExpired: 'Session expired. Sign in again to load dashboard data.',
            failedToLoadDashboard: 'Failed to load dashboard data. Please try again.',
            refreshFamilyFailed: 'refreshFamily failed',
            getFamiliesFailed: 'GET /api/families failed',
            signInToCreateChild: 'Sign in first to create a child profile.',
            firstNameRequired: 'First name is required.',
            lastNameRequired: 'Last name is required.',
            childPasswordTooShort: 'Child password must be at least 6 characters.',
            failedToCreateChild: 'Failed to create child profile. Please try again.',
            failedToCollectDiagnostics: 'Failed to collect family diagnostics.',
            diagnosticsTitle: 'Diagnostics:',
            diagnosticsPostFamilyId: (value: string) => `POST /api/children familyId: ${value}`,
            diagnosticsCreateStrategy: (value: string) => `create strategy: ${value}`,
            diagnosticsStoreFamilyId: (value: string) => `store family.id: ${value}`,
            diagnosticsRefreshFamilyId: (value: string) => `refreshFamily family.id: ${value}`,
            diagnosticsGetFamiliesPayload: (value: string) => `GET /api/families payload: ${value}`,
            diagnosticsRefreshFamilyError: (value: string) => `refreshFamily error: ${value}`,
            diagnosticsGetFamiliesError: (value: string) => `GET /api/families error: ${value}`,
            selectChildProfileFirst: 'Select child profile first.',
            promptRequired: 'Prompt is required.',
            failedToGeneratePlan: 'Failed to generate AI plan. Please try different settings.',
            failedToApprovePlan: 'Failed to approve generated plan.',
            failedToOpenPricingPage: 'Failed to open pricing page. Please try again.',
            loadingDashboard: 'Loading role dashboard...',
            headerTitle: 'Home',
            headerSubtitle: (name: string) => `Adult dashboard: ${name}`,
            parentFallback: 'Parent',
            dashboardErrorTitle: 'Dashboard error',
            selectedChildTitle: 'Selected Child',
            selectedChildSubtitle: 'Current focus profile',
            ageLabel: 'Age',
            levelLabel: 'Level',
            xpLabel: 'XP',
            streakLabel: 'Streak',
            activeQuestsLabel: 'Active quests',
            noActiveChildTitle: 'No active child selected',
            selectChildBelowDescription: 'Select a child below to activate planning target.',
            createChildFirstDescription: 'Create a child profile to begin.',
            childrenTitle: 'Children',
            childrenSubtitle: 'Choose who you are planning for',
            childRowMeta: (age: string, level: number) => `Age ${age} | Lvl ${level}`,
            noChildrenTitle: 'No children yet',
            noChildrenDescription: 'Create child to start planning.',
            createChildButton: 'Create child',
            openAiBuilderButton: 'Open AI Builder',
            noActiveChildForPlanDescription: 'Pick a child from the list to enable AI plan generation.',
            recentPlansTitle: 'Recent Generated Plans',
            recentPlansSubtitle: 'Latest AI output',
            childLabel: 'Child',
            unknownChild: 'Unknown',
            questsLabel: 'Quests',
            statusLabel: 'Status',
            approvingPlan: 'Approving...',
            approvePlan: 'Approve plan',
            noPlansTitle: 'No generated plans',
            noPlansDescription: 'Press Create AI plan to generate one.',
            greetingTitle: 'Greeting',
            greetingSubtitle: 'Your daily overview',
            greetingLine: (name: string) => `Hi, ${name}`,
            explorerFallback: 'Explorer',
            greetingHint: "Keep your streak alive and finish today's quests.",
            todayQuestsTitle: 'Today Quests',
            preview: 'Preview',
            questMeta: (quest: Quest) =>
              `${quest.status.toUpperCase()} | +${quest.rewardXp} XP | ${quest.estimatedMinutes} min`,
            noQuestsTitle: 'No quests yet',
            noQuestsDescription: 'Ask adult to generate and approve a plan.',
            progressTitle: 'Progress',
            coreMetrics: 'Core metrics',
            completedToday: (value: number) => `Completed today: ${value}`,
            totalXp: (value: number) => `Total XP: ${value}`,
            streak: (value: number) => `Streak: ${value} days`,
            level: (value: number) => `Level: ${value}`,
            progressToNextLevel: (percent: number, xp: number) =>
              `Progress to next level: ${percent}% (${xp} XP left)`,
            refreshing: 'Refreshing...',
            refreshDashboard: 'Refresh dashboard',
            createChildModalTitle: 'Create Child',
            createChildModalSubtitle: 'Add profile and set active target for planning.',
            firstNameLabel: 'First Name',
            firstNamePlaceholder: 'Child first name',
            lastNameLabel: 'Last Name',
            lastNamePlaceholder: 'Child last name',
            childPasswordLabel: 'Child Password',
            childPasswordPlaceholder: 'Minimum 6 characters',
            cancel: 'Cancel',
            saving: 'Saving...',
            saveChild: 'Save child',
            childLoginTitle: 'Child Login',
            childLoginSubtitle: 'Child profile created. Use these credentials to sign in:',
            nameLabel: 'Name',
            emailLabel: 'Email',
            done: 'Done',
            aiBuilderTitle: 'AI Builder',
            aiBuilderSubtitle: (name: string) =>
              `Build a quest plan for ${name} with custom settings.`,
            selectedChildFallback: 'selected child',
            quickTemplates: 'Quick templates',
            promptLabel: 'Prompt',
            promptPlaceholder: 'Describe the plan and expected quest outcome...',
            generating: 'Generating...',
            generatePlan: 'Generate plan',
            planPrompts: [...DEFAULT_PLAN_PROMPTS],
            planStatus: (status: string) => status,
          },
    [language],
  );

  const session = useAuthStore((s) => s.session);
  const currentUser = useAuthStore((s) => s.currentUser);
  const family = useAuthStore((s) => s.family);
  const selectedChildId = useAuthStore((s) => s.selectedChildId);
  const setSelectedChildId = useAuthStore((s) => s.setSelectedChildId);
  const registerChild = useAuthStore((s) => s.registerChild);
  const refreshFamily = useAuthStore((s) => s.refreshFamily);

  const [me, setMe] = React.useState<UserProfile | null>(null);
  const [children, setChildren] = React.useState<ChildProfile[]>([]);
  const [recentPlans, setRecentPlans] = React.useState<GeneratedPlan[]>([]);
  const [todayQuests, setTodayQuests] = React.useState<Quest[]>([]);
  const [progress, setProgress] = React.useState<ProgressSummary | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [isCreatingChild, setIsCreatingChild] = React.useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = React.useState(false);
  const [approvingPlanId, setApprovingPlanId] = React.useState<string | null>(null);

  const [isCreateChildModalVisible, setIsCreateChildModalVisible] = React.useState(false);
  const [isChildLoginModalVisible, setIsChildLoginModalVisible] = React.useState(false);
  const [childFirstName, setChildFirstName] = React.useState('');
  const [childLastName, setChildLastName] = React.useState('');
  const [childPassword, setChildPassword] = React.useState('');
  const [childLoginSummary, setChildLoginSummary] = React.useState<ChildLoginSummary | null>(null);
  const [createChildError, setCreateChildError] = React.useState<string | null>(null);
  const lastDashboardRefreshAtRef = React.useRef(0);

  const [isAiBuilderModalVisible, setIsAiBuilderModalVisible] = React.useState(false);
  const [aiPrompt, setAiPrompt] = React.useState<string>(copy.planPrompts[0] ?? DEFAULT_PLAN_PROMPTS[0]);
  const [aiBuilderError, setAiBuilderError] = React.useState<string | null>(null);

  const effectiveRole = 'adult' as const;

  const loadDashboard = React.useCallback(
    async (showLoader = false) => {
      if (showLoader) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        setScreenError(null);

        if (effectiveRole === 'adult') {
          const meData = await userService.getMe();

          if (!session?.accessToken) {
            setMe(meData);
            setChildren([]);
            setRecentPlans([]);
            setProgress(null);
            setTodayQuests([]);
            setScreenError(copy.signInToLoadFamilyDashboard);
            return;
          }

          const [childrenData, planData] = await Promise.all([
            childrenService.getChildren(),
            plansService.getPlans({ limit: 6 }),
          ]);

          const childIds = new Set(childrenData.map((child) => child.id));
          const filteredPlans = planData.filter((plan) =>
            plan.quests.some((quest) => childIds.has(quest.assignedToUserId)),
          );

          const hasSelectedChild = selectedChildId ? childIds.has(selectedChildId) : false;
          const resolvedSelectedChildId = hasSelectedChild ? selectedChildId : null;
          if (selectedChildId && !hasSelectedChild) {
            void setSelectedChildId(null).catch(() => {});
          }

          const selectedProgress = resolvedSelectedChildId
            ? await progressService.getProgress(resolvedSelectedChildId)
            : null;

          setMe(meData);
          setChildren(childrenData);
          setRecentPlans(filteredPlans);
          setProgress(selectedProgress);
          setTodayQuests([]);

          return;
        }

        const meData = await userService.getMe();
        const [questData, progressData] = await Promise.all([
          questsService.getQuests(meData.id),
          progressService.getProgress(meData.id),
        ]);

        setMe(meData);
        setChildren([]);
        setRecentPlans([]);
        setTodayQuests(questData.slice(0, 5));
        setProgress(progressData);
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          setScreenError(copy.sessionExpired);
        } else {
          setScreenError(getApiErrorMessage(error, copy.failedToLoadDashboard, language));
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        lastDashboardRefreshAtRef.current = Date.now();
      }
    },
    [copy.failedToLoadDashboard, copy.sessionExpired, copy.signInToLoadFamilyDashboard, effectiveRole, language, selectedChildId, session?.accessToken, setSelectedChildId],
  );

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

  const selectedChild = React.useMemo(
    () => children.find((child) => child.id === selectedChildId) ?? null,
    [children, selectedChildId],
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

  const resetCreateChildForm = () => {
    setChildFirstName('');
    setChildLastName('');
    setChildPassword('');
    setCreateChildError(null);
  };

  const resolveFamilyId = React.useCallback(async (): Promise<FamilyResolutionDebug> => {
    const storeFamilyId = toTrimmedOrNull(family?.id);
    let refreshedFamilyId: string | null = null;
    let rawFamilyPayload: unknown = null;
    let refreshFamilyError: string | null = null;
    let getFamilyError: string | null = null;

    try {
      const refreshedFamily = await refreshFamily();
      refreshedFamilyId = toTrimmedOrNull(refreshedFamily?.id);
    } catch (error) {
      refreshFamilyError = getApiErrorMessage(error, copy.refreshFamilyFailed, language);
    }

    if (session?.accessToken) {
      try {
        rawFamilyPayload = await authService.getFamily(session.accessToken);
      } catch (error) {
        getFamilyError = getApiErrorMessage(error, copy.getFamiliesFailed, language);
      }
    }

    return {
      familyId: refreshedFamilyId,
      storeFamilyId,
      refreshedFamilyId,
      rawFamilyPayload,
      refreshFamilyError,
      getFamilyError,
    };
  }, [copy.getFamiliesFailed, copy.refreshFamilyFailed, family?.id, language, refreshFamily, session?.accessToken]);

  const openCreateChildModal = async () => {
    if (!session) {
      setScreenError(copy.signInToCreateChild);
      return;
    }

    setChildLoginSummary(null);
    setIsChildLoginModalVisible(false);
    resetCreateChildForm();
    const userLastName =
      extractLastNameFromFamilyName(family?.name) ||
      extractLastNameFromFullName(currentUser?.fullName) ||
      extractLastNameFromFullName(me?.fullName);
    if (userLastName) {
      setChildLastName(userLastName);
    }
    setIsCreateChildModalVisible(true);
    void resolveFamilyId().catch(() => {});
  };

  const closeCreateChildModal = () => {
    if (isCreatingChild) {
      return;
    }

    setIsCreateChildModalVisible(false);
  };

  const closeChildLoginModal = () => {
    setIsChildLoginModalVisible(false);
  };

  const presentChildLoginSummary = (input: {
    firstName: string;
    lastName: string;
    fallbackFullName: string;
    registrationPreview:
      | {
          firstName: string;
          lastName: string;
          email: string;
        }
      | null
      | undefined;
  }) => {
    const preview = input.registrationPreview;
    const resolvedFirstName = preview?.firstName?.trim() || input.firstName;
    const resolvedLastName = preview?.lastName?.trim() || input.lastName;
    const resolvedFullName =
      `${resolvedFirstName} ${resolvedLastName}`.trim() || input.fallbackFullName;
    const resolvedEmail =
      preview?.email?.trim() ||
      buildChildLoginEmailFallback(session?.email, resolvedFirstName) ||
      null;

    if (!resolvedEmail) {
      return;
    }

    setChildLoginSummary({
      fullName: resolvedFullName,
      email: resolvedEmail,
    });
    setIsChildLoginModalVisible(true);
  };

  const handleCreateChild = async () => {
    const firstName = childFirstName.trim();
    const lastName = childLastName.trim();
    if (!firstName) {
      setCreateChildError(copy.firstNameRequired);
      return;
    }

    if (!lastName) {
      setCreateChildError(copy.lastNameRequired);
      return;
    }

    if (childPassword.length < 6) {
      setCreateChildError(copy.childPasswordTooShort);
      return;
    }

    setIsCreatingChild(true);
    setCreateChildError(null);
    const existingChildIds = new Set(children.map((child) => child.id));
    const expectedFullName = `${firstName} ${lastName}`.trim().toLowerCase();

    let usedFamilyId: string | null = null;
    let createChildStrategy: 'explicit-family-id' | 'store-register-child' = 'store-register-child';
    let familyResolutionDebug: FamilyResolutionDebug | null = null;
    let registrationPreview:
      | {
          firstName: string;
          lastName: string;
          email: string;
        }
      | null = null;

    try {
      familyResolutionDebug = await resolveFamilyId();
      const familyId = familyResolutionDebug.familyId;
      usedFamilyId = familyId;
      if (familyId) {
        createChildStrategy = 'explicit-family-id';
        try {
          const createdResult = await childrenService.createChild({
            firstName,
            lastName,
            password: childPassword,
            familyId,
          });
          registrationPreview = createdResult.registrationPreview;
        } catch (error) {
          if (!isFamilyNotFoundError(error)) {
            throw error;
          }

          createChildStrategy = 'store-register-child';
          await registerChild({
            firstName,
            lastName,
            password: childPassword,
          });
        }
      } else {
        await registerChild({
          firstName,
          lastName,
          password: childPassword,
        });
      }

      const refreshedChildren = await childrenService.getChildren({ forceRefresh: true });
      const createdChild =
        refreshedChildren.find((child) => !existingChildIds.has(child.id)) ??
        refreshedChildren.find((child) => child.fullName.trim().toLowerCase() === expectedFullName) ??
        null;

      setChildren(refreshedChildren);
      setIsCreateChildModalVisible(false);
      resetCreateChildForm();

      if (createdChild) {
        await Promise.allSettled([
          setSelectedChildId(createdChild.id),
          loadDashboard(false),
        ]);
        presentChildLoginSummary({
          firstName,
          lastName,
          fallbackFullName: createdChild.fullName,
          registrationPreview,
        });
      } else {
        await loadDashboard(false);
        presentChildLoginSummary({
          firstName,
          lastName,
          fallbackFullName: `${firstName} ${lastName}`.trim(),
          registrationPreview,
        });
      }

      setScreenError(null);
    } catch (error) {
      if (isRecoverableCreateChildError(error)) {
        try {
          const refreshedChildren = await childrenService.getChildren({ forceRefresh: true });
          const createdChild =
            refreshedChildren.find((child) => !existingChildIds.has(child.id)) ??
            refreshedChildren.find((child) => child.fullName.trim().toLowerCase() === expectedFullName) ??
            null;

          if (createdChild) {
            setChildren(refreshedChildren);
            setIsCreateChildModalVisible(false);
            resetCreateChildForm();
            await Promise.allSettled([
              setSelectedChildId(createdChild.id),
              loadDashboard(false),
            ]);
            presentChildLoginSummary({
              firstName,
              lastName,
              fallbackFullName: createdChild.fullName,
              registrationPreview,
            });
            setScreenError(null);
            return;
          }
        } catch {}
      }

      const baseErrorMessage = getApiErrorMessage(
        error,
        copy.failedToCreateChild,
        language,
      );

      const normalizedBaseMessage = baseErrorMessage.toLowerCase();
      const shouldAttachDiagnostics =
        normalizedBaseMessage.includes('family') &&
        normalizedBaseMessage.includes('not found');

      if (shouldAttachDiagnostics) {
        const currentFamilyDebug = familyResolutionDebug ?? (await resolveFamilyId().catch(() => null));
        const diagnostics = currentFamilyDebug
          ? [
              copy.diagnosticsPostFamilyId(usedFamilyId ?? 'null'),
              copy.diagnosticsCreateStrategy(createChildStrategy),
              copy.diagnosticsStoreFamilyId(currentFamilyDebug.storeFamilyId ?? 'null'),
              copy.diagnosticsRefreshFamilyId(currentFamilyDebug.refreshedFamilyId ?? 'null'),
              copy.diagnosticsGetFamiliesPayload(formatDebugPayload(currentFamilyDebug.rawFamilyPayload)),
              copy.diagnosticsRefreshFamilyError(currentFamilyDebug.refreshFamilyError ?? 'none'),
              copy.diagnosticsGetFamiliesError(currentFamilyDebug.getFamilyError ?? 'none'),
            ]
          : [copy.failedToCollectDiagnostics];

        setCreateChildError(`${baseErrorMessage}\n\n${copy.diagnosticsTitle}\n${diagnostics.join('\n')}`);
        return;
      }

      setCreateChildError(baseErrorMessage);
    } finally {
      setIsCreatingChild(false);
    }
  };

  const openAiBuilderModal = () => {
    if (!selectedChild) {
      return;
    }

    setAiBuilderError(null);
    setAiPrompt(
      copy.planPrompts[Math.floor(Math.random() * copy.planPrompts.length)] ??
        copy.planPrompts[0] ??
        DEFAULT_PLAN_PROMPTS[0],
    );
    setIsAiBuilderModalVisible(true);
  };

  const closeAiBuilderModal = () => {
    if (isGeneratingPlan) {
      return;
    }

    setIsAiBuilderModalVisible(false);
    setAiBuilderError(null);
  };

  const handleCreateAiPlan = async () => {
    if (!selectedChild) {
      setAiBuilderError(copy.selectChildProfileFirst);
      return;
    }

    const normalizedPrompt = aiPrompt.trim();
    if (!normalizedPrompt) {
      setAiBuilderError(copy.promptRequired);
      return;
    }

    setIsGeneratingPlan(true);
    setAiBuilderError(null);
    setScreenError(null);
    try {
      const generatedPlan = await plansService.generatePlan({
        targetUserId: selectedChild.id,
        prompt: normalizedPrompt,
      });

      setRecentPlans((prev) => [generatedPlan, ...prev.filter((plan) => plan.id !== generatedPlan.id)].slice(0, 6));
      setIsAiBuilderModalVisible(false);
      if (!session?.accessToken) {
        await loadDashboard(false);
      }
    } catch (error) {
      setAiBuilderError(
        getApiErrorMessage(error, copy.failedToGeneratePlan, language),
      );
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleApprovePlan = async (planId: string) => {
    setApprovingPlanId(planId);
    try {
      const approvedPlan = await plansService.approvePlan(planId);
      setRecentPlans((prev) => prev.map((plan) => (plan.id === approvedPlan.id ? approvedPlan : plan)));
      const targetChildId =
        approvedPlan.quests.find((quest) => quest.assignedToUserId.trim().length > 0)?.assignedToUserId.trim() ?? null;

      if (effectiveRole === 'adult' && targetChildId) {
        const [selectedProgressResult] = await Promise.allSettled([
          progressService.getProgress(targetChildId),
          setSelectedChildId(targetChildId),
        ]);
        if (selectedProgressResult.status === 'fulfilled') {
          setProgress(selectedProgressResult.value);
        }
      }

      navigation.navigate('MainTabs', { screen: 'Quests' });
    } catch {
      setScreenError(copy.failedToApprovePlan);
    } finally {
      setApprovingPlanId(null);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer centered>
        <LoadingState label={copy.loadingDashboard} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader
        title={copy.headerTitle}
        subtitle={copy.headerSubtitle(me?.fullName ?? copy.parentFallback)}
      />

      {screenError ? <EmptyState title={copy.dashboardErrorTitle} description={screenError} /> : null}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <UpgradePlanBanner
          style={styles.card}
          onOpenFailed={() => {
            setScreenError(copy.failedToOpenPricingPage);
          }}
        />

        {effectiveRole === 'adult' ? (
          <>
            <StatCard
              title={copy.selectedChildTitle}
              subtitle={copy.selectedChildSubtitle}
              style={styles.card}
            >
              {selectedChild ? (
                <>
                  <Text style={[styles.headingValue, { color: colors.text }]} allowFontScaling>
                    {selectedChild.fullName}
                  </Text>
                  <Text style={[styles.metricText, { color: colors.textSecondary }]} allowFontScaling>
                    {copy.ageLabel}: {formatChildAge(selectedChild.age)} | {copy.levelLabel}:{' '}
                    {progress?.level ?? selectedChild.level}
                  </Text>
                  <Text style={[styles.metricText, { color: colors.textSecondary }]} allowFontScaling>
                    {copy.xpLabel}: {progress?.xp ?? selectedChild.xp} | {copy.streakLabel}:{' '}
                    {progress?.streak ?? selectedChild.streak}
                  </Text>
                  <Text style={[styles.metricText, { color: colors.textSecondary }]} allowFontScaling>
                    {copy.activeQuestsLabel}: {progress?.activeQuestsCount ?? 0}
                  </Text>
                </>
              ) : (
                <EmptyState
                  title={copy.noActiveChildTitle}
                  description={
                    children.length > 0
                      ? copy.selectChildBelowDescription
                      : copy.createChildFirstDescription
                  }
                />
              )}
            </StatCard>

            <StatCard title={copy.childrenTitle} subtitle={copy.childrenSubtitle} style={styles.card}>
              {children.length > 0 ? (
                <View style={styles.childList}>
                  {children.map((child) => {
                    const isSelected = child.id === selectedChild?.id;
                    return (
                      <Pressable
                        key={child.id}
                        onPress={() => {
                          void setSelectedChildId(child.id);
                        }}
                        style={[
                          styles.childRow,
                          {
                            backgroundColor: isSelected ? '#ff2d55' : colors.background,
                            borderColor: isSelected ? '#ff2d55' : colors.border,
                          },
                        ]}
                        android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                      >
                        <Text
                          style={[styles.childName, { color: isSelected ? '#ffffff' : colors.text }]}
                          allowFontScaling
                        >
                          {child.fullName}
                        </Text>
                        <Text
                          style={[styles.childMeta, { color: isSelected ? '#ffe7ee' : colors.textSecondary }]}
                          allowFontScaling
                        >
                          {copy.childRowMeta(formatChildAge(child.age), child.level)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <EmptyState title={copy.noChildrenTitle} description={copy.noChildrenDescription} />
              )}

              <View style={styles.actionButtonsWrap}>
                <PrimaryButton
                  label={copy.createChildButton}
                  onPress={() => {
                    void openCreateChildModal();
                  }}
                  variant="secondary"
                  style={styles.actionButton}
                />
                <PrimaryButton
                  label={copy.openAiBuilderButton}
                  onPress={openAiBuilderModal}
                  disabled={!selectedChild}
                  style={styles.actionButton}
                />
                {children.length > 0 && !selectedChild ? (
                  <EmptyState
                    title={copy.noActiveChildTitle}
                    description={copy.noActiveChildForPlanDescription}
                  />
                ) : null}
              </View>
            </StatCard>

            <StatCard title={copy.recentPlansTitle} subtitle={copy.recentPlansSubtitle} style={styles.card}>
              {recentPlans.length > 0 ? (
                recentPlans.map((plan) => {
                  const isDraft = plan.status === 'draft';
                  const targetChild = children.find((child) =>
                    plan.quests.some((quest) => quest.assignedToUserId === child.id),
                  );

                  return (
                    <View key={plan.id} style={[styles.planItem, { borderColor: colors.border }]}> 
                      <Text style={[styles.planTitle, { color: colors.text }]} allowFontScaling>
                        {plan.title}
                      </Text>
                      <Text style={[styles.planSummary, { color: colors.textSecondary }]} allowFontScaling>
                        {plan.summary}
                      </Text>
                      <Text style={[styles.planMeta, { color: colors.textSecondary }]} allowFontScaling>
                        {copy.childLabel}: {targetChild?.fullName ?? copy.unknownChild} | {copy.questsLabel}:{' '}
                        {plan.quests.length} | {copy.statusLabel}: {copy.planStatus(plan.status)}
                      </Text>

                      {isDraft ? (
                        <Pressable
                          onPress={() => {
                            void handleApprovePlan(plan.id);
                          }}
                          style={[styles.approveButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                        >
                          <Text style={[styles.approveButtonLabel, { color: colors.text }]} allowFontScaling>
                            {approvingPlanId === plan.id ? copy.approvingPlan : copy.approvePlan}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })
              ) : (
                <EmptyState title={copy.noPlansTitle} description={copy.noPlansDescription} />
              )}
            </StatCard>
          </>
        ) : (
          <>
            <StatCard title={copy.greetingTitle} subtitle={copy.greetingSubtitle} style={styles.card}>
              <Text style={[styles.headingValue, { color: colors.text }]} allowFontScaling>
                {copy.greetingLine(me?.fullName ?? copy.explorerFallback)}
              </Text>
              <Text style={[styles.metricText, { color: colors.textSecondary }]} allowFontScaling>
                {copy.greetingHint}
              </Text>
            </StatCard>

            <StatCard title={copy.todayQuestsTitle} subtitle={copy.preview} style={styles.card}>
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

            <StatCard title={copy.progressTitle} subtitle={copy.coreMetrics} style={styles.card}>
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
                {copy.progressToNextLevel(levelProgressPercent, xpToNextLevel)}
              </Text>
            </StatCard>
          </>
        )}

        <PrimaryButton
          label={isRefreshing ? copy.refreshing : copy.refreshDashboard}
          onPress={() => {
            void loadDashboard(false);
          }}
          variant="tertiary"
          disabled={isRefreshing}
          style={[styles.card, styles.refreshButton]}
        />
      </ScrollView>

      <Modal
        visible={isCreateChildModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeCreateChildModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.modalTitle, { color: colors.text }]} allowFontScaling>
              {copy.createChildModalTitle}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]} allowFontScaling>
              {copy.createChildModalSubtitle}
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]} allowFontScaling>
              {copy.firstNameLabel}
            </Text>
            <TextInput
              value={childFirstName}
              onChangeText={setChildFirstName}
              placeholder={copy.firstNamePlaceholder}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              autoCapitalize="words"
              editable={!isCreatingChild}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]} allowFontScaling>
              {copy.lastNameLabel}
            </Text>
            <TextInput
              value={childLastName}
              onChangeText={setChildLastName}
              placeholder={copy.lastNamePlaceholder}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              autoCapitalize="words"
              editable={!isCreatingChild}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]} allowFontScaling>
              {copy.childPasswordLabel}
            </Text>
            <TextInput
              value={childPassword}
              onChangeText={setChildPassword}
              placeholder={copy.childPasswordPlaceholder}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isCreatingChild}
            />

            {createChildError ? (
              <Text style={styles.errorText} allowFontScaling>
                {createChildError}
              </Text>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={closeCreateChildModal}
                disabled={isCreatingChild}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonSecondary,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    opacity: pressed && !isCreatingChild ? 0.9 : 1,
                  },
                ]}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
              >
                <Text style={[styles.modalButtonLabel, { color: colors.text }]} allowFontScaling>
                  {copy.cancel}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  void handleCreateChild();
                }}
                disabled={isCreatingChild}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  isCreatingChild && styles.modalButtonDisabled,
                  { opacity: pressed && !isCreatingChild ? 0.9 : 1 },
                ]}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.16)' }}
              >
                <Text style={[styles.modalButtonLabel, styles.modalButtonLabelPrimary]} allowFontScaling>
                  {isCreatingChild ? copy.saving : copy.saveChild}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isChildLoginModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeChildLoginModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]} allowFontScaling>
              {copy.childLoginTitle}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]} allowFontScaling>
              {copy.childLoginSubtitle}
            </Text>

            <View style={[styles.loginSummaryBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={[styles.loginSummaryLabel, { color: colors.textSecondary }]} allowFontScaling>
                {copy.nameLabel}
              </Text>
              <Text style={[styles.loginSummaryValue, { color: colors.text }]} allowFontScaling>
                {childLoginSummary?.fullName ?? '—'}
              </Text>

              <Text style={[styles.loginSummaryLabel, { color: colors.textSecondary }]} allowFontScaling>
                {copy.emailLabel}
              </Text>
              <Text style={[styles.loginSummaryValue, { color: colors.text }]} allowFontScaling>
                {childLoginSummary?.email ?? '—'}
              </Text>
            </View>

            <Pressable
              onPress={closeChildLoginModal}
              style={({ pressed }) => [
                styles.modalSingleButton,
                styles.modalButtonPrimary,
                { opacity: pressed ? 0.9 : 1 },
              ]}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.16)' }}
            >
              <Text style={[styles.modalButtonLabel, styles.modalButtonLabelPrimary]} allowFontScaling>
                {copy.done}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isAiBuilderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeAiBuilderModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]} allowFontScaling>
              {copy.aiBuilderTitle}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]} allowFontScaling>
              {copy.aiBuilderSubtitle(selectedChild?.fullName ?? copy.selectedChildFallback)}
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]} allowFontScaling>
              {copy.quickTemplates}
            </Text>
            <View style={styles.templateList}>
              {copy.planPrompts.map((prompt) => {
                const isSelected = aiPrompt.trim() === prompt;
                return (
                  <Pressable
                    key={prompt}
                    onPress={() => setAiPrompt(prompt)}
                    style={[
                      styles.templateChip,
                      {
                        borderColor: isSelected ? '#ff2d55' : colors.border,
                        backgroundColor: isSelected ? '#ff2d55' : colors.background,
                      },
                    ]}
                    android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                  >
                    <Text
                      style={[styles.templateChipLabel, { color: isSelected ? '#ffffff' : colors.textSecondary }]}
                      allowFontScaling
                      numberOfLines={2}
                    >
                      {prompt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]} allowFontScaling>
              {copy.promptLabel}
            </Text>
            <TextInput
              value={aiPrompt}
              onChangeText={setAiPrompt}
              placeholder={copy.promptPlaceholder}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, styles.notesInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isGeneratingPlan}
            />

            {aiBuilderError ? (
              <Text style={styles.errorText} allowFontScaling>
                {aiBuilderError}
              </Text>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={closeAiBuilderModal}
                disabled={isGeneratingPlan}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonSecondary,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    opacity: pressed && !isGeneratingPlan ? 0.9 : 1,
                  },
                ]}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
              >
                <Text style={[styles.modalButtonLabel, { color: colors.text }]} allowFontScaling>
                  {copy.cancel}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  void handleCreateAiPlan();
                }}
                disabled={isGeneratingPlan || !selectedChild}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  (isGeneratingPlan || !selectedChild) && styles.modalButtonDisabled,
                  { opacity: pressed && !isGeneratingPlan ? 0.9 : 1 },
                ]}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.16)' }}
              >
                <Text style={[styles.modalButtonLabel, styles.modalButtonLabelPrimary]} allowFontScaling>
                  {isGeneratingPlan ? copy.generating : copy.generatePlan}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const getStyles = (cardMaxWidth: number, isTablet: boolean, spacing: number) =>
  StyleSheet.create({
    roleSwitcher: {
      flexDirection: 'row',
      borderWidth: 1,
      borderRadius: 12,
      padding: 6,
      gap: 8,
    },
    roleChip: {
      flex: 1,
      minHeight: 42,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    roleChipLabel: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: '700',
    },
    scrollContent: {
      gap: 14,
      paddingBottom: Math.max(18, Math.round(spacing * 1.2)),
    },
    card: {
      width: '100%',
      maxWidth: cardMaxWidth,
      alignSelf: 'center',
    },
    headingValue: {
      fontSize: isTablet ? 20 : 17,
      fontWeight: '700',
    },
    metricText: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: '600',
    },
    childList: {
      gap: 8,
    },
    childRow: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 2,
      overflow: 'hidden',
    },
    childName: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: '700',
    },
    childMeta: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '500',
    },
    actionButtonsWrap: {
      gap: 10,
      marginTop: 4,
    },
    actionButton: {
      width: '100%',
    },
    planItem: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
      gap: 6,
    },
    planTitle: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: '700',
    },
    planSummary: {
      fontSize: isTablet ? 14 : 12,
    },
    planMeta: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '500',
    },
    approveButton: {
      minHeight: 36,
      borderWidth: 1,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      paddingHorizontal: 12,
    },
    approveButtonLabel: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: '700',
    },
    questItem: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
      gap: 4,
    },
    questTitle: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: '700',
    },
    questMeta: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '500',
    },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      overflow: 'hidden',
      marginTop: 4,
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
    },
    progressHint: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '500',
    },
    refreshButton: {
      marginTop: 2,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.42)',
      paddingHorizontal: spacing,
      justifyContent: 'center',
    },
    modalCard: {
      width: '100%',
      maxWidth: cardMaxWidth,
      alignSelf: 'center',
      borderWidth: 1,
      borderRadius: 14,
      padding: isTablet ? 18 : 14,
      gap: 8,
      elevation: 8,
    },
    modalTitle: {
      fontSize: isTablet ? 20 : 18,
      fontWeight: '700',
    },
    modalSubtitle: {
      fontSize: isTablet ? 14 : 13,
      marginBottom: 2,
    },
    fieldLabel: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '600',
      marginTop: 4,
    },
    templateList: {
      gap: 8,
    },
    templateChip: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      minHeight: 48,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    templateChipLabel: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '600',
      lineHeight: isTablet ? 18 : 16,
    },
    input: {
      minHeight: 42,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: isTablet ? 15 : 14,
    },
    notesInput: {
      minHeight: 84,
    },
    errorText: {
      color: '#d93a5a',
      fontSize: isTablet ? 13 : 12,
      fontWeight: '600',
      marginTop: 2,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
    },
    modalButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      elevation: 2,
    },
    modalSingleButton: {
      minHeight: 42,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      elevation: 2,
      width: '100%',
    },
    modalButtonPrimary: {
      backgroundColor: '#ff2d55',
      borderColor: '#ff2d55',
    },
    modalButtonSecondary: {
      borderWidth: 1,
    },
    modalButtonDisabled: {
      opacity: 0.7,
    },
    modalButtonLabel: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: '700',
    },
    modalButtonLabelPrimary: {
      color: '#ffffff',
    },
    loginSummaryBox: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4,
      marginTop: 4,
      marginBottom: 8,
      elevation: 1,
    },
    loginSummaryLabel: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '600',
    },
    loginSummaryValue: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: '700',
      marginBottom: 2,
    },
  });

export default AdultHomeScreen;
