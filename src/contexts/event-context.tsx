/**
 * Unified Event Context
 * 
 * This context manages all real-time events using tRPC's built-in SSE subscription.
 * It provides centralized state management for notifications, messages, games, 
 * presence, and more through a single tRPC subscription.
 */

"use client";

import { useSession } from 'next-auth/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  type ReactNode
} from 'react';
import { Button } from '~/components/ui/button';
import { toast } from '~/hooks/use-toast';
import { api } from '~/trpc/react';
import {
  SSEEventType,
  type ConnectionStatusPayload,
  type FriendRequestPayload,
  type GameInvitePayload,
  type GameMovePayload,
  type MessagePayload,
  type NotificationPayload,
  type PresencePayload,
  type SSEEvent,
  type TypingPayload,
} from '~/types/sse-events';

// ============================================================================
// State Types
// ============================================================================

interface NotificationState {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  relatedEntityId?: string;
  createdAt: string;
  readAt?: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  read: boolean;
}

interface GameState {
  id: string;
  state: any;
  currentPlayer?: string;
  status?: string;
  lastMove?: any;
  lastUpdate: number;
}

interface GameInvite {
  id: string;
  inviterId: string;
  inviterName: string;
  gameId: string;
  message?: string;
  createdAt: string;
}

type PresenceStatus = 'online' | 'offline' | 'away';

interface EventContextState {
  // Connection
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  lastConnected: Date | null;
  error?: string;

  // Notifications
  notifications: NotificationState[];
  unreadNotificationCount: number;

  // Messages
  messages: Map<string, Message[]>; // Keyed by chatId or userId
  typingStatus: Map<string, Set<string>>; // chatId -> Set of userIds typing
  unreadMessageCounts: Map<string, number>;

  // Games
  activeGames: Map<string, GameState>;
  gameInvites: GameInvite[];

  // Presence
  userPresence: Map<string, PresenceStatus>;

  // Friend Requests
  pendingFriendRequests: FriendRequestPayload[];
}

// ============================================================================
// Action Types
// ============================================================================

