"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { z } from "zod";
import { MinimizedChatTab, PopupChat } from "~/components/chat/PopupChat";
import { createSSEClient, type SSEClient } from "~/lib/sse/enhanced-client";
import { api } from "~/trpc/react";

// Zod schemas for validation
const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
});

const ChatStateSchema = z.object({
  user: UserSchema,
  isOpen: z.boolean(),
  unreadCount: z.number().default(0),
  position: z.object({
    left: z.string().optional(),
    right: z.string().optional(),
  }).optional(),
  isClosing: z.boolean().optional(),
  lastActivity: z.string().datetime().optional(),
});

type User = z.infer<typeof UserSchema>;
type ChatState = z.infer<typeof ChatStateSchema>;

interface ChatContextType {
  openChat: (user: User) => void;
  closeChat: (userId: string) => void;
  minimizeChat: (userId: string) => void;
  expandChat: (userId: string) => void;
  chats: Record<string, ChatState>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}

interface ChatProviderProps {
  children: ReactNode;
}

const CHAT_STATE_KEY = "checkers-chat-state";

// Helper to load chat state from localStorage with validation and expiration
function loadChatState(): Record<string, ChatState> {
  if (typeof window === "undefined") return {};

  try {
    const stored = localStorage.getItem(CHAT_STATE_KEY);
    if (!stored) return {};

    const parsed = JSON.parse(stored);
    const validatedChats: Record<string, ChatState> = {};
    const now = new Date();

    // Validate and filter out expired chats
    Object.entries(parsed).forEach(([key, chat]) => {
      try {
        const validated = ChatStateSchema.parse(chat);

        // Check if chat is expired (24 hours)
        if (validated.lastActivity) {
          const lastActivity = new Date(validated.lastActivity);
          const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

          if (hoursSinceActivity >= 24) {
            return; // Skip expired chat
          }
        }

        // Reset isClosing flag and ensure chat is valid
        validatedChats[key] = {
          ...validated,
          isClosing: false,
        };
      } catch (error) {
        console.warn(`Invalid chat state for ${key}:`, error);
        // Skip invalid chat state
      }
    });

    return validatedChats;
  } catch (error) {
    console.error("Failed to load chat state:", error);
    localStorage.removeItem(CHAT_STATE_KEY); // Clear corrupted state
    return {};
  }
}

