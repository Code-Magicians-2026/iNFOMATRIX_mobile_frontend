import { StyleSheet } from 'react-native';

const getStyles = (spacing: number, isTablet: boolean, isLandscape: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: spacing * (isTablet ? 0.85 : 0.8),
      paddingTop: spacing * 0.6,
      paddingBottom: spacing * 0.8,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing * 0.5,
      gap: 8,
    },
    screenTitle: {
      fontSize: isTablet ? 20 : 18,
      fontWeight: '700',
      flex: 1,
    },
    menuTrigger: {
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
      minWidth: isTablet ? 138 : 110,
      elevation: 1,
    },
    menuTriggerText: {
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },
    newChatButton: {
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 8,
      elevation: 1,
    },
    newChatButtonText: {
      fontSize: 13,
      fontWeight: '700',
    },
    chatMenu: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 8,
      marginBottom: spacing * 0.7,
      maxHeight: isLandscape ? (isTablet ? 320 : 250) : isTablet ? 420 : 260,
      alignSelf: 'center',
      width: '100%',
      maxWidth: isTablet ? 900 : undefined,
    },
    chatMenuContent: {
      gap: 8,
    },
    chatMenuItem: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      elevation: 1,
    },
    chatMenuTitle: {
      fontSize: 13,
      fontWeight: '700',
    },
    chatMenuPreview: {
      fontSize: 12,
      marginTop: 3,
    },
    chatBox: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 12,
      padding: isTablet ? 14 : 12,
      marginBottom: spacing * 0.7,
      alignSelf: 'center',
      width: '100%',
      maxWidth: isTablet ? 900 : undefined,
    },
    messagesContent: {
      gap: 10,
      paddingBottom: 4,
    },
    emptyMessage: {
      fontSize: 14,
    },
    messageBubble: {
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 9,
      maxWidth: isTablet ? '78%' : '85%',
    },
    userBubble: {
      alignSelf: 'flex-end',
    },
    agentBubble: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: '#d6d6d6',
    },
    messageText: {
      fontSize: 14,
      lineHeight: 18,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'center',
      width: '100%',
      maxWidth: isTablet ? 900 : undefined,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
    },
    sendButton: {
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minWidth: isTablet ? 110 : 92,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
    },
    sendButtonDisabled: {
      opacity: 0.6,
    },
    sendButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '700',
    },
  });

export default getStyles;
