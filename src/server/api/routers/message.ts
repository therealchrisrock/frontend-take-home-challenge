import { NotificationType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { eventEmitter } from "~/server/event-emitter";
import { createEvent, SSEEventType } from "~/types/sse-events";

export const messageRouter = createTRPCRouter({
  sendMessage: protectedProcedure
    .input(
      z.object({
        receiverId: z.string(),
        content: z.string().min(1).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.receiverId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot send message to yourself",
        });
      }

      // Check if blocked
      const block = await ctx.db.block.findFirst({
        where: {
          OR: [
            {
              blockerId: input.receiverId,
              blockedId: ctx.session.user.id,
            },
            {
              blockerId: ctx.session.user.id,
              blockedId: input.receiverId,
            },
          ],
        },
      });

      if (block) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot send message to this user",
        });
      }

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

      // Create a Notification for the receiver (used by notifications SSE and drawer badge)
      try {
        const createdNotification = await ctx.db.notification.create({
          data: {
            userId: input.receiverId,
            type: NotificationType.MESSAGE,
            title: "New Message",
            message:
              (ctx.session.user.name ||
                ctx.session.user.username ||
                "Someone") +
              ": " +
              input.content,
            relatedEntityId: message.id,
            metadata: JSON.stringify({
              senderId: ctx.session.user.id,
              senderName: ctx.session.user.name,
              senderUsername: ctx.session.user.username,
              senderImage: ctx.session.user.image,
            }),
          },
        });

        // Emit notification event
        const notificationEvent = createEvent(SSEEventType.NOTIFICATION_CREATED, {
          id: createdNotification.id,
          type: "MESSAGE" as any,
          title: createdNotification.title,
          message: createdNotification.message ?? "",
          read: createdNotification.read,
          createdAt: createdNotification.createdAt.toISOString(),
          relatedEntityId: createdNotification.relatedEntityId,
          relatedEntityType: createdNotification.relatedEntityType,
          metadata: createdNotification.metadata ? JSON.parse(createdNotification.metadata as string) : undefined,
        });
        eventEmitter.emitToUser(input.receiverId, notificationEvent);
      } catch (err) {
        console.error("Failed to create/broadcast message notification", err);
      }

      // Emit message event to both participants
      const messageEvent = createEvent(SSEEventType.MESSAGE_RECEIVED, {
        id: message.id,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        read: message.read,
        chatId: input.receiverId,
        senderName: ctx.session.user.name ?? ctx.session.user.username ?? "Unknown",
        senderAvatar: ctx.session.user.image,
      });
      eventEmitter.emitToUser(input.receiverId, messageEvent);
      eventEmitter.emitToUser(ctx.session.user.id, messageEvent);

      return message;
    }),

  getConversation: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Check if blocked
      const block = await ctx.db.block.findFirst({
        where: {
          OR: [
            {
              blockerId: input.userId,
              blockedId: ctx.session.user.id,
            },
            {
              blockerId: ctx.session.user.id,
              blockedId: input.userId,
            },
          ],
        },
      });

      if (block) {
        return { messages: [], nextCursor: null };
      }

      const messages = await ctx.db.message.findMany({
        where: {
          OR: [
            {
              senderId: ctx.session.user.id,
              receiverId: input.userId,
            },
            {
              senderId: input.userId,
              receiverId: ctx.session.user.id,
            },
          ],
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
          receiver: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      // Mark messages as read
      await ctx.db.message.updateMany({
        where: {
          senderId: input.userId,
          receiverId: ctx.session.user.id,
          read: false,
        },
        data: { read: true },
      });

      let nextCursor: string | null = null;
      if (messages.length > input.limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem!.id;
      }

      return { messages: messages.reverse(), nextCursor };
    }),

  getConversations: protectedProcedure.query(async ({ ctx }) => {
    // Get latest message from each conversation
    const messages = await ctx.db.message.findMany({
      where: {
        OR: [
          { senderId: ctx.session.user.id },
          { receiverId: ctx.session.user.id },
        ],
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
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Check for blocks
    const blocks = await ctx.db.block.findMany({
      where: {
        OR: [
          { blockerId: ctx.session.user.id },
          { blockedId: ctx.session.user.id },
        ],
      },
    });

    const blockedIds = new Set([
      ...blocks.map((b) => b.blockedId),
      ...blocks.map((b) => b.blockerId),
    ]);

    // Group by conversation and filter blocked users
    const conversationMap = new Map<string, (typeof messages)[0]>();

    for (const message of messages) {
      const otherUserId =
        message.senderId === ctx.session.user.id
          ? message.receiverId
          : message.senderId;

      if (blockedIds.has(otherUserId)) continue;

      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, message);
      }
    }

    // Count unread messages for each conversation
    const conversations = await Promise.all(
      Array.from(conversationMap.entries()).map(
        async ([userId, lastMessage]) => {
          const unreadCount = await ctx.db.message.count({
            where: {
              senderId: userId,
              receiverId: ctx.session.user.id,
              read: false,
            },
          });

          const otherUser =
            lastMessage.senderId === ctx.session.user.id
              ? lastMessage.receiver
              : lastMessage.sender;

          return {
            userId,
            user: otherUser,
            lastMessage,
            unreadCount,
          };
        },
      ),
    );

    return conversations.sort(
      (a, b) =>
        b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime(),
    );
  }),

  markAsRead: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.db.message.findUnique({
        where: { id: input.messageId },
      });

      if (!message) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Message not found",
        });
      }

      if (message.receiverId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to mark this message as read",
        });
      }

      await ctx.db.message.update({
        where: { id: input.messageId },
        data: { read: true },
      });

      // Notify sender that message was read
      const updated = await ctx.db.message.findUnique({
        where: { id: input.messageId },
      });
      if (updated) {
        // Emit message read event
        const readEvent = createEvent(SSEEventType.MESSAGE_READ, {
          messageId: input.messageId,
          userId: ctx.session.user.id,
          chatId: updated.senderId,
        });
        eventEmitter.emitToUser(updated.senderId, readEvent);
        eventEmitter.emitToUser(updated.receiverId, readEvent);
      }

      return { success: true };
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.message.count({
      where: {
        receiverId: ctx.session.user.id,
        read: false,
      },
    });

    return { count };
  }),

  markConversationAsRead: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.message.updateMany({
        where: {
          senderId: input.userId,
          receiverId: ctx.session.user.id,
          read: false,
        },
        data: { read: true },
      });

      return { success: true };
    }),
});