// Helper to save chat state to localStorage with activity timestamp
function saveChatState(state: Record<string, ChatState>) {
  if (typeof window === "undefined") return;

  try {
    // Add lastActivity timestamp and don't save isClosing state
    const stateToSave = Object.entries(state).reduce((acc, [key, chat]) => {
      acc[key] = {
        ...chat,
        isClosing: false,
        lastActivity: new Date().toISOString(),
      };
      return acc;
    }, {} as Record<string, ChatState>);

    localStorage.setItem(CHAT_STATE_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.error("Failed to save chat state:", error);
  }
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [chats, setChats] = useState<Record<string, ChatState>>({});
  const [isHydrated, setIsHydrated] = useState(false);

  // Enhanced SSE client for real-time chat updates
  const sseClientRef = useRef<SSEClient | null>(null);

  // Get unread counts for minimized chats
  const { data: conversations } = api.message.getConversations.useQuery(
    undefined,
    { enabled: !!session?.user, refetchInterval: 30000 } // Refetch every 30 seconds
  );

  const markConversationAsReadMutation = api.message.markConversationAsRead.useMutation();

  // Load chat state from localStorage after hydration
  useEffect(() => {
    setIsHydrated(true);
    const state = loadChatState();
    if (Object.keys(state).length > 0) {
      setChats(state);
    }
  }, []);

  // Save chat state to localStorage whenever it changes (after hydration)
  useEffect(() => {
    if (isHydrated) {
      saveChatState(chats);
    }
  }, [chats, isHydrated]);

  // Clear chat state when user logs out
  useEffect(() => {
    if (!session?.user) {
      setChats({});
      if (typeof window !== "undefined") {
        localStorage.removeItem(CHAT_STATE_KEY);
      }
    }
  }, [session?.user]);

  // Handle cross-tab synchronization
  useEffect(() => {
    if (!isHydrated) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CHAT_STATE_KEY && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue);
          const validatedChats: Record<string, ChatState> = {};

          Object.entries(newState).forEach(([key, chat]) => {
            try {
              const validated = ChatStateSchema.parse(chat);
              validatedChats[key] = validated;
            } catch {
              // Skip invalid chat state from other tab
            }
          });

          setChats(validatedChats);
        } catch (error) {
          console.error("Failed to sync chat state from other tab:", error);
        }
      } else if (e.key === CHAT_STATE_KEY && !e.newValue) {
        // Storage was cleared in another tab
        setChats({});
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [isHydrated]);

  // Update unread counts when conversations change
  useEffect(() => {
    if (!conversations) return;

    setChats((prevChats) => {
      const updatedChats = { ...prevChats };

      // Update unread counts for existing chats
      conversations.forEach((conv) => {
        const existingChat = updatedChats[conv.userId];
        if (existingChat && !existingChat.isOpen) {
          updatedChats[conv.userId] = {
            ...existingChat,
            unreadCount: conv.unreadCount,
          };
        }
      });

      return updatedChats;
    });
  }, [conversations]);

  const openChat = useCallback((user: User) => {
    setChats((prev) => {
      // If chat already exists, just open it and preserve position
      if (prev[user.id]) {
        return {
          ...prev,
          [user.id]: {
            ...prev[user.id]!,
            user,
            isOpen: true,
            unreadCount: 0,
          },
        };
      }

      // Determine next available horizontal slot considering both open and minimized chats
      const baseLeftPx = 16; // tailwind bottom-4 equivalent for left spacing
      const slotWidthPx = 332; // width (320) + spacing (12) as used previously

      const usedIndices = new Set<number>();
      for (const chat of Object.values(prev)) {
        const left = chat.position?.left;
        if (left && left.endsWith("px")) {
          const px = parseInt(left, 10);
          const idx = Math.round((px - baseLeftPx) / slotWidthPx);
          if (idx >= 0) usedIndices.add(idx);
        }
      }

      let nextIndex = 0;
      while (usedIndices.has(nextIndex)) nextIndex += 1;

      return {
        ...prev,
        [user.id]: {
          user,
          isOpen: true,
          unreadCount: 0,
          position: { left: `${baseLeftPx + nextIndex * slotWidthPx}px` },
        },
      };
    });

    // Mark conversation as read
    markConversationAsReadMutation.mutate({ userId: user.id });
  }, [markConversationAsReadMutation]);

  const closeChat = useCallback((userId: string) => {
    // Step 1: flag as closing to trigger exit animation inside PopupChat
    setChats((prev) => {
      if (!prev[userId]) return prev;
      return {
        ...prev,
        [userId]: {
          ...prev[userId]!,
          isClosing: true,
        },
      };
    });

    // Step 2: after exit duration, remove and compact positions so neighbors slide left
    setTimeout(() => {
      setChats((prev) => {
        const { [userId]: _removed, ...rest } = prev;

        const baseLeftPx = 16;
        const slotWidthPx = 332;

        // Sort remaining chats by their current left position to preserve relative order
        const sortedEntries = Object.entries(rest).sort((a, b) => {
          const aLeftStr = a[1].position?.left ?? `${baseLeftPx}`;
          const bLeftStr = b[1].position?.left ?? `${baseLeftPx}`;
          const aLeft = parseInt(aLeftStr, 10);
          const bLeft = parseInt(bLeftStr, 10);
          return aLeft - bLeft;
        });

        // Reassign compacted positions (fill the gap so items slide left)
        const compacted: Record<string, ChatState> = {};
        sortedEntries.forEach(([id, chat], index) => {
          compacted[id] = {
            ...chat,
            isClosing: false,
            position: { left: `${baseLeftPx + index * slotWidthPx}px` },
          };
        });

        return compacted;
      });
    }, 220); // slightly longer than 0.2s transition
  }, []);

  const minimizeChat = useCallback((userId: string) => {
    setChats((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId]!,
        isOpen: false,
        // Keep the same position when minimizing
      },
    }));
  }, []);

  const expandChat = useCallback((userId: string) => {
    setChats((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId]!,
        isOpen: true,
        unreadCount: 0, // Reset unread count when expanding
      },
    }));

    // Mark conversation as read
    markConversationAsReadMutation.mutate({ userId });
  }, [markConversationAsReadMutation]);

  const handleExternalOpen = useCallback(
    (username: string) => {
      router.push(`/messages?user=${username}`);
    },
    [router]
  );

  const handleChallenge = useCallback(
    (username: string) => {
      router.push(`/game/online?username=${username}`);
    },
    [router]
  );

  // Enhanced SSE subscription for real-time chat updates
  useEffect(() => {
    if (!session?.user?.id || !isHydrated) {
      // Clean up existing connection if user logs out or not hydrated
      if (sseClientRef.current) {
        sseClientRef.current.destroy();
        sseClientRef.current = null;
      }
      return;
    }

    // Disconnect existing client if any
    if (sseClientRef.current) {
      sseClientRef.current.destroy();
      sseClientRef.current = null;
    }

    const tabId = `chat_context_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const url = `/api/messages/stream?tabId=${tabId}`;

    sseClientRef.current = createSSEClient({
      url,
      onMessage: (event) => {
        try {
          const data = JSON.parse(event.data) as { type: string; data?: any };

          if (data.type === "MESSAGE_CREATED") {
            const { senderId, receiverId, senderUsername } = data.data ?? {};

            // Check if this message is relevant to any of our chats
            setChats((prevChats) => {
              const updatedChats = { ...prevChats };

              // Check if we have a chat with the sender (incoming message)
              if (senderId && updatedChats[senderId]) {
                const chat = updatedChats[senderId];
                // Only increment unread if chat is minimized
                if (!chat.isOpen) {
                  updatedChats[senderId] = {
                    ...chat,
                    unreadCount: chat.unreadCount + 1,
                    lastActivity: new Date().toISOString(),
                  };
                }
              }

              // Check if we have a chat with the receiver (for sent messages)
              if (receiverId && updatedChats[receiverId]) {
                const chat = updatedChats[receiverId];
                updatedChats[receiverId] = {
                  ...chat,
                  lastActivity: new Date().toISOString(),
                };
              }

              return updatedChats;
            });
          }

          if (data.type === "MESSAGE_READ") {
            const { userId } = data.data ?? {};
            if (userId) {
              setChats((prevChats) => {
                if (prevChats[userId]) {
                  return {
                    ...prevChats,
                    [userId]: {
                      ...prevChats[userId],
                      unreadCount: 0, // Reset unread count when messages are read
                    },
                  };
                }
                return prevChats;
              });
            }
          }
        } catch (error) {
          console.error("Error processing chat SSE message:", error);
        }
      },
      onOpen: () => {
        console.log("Chat SSE connection opened");
      },
      onError: (error) => {
        console.error("Chat SSE connection error:", error);
      },
      autoConnect: true,
    });

    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.destroy();
        sseClientRef.current = null;
      }
    };
  }, [session?.user?.id, isHydrated]);

  // Calculate positions for minimized tabs
  const minimizedChats = Object.entries(chats).filter(([_, chat]) => !chat.isOpen);

  return (
    <ChatContext.Provider
      value={{
        openChat,
        closeChat,
        minimizeChat,
        expandChat,
        chats,
      }}
    >
      {children}

      {/* Render popup chats - only after hydration */}
      {isHydrated && Object.entries(chats)
        .filter(([_, chat]) => chat.isOpen || chat.isClosing)
        .map(([userId, chat]) => (
          <PopupChat
            key={userId}
            user={chat.user}
            isOpen={chat.isOpen && !chat.isClosing}
            onClose={() => closeChat(userId)}
            onMinimize={() => minimizeChat(userId)}
            onExternalOpen={() => handleExternalOpen(chat.user.username)}
            onChallenge={() => handleChallenge(chat.user.username)}
            style={chat.position}
          />
        ))}

      {/* Render minimized chat tabs - only after hydration */}
      {isHydrated && minimizedChats.map(([userId, chat]) => (
        <MinimizedChatTab
          key={userId}
          user={chat.user}
          unreadCount={chat.unreadCount}
          onClick={() => expandChat(userId)}
          onClose={() => closeChat(userId)}
          style={chat.position}
        />
      ))}
    </ChatContext.Provider>
  );
}