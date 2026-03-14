import { StyleSheet } from 'react-native';
import { ThemeColors } from '@/shared/styles/theme';

export const getStyles = (
  c: ThemeColors,
  spacing: number,
  isTablet: boolean,
  isLandscape: boolean,
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: spacing,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.background,
    },
    settingRow: {
      width: '100%',
      maxWidth: isLandscape ? (isTablet ? 720 : 560) : isTablet ? 620 : 420,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: isTablet ? 20 : 14,
      paddingVertical: isTablet ? 18 : 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      gap: 12,
      marginBottom: spacing,
    },
    settingBlock: {
      width: '100%',
      maxWidth: isLandscape ? (isTablet ? 720 : 560) : isTablet ? 620 : 420,
      paddingHorizontal: isTablet ? 20 : 14,
      paddingVertical: isTablet ? 18 : 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      marginBottom: spacing,
    },
    label: {
      fontSize: isTablet ? 22 : 20,
      color: c.text,
    },
    labelWrap: {
      flex: 1,
      gap: 4,
    },
    description: {
      fontSize: isTablet ? 14 : 13,
      color: c.textSecondary,
    },
    roleChipsRow: {
      marginTop: 12,
      flexDirection: 'row',
      gap: 10,
    },
    roleChip: {
      flex: 1,
      minHeight: isTablet ? 44 : 40,
      borderWidth: 1,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      elevation: 1,
    },
    roleChipLabel: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: '700',
    },
  });
