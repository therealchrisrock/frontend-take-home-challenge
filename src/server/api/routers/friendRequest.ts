import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { FriendRequestStatus, NotificationType } from "@prisma/client";
import { eventEmitter } from "~/server/event-emitter";
import { 
  createEvent, 
  SSEEventType,
  type FriendRequestPayload,
  type NotificationPayload,
} from "~/types/sse-events";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const friendRequestRouter = createTRPCRouter({
  send: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        message: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent self-friend request
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot send friend request to yourself",
        });
      }

      // Check if target user exists
      const targetUser = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { id: true, username: true, name: true },
      });

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check for blocks
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
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot send friend request",
        });
      }

      // Check for existing friend request (excluding cancelled ones)
      const existingRequest = await ctx.db.friendRequest.findFirst({
        where: {
          OR: [
            {
              senderId: ctx.session.user.id,
              receiverId: input.userId,
              status: {
                in: [FriendRequestStatus.PENDING, FriendRequestStatus.ACCEPTED],
              },
            },
            {
              senderId: input.userId,
              receiverId: ctx.session.user.id,
              status: {
                in: [FriendRequestStatus.PENDING, FriendRequestStatus.ACCEPTED],
              },
            },
          ],
        },
      });

      if (existingRequest) {
        // If it's accepted, they're already friends
        if (existingRequest.status === FriendRequestStatus.ACCEPTED) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Already friends with this user",
          });
        }
        // Otherwise it's a pending request
        throw new TRPCError({
          code: "CONFLICT",
          message: "Friend request already exists",
        });
      }

      // Check for existing friendship
      const existingFriendship = await ctx.db.friendship.findFirst({
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
      });

      if (existingFriendship) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Already friends with this user",
        });
      }

      // Create friend request and notification in a transaction
      const result = await ctx.db.$transaction(async (tx) => {
        // Create friend request
        const friendRequest = await tx.friendRequest.create({
          data: {
            senderId: ctx.session.user.id,
            receiverId: input.userId,
            status: FriendRequestStatus.PENDING,
            message: input.message,
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

        // Create notification for receiver
        const created = await tx.notification.create({
          data: {
            userId: input.userId,
            type: NotificationType.FRIEND_REQUEST,
            title: "New Friend Request",
            message: `${ctx.session.user.name || ctx.session.user.username} sent you a friend request`,
            relatedEntityId: friendRequest.id,
            metadata: JSON.stringify({
              senderId: ctx.session.user.id,
              senderName: ctx.session.user.name,
              senderUsername: ctx.session.user.username,
              senderImage: ctx.session.user.image,
              message: input.message,
            }),
          },
        });

        // Emit events for real-time delivery
        try {
          // Emit friend request event
          const friendRequestEvent = createEvent<FriendRequestPayload>(
            SSEEventType.FRIEND_REQUEST_RECEIVED,
            {
              requestId: friendRequest.id,
              senderId: ctx.session.user.id,
              senderName: friendRequest.sender.name,
              senderUsername: friendRequest.sender.username,
              senderImage: friendRequest.sender.image,
              message: input.message,
              status: 'PENDING',
              createdAt: friendRequest.createdAt.toISOString(),
            },
            { userId: input.userId }
          );
          eventEmitter.emitToUser(input.userId, friendRequestEvent);
          
          // Emit notification event
          const notificationEvent = createEvent<NotificationPayload>(
            SSEEventType.NOTIFICATION_CREATED,
            {
              id: created.id,
              type: "FRIEND_REQUEST",
              title: created.title,
              message: created.message,
              metadata: created.metadata
                ? JSON.parse(created.metadata as any)
                : undefined,
              relatedEntityId: created.relatedEntityId ?? undefined,
              createdAt: created.createdAt.toISOString(),
            },
            { userId: input.userId }
          );
          eventEmitter.emitToUser(input.userId, notificationEvent);
          
        } catch (err) {
          console.error("Failed to emit FRIEND_REQUEST events", err);
        }

        return friendRequest;
      });

      return { success: true, friendRequest: result };
    }),

  getPending: protectedProcedure.query(async ({ ctx }) => {
    const pendingRequests = await ctx.db.friendRequest.findMany({
      where: {
        receiverId: ctx.session.user.id,
        status: FriendRequestStatus.PENDING,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return pendingRequests;
  }),

  getSent: protectedProcedure.query(async ({ ctx }) => {
    const sentRequests = await ctx.db.friendRequest.findMany({
      where: {
        senderId: ctx.session.user.id,
        status: FriendRequestStatus.PENDING,
      },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return sentRequests;
  }),

  accept: protectedProcedure
    .input(z.object({ friendRequestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get the friend request
      const friendRequest = await ctx.db.friendRequest.findUnique({
        where: { id: input.friendRequestId },
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

      if (!friendRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Friend request not found",
        });
      }

      // Only the receiver can accept the request
      if (friendRequest.receiverId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to accept this request",
        });
      }

      // Check if request is still pending
      if (friendRequest.status !== FriendRequestStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Friend request is no longer pending",
        });
      }

      // Accept request and create friendship in a transaction
      await ctx.db.$transaction(async (tx) => {
        // Update friend request status
        await tx.friendRequest.update({
          where: { id: input.friendRequestId },
          data: { status: FriendRequestStatus.ACCEPTED },
        });

        // Create bidirectional friendship
        await tx.friendship.create({
          data: {
            senderId: friendRequest.senderId,
            receiverId: friendRequest.receiverId,
          },
        });

        // Create notification for sender
        const created = await tx.notification.create({
          data: {
            userId: friendRequest.senderId,
            type: NotificationType.FRIEND_REQUEST_ACCEPTED,
            title: "Friend Request Accepted",
            message: `${ctx.session.user.name || ctx.session.user.username} accepted your friend request`,
            relatedEntityId: friendRequest.id,
            metadata: JSON.stringify({
              accepterId: ctx.session.user.id,
              accepterName: ctx.session.user.name,
              accepterUsername: ctx.session.user.username,
              accepterImage: ctx.session.user.image,
            }),
          },
        });

        // Emit events to sender
        try {
          // Emit friend request accepted event
          const acceptedEvent = createEvent<FriendRequestPayload>(
            SSEEventType.FRIEND_REQUEST_ACCEPTED,
            {
              requestId: friendRequest.id,
              senderId: friendRequest.senderId,
              receiverId: ctx.session.user.id,
              status: 'ACCEPTED',
            },
            { userId: friendRequest.senderId }
          );
          eventEmitter.emitToUser(friendRequest.senderId, acceptedEvent);
          
          // Emit notification event
          const notificationEvent = createEvent<NotificationPayload>(
            SSEEventType.NOTIFICATION_CREATED,
            {
              id: created.id,
              type: "FRIEND_REQUEST_ACCEPTED",
              title: created.title,
              message: created.message,
              metadata: created.metadata
                ? JSON.parse(created.metadata as any)
                : undefined,
              relatedEntityId: created.relatedEntityId ?? undefined,
              createdAt: created.createdAt.toISOString(),
            },
            { userId: friendRequest.senderId }
          );
          eventEmitter.emitToUser(friendRequest.senderId, notificationEvent);
          
        } catch (err) {
          console.error(
            "Failed to emit FRIEND_REQUEST_ACCEPTED events",
            err,
          );
        }

        // Mark original notification as read (optional cleanup)
        await tx.notification.updateMany({
          where: {
            userId: ctx.session.user.id,
            type: NotificationType.FRIEND_REQUEST,
            relatedEntityId: friendRequest.id,
          },
          data: { read: true },
        });
      });

      return { success: true };
    }),

  decline: protectedProcedure
    .input(z.object({ friendRequestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get the friend request
      const friendRequest = await ctx.db.friendRequest.findUnique({
        where: { id: input.friendRequestId },
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

      if (!friendRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Friend request not found",
        });
      }

      // Only the receiver can decline the request
      if (friendRequest.receiverId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to decline this request",
        });
      }

      // Check if request is still pending
      if (friendRequest.status !== FriendRequestStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Friend request is no longer pending",
        });
      }

      // Decline request and clean up in a transaction
      await ctx.db.$transaction(async (tx) => {
        // Delete the friend request entirely
        await tx.friendRequest.delete({
          where: { id: input.friendRequestId },
        });

        // Create notification for sender (optional - some apps don't notify on decline)
        const created = await tx.notification.create({
          data: {
            userId: friendRequest.senderId,
            type: NotificationType.FRIEND_REQUEST_DECLINED,
            title: "Friend Request Declined",
            message: `${ctx.session.user.name || ctx.session.user.username} declined your friend request`,
            relatedEntityId: friendRequest.id,
            metadata: JSON.stringify({
              declinerId: ctx.session.user.id,
              declinerName: ctx.session.user.name,
              declinerUsername: ctx.session.user.username,
              declinerImage: ctx.session.user.image,
            }),
          },
        });

        // Emit events to sender
        try {
          // Emit friend request declined event
          const declinedEvent = createEvent<FriendRequestPayload>(
            SSEEventType.FRIEND_REQUEST_DECLINED,
            {
              requestId: friendRequest.id,
              senderId: friendRequest.senderId,
              receiverId: ctx.session.user.id,
              status: 'DECLINED',
            },
            { userId: friendRequest.senderId }
          );
          eventEmitter.emitToUser(friendRequest.senderId, declinedEvent);
          
          // Emit notification event
          const notificationEvent = createEvent<NotificationPayload>(
            SSEEventType.NOTIFICATION_CREATED,
            {
              id: created.id,
              type: "FRIEND_REQUEST_DECLINED",
              title: created.title,
              message: created.message,
              metadata: created.metadata
                ? JSON.parse(created.metadata as any)
                : undefined,
              relatedEntityId: created.relatedEntityId ?? undefined,
              createdAt: created.createdAt.toISOString(),
            },
            { userId: friendRequest.senderId }
          );
          eventEmitter.emitToUser(friendRequest.senderId, notificationEvent);
          
        } catch (err) {
          console.error(
            "Failed to emit FRIEND_REQUEST_DECLINED events",
            err,
          );
        }

        // Mark original notification as read
        await tx.notification.updateMany({
          where: {
            userId: ctx.session.user.id,
            type: NotificationType.FRIEND_REQUEST,
            relatedEntityId: friendRequest.id,
          },
          data: { read: true },
        });
      });

      return { success: true };
    }),

  cancel: protectedProcedure
    .input(z.object({ friendRequestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get the friend request
      const friendRequest = await ctx.db.friendRequest.findUnique({
        where: { id: input.friendRequestId },
      });

      if (!friendRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Friend request not found",
        });
      }

      // Only the sender can cancel the request
      if (friendRequest.senderId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to cancel this request",
        });
      }

      // Check if request is still pending
      if (friendRequest.status !== FriendRequestStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Friend request is no longer pending",
        });
      }

      // Cancel request and clean up in a transaction
      await ctx.db.$transaction(async (tx) => {
        // Delete the friend request entirely
        await tx.friendRequest.delete({
          where: { id: input.friendRequestId },
        });

        // Remove related notifications
        await tx.notification.deleteMany({
          where: {
            type: NotificationType.FRIEND_REQUEST,
            relatedEntityId: friendRequest.id,
          },
        });
      });

      return { success: true };
    }),

  checkStatus: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        return { status: "self" };
      }

      // Check for existing friendship
      const friendship = await ctx.db.friendship.findFirst({
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
      });

      if (friendship) {
        return { status: "friends" };
      }

      // Check for pending friend request
      const friendRequest = await ctx.db.friendRequest.findFirst({
        where: {
          OR: [
            {
              senderId: ctx.session.user.id,
              receiverId: input.userId,
              status: FriendRequestStatus.PENDING,
            },
            {
              senderId: input.userId,
              receiverId: ctx.session.user.id,
              status: FriendRequestStatus.PENDING,
            },
          ],
        },
      });

      if (friendRequest) {
        if (friendRequest.senderId === ctx.session.user.id) {
          return { status: "request_sent", friendRequestId: friendRequest.id };
        } else {
          return {
            status: "request_received",
            friendRequestId: friendRequest.id,
          };
        }
      }

      // Check for blocks
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
        return { status: "blocked" };
      }

      return { status: "none" };
    }),

  removeFriend: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Prevent removing self
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove yourself as friend",
        });
      }

      // Check if friendship exists
      const friendship = await ctx.db.friendship.findFirst({
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
      });

      if (!friendship) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Friendship not found",
        });
      }

      // Remove friendship and related friend request in a transaction
      await ctx.db.$transaction(async (tx) => {
        // Delete the friendship
        await tx.friendship.delete({
          where: { id: friendship.id },
        });

        // Also delete any accepted friend request between these users
        // This allows for new friend requests to be sent after removal
        await tx.friendRequest.deleteMany({
          where: {
            OR: [
              {
                senderId: ctx.session.user.id,
                receiverId: input.userId,
                status: FriendRequestStatus.ACCEPTED,
              },
              {
                senderId: input.userId,
                receiverId: ctx.session.user.id,
                status: FriendRequestStatus.ACCEPTED,
              },
            ],
          },
        });
      });

      return { success: true };
    }),
});
