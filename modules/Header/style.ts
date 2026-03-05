import { StyleSheet } from 'react-native';

export const getStyles = (isDark: boolean, isAuthenticated: boolean) => {
  const background = isDark ? '#1f1f1f' : '#ffffff';
  const border = isDark ? '#343434' : '#e6e6e6';
  const text = isDark ? '#f2f2f2' : '#111111';
  const profileBackground = isAuthenticated
    ? isDark
      ? '#1f9ad4'
      : '#0077b6'
    : isDark
      ? '#5a5a60'
      : '#9a9aa1';

  return StyleSheet.create({
    header: {
      height: 88,
      paddingTop: 36,
      paddingHorizontal: 16,
      backgroundColor: background,
      borderBottomWidth: 1,
      borderBottomColor: border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: text,
    },
    sideButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#2a2a2a' : '#f2f2f2',
    },
    sideButtonText: {
      fontSize: 18,
      fontWeight: '700',
      color: text,
      marginTop: -2,
    },
    sideButtonPlaceholder: {
      width: 36,
      height: 36,
    },
    profileButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: profileBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '700',
    },
  });
};
