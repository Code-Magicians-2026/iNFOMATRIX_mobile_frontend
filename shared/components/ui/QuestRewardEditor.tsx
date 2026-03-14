import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import {
  QUEST_REWARD_EDITOR_OPTIONS,
  getQuestRewardOption,
  type QuestRewardDraft,
} from '@/shared/models/quest-reward.model';

type QuestRewardEditorProps = {
  draft: QuestRewardDraft;
  previewText: string;
  onChangeType: (type: QuestRewardDraft['type']) => void;
  onChangeValue: (value: string) => void;
  onChangeNote: (value: string) => void;
  disabled?: boolean;
};

const SELECTED_REWARD_COLOR: Record<QuestRewardDraft['type'], string> = {
  money: '#1f9b54',
  screen_time: '#0f6ab8',
  treat: '#d97706',
  activity: '#0d9488',
  custom: '#c2410c',
};

const QuestRewardEditor = ({
  draft,
  previewText,
  onChangeType,
  onChangeValue,
  onChangeNote,
  disabled = false,
}: QuestRewardEditorProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { isTablet } = useResponsiveLayout();
  const styles = React.useMemo(() => getStyles(isTablet), [isTablet]);
  const activeOption = getQuestRewardOption(draft.type);
  const valueFieldLabel = activeOption.isNumeric ? 'Reward value' : 'Reward value / description';

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <Text style={[styles.heading, { color: colors.text }]} allowFontScaling>
        Reward
      </Text>

      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]} allowFontScaling>
        Reward type
      </Text>
      <View style={styles.typeRow}>
        {QUEST_REWARD_EDITOR_OPTIONS.map((option) => {
          const isSelected = option.type === draft.type;
          const selectedColor = SELECTED_REWARD_COLOR[option.type];
          return (
            <Pressable
              key={option.type}
              onPress={() => onChangeType(option.type)}
              disabled={disabled}
              style={[
                styles.typeChip,
                {
                  borderColor: isSelected ? selectedColor : colors.border,
                  backgroundColor: isSelected ? selectedColor : colors.card,
                },
                disabled ? styles.disabled : null,
              ]}
              android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            >
              <Text style={[styles.typeChipText, { color: isSelected ? '#ffffff' : colors.text }]} allowFontScaling>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]} allowFontScaling>
        {valueFieldLabel}
      </Text>
      <TextInput
        value={draft.valueInput}
        editable={!disabled}
        onChangeText={onChangeValue}
        placeholder={activeOption.placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType={activeOption.isNumeric ? 'number-pad' : 'default'}
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
          disabled ? styles.disabled : null,
        ]}
      />

      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]} allowFontScaling>
        Reward note (optional)
      </Text>
      <TextInput
        value={draft.noteInput}
        editable={!disabled}
        onChangeText={onChangeNote}
        placeholder="For example: after parent verification"
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
          disabled ? styles.disabled : null,
        ]}
      />

      <View style={[styles.previewWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.previewLabel, { color: colors.textSecondary }]} allowFontScaling>
          Preview
        </Text>
        <Text style={[styles.previewText, { color: colors.text }]} allowFontScaling>
          Reward: {previewText}
        </Text>
      </View>
    </View>
  );
};

const getStyles = (isTablet: boolean) =>
  StyleSheet.create({
    wrap: {
      borderWidth: 1,
      borderRadius: 12,
      padding: isTablet ? 14 : 12,
      gap: 8,
      elevation: 1,
    },
    heading: {
      fontSize: isTablet ? 16 : 15,
      fontWeight: '700',
    },
    fieldLabel: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '600',
    },
    typeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    typeChip: {
      borderWidth: 1,
      borderRadius: 999,
      minHeight: 34,
      paddingHorizontal: 11,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      elevation: 1,
    },
    typeChipText: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '700',
    },
    input: {
      borderWidth: 1,
      borderRadius: 9,
      minHeight: 40,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: isTablet ? 14 : 13,
    },
    previewWrap: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 9,
      gap: 2,
      elevation: 1,
    },
    previewLabel: {
      fontSize: isTablet ? 12 : 11,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    previewText: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: '700',
    },
    disabled: {
      opacity: 0.65,
    },
  });

export default QuestRewardEditor;
