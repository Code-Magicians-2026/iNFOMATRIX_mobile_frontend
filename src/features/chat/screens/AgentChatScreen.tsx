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
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import type { ChatMessage, ChatThread } from '@/src/features/chat/models/chat.model';
import getStyles from './AgentChatScreen.styles';

const DRAFT_CHAT_ID = 'draft-agent-chat';
const AGENT_REPLY = 'Привіт, чекаємо на бекенд)';

const AgentChatScreen = () => {
  const colors = useThemeStore((s) => s.colors);
  const { isLandscape, isTablet, spacing } = useResponsiveLayout();
  const styles = React.useMemo(
    () => getStyles(spacing, isTablet, isLandscape),
    [isLandscape, isTablet, spacing],
  );
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
          accessibilityRole="button"
          accessibilityLabel={`Чат ${item.title}`}
          accessibilityHint="Відкриває вибраний чат"
          accessibilityState={{ selected: isSelected }}
          importantForAccessibility="yes"
        >
          <Text
            style={[styles.chatMenuTitle, { color: isSelected ? '#ffffff' : colors.text }]}
            allowFontScaling
          >
            {item.title}
          </Text>
          <Text
            style={[styles.chatMenuPreview, { color: isSelected ? '#cfe9ff' : colors.textSecondary }]}
            numberOfLines={1}
            allowFontScaling
          >
            {item.preview}
          </Text>
        </Pressable>
      );
    },
    [activeChatId, colors.background, colors.border, colors.text, colors.textSecondary, styles],
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
          allowFontScaling
        >
          {item.text}
        </Text>
      </View>
    ),
    [colors.background, colors.text, styles],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topBar} importantForAccessibility="yes">
        {hasMultipleChats ? (
          <Pressable
            onPress={() => setIsChatMenuOpen((prev) => !prev)}
            style={[styles.menuTrigger, { backgroundColor: colors.card, borderColor: colors.border }]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            accessibilityRole="button"
            accessibilityLabel="Список чатів"
            accessibilityHint={isChatMenuOpen ? 'Закриває список чатів' : 'Відкриває список чатів'}
            accessibilityState={{ expanded: isChatMenuOpen }}
            importantForAccessibility="yes"
          >
            <Text style={[styles.menuTriggerText, { color: colors.text }]} allowFontScaling>
              Чати ({chats.length})
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.screenTitle, { color: colors.text }]} allowFontScaling>
            {activeChat?.title ?? 'Новий чат з агентом'}
          </Text>
        )}
        <Pressable
          onPress={handleStartNewChat}
          style={[styles.newChatButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
          accessibilityRole="button"
          accessibilityLabel="Новий чат"
          accessibilityHint="Створює новий чат з агентом"
          importantForAccessibility="yes"
        >
          <Text style={[styles.newChatButtonText, { color: colors.text }]} allowFontScaling>
            + Новий чат
          </Text>
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
              <Text style={[styles.emptyMessage, { color: colors.textSecondary }]} allowFontScaling>
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
            accessibilityLabel="Поле повідомлення"
            accessibilityHint="Введіть текст повідомлення для чату"
            importantForAccessibility="yes"
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
            accessibilityRole="button"
            accessibilityLabel="Надіслати повідомлення"
            accessibilityHint="Надсилає поточне повідомлення в чат"
            importantForAccessibility="yes"
          >
            <Text style={styles.sendButtonText} allowFontScaling>
              Надіслати
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
};

export default AgentChatScreen;