type EventContextAction =
  | { type: 'SET_CONNECTION_STATE'; payload: EventContextState['connectionState'] }
  | { type: 'SET_CONNECTION_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CONNECTION_STATUS_UPDATE'; payload: ConnectionStatusPayload }
  | { type: 'INITIALIZE_NOTIFICATIONS'; payload: NotificationState[] }
  | { type: 'ADD_NOTIFICATION'; payload: NotificationState }
  | { type: 'MARK_NOTIFICATION_READ'; payload: { notificationId: string; readAt?: string } }
  | { type: 'DELETE_NOTIFICATION'; payload: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
  | { type: 'ADD_MESSAGE'; payload: { chatId: string; message: Message } }
  | { type: 'MARK_MESSAGES_READ'; payload: { chatId: string } }
  | { type: 'UPDATE_TYPING'; payload: { chatId: string; userId: string; isTyping: boolean } }
  | { type: 'UPDATE_GAME'; payload: { gameId: string; gameState: GameState } }
  | { type: 'ADD_GAME_INVITE'; payload: GameInvite }
  | { type: 'REMOVE_GAME_INVITE'; payload: string }
  | { type: 'UPDATE_PRESENCE'; payload: { userId: string; status: PresenceStatus } }
  | { type: 'ADD_FRIEND_REQUEST'; payload: FriendRequestPayload }
  | { type: 'REMOVE_FRIEND_REQUEST'; payload: string }
  | { type: 'HEARTBEAT'; payload: { lastConnected: Date } };

// ============================================================================
// Initial State
// ============================================================================

const initialState: EventContextState = {
  connectionState: 'disconnected',
  lastConnected: null,
  error: undefined,
  notifications: [],
  unreadNotificationCount: 0,
  messages: new Map(),
  typingStatus: new Map(),
  unreadMessageCounts: new Map(),
  activeGames: new Map(),
  gameInvites: [],
  userPresence: new Map(),
  pendingFriendRequests: [],
};

// ============================================================================
// Reducer
// ============================================================================

function eventReducer(state: EventContextState, action: EventContextAction): EventContextState {
  switch (action.type) {
    case 'SET_CONNECTION_STATE':
      return {
        ...state,
        connectionState: action.payload,
        error: action.payload === 'connected' ? undefined : state.error,
      };

    case 'SET_CONNECTION_ERROR':
      return {
        ...state,
        error: action.payload,
        connectionState: 'disconnected',
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: undefined,
      };

    case 'CONNECTION_STATUS_UPDATE':
      return {
        ...state,
        connectionState: action.payload.connected ? 'connected' :
          action.payload.reconnecting ? 'reconnecting' : 'disconnected',
        lastConnected: action.payload.lastConnected ? new Date(action.payload.lastConnected) : null,
        error: action.payload.error ?? undefined,
      };

    case 'INITIALIZE_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        unreadNotificationCount: action.payload.filter(n => !n.read).length,
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadNotificationCount: state.unreadNotificationCount + (action.payload.read ? 0 : 1),
      };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload.notificationId
            ? { ...n, read: true, readAt: action.payload.readAt }
            : n
        ),
        unreadNotificationCount: Math.max(0, state.unreadNotificationCount - 1),
      };

    case 'DELETE_NOTIFICATION':
      const notificationToDelete = state.notifications.find(n => n.id === action.payload);
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
        unreadNotificationCount: notificationToDelete && !notificationToDelete.read
          ? Math.max(0, state.unreadNotificationCount - 1)
          : state.unreadNotificationCount,
      };

    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadNotificationCount: 0,
      };

    case 'ADD_MESSAGE': {
      const { chatId, message } = action.payload;
      const messages = new Map(state.messages);
      const chatMessages = messages.get(chatId) ?? [];
      messages.set(chatId, [...chatMessages, message]);

      const unreadCounts = new Map(state.unreadMessageCounts);
      if (!message.read) {
        unreadCounts.set(chatId, (unreadCounts.get(chatId) ?? 0) + 1);
      }

      return {
        ...state,
        messages,
        unreadMessageCounts: unreadCounts,
      };
    }

    case 'MARK_MESSAGES_READ': {
      const { chatId } = action.payload;
      const messages = new Map(state.messages);
      const chatMessages = messages.get(chatId) ?? [];
      messages.set(chatId, chatMessages.map(m => ({ ...m, read: true })));

      const unreadCounts = new Map(state.unreadMessageCounts);
      unreadCounts.set(chatId, 0);

      return {
        ...state,
        messages,
        unreadMessageCounts: unreadCounts,
      };
    }

    case 'UPDATE_TYPING': {
      const { chatId, userId, isTyping } = action.payload;
      const typingStatus = new Map(state.typingStatus);
      const chatTyping = typingStatus.get(chatId) ?? new Set<string>();

      if (isTyping) {
        chatTyping.add(userId);
      } else {
        chatTyping.delete(userId);
      }

      if (chatTyping.size > 0) {
        typingStatus.set(chatId, chatTyping);
      } else {
        typingStatus.delete(chatId);
      }

      return {
        ...state,
        typingStatus,
      };
    }

    case 'UPDATE_GAME': {
      const { gameId, gameState } = action.payload;
      const activeGames = new Map(state.activeGames);
      activeGames.set(gameId, gameState);

      return {
        ...state,
        activeGames,
      };
    }

    case 'ADD_GAME_INVITE':
      return {
        ...state,
        gameInvites: [action.payload, ...state.gameInvites],
      };

    case 'REMOVE_GAME_INVITE':
      return {
        ...state,
        gameInvites: state.gameInvites.filter(i => i.id !== action.payload),
      };

    case 'UPDATE_PRESENCE': {
      const { userId, status } = action.payload;
      const userPresence = new Map(state.userPresence);
      userPresence.set(userId, status);

      return {
        ...state,
        userPresence,
      };
    }

    case 'ADD_FRIEND_REQUEST':
      return {
        ...state,
        pendingFriendRequests: [action.payload, ...state.pendingFriendRequests],
      };

    case 'REMOVE_FRIEND_REQUEST':
      return {
        ...state,
        pendingFriendRequests: state.pendingFriendRequests.filter(r => r.requestId !== action.payload),
      };

    case 'HEARTBEAT':
      return {
        ...state,
        lastConnected: action.payload.lastConnected,
      };

    default:
      return state;
  }
}

// ============================================================================
// Context Type
// ============================================================================

interface EventContextValue extends EventContextState {
  // Connection methods
  reconnect: () => void;

  // Notification methods
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;

  // Message methods
  sendMessage: (receiverId: string, content: string, chatId?: string) => Promise<void>;
  setTyping: (receiverId: string, isTyping: boolean, chatId?: string) => void;
  markMessagesRead: (chatId: string) => void;

