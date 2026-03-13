import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import useAuthStore from '@/context/Auth-store';
import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import type { ChildProfile, UserProfile, UserRole } from '@/shared/models/mvp-contracts.model';
import {
  EmptyState,
  LoadingState,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from '@/shared/components/ui';
import {
  generatePlanMock,
  getChildrenMock,
  getMeMock,
  setMockMeId,
} from '@/src/features/mvp/services';
import type { AppStackParamList } from '@/src/navigation/AppNavigator';

const QUICK_PROMPTS = [
  'Create an after-school routine',
  'Turn room cleaning into quests',
  'Create a calm evening plan',
  'Make homework feel like a game',
] as const;

const CATEGORY_OPTIONS = ['study', 'routine', 'household', 'health'] as const;
const INTENSITY_OPTIONS = ['low', 'medium', 'high'] as const;

type TargetMode = 'myself' | 'child';

type ChatNavigation = NativeStackNavigationProp<AppStackParamList>;

const resolveMockUserId = (role: UserRole, currentUserId: string | undefined) => {
  if (role === 'adult') {
    return 'adult-1';
  }

  if (typeof currentUserId === 'string' && currentUserId.startsWith('child-')) {
    return currentUserId;
  }

  return 'child-1';
};

const AgentChatScreen = () => {
  const navigation = useNavigation<ChatNavigation>();
  const colors = useThemeStore((s) => s.colors);
  const { cardMaxWidth, isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(
    () => getStyles(cardMaxWidth, isTablet, spacing),
    [cardMaxWidth, isTablet, spacing],
  );

  const role = useAuthStore((s) => s.role);
  const currentUser = useAuthStore((s) => s.currentUser);
  const selectedChildId = useAuthStore((s) => s.selectedChildId);
  const setSelectedChildId = useAuthStore((s) => s.setSelectedChildId);
  const setRole = useAuthStore((s) => s.setRole);

  const effectiveRole: UserRole = role ?? 'child';

  const [me, setMe] = React.useState<UserProfile | null>(null);
  const [children, setChildren] = React.useState<ChildProfile[]>([]);
  const [targetMode, setTargetMode] = React.useState<TargetMode>(
    effectiveRole === 'adult' ? 'child' : 'myself',
  );

  const [prompt, setPrompt] = React.useState('');
  const [category, setCategory] = React.useState<string>('study');
  const [intensity, setIntensity] = React.useState<string>('medium');

  const [isLoading, setIsLoading] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [screenError, setScreenError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!role) {
      void setRole('child');
    }
  }, [role, setRole]);

  const loadBuilderContext = React.useCallback(async () => {
    setIsLoading(true);

    try {
      setScreenError(null);

      const targetMockUserId = resolveMockUserId(effectiveRole, currentUser?.id);
      try {
        setMockMeId(targetMockUserId);
      } catch {
        setMockMeId(effectiveRole === 'adult' ? 'adult-1' : 'child-1');
      }

      const [meData, childrenData] = await Promise.all([
        getMeMock(),
        effectiveRole === 'adult' ? getChildrenMock() : Promise.resolve([]),
      ]);

      setMe(meData);
      setChildren(childrenData);

      if (effectiveRole !== 'adult') {
        setTargetMode('myself');
        return;
      }

      if (childrenData.length === 0) {
        setTargetMode('myself');
        return;
      }

      const isSelectedChildValid = selectedChildId
        ? childrenData.some((child) => child.id === selectedChildId)
        : false;

      if (!isSelectedChildValid) {
        await setSelectedChildId(childrenData[0].id);
      }
    } catch {
      setScreenError('Failed to load AI Plan Builder context.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, effectiveRole, selectedChildId, setSelectedChildId]);

  React.useEffect(() => {
    void loadBuilderContext();
  }, [loadBuilderContext]);

  const selectedChild = React.useMemo(
    () => children.find((child) => child.id === selectedChildId) ?? children[0] ?? null,
    [children, selectedChildId],
  );

  const canUseChildTarget = effectiveRole === 'adult' && children.length > 0;
  const activeTargetLabel = targetMode === 'myself' ? me?.fullName ?? 'Myself' : selectedChild?.fullName ?? 'Child';

  const handleGeneratePlan = async () => {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      setScreenError('Prompt is required to generate a plan.');
      return;
    }

    const targetUserId = targetMode === 'myself' ? me?.id : selectedChild?.id;
    if (!targetUserId) {
      setScreenError('Select target user before generating a plan.');
      return;
    }

    setIsGenerating(true);
    try {
      setScreenError(null);

      const request = {
        targetUserId,
        prompt: normalizedPrompt,
        category,
        intensity,
      };

      const generatedPlan = await generatePlanMock(request);

      navigation.navigate('PlanPreview', {
        plan: generatedPlan,
        request,
        targetLabel: activeTargetLabel,
      });
    } catch {
      setScreenError('Failed to generate AI plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer centered>
        <LoadingState label="Loading AI Plan Builder..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader
        title="AI Plan Builder"
        subtitle="Create structured plans instead of free-form chat"
      />

      {screenError ? <EmptyState title="Builder error" description={screenError} /> : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StatCard title="Selected Target" subtitle={`Active: ${activeTargetLabel}`} style={styles.card}>
          <View style={styles.optionRow}>
            <Pressable
              onPress={() => setTargetMode('myself')}
              style={[
                styles.optionChip,
                {
                  borderColor: targetMode === 'myself' ? '#ff2d55' : colors.border,
                  backgroundColor: targetMode === 'myself' ? '#ff2d55' : colors.background,
                },
              ]}
              android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            >
              <Text
                style={[styles.optionChipLabel, { color: targetMode === 'myself' ? '#ffffff' : colors.text }]}
                allowFontScaling
              >
                Myself
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (!canUseChildTarget) {
                  return;
                }

                setTargetMode('child');
              }}
              style={[
                styles.optionChip,
                {
                  borderColor: targetMode === 'child' ? '#ff2d55' : colors.border,
                  backgroundColor: targetMode === 'child' ? '#ff2d55' : colors.background,
                  opacity: canUseChildTarget ? 1 : 0.6,
                },
              ]}
              android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            >
              <Text
                style={[styles.optionChipLabel, { color: targetMode === 'child' ? '#ffffff' : colors.text }]}
                allowFontScaling
              >
                Child
              </Text>
            </Pressable>
          </View>

          {targetMode === 'child' ? (
            canUseChildTarget ? (
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
                          borderColor: isSelected ? '#ff2d55' : colors.border,
                          backgroundColor: isSelected ? '#ff2d55' : colors.background,
                        },
                      ]}
                      android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                    >
                      <Text style={[styles.childName, { color: isSelected ? '#ffffff' : colors.text }]} allowFontScaling>
                        {child.fullName}
                      </Text>
                      <Text
                        style={[styles.childMeta, { color: isSelected ? '#ffe7ee' : colors.textSecondary }]}
                        allowFontScaling
                      >
                        Age {child.age} | Lvl {child.level}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <EmptyState title="No child profiles" description="Create child profile from Home first." />
            )
          ) : null}
        </StatCard>

        <StatCard title="Prompt" subtitle="Describe the plan you want" style={styles.card}>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Write what the AI should build..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[
              styles.promptInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          />
        </StatCard>

        <StatCard title="Category" subtitle="Plan focus" style={styles.card}>
          <View style={styles.optionRow}>
            {CATEGORY_OPTIONS.map((item) => {
              const isSelected = category === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[
                    styles.optionChip,
                    {
                      borderColor: isSelected ? '#ff2d55' : colors.border,
                      backgroundColor: isSelected ? '#ff2d55' : colors.background,
                    },
                  ]}
                  android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                >
                  <Text
                    style={[styles.optionChipLabel, { color: isSelected ? '#ffffff' : colors.text }]}
                    allowFontScaling
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </StatCard>

        <StatCard title="Intensity" subtitle="How demanding the plan should be" style={styles.card}>
          <View style={styles.optionRow}>
            {INTENSITY_OPTIONS.map((item) => {
              const isSelected = intensity === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setIntensity(item)}
                  style={[
                    styles.optionChip,
                    {
                      borderColor: isSelected ? '#ff2d55' : colors.border,
                      backgroundColor: isSelected ? '#ff2d55' : colors.background,
                    },
                  ]}
                  android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                >
                  <Text
                    style={[styles.optionChipLabel, { color: isSelected ? '#ffffff' : colors.text }]}
                    allowFontScaling
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </StatCard>

        <StatCard title="Quick Prompts" subtitle="Tap to prefill" style={styles.card}>
          <View style={styles.quickPromptList}>
            {QUICK_PROMPTS.map((quickPrompt) => (
              <Pressable
                key={quickPrompt}
                onPress={() => setPrompt(quickPrompt)}
                style={[styles.quickPromptItem, { borderColor: colors.border, backgroundColor: colors.background }]}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
              >
                <Text style={[styles.quickPromptText, { color: colors.text }]} allowFontScaling>
                  {quickPrompt}
                </Text>
              </Pressable>
            ))}
          </View>
        </StatCard>

        <Pressable
          onPress={() => {
            void handleGeneratePlan();
          }}
          disabled={isGenerating}
          style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.16)' }}
        >
          <Text style={styles.generateButtonLabel} allowFontScaling>
            {isGenerating ? 'Generating...' : 'Generate'}
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
      paddingBottom: Math.max(14, Math.round(spacing * 1.1)),
    },
    card: {
      width: '100%',
      maxWidth: cardMaxWidth,
      alignSelf: 'center',
    },
    optionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    optionChip: {
      borderWidth: 1,
      borderRadius: 999,
      minHeight: 36,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      elevation: 1,
    },
    optionChipLabel: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    childList: {
      gap: 8,
      marginTop: 4,
    },
    childRow: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 2,
      overflow: 'hidden',
      elevation: 1,
    },
    childName: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: '700',
    },
    childMeta: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '500',
    },
    promptInput: {
      borderWidth: 1,
      borderRadius: 10,
      minHeight: isTablet ? 120 : 108,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: isTablet ? 15 : 14,
    },
    quickPromptList: {
      gap: 8,
    },
    quickPromptItem: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      overflow: 'hidden',
      elevation: 1,
    },
    quickPromptText: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: '600',
    },
    generateButton: {
      width: '100%',
      maxWidth: cardMaxWidth,
      alignSelf: 'center',
      minHeight: 46,
      borderRadius: 10,
      backgroundColor: '#ff2d55',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      elevation: 2,
    },
    generateButtonDisabled: {
      opacity: 0.7,
    },
    generateButtonLabel: {
      fontSize: isTablet ? 16 : 15,
      fontWeight: '700',
      color: '#ffffff',
    },
  });

export default AgentChatScreen;
