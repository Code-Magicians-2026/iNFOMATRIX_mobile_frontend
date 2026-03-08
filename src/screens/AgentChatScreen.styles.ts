import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  menuTrigger: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 110,
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
    marginBottom: 12,
    maxHeight: 260,
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
    padding: 12,
    marginBottom: 12,
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
    maxWidth: '85%',
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
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default styles;