  // Game methods
  makeGameMove: (gameId: string, move: any, gameVersion?: number) => Promise<boolean>;
  acceptGameInvite: (inviteId: string) => Promise<void>;
  declineGameInvite: (inviteId: string) => void;

  // Friend request methods
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const EventContext = createContext<EventContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export function EventProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [state, dispatch] = useReducer(eventReducer, initialState);
  const utils = api.useContext();

  // tRPC queries for initial data
  const { data: initialNotifications } = api.notification.getAll.useQuery(
    undefined,
    { enabled: !!session?.user?.id }
  );

  // tRPC mutations
  const markAsReadMutation = api.notification.markAsRead.useMutation();
  const markAllAsReadMutation = api.notification.markAllAsRead.useMutation();
  const dismissMutation = api.notification.dismiss.useMutation();
  const sendMessageMutation = api.events.sendMessage.useMutation();
  const setTypingMutation = api.events.setTyping.useMutation();
  const makeGameMoveMutation = api.multiplayerGame.makeMove.useMutation();
  const redeemInviteMutation = api.gameInvite.redeemInvitation.useMutation({
    onError: (error: { message: string }) => {
      toast({
        title: "Failed to join",
        description: error.message || "Could not accept invitation",
        variant: "destructive",
      });
    },
  });
  const declineInviteMutation = api.gameInvite.declineInvitation.useMutation({
    onSuccess: () => {
      toast({ title: "Invitation declined" });
    },
    onError: (error: { message: string }) => {
      toast({
        title: "Failed",
        description: error.message || "Could not decline invitation",
        variant: "destructive",
      });
    },
  });
  const acceptFriendRequestMutation = api.friendRequest.accept.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Friend request accepted",
      });
      // Optionally refetch friend requests or update UI
    },
    onError: (error: { message: string }) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept friend request",
        variant: "destructive",
      });
    },
  });

  const declineFriendRequestMutation = api.friendRequest.decline.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Friend request declined",
      });
      // Optionally refetch friend requests or update UI
    },
    onError: (error: { message: string }) => {
      toast({
        title: "Error",
        description: error.message || "Failed to decline friend request",
        variant: "destructive",
      });
    },
  });

  // Initialize notifications from server
  useEffect(() => {
    if (initialNotifications) {
      const mappedNotifications: NotificationState[] = initialNotifications
        // Don't filter here - let components decide what to show
        .map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          read: n.read,
          metadata: n.metadata ? JSON.parse(n.metadata) : undefined,
          relatedEntityId: n.relatedEntityId ?? undefined,
          createdAt: n.createdAt.toISOString(),
        }));

      dispatch({ type: 'INITIALIZE_NOTIFICATIONS', payload: mappedNotifications });
    }
  }, [initialNotifications]);

  // Use tRPC subscription for real-time events
  api.events.onAllEvents.useSubscription(undefined, {
    enabled: !!session?.user?.id && status === 'authenticated',

    onData: (event: SSEEvent) => {
      console.log(`[EventContext] tRPC Event: ${event.type}`, event);

      switch (event.type) {
        case SSEEventType.CONNECTION_STATUS:
          dispatch({
            type: 'CONNECTION_STATUS_UPDATE',
            payload: event.payload as ConnectionStatusPayload
          });
          break;

        case SSEEventType.HEARTBEAT:
          dispatch({
            type: 'HEARTBEAT',
            payload: { lastConnected: new Date() }
          });
          break;

        case SSEEventType.NOTIFICATION_CREATED: {
          const payload = event.payload as NotificationPayload;
          const notification: NotificationState = {
            id: payload.id ?? payload.notificationId ?? '',
            type: payload.type,
            title: payload.title,
            message: payload.message,
            read: false,
            metadata: payload.metadata,
            relatedEntityId: payload.relatedEntityId,
            createdAt: payload.createdAt ?? new Date().toISOString(),
          };

          dispatch({ type: 'ADD_NOTIFICATION', payload: notification });

          // Show toast
          if (payload.type === 'GAME_INVITE' && (payload.metadata as any)?.inviteToken) {
            const token = (payload.metadata as any)?.inviteToken as string;
            toast({
              title: payload.title,
              description: payload.message,
              action: (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await redeemInviteMutation.mutateAsync({ inviteToken: token });
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      await declineInviteMutation.mutateAsync({ inviteToken: token });
                    }}
                  >
                    Decline
                  </Button>
                </div>
              )
            });
          } else {
            toast({
              title: payload.title,
              description: payload.message,
            });
          }
          break;
        }

        case SSEEventType.NOTIFICATION_READ: {
          const payload = event.payload as NotificationPayload;
          dispatch({
            type: 'MARK_NOTIFICATION_READ',
            payload: {
              notificationId: payload.notificationId ?? payload.id ?? '',
              readAt: payload.readAt,
            }
          });
          break;
        }

        case SSEEventType.NOTIFICATION_DELETED: {
          const payload = event.payload as NotificationPayload;
          dispatch({
            type: 'DELETE_NOTIFICATION',
            payload: payload.notificationId ?? payload.id ?? ''
          });
          break;
        }

        case SSEEventType.MESSAGE_RECEIVED: {
          const payload = event.payload as MessagePayload;
          const message: Message = {
            id: payload.messageId,
            senderId: payload.senderId,
            senderName: payload.senderName,
            content: payload.content,
            createdAt: payload.createdAt ?? new Date().toISOString(),
            read: false,
          };

          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              chatId: payload.chatId ?? payload.senderId,
              message
            }
          });

          // Invalidate conversations so the notification panel list updates
          void utils.message.getConversations.invalidate();

          // Do not show a toast here; the UI will update instantly via EventContext state.
          break;
        }

        case SSEEventType.TYPING_START:
        case SSEEventType.TYPING_STOP: {
          const payload = event.payload as TypingPayload;
          dispatch({
            type: 'UPDATE_TYPING',
            payload: {
              chatId: payload.chatId,
              userId: payload.userId,
              isTyping: event.type === SSEEventType.TYPING_START,
            }
          });
          break;
        }

        case SSEEventType.GAME_MOVE: {
          const payload = event.payload as GameMovePayload;
          dispatch({
            type: 'UPDATE_GAME',
            payload: {
              gameId: payload.gameId,
              gameState: {
                id: payload.gameId,
                state: {
                  board: payload.newBoard || payload.board,
                  currentPlayer: payload.currentPlayer,
                  winner: payload.winner,
                  moveCount: payload.moveCount,
                  playerColor: payload.playerColor,
                  version: payload.version,
                },
                currentPlayer: payload.currentPlayer,
                lastMove: payload.move,
                lastUpdate: Date.now(),
              }
            }
          });
          break;
        }

        case SSEEventType.GAME_INVITE: {
          const payload = event.payload as GameInvitePayload;
          dispatch({
            type: 'ADD_GAME_INVITE',
            payload: {
              id: payload.inviteId,
              inviterId: payload.inviterId,
              inviterName: payload.inviterName,
              gameId: payload.gameId,
              message: payload.message,
              createdAt: new Date().toISOString(),
            }
          });

          toast({
            title: "Game Invitation",
            description: `${payload.inviterName} invited you to play`,
            action: (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    // Prefer inviteToken if provided via notification path; fallback to navigating to invite page
                    const token = (payload as any)?.inviteToken as string | undefined;
                    if (token) {
                      await redeemInviteMutation.mutateAsync({ inviteToken: token });
                    } else if ((payload as any)?.gameId) {
                      // If we only have a gameId, fallback to invite page where token is expected in URL
                      window.location.href = `/game/${payload.gameId}`;
                    }
                  }}
                >
                  Accept
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    const token = (payload as any)?.inviteToken as string | undefined;
                    if (token) {
                      await declineInviteMutation.mutateAsync({ inviteToken: token });
                    }
                  }}
                >
                  Decline
                </Button>
              </div>
            )
          });
          break;
        }

        case SSEEventType.GAME_RESIGNED: {
          const payload = event.payload as any; // Type will be added to sse-events.ts
          const { gameId, resignedBy, winner } = payload;

          // Update game state with winner
          if (gameId) {
            const existingGameState = state.activeGames.get(gameId);
            if (existingGameState) {
              dispatch({
                type: 'UPDATE_GAME',
                payload: {
                  gameId,
                  gameState: {
                    ...existingGameState,
                    state: {
                      ...existingGameState.state,
                      winner,
                      status: 'COMPLETED',
                    },
                    lastUpdate: Date.now(),
                  }
                }
              });
            }
          }

          toast({
            title: "Game Ended",
            description: resignedBy === "PLAYER_1" ? "Red player resigned. Black wins!" : "Black player resigned. Red wins!",
          });
          break;
        }

        case SSEEventType.DRAW_REQUEST: {
          const payload = event.payload as any;
          const { gameId, requestedBy } = payload;

          // Update game state with draw request
          if (gameId) {
            const existingGameState = state.activeGames.get(gameId);
            if (existingGameState) {
              dispatch({
                type: 'UPDATE_GAME',
                payload: {
                  gameId,
                  gameState: {
                    ...existingGameState,
                    state: {
                      ...existingGameState.state,
                      drawRequestedBy: requestedBy,
                    },
                    status: 'DRAW_REQUESTED',
                    lastUpdate: Date.now(),
                  }
                }
              });
            }
          }
          break;
        }

        case SSEEventType.DRAW_ACCEPTED: {
          const payload = event.payload as any;
          const { gameId, acceptedBy } = payload;

          // Update game state with draw acceptance
          if (gameId) {
            const existingGameState = state.activeGames.get(gameId);
            if (existingGameState) {
              dispatch({
                type: 'UPDATE_GAME',
                payload: {
                  gameId,
                  gameState: {
                    ...existingGameState,
                    state: {
                      ...existingGameState.state,
                      winner: 'draw',
                    },
                    status: 'DRAW_ACCEPTED',
                    lastUpdate: Date.now(),
                  }
                }
              });
            }
          }
          break;
        }

        case SSEEventType.DRAW_DECLINED: {
          const payload = event.payload as any;
          const { gameId, declinedBy } = payload;

          // Update game state to clear draw request
          if (gameId) {
            const existingGameState = state.activeGames.get(gameId);
            if (existingGameState) {
              dispatch({
                type: 'UPDATE_GAME',
                payload: {
                  gameId,
                  gameState: {
                    ...existingGameState,
                    state: {
                      ...existingGameState.state,
                      drawRequestedBy: null,
                    },
                    status: 'DRAW_DECLINED',
                    lastUpdate: Date.now(),
                  }
                }
              });
            }
          }
          break;
        }

        case SSEEventType.USER_ONLINE:
        case SSEEventType.USER_OFFLINE:
        case SSEEventType.USER_AWAY:
        case SSEEventType.PRESENCE: {
          const payload = event.payload as PresencePayload;
          const status: PresenceStatus =
            event.type === SSEEventType.USER_ONLINE ? 'online' :
              event.type === SSEEventType.USER_OFFLINE ? 'offline' :
                event.type === SSEEventType.USER_AWAY ? 'away' :
                  payload.online ? 'online' : 'offline';

          dispatch({
            type: 'UPDATE_PRESENCE',
            payload: {
              userId: payload.userId,
              status,
            }
          });
          break;
        }

        case SSEEventType.FRIEND_REQUEST_RECEIVED: {
          const payload = event.payload as FriendRequestPayload;
          dispatch({ type: 'ADD_FRIEND_REQUEST', payload });

          toast({
            title: "Friend Request",
            description: `${payload.senderName ?? 'Someone'} sent you a friend request`,
            action: (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => acceptFriendRequestMutation.mutate({
                    friendRequestId: payload.requestId,
                  })}
                  disabled={acceptFriendRequestMutation.isPending}
                >
                  Accept
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => declineFriendRequestMutation.mutate({
                    friendRequestId: payload.requestId,
                  })}
                  disabled={declineFriendRequestMutation.isPending}
                >
                  Reject
                </Button>
              </div>
            )
          });
          break;
        }

        case SSEEventType.FRIEND_REQUEST_ACCEPTED:
        case SSEEventType.FRIEND_REQUEST_DECLINED: {
          const payload = event.payload as FriendRequestPayload;
          dispatch({ type: 'REMOVE_FRIEND_REQUEST', payload: payload.requestId });
          break;
        }

        default:
          console.warn(`[EventContext] Unhandled event type: ${event.type}`);
      }
    },

    onError: (error) => {
      console.error('[EventContext] tRPC subscription error:', error);
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'Connection lost' });

      // tRPC will automatically retry with exponential backoff
      toast({
        title: 'Connection Error',
        description: 'Attempting to reconnect...',
        variant: 'destructive',
      });
    },
  });

  // API Methods
  const markNotificationRead = useCallback(async (notificationId: string) => {
    try {
      dispatch({
        type: 'MARK_NOTIFICATION_READ',
        payload: {
          notificationId,
          readAt: new Date().toISOString()
        }
      });
      await markAsReadMutation.mutateAsync({ notificationId });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  }, [markAsReadMutation]);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' });
      await markAllAsReadMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  }, [markAllAsReadMutation]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      dispatch({ type: 'DELETE_NOTIFICATION', payload: notificationId });
      await dismissMutation.mutateAsync({ notificationId });
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  }, [dismissMutation]);

  // Message methods using tRPC mutations
  const sendMessage = useCallback(async (receiverId: string, content: string, chatId?: string) => {
    try {
      await sendMessageMutation.mutateAsync({ receiverId, content, chatId });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  }, [sendMessageMutation]);

  const setTyping = useCallback((receiverId: string, isTyping: boolean, chatId?: string) => {
    if (chatId) {
      setTypingMutation.mutate({ chatId, isTyping });
    }
  }, [setTypingMutation]);

  const markMessagesRead = useCallback((chatId: string) => {
    dispatch({ type: 'MARK_MESSAGES_READ', payload: { chatId } });
  }, []);

  const makeGameMove = useCallback(async (gameId: string, move: any, gameVersion?: number) => {
    try {
      const result = await makeGameMoveMutation.mutateAsync({
        gameId,
        move,
        gameVersion: gameVersion ?? 0
      });
      return result.success;
    } catch (error) {
      console.error('Failed to make game move:', error);
      toast({
        title: 'Error',
        description: 'Failed to make move',
        variant: 'destructive',
      });
      return false;
    }
  }, [makeGameMoveMutation]);

  const acceptGameInvite = useCallback(async (inviteId: string) => {
    console.log('acceptGameInvite not yet implemented', { inviteId });
    dispatch({ type: 'REMOVE_GAME_INVITE', payload: inviteId });
  }, []);

  const declineGameInvite = useCallback((inviteId: string) => {
    dispatch({ type: 'REMOVE_GAME_INVITE', payload: inviteId });
  }, []);

  const acceptFriendRequest = useCallback(async (requestId: string) => {
    console.log('acceptFriendRequest not yet implemented', { requestId });
    dispatch({ type: 'REMOVE_FRIEND_REQUEST', payload: requestId });
  }, []);

  const declineFriendRequest = useCallback(async (requestId: string) => {
    console.log('declineFriendRequest not yet implemented', { requestId });
    dispatch({ type: 'REMOVE_FRIEND_REQUEST', payload: requestId });
  }, []);

  const reconnect = useCallback(() => {
    // tRPC handles reconnection automatically
    dispatch({ type: 'SET_CONNECTION_STATE', payload: 'reconnecting' });
  }, []);

  // Context value
  const value: EventContextValue = {
    ...state,
    reconnect,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    sendMessage,
    setTyping,
    markMessagesRead,
    makeGameMove,
    acceptGameInvite,
    declineGameInvite,
    acceptFriendRequest,
    declineFriendRequest,
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

export function useEventContext(): EventContextValue {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEventContext must be used within EventProvider');
  }
  return context;
}

/**
 * Hook for game-specific real-time synchronization
 * Provides game state subscription and move handling for a specific game
 */
export function useGameState(gameId: string | undefined, gameVersion?: number) {
  const context = useEventContext();

  // Get the game state for this specific gameId
  const gameState = gameId ? context.activeGames.get(gameId) : undefined;

  // Connection state is derived from the main EventContext connection
  const isConnected = context.connectionState === 'connected';
  const isReconnecting = context.connectionState === 'reconnecting';

  // Game-specific methods
  const sendMove = useCallback(
    async (move: any, version?: number) => {
      if (!gameId) return false;

      try {
        const success = await context.makeGameMove(gameId, move, version ?? gameVersion);
        return success;
      } catch (error) {
        console.error('Failed to send move:', error);
        return false;
      }
    },
    [gameId, gameVersion, context]
  );

  return {
    // State
    gameState,
    isConnected,
    isReconnecting,
    connectionError: context.error,

    // Actions
    sendMove,
    reconnect: context.reconnect,
  };
}

/**
 * Hook for getting real-time game invites
 */
export function useGameInvites() {
  const context = useEventContext();
  return {
    invites: context.gameInvites,
    acceptInvite: context.acceptGameInvite,
    declineInvite: context.declineGameInvite,
  };
}