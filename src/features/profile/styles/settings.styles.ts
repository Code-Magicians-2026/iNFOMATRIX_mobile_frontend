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
    label: {
      fontSize: isTablet ? 22 : 20,
      color: c.text,
    },
  });
