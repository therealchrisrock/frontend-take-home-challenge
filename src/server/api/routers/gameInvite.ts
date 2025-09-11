import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import type { GameInviteStatus, NotificationType } from "@prisma/client";
import { nanoid } from "nanoid";

const GameConfigSchema = z.object({
  timeLimit: z.number().optional(),
  variant: z.string().optional(),
  boardSize: z.number().optional(),
});

const GameInvitationResponseSchema = z.object({
  inviteId: z.string(),
  inviteToken: z.string(),
  inviteUrl: z.string(),
  expiresAt: z.date().nullable(),
  gameMode: z.string(),
  variant: z.string().nullable(),
});

export const gameInviteRouter = createTRPCRouter({
  /**
   * Create a new game invitation
   * Can be sent to a specific friend or made as a shareable link
   */
  createInvitation: protectedProcedure
    .input(
      z.object({
        friendId: z.string().optional(), // deprecated - use friendIds instead
        friendIds: z.array(z.string()).optional(), // array of friend IDs for batch invitations
        gameConfig: GameConfigSchema.optional(),
        message: z.string().optional(),
        expiresIn: z.number().default(24), // hours
      })
    )
    .output(GameInvitationResponseSchema.extend({
      friendInvitesSent: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Handle backwards compatibility
      const friendIds = input.friendIds || (input.friendId ? [input.friendId] : []);

      // Verify friendships exist for all provided friend IDs
      if (friendIds.length > 0) {
        const friendships = await ctx.db.friendship.findMany({
          where: {
            OR: friendIds.flatMap(friendId => [
              { senderId: userId, receiverId: friendId },
              { senderId: friendId, receiverId: userId },
            ]),
          },
        });

        const validFriendIds = new Set(
          friendships.map(f => f.senderId === userId ? f.receiverId : f.senderId)
        );

        const invalidFriends = friendIds.filter(id => !validFriendIds.has(id));
        if (invalidFriends.length > 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Friend${invalidFriends.length > 1 ? 's' : ''} not found: ${invalidFriends.join(', ')}`,
          });
        }

        // Check for existing active invitations to prevent duplicates
        const existingInvites = await ctx.db.gameInvite.findMany({
          where: {
            inviterId: userId,
            inviteeId: { in: friendIds },
            status: "PENDING",
          },
        });

        if (existingInvites.length > 0) {
          const existingFriends = existingInvites.map(inv => inv.inviteeId).join(', ');
          throw new TRPCError({
            code: "CONFLICT",
            message: `Active invitation${existingInvites.length > 1 ? 's' : ''} already exist${existingInvites.length === 1 ? 's' : ''} for: ${existingFriends}`,
          });
        }
      }

      // Generate unique invite token  
      const inviteToken = nanoid(12);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + input.expiresIn);

      // Create main invitation record (always created for shareable link)
      const invitation = await ctx.db.gameInvite.create({
        data: {
          inviterId: userId,
          inviteeId: null, // Main invitation is not tied to specific user
          inviteToken,
          status: "PENDING",
          message: input.message,
          gameMode: "online",
          variant: input.gameConfig?.variant || null,
          expiresAt,
        },
      });

      let friendInvitesSent = 0;

      // Create specific invitations for friends
      if (friendIds.length > 0) {
        const friendInvitations = await ctx.db.$transaction(
          friendIds.map(friendId => 
            ctx.db.gameInvite.create({
              data: {
                inviterId: userId,
                inviteeId: friendId,
                inviteToken: `${inviteToken}-${nanoid(4)}`, // Unique token for each friend
                status: "PENDING",
                message: input.message,
                gameMode: "online",
                variant: input.gameConfig?.variant || null,
                expiresAt,
              },
            })
          )
        );

        // Create notifications for each friend
        await ctx.db.$transaction(
          friendIds.map((friendId, index) =>
            ctx.db.notification.create({
              data: {
                userId: friendId,
                type: "GAME_INVITE" as NotificationType,
                title: "Game Invitation",
                message: `${ctx.session.user.username} invited you to play checkers`,
                metadata: JSON.stringify({
                  gameId: null,
                  inviterId: userId,
                  gameMode: "online",
                  variant: input.gameConfig?.variant || null,
                  inviteToken: friendInvitations[index]?.inviteToken,
                  mainInviteToken: inviteToken, // Reference to shareable link
                }),
                relatedEntityId: friendInvitations[index]?.id,
              },
            })
          )
        );

        friendInvitesSent = friendIds.length;

        // TODO: Emit SSE events for real-time notifications
        // This will be handled by the notification system
      }

      return {
        inviteId: invitation.id,
        inviteToken: invitation.inviteToken,
        inviteUrl: `${process.env.NEXTAUTH_URL}/game/invite/${invitation.inviteToken}`,
        expiresAt: invitation.expiresAt,
        gameMode: invitation.gameMode,
        variant: invitation.variant,
        friendInvitesSent,
      };
    }),

  /**
   * Redeem a game invitation (by token)
   * Creates the actual game and assigns player roles
   */
  redeemInvitation: publicProcedure
    .input(
      z.object({
        inviteToken: z.string(),
        guestInfo: z
          .object({
            displayName: z.string().min(1).max(20),
          })
          .optional(),
      })
    )
    .output(
      z.object({
        gameId: z.string(),
        playerRole: z.enum(["PLAYER_1", "PLAYER_2"]),
        isGuest: z.boolean(),
        inviteId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find the invitation
      const invitation = await ctx.db.gameInvite.findUnique({
        where: { inviteToken: input.inviteToken },
        include: {
          inviter: true,
          invitee: true,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      if (invitation.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation is no longer valid",
        });
      }

      // Check if invitation has expired
      if (invitation.expiresAt && new Date() > invitation.expiresAt) {
        // Mark as expired
        await ctx.db.gameInvite.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation expired",
        });
      }

      const isGuest = !ctx.session?.user;
      const userId = ctx.session?.user?.id;

      // Prevent inviter from redeeming their own invitation (unless testing)
      if (userId && userId === invitation.inviterId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot redeem your own invitation",
        });
      }

      // For specific friend invitations, verify the correct user is redeeming
      if (invitation.inviteeId && userId && userId !== invitation.inviteeId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation is not for you",
        });
      }

      // Create the multiplayer game
      const game = await ctx.db.game.create({
        data: {
          board: JSON.stringify([
            [null, { color: "black", type: "regular" }, null, { color: "black", type: "regular" }, null, { color: "black", type: "regular" }, null, { color: "black", type: "regular" }],
            [{ color: "black", type: "regular" }, null, { color: "black", type: "regular" }, null, { color: "black", type: "regular" }, null, { color: "black", type: "regular" }, null],
            [null, { color: "black", type: "regular" }, null, { color: "black", type: "regular" }, null, { color: "black", type: "regular" }, null, { color: "black", type: "regular" }],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [{ color: "red", type: "regular" }, null, { color: "red", type: "regular" }, null, { color: "red", type: "regular" }, null, { color: "red", type: "regular" }, null],
            [null, { color: "red", type: "regular" }, null, { color: "red", type: "regular" }, null, { color: "red", type: "regular" }, null, { color: "red", type: "regular" }],
            [{ color: "red", type: "regular" }, null, { color: "red", type: "regular" }, null, { color: "red", type: "regular" }, null, { color: "red", type: "regular" }, null],
          ]),
          currentPlayer: "red",
          gameMode: "online",
          moveCount: 0,
          version: 1,
          player1Id: invitation.inviterId, // Inviter is always player 1 (red)
          player2Id: isGuest ? null : userId, // Guest players don't get userId assigned
          variant: invitation.variant ? invitation.variant.toUpperCase() as any : "AMERICAN",
          playMode: "CASUAL",
          gameConfig: JSON.stringify({
            boardVariant: invitation.variant || "american",
            playerColor: "black", // Player 2 (redeemer) plays black
            isMultiplayer: true,
            guestInfo: isGuest ? input.guestInfo : null,
          }),
        },
      });

      // Update invitation status and link to game
      await ctx.db.gameInvite.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          gameId: game.id,
        },
      });

      // Determine player role (inviter is always player 1, redeemer is player 2)
      const playerRole = "PLAYER_2";

      // Create notification for inviter that invitation was accepted
      await ctx.db.notification.create({
        data: {
          userId: invitation.inviterId,
          type: "GAME_INVITE" as NotificationType,
          title: "Invitation Accepted",
          message: `${isGuest ? (input.guestInfo?.displayName || "A guest") : ctx.session!.user.username} accepted your game invitation`,
          metadata: JSON.stringify({
            gameId: game.id,
            inviterId: invitation.inviterId,
            gameMode: "online",
            playerRole: "PLAYER_1",
          }),
          relatedEntityId: game.id,
        },
      });

      // TODO: Emit SSE events for real-time updates
      // PLAYER_JOINED event to notify inviter

      return {
        gameId: game.id,
        playerRole,
        isGuest,
        inviteId: invitation.id,
      };
    }),

  /**
   * Get active invitations sent by the current user
   */
  getActiveInvitations: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const invitations = await ctx.db.gameInvite.findMany({
        where: {
          inviterId: ctx.session.user.id,
          status: "PENDING",
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        include: {
          invitee: {
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

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (invitations.length > input.limit) {
        const nextItem = invitations.pop();
        nextCursor = nextItem!.id;
      }

      return {
        invitations: invitations.map((invitation) => ({
          id: invitation.id,
          inviteToken: invitation.inviteToken,
          inviteUrl: `${process.env.NEXTAUTH_URL}/game/invite/${invitation.inviteToken}`,
          invitee: invitation.invitee,
          message: invitation.message,
          gameMode: invitation.gameMode,
          variant: invitation.variant,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
        })),
        nextCursor,
      };
    }),

  /**
   * Cancel a pending invitation
   */
  cancelInvitation: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.gameInvite.findFirst({
        where: {
          id: input.invitationId,
          inviterId: ctx.session.user.id,
          status: "PENDING",
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found or cannot be cancelled",
        });
      }

      await ctx.db.gameInvite.update({
        where: { id: invitation.id },
        data: { status: "CANCELLED" },
      });

      // If invitation was sent to specific friend, notify them of cancellation
      if (invitation.inviteeId) {
        await ctx.db.notification.create({
          data: {
            userId: invitation.inviteeId,
            type: "GAME_INVITE" as NotificationType,
            title: "Invitation Cancelled",
            message: `${ctx.session.user.username} cancelled their game invitation`,
            metadata: JSON.stringify({
              gameId: null,
              inviterId: ctx.session.user.id,
              gameMode: "online",
              cancelled: true,
            }),
            relatedEntityId: invitation.id,
          },
        });
      }

      return { success: true };
    }),

  /**
   * Get invitation details by token (public for guest access)
   */
  getInvitationByToken: publicProcedure
    .input(z.object({ inviteToken: z.string() }))
    .query(async ({ ctx, input }) => {
      const invitation = await ctx.db.gameInvite.findUnique({
        where: { inviteToken: input.inviteToken },
        include: {
          inviter: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
            },
          },
          invitee: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
            },
          },
          game: {
            select: {
              id: true,
              gameMode: true,
              currentPlayer: true,
              winner: true,
            },
          },
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Check if expired and update status
      if (
        invitation.status === "PENDING" &&
        invitation.expiresAt &&
        new Date() > invitation.expiresAt
      ) {
        await ctx.db.gameInvite.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });
        invitation.status = "EXPIRED";
      }

      return {
        id: invitation.id,
        status: invitation.status,
        inviter: invitation.inviter,
        invitee: invitation.invitee,
        message: invitation.message,
        gameMode: invitation.gameMode,
        variant: invitation.variant,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        game: invitation.game,
      };
    }),

  /**
   * Get invitation status with participant information for real-time updates
   */
  getInvitationStatus: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const invitation = await ctx.db.gameInvite.findUnique({
        where: { id: input.invitationId },
        include: {
          inviter: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
            },
          },
          game: {
            select: {
              id: true,
              gameMode: true,
              currentPlayer: true,
              winner: true,
              player1Id: true,
              player2Id: true,
            },
          },
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Check if expired and update status
      if (
        invitation.status === "PENDING" &&
        invitation.expiresAt &&
        new Date() > invitation.expiresAt
      ) {
        await ctx.db.gameInvite.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });
        invitation.status = "EXPIRED";
      }

      // Build participant list
      const participants = [];
      
      // Add inviter as participant
      participants.push({
        id: invitation.inviter.id,
        username: invitation.inviter.username,
        name: invitation.inviter.name,
        image: invitation.inviter.image,
        role: 'inviter' as const,
        status: 'ready' as const,
        joinedAt: invitation.createdAt,
      });

      // If game exists, add player 2 info
      if (invitation.game?.player2Id) {
        const player2 = await ctx.db.user.findUnique({
          where: { id: invitation.game.player2Id },
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
          },
        });

        if (player2) {
          participants.push({
            id: player2.id,
            username: player2.username,
            name: player2.name,
            image: player2.image,
            role: 'invitee' as const,
            status: 'joined' as const,
            joinedAt: invitation.updatedAt,
          });
        }
      }

      // Determine overall status
      let overallStatus = invitation.status.toLowerCase();
      if (invitation.game && participants.length >= 2) {
        overallStatus = 'ready';
      }

      return {
        id: invitation.id,
        status: overallStatus,
        gameId: invitation.game?.id || null,
        participants,
        expiresAt: invitation.expiresAt,
        message: invitation.message,
      };
    }),
});