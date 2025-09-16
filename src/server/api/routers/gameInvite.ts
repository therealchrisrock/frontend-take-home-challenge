import type { NotificationType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { GameConfigLoader } from "~/lib/game-engine/config-loader";
import { createInitialBoard } from "~/lib/game/logic";
import { sseHub } from "~/lib/sse/sse-hub";
import { STORAGE_VERSION } from "~/lib/storage/types";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const GameConfigSchema = z.object({
  timeLimit: z.number().optional(),
  variant: z.string().optional(),
  boardSize: z.number().optional(),
  hostColor: z.enum(["red", "black", "random"]).optional(),
});

const GameInvitationResponseSchema = z.object({
  inviteId: z.string(),
  inviteToken: z.string(),
  inviteUrl: z.string(),
  expiresAt: z.date().nullable(),
  gameMode: z.string(),
  variant: z.string().nullable(),
  gameId: z.string(),
});

export const gameInviteRouter = createTRPCRouter({
  /**
   * Return active pending invitation for current host, if any
   */
  getActiveInviteForHost: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const invitation = await ctx.db.gameInvite.findFirst({
      where: {
        inviterId: userId,
        status: "PENDING",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
      include: { game: { select: { id: true } } },
    });

    if (!invitation) return null;

    return {
      id: invitation.id,
      inviteToken: invitation.inviteToken,
      inviteUrl: `${process.env.NEXTAUTH_URL ?? ""}/game/invite/${invitation.inviteToken}`,
      expiresAt: invitation.expiresAt,
      gameId: invitation.game?.id ?? null,
      status: invitation.status,
    };
  }),
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
      }),
    )
    .output(
      GameInvitationResponseSchema.extend({
        friendInvitesSent: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Handle backwards compatibility
      const friendIds =
        input.friendIds || (input.friendId ? [input.friendId] : []);

      // Validate provided user IDs exist (friendship not required)
      if (friendIds.length > 0) {
        const users = await ctx.db.user.findMany({
          where: { id: { in: friendIds } },
          select: { id: true },
        });

        const existingUserIds = new Set(users.map((u) => u.id));
        const invalidUserIds = friendIds.filter(
          (id) => !existingUserIds.has(id),
        );
        if (invalidUserIds.length > 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `User${invalidUserIds.length > 1 ? "s" : ""} not found: ${invalidUserIds.join(", ")}`,
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
          const existingInviteeIds = existingInvites
            .map((inv) => inv.inviteeId)
            .join(", ");
          throw new TRPCError({
            code: "CONFLICT",
            message: `Active invitation${existingInvites.length > 1 ? "s" : ""} already exist${existingInvites.length === 1 ? "s" : ""} for: ${existingInviteeIds}`,
          });
        }
      }

      // If host already has an active pending invitation, return it (single-active-invite policy)
      const existingActive = await ctx.db.gameInvite.findFirst({
        where: {
          inviterId: userId,
          status: "PENDING",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: { createdAt: "desc" },
        include: { game: true },
      });

      if (existingActive && existingActive.gameId) {
        return {
          inviteId: existingActive.id,
          inviteToken: existingActive.inviteToken,
          inviteUrl: `${process.env.NEXTAUTH_URL ?? ""}/game/invite/${existingActive.inviteToken}`,
          expiresAt: existingActive.expiresAt,
          gameMode: existingActive.gameMode,
          variant: existingActive.variant,
          gameId: existingActive.gameId,
          friendInvitesSent: 0,
        };
      }

      // Generate unique invite token
      const inviteToken = nanoid(12);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + input.expiresIn);

      // Determine rules/config and create the lobby game up front (lobby-first)
      const selectedVariant = input.gameConfig?.variant || "american";
      const rules = await GameConfigLoader.loadVariant(selectedVariant);
      const initialBoard = createInitialBoard(rules);

      // Resolve host color selection
      const hostSelectedColor = input.gameConfig?.hostColor ?? "red";
      const hostColor =
        hostSelectedColor === "random"
          ? Math.random() < 0.5
            ? "red"
            : "black"
          : hostSelectedColor;
      const playerColor = hostColor;

      const game = await ctx.db.game.create({
        data: {
          board: JSON.stringify(initialBoard),
          currentPlayer: "red",
          gameMode: "online",
          moveCount: 0,
          version: STORAGE_VERSION,
          // Assign host to player1 if red, or hold spot for black (player2) if black
          player1Id: hostColor === "red" ? userId : null,
          player2Id: hostColor === "black" ? userId : null,
          variant: selectedVariant.toUpperCase() as any,
          playMode: "CASUAL" as any,
          boardSize: rules.board.size,
          gameConfig: JSON.stringify({
            boardVariant: selectedVariant,
            rules,
            // For client initial orientation, set host's chosen color
            playerColor,
            isMultiplayer: true,
            timeControl: input.gameConfig?.timeLimit
              ? {
                  format: "X+Y",
                  initialMinutes: Math.floor(
                    (input.gameConfig.timeLimit || 0) / 60,
                  ),
                  incrementSeconds: 0,
                }
              : null,
            hostColor: hostSelectedColor,
          }),
        } as any,
      });

      let invitation: {
        id: string;
        inviteToken: string;
        expiresAt: Date | null;
        gameMode: string;
        variant: string | null;
      };

      let friendInvitesSent = 0;

      if (friendIds.length > 0) {
        // SINGLE friend invite: create only one targeted invitation linked to the game (no extra shareable row)
        const targetedToken = `${inviteToken}-${nanoid(4)}`;
        const created = await ctx.db.gameInvite.create({
          data: {
            inviterId: userId,
            inviteeId: friendIds[0],
            inviteToken: targetedToken,
            status: "PENDING",
            message: input.message,
            gameMode: "online",
            variant: selectedVariant,
            expiresAt,
            gameId: game.id,
          },
        });
        invitation = created;
        friendInvitesSent = 1;

        // Notification + SSE to that friend
        await ctx.db.notification.create({
          data: {
            userId: friendIds[0]!,
            type: "GAME_INVITE" as NotificationType,
            title: "Game Invitation",
            message: `${ctx.session.user.username} invited you to play checkers`,
            metadata: JSON.stringify({
              gameId: null,
              inviterId: userId,
              gameMode: "online",
              variant: selectedVariant,
              inviteToken: targetedToken,
            }),
            relatedEntityId: created.id,
          },
        });
        sseHub.broadcast("notifications", friendIds[0]!, {
          type: "notification",
          data: {
            subtype: "GAME_INVITE",
            inviterId: userId,
            inviteToken: targetedToken,
            timestamp: Date.now(),
          },
        });
      } else {
        // Shareable link invite: create a single main invitation linked to the game
        const created = await ctx.db.gameInvite.create({
          data: {
            inviterId: userId,
            inviteeId: null,
            inviteToken,
            status: "PENDING",
            message: input.message,
            gameMode: "online",
            variant: selectedVariant,
            expiresAt,
            gameId: game.id,
          },
        });
        invitation = created;
      }

      return {
        inviteId: invitation.id,
        inviteToken: invitation.inviteToken,
        inviteUrl: `${process.env.NEXTAUTH_URL ?? ""}/game/invite/${invitation.inviteToken}`,
        expiresAt: invitation.expiresAt,
        gameMode: invitation.gameMode,
        variant: invitation.variant,
        gameId: game.id,
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
      }),
    )
    .output(
      z.object({
        gameId: z.string(),
        playerRole: z.enum(["PLAYER_1", "PLAYER_2"]),
        isGuest: z.boolean(),
        inviteId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find the invitation
      const invitation = await ctx.db.gameInvite.findUnique({
        where: { inviteToken: input.inviteToken },
        include: {
          inviter: true,
          invitee: true,
          game: true,
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

      // Use the pre-created game (lobby) and attach the redeemer to the open slot based on host color selection
      const gameId = invitation.gameId;
      if (!gameId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Invitation is missing game reference",
        });
      }

      const game = await ctx.db.game.findUnique({ where: { id: gameId } });
      if (!game) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }

      if (!isGuest && userId) {
        // If player1 is empty, fill player1; else fill player2
        if (!game.player1Id) {
          await ctx.db.game.update({
            where: { id: gameId },
            data: { player1Id: userId },
          });
        } else if (!game.player2Id) {
          await ctx.db.game.update({
            where: { id: gameId },
            data: { player2Id: userId },
          });
        }
      }

      // Update invitation status and link to game
      await ctx.db.gameInvite.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          gameId: gameId,
        },
      });

      // Determine player role for redeemer by the slot filled
      const playerRole = game.player1Id ? "PLAYER_2" : "PLAYER_1";

      // Create notification for inviter that invitation was accepted
      await ctx.db.notification.create({
        data: {
          userId: invitation.inviterId,
          type: "GAME_INVITE" as NotificationType,
          title: "Invitation Accepted",
          message: `${isGuest ? input.guestInfo?.displayName || "A guest" : ctx.session!.user.username} accepted your game invitation`,
          metadata: JSON.stringify({
            gameId: gameId,
            inviterId: invitation.inviterId,
            gameMode: "online",
            playerRole: "PLAYER_1",
          }),
          relatedEntityId: gameId,
        },
      });

      // Emit SSE event for player joining so host can transition out of waiting state
      sseHub.broadcast("game", gameId, {
        type: "PLAYER_JOINED",
        data: {
          playerRole: "PLAYER_2",
          isGuest,
          timestamp: Date.now(),
        },
      });

      return {
        gameId: gameId,
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
      }),
    )
    .query(async ({ ctx, input }) => {
      const invitations = await ctx.db.gameInvite.findMany({
        where: {
          inviterId: ctx.session.user.id,
          status: "PENDING",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
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
        role: "inviter" as const,
        status: "ready" as const,
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
            role: "invitee" as const,
            status: "joined" as const,
            joinedAt: invitation.updatedAt,
          });
        }
      }

      // Determine overall status
      let overallStatus = invitation.status.toLowerCase();
      if (invitation.game && participants.length >= 2) {
        overallStatus = "ready";
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
