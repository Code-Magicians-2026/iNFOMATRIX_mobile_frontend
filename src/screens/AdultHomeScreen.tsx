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

const PLAN_PROMPTS = [
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
  const styles = React.useMemo(
    () => getStyles(cardMaxWidth, isTablet, spacing),
    [cardMaxWidth, isTablet, spacing],
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
  const [aiPrompt, setAiPrompt] = React.useState<string>(PLAN_PROMPTS[0]);
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
            setScreenError('Sign in to load family dashboard data.');
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
          setScreenError('Session expired. Sign in again to load dashboard data.');
        } else {
          setScreenError(getApiErrorMessage(error, 'Failed to load dashboard data. Please try again.'));
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        lastDashboardRefreshAtRef.current = Date.now();
      }
    },
    [effectiveRole, selectedChildId, session?.accessToken, setSelectedChildId],
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
      refreshFamilyError = getApiErrorMessage(error, 'refreshFamily failed');
    }

    if (session?.accessToken) {
      try {
        rawFamilyPayload = await authService.getFamily(session.accessToken);
      } catch (error) {
        getFamilyError = getApiErrorMessage(error, 'GET /api/families failed');
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
  }, [family?.id, refreshFamily, session?.accessToken]);

  const openCreateChildModal = async () => {
    if (!session) {
      setScreenError('Sign in first to create a child profile.');
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
      setCreateChildError('First name is required.');
      return;
    }

    if (!lastName) {
      setCreateChildError('Last name is required.');
      return;
    }

    if (childPassword.length < 6) {
      setCreateChildError('Child password must be at least 6 characters.');
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
        'Failed to create child profile. Please try again.',
      );

      const normalizedBaseMessage = baseErrorMessage.toLowerCase();
      const shouldAttachDiagnostics =
        normalizedBaseMessage.includes('family') &&
        normalizedBaseMessage.includes('not found');

      if (shouldAttachDiagnostics) {
        const currentFamilyDebug = familyResolutionDebug ?? (await resolveFamilyId().catch(() => null));
        const diagnostics = currentFamilyDebug
          ? [
              `POST /api/children familyId: ${usedFamilyId ?? 'null'}`,
              `create strategy: ${createChildStrategy}`,
              `store family.id: ${currentFamilyDebug.storeFamilyId ?? 'null'}`,
              `refreshFamily family.id: ${currentFamilyDebug.refreshedFamilyId ?? 'null'}`,
              `GET /api/families payload: ${formatDebugPayload(currentFamilyDebug.rawFamilyPayload)}`,
              `refreshFamily error: ${currentFamilyDebug.refreshFamilyError ?? 'none'}`,
              `GET /api/families error: ${currentFamilyDebug.getFamilyError ?? 'none'}`,
            ]
          : ['Failed to collect family diagnostics.'];

        setCreateChildError(`${baseErrorMessage}\n\nDiagnostics:\n${diagnostics.join('\n')}`);
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
    setAiPrompt(PLAN_PROMPTS[Math.floor(Math.random() * PLAN_PROMPTS.length)] ?? PLAN_PROMPTS[0]);
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
      setAiBuilderError('Select child profile first.');
      return;
    }

    const normalizedPrompt = aiPrompt.trim();
    if (!normalizedPrompt) {
      setAiBuilderError('Prompt is required.');
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
        getApiErrorMessage(error, 'Failed to generate AI plan. Please try different settings.'),
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
      setScreenError('Failed to approve generated plan.');
    } finally {
      setApprovingPlanId(null);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer centered>
        <LoadingState label="Loading role dashboard..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader
        title="Home"
        subtitle={`Adult dashboard: ${me?.fullName ?? 'Parent'}`}
      />

      {screenError ? <EmptyState title="Dashboard error" description={screenError} /> : null}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <UpgradePlanBanner
          style={styles.card}
          onOpenFailed={() => {
            setScreenError('Failed to open pricing page. Please try again.');
          }}
        />

        {effectiveRole === 'adult' ? (
          <>
            <StatCard
              title="Selected Child"
              subtitle="Current focus profile"
              style={styles.card}
            >
              {selectedChild ? (
                <>
                  <Text style={[styles.headingValue, { color: colors.text }]} allowFontScaling>
                    {selectedChild.fullName}
                  </Text>
                  <Text style={[styles.metricText, { color: colors.textSecondary }]} allowFontScaling>
                    Age: {formatChildAge(selectedChild.age)} | Level: {progress?.level ?? selectedChild.level}
                  </Text>
                  <Text style={[styles.metricText, { color: colors.textSecondary }]} allowFontScaling>
                    XP: {progress?.xp ?? selectedChild.xp} | Streak: {progress?.streak ?? selectedChild.streak}
                  </Text>
                  <Text style={[styles.metricText, { color: colors.textSecondary }]} allowFontScaling>
                    Active quests: {progress?.activeQuestsCount ?? 0}
                  </Text>
                </>
              ) : (
                <EmptyState
                  title="No active child selected"
                  description={
                    children.length > 0
                      ? 'Select a child below to activate planning target.'
                      : 'Create a child profile to begin.'
                  }
                />
              )}
            </StatCard>

            <StatCard title="Children" subtitle="Choose who you are planning for" style={styles.card}>
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
                          Age {formatChildAge(child.age)} | Lvl {child.level}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <EmptyState title="No children yet" description="Create child to start planning." />
              )}

              <View style={styles.actionButtonsWrap}>
                <PrimaryButton
                  label="Create child"
                  onPress={() => {
                    void openCreateChildModal();
                  }}
                  variant="secondary"
                  style={styles.actionButton}
                />
                <PrimaryButton
                  label="Open AI Builder"
                  onPress={openAiBuilderModal}
                  disabled={!selectedChild}
                  style={styles.actionButton}
                />
                {children.length > 0 && !selectedChild ? (
                  <EmptyState
                    title="No active child selected"
                    description="Pick a child from the list to enable AI plan generation."
                  />
                ) : null}
              </View>
            </StatCard>

            <StatCard title="Recent Generated Plans" subtitle="Latest AI output" style={styles.card}>
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
                        Child: {targetChild?.fullName ?? 'Unknown'} | Quests: {plan.quests.length} | Status: {plan.status}
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
                            {approvingPlanId === plan.id ? 'Approving...' : 'Approve plan'}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })
              ) : (
                <EmptyState title="No generated plans" description="Press Create AI plan to generate one." />
              )}
            </StatCard>
          </>
        ) : (
          <>
            <StatCard title="Greeting" subtitle="Your daily overview" style={styles.card}>
              <Text style={[styles.headingValue, { color: colors.text }]} allowFontScaling>
                Hi, {me?.fullName ?? 'Explorer'}
              </Text>
              <Text style={[styles.metricText, { color: colors.textSecondary }]} allowFontScaling>
                Keep your streak alive and finish today&apos;s quests.
              </Text>
            </StatCard>

            <StatCard title="Today Quests" subtitle="Preview" style={styles.card}>
              {todayQuests.length > 0 ? (
                todayQuests.map((quest) => (
                  <View key={quest.id} style={[styles.questItem, { borderColor: colors.border }]}> 
                    <Text style={[styles.questTitle, { color: colors.text }]} allowFontScaling>
                      {quest.title}
                    </Text>
                    <Text style={[styles.questMeta, { color: colors.textSecondary }]} allowFontScaling>
                      {quest.status.toUpperCase()} | +{quest.rewardXp} XP | {quest.estimatedMinutes} min
                    </Text>
                  </View>
                ))
              ) : (
                <EmptyState title="No quests yet" description="Ask adult to generate and approve a plan." />
              )}
            </StatCard>

            <StatCard title="Progress" subtitle="Core metrics" style={styles.card}>
              <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                Completed today: {completedToday}
              </Text>
              <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                Total XP: {totalXp}
              </Text>
              <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                Streak: {streak} days
              </Text>
              <Text style={[styles.metricText, { color: colors.text }]} allowFontScaling>
                Level: {level}
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
                Progress to next level: {levelProgressPercent}% ({xpToNextLevel} XP left)
              </Text>
            </StatCard>
          </>
        )}

        <PrimaryButton
          label={isRefreshing ? 'Refreshing...' : 'Refresh dashboard'}
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
              Create Child
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]} allowFontScaling>
              Add profile and set active target for planning.
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]} allowFontScaling>
              First Name
            </Text>
            <TextInput
              value={childFirstName}
              onChangeText={setChildFirstName}
              placeholder="Child first name"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              autoCapitalize="words"
              editable={!isCreatingChild}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]} allowFontScaling>
              Last Name
            </Text>
            <TextInput
              value={childLastName}
              onChangeText={setChildLastName}
              placeholder="Child last name"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              autoCapitalize="words"
              editable={!isCreatingChild}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]} allowFontScaling>
              Child Password
            </Text>
            <TextInput
              value={childPassword}
              onChangeText={setChildPassword}
              placeholder="Minimum 6 characters"
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
                  Cancel
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
                  {isCreatingChild ? 'Saving...' : 'Save child'}
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
              Child Login
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]} allowFontScaling>
              Child profile created. Use these credentials to sign in:
            </Text>

            <View style={[styles.loginSummaryBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={[styles.loginSummaryLabel, { color: colors.textSecondary }]} allowFontScaling>
                Name
              </Text>
              <Text style={[styles.loginSummaryValue, { color: colors.text }]} allowFontScaling>
                {childLoginSummary?.fullName ?? '—'}
              </Text>

              <Text style={[styles.loginSummaryLabel, { color: colors.textSecondary }]} allowFontScaling>
                Email
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
                Done
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
              AI Builder
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]} allowFontScaling>
              Build a quest plan for {selectedChild?.fullName ?? 'selected child'} with custom settings.
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]} allowFontScaling>
              Quick templates
            </Text>
            <View style={styles.templateList}>
              {PLAN_PROMPTS.map((prompt) => {
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
              Prompt
            </Text>
            <TextInput
              value={aiPrompt}
              onChangeText={setAiPrompt}
              placeholder="Describe the plan and expected quest outcome..."
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
                  Cancel
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
                  {isGeneratingPlan ? 'Generating...' : 'Generate plan'}
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
