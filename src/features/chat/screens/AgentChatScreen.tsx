import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import useAuthStore from '@/context/Auth-store';
import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import type { ChildProfile, UserProfile, UserRole } from '@/shared/models/mvp-contracts.model';
import {
  EmptyState,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from '@/shared/components/ui';
import {
  PLAN_BUILDER_INPUT_SCHEMA,
  PLAN_BUILDER_OUTPUT_SCHEMA,
  PLAN_BUILDER_SAFETY_RULES,
  PLAN_BUILDER_SYSTEM_PROMPT,
  PLAN_BUILDER_TONE_RULES,
} from '@/src/features/chat/config/ai-transparency';
import { childrenService, plansService, userService } from '@/src/integration/services';
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
  const [isTransparencyVisible, setIsTransparencyVisible] = React.useState(false);

  const inputSchemaPreview = React.useMemo(
    () => JSON.stringify(PLAN_BUILDER_INPUT_SCHEMA, null, 2),
    [],
  );
  const outputSchemaPreview = React.useMemo(
    () => JSON.stringify(PLAN_BUILDER_OUTPUT_SCHEMA, null, 2),
    [],
  );

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
        userService.setCurrentUserId(targetMockUserId);
      } catch {
        userService.setCurrentUserId(effectiveRole === 'adult' ? 'adult-1' : 'child-1');
      }

      const [meData, childrenData] = await Promise.all([
        userService.getMe(),
        effectiveRole === 'adult' ? childrenService.getChildren() : Promise.resolve([]),
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

      const generatedPlan = await plansService.generatePlan(request);

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

        <PrimaryButton
          label="AI Transparency (Debug)"
          variant="tertiary"
          onPress={() => setIsTransparencyVisible(true)}
          style={styles.card}
        />

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

      <Modal
        visible={isTransparencyVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTransparencyVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SectionHeader
              title="AI Transparency"
              subtitle="System prompt, schemas, and safety constraints"
            />

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
              <StatCard title="System Prompt Preview" subtitle="Instruction layer">
                <Text style={[styles.codeText, { color: colors.text }]} allowFontScaling>
                  {PLAN_BUILDER_SYSTEM_PROMPT}
                </Text>
              </StatCard>

              <StatCard title="Input Schema" subtitle="Prompt contract">
                <Text style={[styles.codeText, { color: colors.text }]} allowFontScaling>
                  {inputSchemaPreview}
                </Text>
              </StatCard>

              <StatCard title="Expected Output Schema" subtitle="Structured plan shape">
                <Text style={[styles.codeText, { color: colors.text }]} allowFontScaling>
                  {outputSchemaPreview}
                </Text>
              </StatCard>

              <StatCard title="Safety Rules" subtitle="Policy constraints">
                {PLAN_BUILDER_SAFETY_RULES.map((rule) => (
                  <Text key={rule} style={[styles.ruleText, { color: colors.text }]} allowFontScaling>
                    - {rule}
                  </Text>
                ))}
              </StatCard>

              <StatCard title="Child-Friendly Tone Rules" subtitle="Response style guardrails">
                {PLAN_BUILDER_TONE_RULES.map((rule) => (
                  <Text key={rule} style={[styles.ruleText, { color: colors.text }]} allowFontScaling>
                    - {rule}
                  </Text>
                ))}
              </StatCard>
            </ScrollView>

            <PrimaryButton
              label="Close"
              variant="secondary"
              onPress={() => setIsTransparencyVisible(false)}
            />
          </View>
        </View>
      </Modal>
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
      maxWidth: cardMaxWidth + 60,
      maxHeight: '90%',
      borderRadius: 14,
      borderWidth: 1,
      padding: isTablet ? 18 : 14,
      gap: 10,
      elevation: 4,
    },
    modalScroll: {
      flexGrow: 0,
    },
    modalContent: {
      gap: 10,
      paddingBottom: 4,
    },
    codeText: {
      fontFamily: 'monospace',
      fontSize: isTablet ? 13 : 12,
      lineHeight: isTablet ? 19 : 17,
      fontWeight: '500',
    },
    ruleText: {
      fontSize: isTablet ? 14 : 13,
      lineHeight: isTablet ? 20 : 18,
      fontWeight: '500',
    },
  });

export default AgentChatScreen;
