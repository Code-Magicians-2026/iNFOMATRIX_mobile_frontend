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
import useAuthStore from '@/context/Auth-store';
import { getApiErrorMessage } from '@/src/features/auth/api/client';
import { sendPromptToAgent } from '@/src/features/chat/api/agent';
import type { ChatMessage, ChatThread } from '@/src/features/chat/models/chat.model';
import getStyles from './AgentChatScreen.styles';

const DRAFT_CHAT_ID = 'draft-agent-chat';
const AGENT_TYPING_PREVIEW = 'Агент друкує...';
const AGENT_ERROR_FALLBACK = 'Не вдалося отримати відповідь від агента.';
const AGENT_AUTH_REQUIRED = 'Щоб спілкуватися з агентом, увійдіть у свій акаунт.';

const AgentChatScreen = () => {
  const colors = useThemeStore((s) => s.colors);
  const session = useAuthStore((s) => s.session);
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
  const [isSending, setIsSending] = React.useState(false);
  const isAuthenticated = Boolean(session?.accessToken?.trim());

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

  const handleSend = React.useCallback(async () => {
    if (isSending) {
      return;
    }

    if (!isAuthenticated) {
      const failedAt = Date.now();

      setMessagesByChat((prev) => {
        const existingMessages = prev[activeChatId] ?? [];
        const hasAuthNotice = existingMessages.some((msg) => msg.text === AGENT_AUTH_REQUIRED);
        if (hasAuthNotice) {
          return prev;
        }

        return {
          ...prev,
          [activeChatId]: [
            ...existingMessages,
            { id: `agent-auth-${failedAt}`, role: 'agent', text: AGENT_AUTH_REQUIRED },
          ],
        };
      });

      return;
    }

    const normalizedText = inputText.trim();
    if (!normalizedText) {
      return;
    }

    let targetChatId = activeChatId;
    const sentAt = Date.now();

    if (activeChatId === DRAFT_CHAT_ID) {
      targetChatId = `chat-${sentAt}`;
      setChats((prev) => [
        {
          id: targetChatId,
          title: `Чат ${prev.length + 1}`,
          preview: AGENT_TYPING_PREVIEW,
          updatedAt: sentAt,
        },
        ...prev,
      ]);
      setSelectedChatId(targetChatId);
    } else {
      setChats((prev) =>
        prev
          .map((chat) =>
            chat.id === targetChatId
              ? { ...chat, preview: AGENT_TYPING_PREVIEW, updatedAt: sentAt }
              : chat,
          )
          .sort((a, b) => b.updatedAt - a.updatedAt),
      );
    }

    setMessagesByChat((prev) => {
      const existingMessages = prev[targetChatId] ?? [];
      return {
        ...prev,
        [targetChatId]: [
          ...existingMessages,
          { id: `user-${sentAt}`, role: 'user', text: normalizedText },
        ],
      };
    });

    setInputText('');
    setIsSending(true);

    try {
      const tokenType = session?.tokenType?.trim() || 'Bearer';
      const authHeader = session?.accessToken ? `${tokenType} ${session.accessToken}` : undefined;
      const agentReply = await sendPromptToAgent(normalizedText, authHeader);
      const repliedAt = Date.now();

      setMessagesByChat((prev) => {
        const existingMessages = prev[targetChatId] ?? [];
        return {
          ...prev,
          [targetChatId]: [
            ...existingMessages,
            { id: `agent-${repliedAt}`, role: 'agent', text: agentReply },
          ],
        };
      });
      setChats((prev) =>
        prev
          .map((chat) =>
            chat.id === targetChatId
              ? { ...chat, preview: agentReply, updatedAt: repliedAt }
              : chat,
          )
          .sort((a, b) => b.updatedAt - a.updatedAt),
      );
    } catch (error) {
      const failedAt = Date.now();
      const errorMessage = getApiErrorMessage(error, AGENT_ERROR_FALLBACK);

      setMessagesByChat((prev) => {
        const existingMessages = prev[targetChatId] ?? [];
        return {
          ...prev,
          [targetChatId]: [
            ...existingMessages,
            { id: `agent-error-${failedAt}`, role: 'agent', text: errorMessage },
          ],
        };
      });
      setChats((prev) =>
        prev
          .map((chat) =>
            chat.id === targetChatId
              ? { ...chat, preview: errorMessage, updatedAt: failedAt }
              : chat,
          )
          .sort((a, b) => b.updatedAt - a.updatedAt),
      );
    } finally {
      setIsSending(false);
    }
  }, [activeChatId, inputText, isAuthenticated, isSending, session?.accessToken, session?.tokenType]);

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
            placeholder={isAuthenticated ? 'Напишіть повідомлення...' : 'Увійдіть, щоб писати агенту'}
            placeholderTextColor={colors.textSecondary}
            editable={!isSending && isAuthenticated}
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
            onPress={() => {
              void handleSend();
            }}
            disabled={isSending || !isAuthenticated}
            style={[
              styles.sendButton,
              { backgroundColor: '#0077b6' },
              isSending || !isAuthenticated ? styles.sendButtonDisabled : null,
            ]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            accessibilityRole="button"
            accessibilityLabel="Надіслати повідомлення"
            accessibilityHint={
              !isAuthenticated
                ? 'Увійдіть у акаунт, щоб надсилати повідомлення'
                : isSending
                ? 'Очікуйте, триває відправка повідомлення'
                : 'Надсилає поточне повідомлення в чат'
            }
            importantForAccessibility="yes"
          >
            <Text style={styles.sendButtonText} allowFontScaling>
              {isSending ? 'Надсилання...' : 'Надіслати'}
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
};

export default AgentChatScreen;
