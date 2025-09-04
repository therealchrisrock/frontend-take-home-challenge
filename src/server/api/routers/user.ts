import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { FriendshipStatus } from "@prisma/client";

export const userRouter = createTRPCRouter({
  getProfile: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { username: input.username },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if blocked
      if (ctx.session?.user?.id) {
        const block = await ctx.db.block.findFirst({
          where: {
            OR: [
              {
                blockerId: user.id,
                blockedId: ctx.session.user.id,
              },
              {
                blockerId: ctx.session.user.id,
                blockedId: user.id,
              },
            ],
          },
        });

        if (block) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "User not accessible",
          });
        }
      }

      return user;
    }),

  searchUsers: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        where: {
          OR: [
            { username: { contains: input.query } },
            { name: { contains: input.query } },
          ],
        },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
        },
        take: 10,
      });

      // Filter out blocked users if authenticated
      if (ctx.session?.user?.id) {
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

        return users.filter((u) => !blockedIds.has(u.id));
      }

      return users;
    }),

  sendFriendRequest: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot send friend request to yourself",
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

      // Check for existing friendship
      const existing = await ctx.db.friendship.findFirst({
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

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Friend request already exists",
        });
      }

      await ctx.db.friendship.create({
        data: {
          senderId: ctx.session.user.id,
          receiverId: input.userId,
          status: FriendshipStatus.PENDING,
        },
      });

      return { success: true };
    }),

  respondToFriendRequest: protectedProcedure
    .input(
      z.object({
        friendshipId: z.string(),
        accept: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const friendship = await ctx.db.friendship.findUnique({
        where: { id: input.friendshipId },
      });

      if (!friendship) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Friend request not found",
        });
      }

      if (friendship.receiverId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to respond to this request",
        });
      }

      if (input.accept) {
        await ctx.db.friendship.update({
          where: { id: input.friendshipId },
          data: { status: FriendshipStatus.ACCEPTED },
        });
      } else {
        await ctx.db.friendship.delete({
          where: { id: input.friendshipId },
        });
      }

      return { success: true };
    }),

  removeFriend: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const friendship = await ctx.db.friendship.findFirst({
        where: {
          OR: [
            {
              senderId: ctx.session.user.id,
              receiverId: input.userId,
              status: FriendshipStatus.ACCEPTED,
            },
            {
              senderId: input.userId,
              receiverId: ctx.session.user.id,
              status: FriendshipStatus.ACCEPTED,
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

      await ctx.db.friendship.delete({
        where: { id: friendship.id },
      });

      return { success: true };
    }),

  getFriends: protectedProcedure.query(async ({ ctx }) => {
    const friendships = await ctx.db.friendship.findMany({
      where: {
        OR: [
          {
            senderId: ctx.session.user.id,
            status: FriendshipStatus.ACCEPTED,
          },
          {
            receiverId: ctx.session.user.id,
            status: FriendshipStatus.ACCEPTED,
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
    });

    return friendships.map((f) =>
      f.senderId === ctx.session.user.id ? f.receiver : f.sender
    );
  }),

  getPendingFriendRequests: protectedProcedure.query(async ({ ctx }) => {
    const requests = await ctx.db.friendship.findMany({
      where: {
        receiverId: ctx.session.user.id,
        status: FriendshipStatus.PENDING,
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

    return requests;
  }),

  blockUser: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot block yourself",
        });
      }

      // Check if already blocked
      const existing = await ctx.db.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: ctx.session.user.id,
            blockedId: input.userId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already blocked",
        });
      }

      // Remove any existing friendship
      await ctx.db.friendship.deleteMany({
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

      await ctx.db.block.create({
        data: {
          blockerId: ctx.session.user.id,
          blockedId: input.userId,
        },
      });

      return { success: true };
    }),

  unblockUser: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const block = await ctx.db.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: ctx.session.user.id,
            blockedId: input.userId,
          },
        },
      });

      if (!block) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not blocked",
        });
      }

      await ctx.db.block.delete({
        where: { id: block.id },
      });

      return { success: true };
    }),

  getBlockedUsers: protectedProcedure.query(async ({ ctx }) => {
    const blocks = await ctx.db.block.findMany({
      where: { blockerId: ctx.session.user.id },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return blocks.map((b) => b.blocked);
  }),
});