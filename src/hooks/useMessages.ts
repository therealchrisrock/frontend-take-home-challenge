/**
 * useMessages Hook
 *
 * Specialized hook for accessing message state from EventContext.
 * Provides filtered access to messages for specific chats and message-related actions.
 */

import { useCallback, useMemo } from "react";
import { useEventContext } from "~/contexts/event-context";

/**
 * Get messages for a specific chat
 */
export function useMessages(chatId?: string) {
  const context = useEventContext();

  const messages = useMemo(() => {
    if (!chatId) return [];
    return context.messages.get(chatId) ?? [];
  }, [context.messages, chatId]);

  const unreadCount = useMemo(() => {
    if (!chatId) return 0;
    return context.unreadMessageCounts.get(chatId) ?? 0;
  }, [context.unreadMessageCounts, chatId]);

  const typingUsers = useMemo(() => {
    if (!chatId) return [];
    const typing = context.typingStatus.get(chatId);
    return typing ? Array.from(typing) : [];
  }, [context.typingStatus, chatId]);

  return {
    messages,
    unreadCount,
    typingUsers,
    sendMessage: context.sendMessage,
    setTyping: context.setTyping,
    markAsRead: useCallback(
      () => context.markMessagesRead(chatId ?? ""),
      [context, chatId],
    ),
  };
}

/**
 * Get all unread message counts across all chats
 */
export function useUnreadMessageCounts() {
  const context = useEventContext();

  const totalUnread = useMemo(() => {
    let total = 0;
    for (const count of context.unreadMessageCounts.values()) {
      total += count;
    }
    return total;
  }, [context.unreadMessageCounts]);

  return {
    counts: context.unreadMessageCounts,
    totalUnread,
  };
}

/**
 * Get typing status for all chats
 */
export function useTypingStatus() {
  const context = useEventContext();

  return context.typingStatus;
}
