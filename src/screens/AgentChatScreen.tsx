import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import useThemeStore from '@/context/Theme-store';
import styles from '@/src/screens/AgentChatScreen.styles';

type ChatThread = {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  text: string;
};

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
          <ScrollView contentContainerStyle={styles.chatMenuContent}>
            {chats.map((chat) => {
              const isSelected = chat.id === activeChatId;
              return (
                <Pressable
                  key={chat.id}
                  onPress={() => handleSelectChat(chat.id)}
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
                    {chat.title}
                  </Text>
                  <Text
                    style={[styles.chatMenuPreview, { color: isSelected ? '#cfe9ff' : colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {chat.preview}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {isChatMenuOpen ? null : (
        <View style={[styles.chatBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <ScrollView contentContainerStyle={styles.messagesContent}>
            {activeMessages.length === 0 ? (
              <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                Напишіть перше повідомлення.
              </Text>
            ) : (
              activeMessages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    message.role === 'user'
                      ? [styles.userBubble, { backgroundColor: '#0077b6' }]
                      : [styles.agentBubble, { backgroundColor: colors.background }],
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      { color: message.role === 'user' ? '#ffffff' : colors.text },
                    ]}
                  >
                    {message.text}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
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
