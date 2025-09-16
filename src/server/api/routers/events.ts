/**
 * Events Router with Unified tRPC SSE Subscription
 * 
 * This router provides a single subscription endpoint that handles ALL real-time events
 * using tRPC's built-in subscription support with SSE transport.
 * 
 * Architecture:
 * - Single subscription endpoint (onAllEvents) for all real-time data
 * - Observable pattern for merging multiple event sources
 * - Mutations emit events through the event emitter
 * - Full type safety with TypeScript
 */

import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { eventEmitter } from '~/server/event-emitter';
import { 
  createEvent,
  SSEEventType,
  type SSEEvent,
  type MessagePayload,
  type TypingPayload,
  type GameMovePayload,
  type NotificationPayload,
  type FriendRequestPayload,
  type PresencePayload,
} from '~/types/sse-events';
import { NotificationType } from '@prisma/client';

export const eventsRouter = createTRPCRouter({
  /**
   * UNIFIED SUBSCRIPTION - Single SSE connection for all events
   * 
   * This subscription:
   * 1. Listens to the user's personal channel for notifications, messages, friend requests
   * 2. Subscribes to active game channels for game updates
   * 3. Subscribes to chat channels for messages and typing indicators
   * 4. Provides presence updates for friends
   * 5. Sends periodic heartbeats to keep connection alive
   */
  onAllEvents: protectedProcedure
    .subscription(({ ctx }) => {
      const userId = ctx.session.user.id;
      
      return observable<SSEEvent>((emit) => {
        console.log(`[Events] Starting unified subscription for user ${userId}`);
        
        // Track cleanup functions
        const cleanupFunctions: Array<() => void> = [];
        
        // Send initial connection status
        emit.next(createEvent(
          SSEEventType.CONNECTION_STATUS,
          { 
            connected: true, 
            reconnecting: false,
            error: null,
            lastConnected: new Date().toISOString(),
            status: 'connected',
          }
        ));
        
        // 1. Subscribe to user's personal channel
        const handleUserEvent = (event: SSEEvent) => {
          emit.next(event);
        };
        
        const userChannel = `user:${userId}`;
        eventEmitter.on(userChannel, handleUserEvent);
        cleanupFunctions.push(() => eventEmitter.off(userChannel, handleUserEvent));
        
        // 2. Subscribe to active game channels (async)
        void ctx.db.game.findMany({
          where: {
            OR: [
              { player1Id: userId },
              { player2Id: userId },
            ],
            winner: null, // Only get active games (no winner yet)
          },
          select: { id: true },
        }).then(games => {
          games.forEach(game => {
            const gameChannel = `game:${game.id}`;
            const handleGameEvent = (event: SSEEvent) => {
              emit.next(event);
            };
            eventEmitter.on(gameChannel, handleGameEvent);
            cleanupFunctions.push(() => eventEmitter.off(gameChannel, handleGameEvent));
            console.log(`[Events] Subscribed to game channel: ${gameChannel}`);
          });
        }).catch(error => {
          console.error('[Events] Failed to subscribe to game channels:', error);
        });
        
        // 3. Subscribe to chat channels (if chat model exists)
        // Note: Chat model doesn't exist yet, preparing for future
        /*
        void ctx.db.chat?.findMany({
          where: {
            participants: {
              some: { userId },
            },
          },
          select: { id: true },
        }).then(chats => {
          chats?.forEach(chat => {
            const chatChannel = `chat:${chat.id}`;
            const handleChatEvent = (event: SSEEvent) => {
              emit.next(event);
            };
            eventEmitter.on(chatChannel, handleChatEvent);
            cleanupFunctions.push(() => eventEmitter.off(chatChannel, handleChatEvent));
            console.log(`[Events] Subscribed to chat channel: ${chatChannel}`);
          });
        }).catch(() => {
          // Chat model might not exist, that's okay
        });
        */
        
        // 4. Subscribe to friend presence updates
        void ctx.db.friendship.findMany({
          where: {
            OR: [
              { senderId: userId },
              { receiverId: userId },
            ],
          },
          select: {
            senderId: true,
            receiverId: true,
          },
        }).then(friendships => {
          const friendIds = friendships.map(f => 
            f.senderId === userId ? f.receiverId : f.senderId
          );
          
          friendIds.forEach(friendId => {
            const presenceChannel = `presence:${friendId}`;
            const handlePresenceEvent = (event: SSEEvent) => {
              emit.next(event);
            };
            eventEmitter.on(presenceChannel, handlePresenceEvent);
            cleanupFunctions.push(() => eventEmitter.off(presenceChannel, handlePresenceEvent));
          });
          
          console.log(`[Events] Subscribed to presence for ${friendIds.length} friends`);
        }).catch(error => {
          console.error('[Events] Failed to subscribe to presence updates:', error);
        });
        
        // 5. Heartbeat every 30 seconds
        const heartbeatInterval = setInterval(() => {
          emit.next(createEvent(
            SSEEventType.HEARTBEAT,
            { timestamp: Date.now() }
          ));
        }, 30000);
        
        // Update user's online status
        void ctx.db.user.update({
          where: { id: userId },
          data: { lastActive: new Date() } as any,
        }).then(() => {
          // Notify friends that user is online
          return ctx.db.friendship.findMany({
            where: {
              OR: [
                { senderId: userId },
                { receiverId: userId },
              ],
            },
          });
        }).then(friendships => {
          friendships.forEach(friendship => {
            const friendId = friendship.senderId === userId 
              ? friendship.receiverId 
              : friendship.senderId;
            
            eventEmitter.emitToUser(friendId, createEvent<PresencePayload>(
              SSEEventType.USER_ONLINE,
              {
                userId,
                online: true,
                status: 'online',
                timestamp: Date.now(),
              }
            ));
          });
        }).catch(error => {
          console.error('[Events] Failed to update presence:', error);
        });
        
        // CLEANUP - Critical for preventing memory leaks
        return () => {
          console.log(`[Events] Cleaning up unified subscription for user ${userId}`);
          
          // Clear heartbeat
          clearInterval(heartbeatInterval);
          
          // Run all cleanup functions
          cleanupFunctions.forEach(cleanup => {
            try {
              cleanup();
            } catch (error) {
              console.error('[Events] Cleanup error:', error);
            }
          });
          
          // Update user's offline status
          void ctx.db.user.update({
            where: { id: userId },
            data: { 
              lastActive: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
            } as any,
          }).then(() => {
            return ctx.db.friendship.findMany({
              where: {
                OR: [
                  { senderId: userId },
                  { receiverId: userId },
                ],
              },
            });
          }).then(friendships => {
            friendships.forEach(friendship => {
              const friendId = friendship.senderId === userId 
                ? friendship.receiverId 
                : friendship.senderId;
              
              eventEmitter.emitToUser(friendId, createEvent<PresencePayload>(
                SSEEventType.USER_OFFLINE,
                {
                  userId,
                  online: false,
                  status: 'offline',
                  timestamp: Date.now(),
                }
              ));
            });
          }).catch(error => {
            console.error('[Events] Failed to update offline status:', error);
          });
        };
      });
    }),
  
  // ============================================================================
  // MUTATIONS - These trigger events that flow through the subscription
  // ============================================================================
  
  /**
   * Send a message (direct or in a chat)
   */
  sendMessage: protectedProcedure
    .input(z.object({
      receiverId: z.string(),
      content: z.string().min(1).max(1000),
      chatId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Prevent self-messaging
      if (input.receiverId === ctx.session.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot send message to yourself',
        });
      }
      
      // Check for blocks
      const block = await ctx.db.block.findFirst({
        where: {
          OR: [
            { blockerId: input.receiverId, blockedId: ctx.session.user.id },
            { blockerId: ctx.session.user.id, blockedId: input.receiverId },
          ],
        },
      });
      
      if (block) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot send message to this user',
        });
      }
      
      // Create message
      const message = await ctx.db.message.create({
        data: {
          senderId: ctx.session.user.id,
          receiverId: input.receiverId,
          content: input.content,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
            },
          },
        },
      });
      
      // Create notification
      const notification = await ctx.db.notification.create({
        data: {
          userId: input.receiverId,
          type: NotificationType.MESSAGE,
          title: 'New Message',
          message: `${message.sender.name ?? message.sender.username}: ${input.content.substring(0, 100)}`,
          relatedEntityId: message.id,
          metadata: JSON.stringify({
            senderId: ctx.session.user.id,
            senderName: message.sender.name,
            senderUsername: message.sender.username,
            senderImage: message.sender.image,
            messagePreview: input.content.substring(0, 100),
          }),
        },
      });
      
      // Emit message event
      const messageEvent = createEvent<MessagePayload>(
        SSEEventType.MESSAGE_RECEIVED,
        {
          messageId: message.id,
          chatId: input.chatId,
          senderId: ctx.session.user.id,
          senderName: message.sender.name ?? message.sender.username ?? 'Unknown',
          senderUsername: message.sender.username,
          senderImage: message.sender.image,
          content: input.content,
          createdAt: message.createdAt.toISOString(),
        },
        { 
          userId: input.receiverId,
          channel: input.chatId ? `chat:${input.chatId}` : undefined,
        }
      );
      
      eventEmitter.emitToUser(input.receiverId, messageEvent);
      
      // Emit notification event
      const notificationEvent = createEvent<NotificationPayload>(
        SSEEventType.NOTIFICATION_CREATED,
        {
          id: notification.id,
          type: 'MESSAGE',
          title: notification.title,
          message: notification.message,
          metadata: notification.metadata ? JSON.parse(notification.metadata as string) : undefined,
          relatedEntityId: notification.relatedEntityId ?? undefined,
          createdAt: notification.createdAt.toISOString(),
        },
        { userId: input.receiverId }
      );
      
      eventEmitter.emitToUser(input.receiverId, notificationEvent);
      
      return message;
    }),
  
  /**
   * Set typing status
   */
  setTyping: protectedProcedure
    .input(z.object({
      chatId: z.string(),
      isTyping: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Emit typing event to chat channel
      const typingEvent = createEvent<TypingPayload>(
        input.isTyping ? SSEEventType.TYPING_START : SSEEventType.TYPING_STOP,
        {
          userId: ctx.session.user.id,
          userName: ctx.session.user.name ?? ctx.session.user.username,
          chatId: input.chatId,
          isTyping: input.isTyping,
        },
        { channel: `chat:${input.chatId}` }
      );
      
      // Emit to channel (all participants will receive if subscribed)
      eventEmitter.emit(`chat:${input.chatId}`, typingEvent);
      
      return { success: true };
    }),
  
  /**
   * Make a game move
   */
  makeGameMove: protectedProcedure
    .input(z.object({
      gameId: z.string(),
      move: z.any(),
      gameState: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get game details
      const game = await ctx.db.game.findUnique({
        where: { id: input.gameId },
        include: {
          player1: true,
          player2: true,
        },
      });
      
      if (!game) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Game not found',
        });
      }
      
      // Determine player role and next player
      const playerRole = game.player1Id === ctx.session.user.id ? 'PLAYER_1' : 'PLAYER_2';
      const nextPlayer = playerRole === 'PLAYER_1' ? game.player2Id : game.player1Id;
      
      // Emit game move event to game channel
      const gameMoveEvent = createEvent<GameMovePayload>(
        SSEEventType.GAME_MOVE,
        {
          gameId: input.gameId,
          playerId: ctx.session.user.id,
          playerName: ctx.session.user.name ?? ctx.session.user.username ?? 'Player',
          playerRole,
          move: input.move,
          gameState: input.gameState,
          nextPlayer: nextPlayer ?? undefined,
          currentPlayer: ctx.session.user.id,
          timestamp: Date.now(),
        },
        { channel: `game:${input.gameId}` }
      );
      
      // Emit to game channel (both players will receive)
      eventEmitter.emit(`game:${input.gameId}`, gameMoveEvent);
      
      // Also emit directly to both players' personal channels
      if (game.player1Id) {
        eventEmitter.emitToUser(game.player1Id, gameMoveEvent);
      }
      if (game.player2Id && game.player2Id !== game.player1Id) {
        eventEmitter.emitToUser(game.player2Id, gameMoveEvent);
      }
      
      return { success: true, nextPlayer };
    }),
  
  /**
   * Mark notification as read
   */
  markNotificationRead: protectedProcedure
    .input(z.object({
      notificationId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.db.notification.update({
        where: { 
          id: input.notificationId,
          userId: ctx.session.user.id, // Ensure user owns this notification
        },
        data: { read: true },
      });
      
      // Emit read event to user
      const readEvent = createEvent<NotificationPayload>(
        SSEEventType.NOTIFICATION_READ,
        {
          notificationId: input.notificationId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          readAt: new Date().toISOString(),
        },
        { userId: ctx.session.user.id }
      );
      
      eventEmitter.emitToUser(ctx.session.user.id, readEvent);
      
      return notification;
    }),
  
  /**
   * Update presence status
   */
  updatePresence: protectedProcedure
    .input(z.object({
      status: z.enum(['online', 'offline', 'away']),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update user's last active time
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { 
          lastActive: input.status === 'online' ? new Date() : undefined 
        } as any,
      });
      
      // Get user's friends
      const friendships = await ctx.db.friendship.findMany({
        where: {
          OR: [
            { senderId: ctx.session.user.id },
            { receiverId: ctx.session.user.id },
          ],
        },
      });
      
      // Emit presence update to all friends
      friendships.forEach(friendship => {
        const friendId = friendship.senderId === ctx.session.user.id 
          ? friendship.receiverId 
          : friendship.senderId;
        
        const presenceEvent = createEvent<PresencePayload>(
          input.status === 'online' ? SSEEventType.USER_ONLINE :
          input.status === 'offline' ? SSEEventType.USER_OFFLINE :
          SSEEventType.USER_AWAY,
          {
            userId: ctx.session.user.id,
            online: input.status === 'online',
            status: input.status,
            timestamp: Date.now(),
          }
        );
        
        eventEmitter.emitToUser(friendId, presenceEvent);
      });
      
      return { success: true };
    }),
  
  /**
   * Get event statistics (for debugging/monitoring)
   */
  getStats: protectedProcedure
    .query(() => {
      return eventEmitter.getStats();
    }),
});