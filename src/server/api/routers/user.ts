import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { FriendshipStatus, GameVariantEnum, PlayModeEnum } from "@prisma/client";
import { generatePresignedUploadUrl, deleteObject, generateAvatarKey, getPublicUrl } from "~/lib/s3";

export const userRouter = createTRPCRouter({
  getProfile: publicProcedure
    .input(z.object({ 
      username: z.string().optional(),
      userId: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: input.userId 
          ? { id: input.userId }
          : { username: input.username },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          emailVerified: true,
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

  // Public site-wide quick stats
  getQuickStats: publicProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const [activePlayers, gamesToday, activeSessions] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.game.count({
        where: { gameStartTime: { gte: startOfDay } },
      }),
      ctx.db.session.findMany({
        where: { expires: { gt: now } },
        select: { userId: true },
      }),
    ]);

    const onlineNow = new Set(activeSessions.map((s) => s.userId)).size;

    return { activePlayers, gamesToday, onlineNow };
  }),

  // Returns friends plus a computed `online` flag based on active NextAuth sessions
  getFriendsWithStatus: protectedProcedure.query(async ({ ctx }) => {
    const friendships = await ctx.db.friendship.findMany({
      where: {
        OR: [
          { senderId: ctx.session.user.id, status: FriendshipStatus.ACCEPTED },
          { receiverId: ctx.session.user.id, status: FriendshipStatus.ACCEPTED },
        ],
      },
      include: {
        sender: {
          select: { id: true, username: true, name: true, image: true },
        },
        receiver: {
          select: { id: true, username: true, name: true, image: true },
        },
      },
    });

    const friends = friendships.map((f) =>
      f.senderId === ctx.session.user.id ? f.receiver : f.sender
    );

    if (friends.length === 0) return [] as Array<
      typeof friends[number] & { online: boolean }
    >;

    const friendIds = friends.map((f) => f.id);

    // Consider a user online if they have at least one non-expired session
    const activeSessions = await ctx.db.session.findMany({
      where: {
        userId: { in: friendIds },
        expires: { gt: new Date() },
      },
      select: { userId: true },
    });

    const onlineSet = new Set(activeSessions.map((s) => s.userId));

    return friends.map((f) => ({ ...f, online: onlineSet.has(f.id) }));
  }),

  // Player data procedures for PlayerCard component
  getCurrentUserProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
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

    return user;
  }),

  getPlayerStats: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(), // If not provided, use current user
        variant: z.nativeEnum(GameVariantEnum).default(GameVariantEnum.AMERICAN),
        playMode: z.nativeEnum(PlayModeEnum).default(PlayModeEnum.CASUAL),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = input.userId || ctx.session.user.id;

      // Check if requesting another user's stats
      if (input.userId && input.userId !== ctx.session.user.id) {
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
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "User stats not accessible",
          });
        }
      }

      const playerRating = await ctx.db.playerRating.findUnique({
        where: {
          userId_variant_playMode: {
            userId,
            variant: input.variant,
            playMode: input.playMode,
          },
        },
      });

      if (!playerRating) {
        // Return default stats if no rating found
        return {
          rating: 1200,
          wins: 0,
          losses: 0,
          draws: 0,
          gamesPlayed: 0,
          provisional: true,
        };
      }

      return {
        rating: playerRating.rating,
        wins: playerRating.wins,
        losses: playerRating.losses,
        draws: playerRating.draws,
        gamesPlayed: playerRating.gamesPlayed,
        provisional: playerRating.provisional,
        peakRating: playerRating.peakRating,
        lastGameDate: playerRating.lastGameDate,
      };
    }),

  getPlayerProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
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

  bulkGetPlayerProfiles: publicProcedure
    .input(z.object({ userIds: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      if (input.userIds.length === 0) {
        return [];
      }

      // Get blocked user IDs if authenticated
      let blockedIds = new Set<string>();
      if (ctx.session?.user?.id) {
        const blocks = await ctx.db.block.findMany({
          where: {
            OR: [
              { blockerId: ctx.session.user.id },
              { blockedId: ctx.session.user.id },
            ],
          },
        });

        blockedIds = new Set([
          ...blocks.map((b) => b.blockedId),
          ...blocks.map((b) => b.blockerId),
        ]);
      }

      const users = await ctx.db.user.findMany({
        where: {
          id: { in: input.userIds },
        },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          createdAt: true,
        },
      });

      // Filter out blocked users
      return users.filter((user) => !blockedIds.has(user.id));
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      userId: z.string(),
      name: z.string().optional(),
      username: z.string().optional(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to update this profile",
        });
      }

      // Check if username is already taken if changing username
      if (input.username) {
        const existing = await ctx.db.user.findFirst({
          where: {
            username: input.username,
            NOT: { id: input.userId }
          }
        });
        
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Username already taken",
          });
        }
      }

      // Check if email is already taken if changing email
      if (input.email) {
        const existing = await ctx.db.user.findFirst({
          where: {
            email: input.email,
            NOT: { id: input.userId }
          }
        });
        
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already in use",
          });
        }
      }

      const updated = await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.username !== undefined && { username: input.username }),
          ...(input.email !== undefined && { email: input.email }),
        },
      });

      return updated;
    }),

  getGameStats: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get all games for the user
      const games = await ctx.db.game.findMany({
        where: {
          OR: [
            { player1Id: input.userId },
            { player2Id: input.userId },
          ],
        },
        select: {
          id: true,
          winner: true,
          gameMode: true,
          player1Id: true,
          player2Id: true,
          gameStartTime: true,
          moveCount: true,
        },
        orderBy: { gameStartTime: "desc" },
      });

      // Calculate statistics
      let wins = 0;
      let losses = 0;
      let draws = 0;
      let aiGames = 0;
      let localGames = 0;
      let onlineGames = 0;

      const recentGames = [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const game of games) {
        // Count by game mode
        if (game.gameMode === "ai") aiGames++;
        else if (game.gameMode === "local") localGames++;
        else if (game.gameMode === "online") onlineGames++;

        // Count wins/losses/draws
        if (game.winner) {
          if (game.winner === "draw") {
            draws++;
          } else {
            // Determine if user was playing as red or black
            const isPlayer1 = game.player1Id === input.userId;
            const playerColor = isPlayer1 ? "red" : "black";
            
            if (game.winner === playerColor) {
              wins++;
            } else {
              losses++;
            }
          }
        }

        // Track recent games (last 30 days)
        if (new Date(game.gameStartTime) > thirtyDaysAgo && game.winner) {
          let result: "win" | "loss" | "draw";
          if (game.winner === "draw") {
            result = "draw";
          } else {
            const isPlayer1 = game.player1Id === input.userId;
            const playerColor = isPlayer1 ? "red" : "black";
            result = game.winner === playerColor ? "win" : "loss";
          }
          
          recentGames.push({
            id: game.id,
            result,
            gameMode: game.gameMode,
            moveCount: game.moveCount,
            date: game.gameStartTime,
          });
        }
      }

      return {
        totalGames: games.length,
        wins,
        losses,
        draws,
        aiGames,
        localGames,
        onlineGames,
        recentGames: recentGames.slice(0, 10), // Return max 10 recent games
      };
    }),

  getMatchHistory: protectedProcedure
    .input(z.object({
      userId: z.string(),
      skip: z.number().default(0),
      take: z.number().default(10),
    }))
    .query(async ({ ctx, input }) => {
      const where = {
        OR: [
          { player1Id: input.userId },
          { player2Id: input.userId },
        ],
      };

      const [matches, total] = await Promise.all([
        ctx.db.game.findMany({
          where,
          select: {
            id: true,
            winner: true,
            gameMode: true,
            moveCount: true,
            gameStartTime: true,
            lastSaved: true,
            player1Id: true,
            player2Id: true,
            player1: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
              },
            },
            player2: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { gameStartTime: "desc" },
          skip: input.skip,
          take: input.take,
        }),
        ctx.db.game.count({ where }),
      ]);

      return {
        matches,
        total,
      };
    }),

  getEnhancedMatchHistory: protectedProcedure
    .input(z.object({
      userId: z.string(),
      skip: z.number().default(0),
      take: z.number().default(15),
      gameMode: z.enum(["ai", "local", "online"]).optional(),
      searchOpponent: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Build where clause
      const whereConditions: any = {
        OR: [
          { player1Id: input.userId },
          { player2Id: input.userId },
        ],
      };

      if (input.gameMode) {
        whereConditions.gameMode = input.gameMode;
      }

      // Search opponent name if provided
      if (input.searchOpponent) {
        whereConditions.AND = [
          {
            OR: [
              { player1Id: input.userId },
              { player2Id: input.userId },
            ],
          },
          {
            OR: [
              {
                player1: {
                  OR: [
                    { name: { contains: input.searchOpponent } },
                    { username: { contains: input.searchOpponent } },
                  ],
                },
              },
              {
                player2: {
                  OR: [
                    { name: { contains: input.searchOpponent } },
                    { username: { contains: input.searchOpponent } },
                  ],
                },
              },
            ],
          },
        ];
      }

      const [matches, total] = await Promise.all([
        ctx.db.game.findMany({
          where: whereConditions,
          select: {
            id: true,
            winner: true,
            gameMode: true,
            moveCount: true,
            gameStartTime: true,
            lastSaved: true,
            player1Id: true,
            player2Id: true,
            player1: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
              },
            },
            player2: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { gameStartTime: "desc" },
          skip: input.skip,
          take: input.take,
        }),
        ctx.db.game.count({ where: whereConditions }),
      ]);

      // Calculate stats
      const allGames = await ctx.db.game.findMany({
        where: {
          OR: [
            { player1Id: input.userId },
            { player2Id: input.userId },
          ],
          winner: { not: null },
        },
        select: {
          winner: true,
          player1Id: true,
          player2Id: true,
          moveCount: true,
        },
      });

      let wins = 0;
      let losses = 0;
      let draws = 0;
      let bestStreak = 0;
      let currentStreak = 0;
      let totalMoves = 0;

      for (const game of allGames) {
        if (game.winner === "draw") {
          draws++;
          currentStreak = 0;
        } else {
          const isPlayer1 = game.player1Id === input.userId;
          const playerColor = isPlayer1 ? "red" : "black";
          
          if (game.winner === playerColor) {
            wins++;
            currentStreak++;
            bestStreak = Math.max(bestStreak, currentStreak);
          } else {
            losses++;
            currentStreak = 0;
          }
        }
        totalMoves += game.moveCount;
      }

      const totalGames = wins + losses + draws;
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
      const avgMoves = totalGames > 0 ? Math.round(totalMoves / totalGames) : 0;

      return {
        matches,
        total,
        stats: {
          totalGames,
          wins,
          losses,
          draws,
          winRate,
          bestStreak,
          avgMoves,
        },
      };
    }),

  getAvatarUploadUrl: protectedProcedure
    .input(z.object({
      filename: z.string(),
      contentType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const key = generateAvatarKey(ctx.session.user.id, input.filename);
      const uploadUrl = await generatePresignedUploadUrl(key, input.contentType);
      
      return {
        uploadUrl,
        key,
        publicUrl: getPublicUrl(key),
      };
    }),

  updateAvatar: protectedProcedure
    .input(z.object({
      image: z.string().url(),
      avatarKey: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Delete old avatar if exists
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { avatarKey: true },
      });

      if (user?.avatarKey) {
        try {
          await deleteObject(user.avatarKey);
        } catch (error) {
          console.error("Failed to delete old avatar:", error);
        }
      }

      // Update user with new avatar
      const updated = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          image: input.image,
          avatarKey: input.avatarKey,
        },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
        },
      });

      return updated;
    }),

  deleteAvatar: protectedProcedure
    .mutation(async ({ ctx }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { avatarKey: true },
      });

      if (user?.avatarKey) {
        try {
          await deleteObject(user.avatarKey);
        } catch (error) {
          console.error("Failed to delete avatar:", error);
        }
      }

      const updated = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          image: null,
          avatarKey: null,
        },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
        },
      });

      return updated;
    }),

  getFriendRequestNotificationCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.friendship.count({
      where: {
        receiverId: ctx.session.user.id,
        status: FriendshipStatus.PENDING,
      },
    });

    return { count };
  }),

  getFriendRequestNotifications: protectedProcedure.query(async ({ ctx }) => {
    const notifications = await ctx.db.friendship.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    return notifications.map(notification => ({
      id: notification.id,
      type: 'FRIEND_REQUEST_RECEIVED' as const,
      sender: notification.sender,
      createdAt: notification.createdAt,
      read: false, // For now, we'll consider all friend requests as unread until acted upon
    }));
  }),

  getLeaderboard: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        variant: z.nativeEnum(GameVariantEnum).default(GameVariantEnum.AMERICAN),
        playMode: z.nativeEnum(PlayModeEnum).default(PlayModeEnum.CASUAL),
      })
    )
    .query(async ({ ctx, input }) => {
      const playerRatings = await ctx.db.playerRating.findMany({
        where: {
          variant: input.variant,
          playMode: input.playMode,
          gamesPlayed: { gt: 0 }, // Only include players who have played at least one game
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // Calculate win rate and sort by it instead of rating
      const playersWithWinRate = playerRatings.map((playerRating) => ({
        id: playerRating.user.id,
        username: playerRating.user.username,
        name: playerRating.user.name,
        image: playerRating.user.image,
        rating: playerRating.rating,
        wins: playerRating.wins,
        losses: playerRating.losses,
        draws: playerRating.draws,
        totalGames: playerRating.gamesPlayed,
        winRate: playerRating.gamesPlayed > 0 
          ? Math.round((playerRating.wins / playerRating.gamesPlayed) * 100 * 10) / 10
          : 0,
        streak: 0, // We'd need to calculate this from recent games
      }));

      // Sort by win rate (descending), then by wins (descending), then by total games (descending)
      const sortedPlayers = playersWithWinRate.sort((a, b) => {
        if (b.winRate !== a.winRate) {
          return b.winRate - a.winRate;
        }
        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }
        return b.totalGames - a.totalGames;
      });

      // Take only the requested limit and add rank
      return sortedPlayers.slice(0, input.limit).map((player, index) => ({
        ...player,
        rank: index + 1,
      }));
    }),
});