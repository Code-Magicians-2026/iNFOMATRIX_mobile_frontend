import React from 'react';
import {
  FlatList,
  ListRenderItem,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';

import useThemeStore from '@/context/Theme-store';
import type { ChatMessage, ChatThread } from '@/src/features/chat/models/chat.model';
import styles from './AgentChatScreen.styles';

const DRAFT_CHAT_ID = 'draft-agent-chat';
const AGENT_REPLY = 'Привіт, чекаємо на бекенд)';

const AgentChatScreen = () => {
  const colors = useThemeStore((s) => s.colors);
  const [chats, setChats] = React.useState<ChatThread[]>([]);
  const [selectedChatId, setSelectedChatId] = React.useState<string>(DRAFT_CHAT_ID);
  const [messagesByChat, setMessagesByChat] = React.useState<Record<string, ChatMessage[]>>({});
  const [inputText, setInputText] = React.useState('');
  const [isChatMenuOpen, setIsChatMenuOpen] = React.useState(false);

  const hasMultipleChats = chats.length >= 2;
  const activeChatId = selectedChatId;
  const activeMessages = messagesByChat[activeChatId] ?? [];
  const activeChat = React.useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [activeChatId, chats],
  );

  const handleStartNewChat = () => {
    setSelectedChatId(DRAFT_CHAT_ID);
    setInputText('');
    setIsChatMenuOpen(false);
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setIsChatMenuOpen(false);
  };

  const handleSend = () => {
    const normalizedText = inputText.trim();
    if (!normalizedText) {
      return;
    }

    let targetChatId = activeChatId;

    if (activeChatId === DRAFT_CHAT_ID) {
      targetChatId = `chat-${Date.now()}`;
      setChats((prev) => [
        {
          id: targetChatId,
          title: `Чат ${prev.length + 1}`,
          preview: AGENT_REPLY,
          updatedAt: Date.now(),
        },
        ...prev,
      ]);
      setSelectedChatId(targetChatId);
    } else {
      setChats((prev) =>
        prev
          .map((chat) =>
            chat.id === targetChatId
              ? { ...chat, preview: AGENT_REPLY, updatedAt: Date.now() }
              : chat,
          )
          .sort((a, b) => b.updatedAt - a.updatedAt),
      );
    }

    const timestamp = Date.now();
    setMessagesByChat((prev) => {
      const existingMessages = prev[targetChatId] ?? [];
      return {
        ...prev,
        [targetChatId]: [
          ...existingMessages,
          { id: `user-${timestamp}`, role: 'user', text: normalizedText },
          { id: `agent-${timestamp + 1}`, role: 'agent', text: AGENT_REPLY },
        ],
      };
    });

    setInputText('');
  };

  const renderChatMenuItem: ListRenderItem<ChatThread> = React.useCallback(
    ({ item }) => {
      const isSelected = item.id === activeChatId;

      return (
        <Pressable
          onPress={() => handleSelectChat(item.id)}
          style={[
            styles.chatMenuItem,
            {
              borderColor: isSelected ? '#0077b6' : colors.border,
              backgroundColor: isSelected ? '#0077b6' : colors.background,
            },
          ]}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
        >
          <Text style={[styles.chatMenuTitle, { color: isSelected ? '#ffffff' : colors.text }]}>
            {item.title}
          </Text>
          <Text
            style={[styles.chatMenuPreview, { color: isSelected ? '#cfe9ff' : colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.preview}
          </Text>
        </Pressable>
      );
    },
    [activeChatId, colors.background, colors.border, colors.text, colors.textSecondary],
  );

  const renderMessageItem: ListRenderItem<ChatMessage> = React.useCallback(
    ({ item }) => (
      <View
        style={[
          styles.messageBubble,
          item.role === 'user'
            ? [styles.userBubble, { backgroundColor: '#0077b6' }]
            : [styles.agentBubble, { backgroundColor: colors.background }],
        ]}
      >
        <Text
          style={[
            styles.messageText,
            { color: item.role === 'user' ? '#ffffff' : colors.text },
          ]}
        >
          {item.text}
        </Text>
      </View>
    ),
    [colors.background, colors.text],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        {hasMultipleChats ? (
          <Pressable
            onPress={() => setIsChatMenuOpen((prev) => !prev)}
            style={[styles.menuTrigger, { backgroundColor: colors.card, borderColor: colors.border }]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
          >
            <Text style={[styles.menuTriggerText, { color: colors.text }]}>Чати ({chats.length})</Text>
          </Pressable>
        ) : (
          <Text style={[styles.screenTitle, { color: colors.text }]}>
            {activeChat?.title ?? 'Новий чат з агентом'}
          </Text>
        )}
        <Pressable
          onPress={handleStartNewChat}
          style={[styles.newChatButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
        >
          <Text style={[styles.newChatButtonText, { color: colors.text }]}>+ Новий чат</Text>
        </Pressable>
      </View>

      {hasMultipleChats && isChatMenuOpen ? (
        <View style={[styles.chatMenu, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <FlatList
            data={chats}
            keyExtractor={(item) => item.id}
            renderItem={renderChatMenuItem}
            contentContainerStyle={styles.chatMenuContent}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={5}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : null}

      {isChatMenuOpen ? null : (
        <View style={[styles.chatBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <FlatList
            data={activeMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messagesContent}
            ListEmptyComponent={
              <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                Напишіть перше повідомлення.
              </Text>
            }
            initialNumToRender={12}
            maxToRenderPerBatch={20}
            windowSize={10}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {isChatMenuOpen ? null : (
        <View style={styles.composer}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Напишіть повідомлення..."
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.inputBackground,
              },
            ]}
          />
          <Pressable
            onPress={handleSend}
            style={[styles.sendButton, { backgroundColor: '#0077b6' }]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
          >
            <Text style={styles.sendButtonText}>Надіслати</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
};

export default AgentChatScreen;
