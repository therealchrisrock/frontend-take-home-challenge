import type { NotificationType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  checkWinner,
  getValidMoves,
  makeMove,
  type Board,
  type Move,
  type Position,
} from "~/lib/game/logic";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { eventEmitter } from "~/server/event-emitter";
import { createEvent, SSEEventType } from "~/types/sse-events";

const PositionSchema = z.object({
  row: z.number().int().min(0),
  col: z.number().int().min(0),
});

const MoveSchema = z.object({
  from: PositionSchema,
  to: PositionSchema,
  captures: z.array(PositionSchema).optional(),
});

const PlayerRoleSchema = z.enum(["PLAYER_1", "PLAYER_2", "SPECTATOR"]);

const GameStateSchema = z.object({
  id: z.string(),
  board: z.string(), // JSON serialized board
  currentPlayer: z.enum(["red", "black"]),
  moveCount: z.number(),
  winner: z.string().nullable(),
  version: z.number(),
  players: z.object({
    player1: z.object({
      id: z.string().nullable(),
      username: z.string().nullable(),
      isGuest: z.boolean(),
      displayName: z.string().nullable(),
    }),
    player2: z.object({
      id: z.string().nullable(),
      username: z.string().nullable(),
      isGuest: z.boolean(),
      displayName: z.string().nullable(),
    }),
  }),
  spectatorCount: z.number(),
  lastMove: z
    .object({
      from: PositionSchema,
      to: PositionSchema,
      captures: z.array(PositionSchema),
      timestamp: z.date(),
    })
    .nullable(),
});

export const multiplayerGameRouter = createTRPCRouter({
  /**
   * Join a multiplayer game as player or spectator
   * Determines role based on available slots and guest status
   */
  joinGame: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
        guestInfo: z
          .object({
            displayName: z.string().min(1).max(20),
            sessionId: z.string().optional(), // For guest session tracking
          })
          .optional(),
      }),
    )
    .output(
      z.object({
        playerRole: PlayerRoleSchema,
        gameState: GameStateSchema,
        connectionId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.db.game.findUnique({
        where: { id: input.gameId },
        include: {
          player1: {
            select: { id: true, username: true, name: true },
          },
          player2: {
            select: { id: true, username: true, name: true },
          },
        },
      });

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      if (game.gameMode !== "online") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This game is not a multiplayer game",
        });
      }

      const isGuest = !ctx.session?.user;
      const userId = ctx.session?.user?.id;
      let playerRole: "PLAYER_1" | "PLAYER_2" | "SPECTATOR" = "SPECTATOR";

      // Determine player role
      if (userId === game.player1Id) {
        playerRole = "PLAYER_1";
      } else if (userId === game.player2Id) {
        playerRole = "PLAYER_2";
      } else if (isGuest && !game.player2Id) {
        // Guest can take player 2 slot if available
        playerRole = "PLAYER_2";
      } else if (!isGuest && !game.player2Id) {
        // Authenticated user can take player 2 slot
        await ctx.db.game.update({
          where: { id: input.gameId },
          data: { player2Id: userId },
        });
        playerRole = "PLAYER_2";
      }
      // Otherwise remains as SPECTATOR

      // Parse game configuration for guest info
      let gameConfig: any = {};
      try {
        gameConfig = game.gameConfig ? JSON.parse(game.gameConfig) : {};
      } catch (error) {
        // Ignore parsing errors
      }

      // Generate connection ID for tracking this session
      const connectionId = `${input.gameId}_${userId || "guest"}_${Date.now()}`;

      // Get last move from database
      const lastMove = await ctx.db.gameMove.findFirst({
        where: { gameId: input.gameId },
        orderBy: { moveIndex: "desc" },
      });

      // Build game state response
      const gameState = {
        id: game.id,
        board: game.board,
        currentPlayer: game.currentPlayer as "red" | "black",
        moveCount: game.moveCount,
        winner: game.winner,
        version: game.version,
        players: {
          player1: {
            id: game.player1?.id || null,
            username: game.player1?.username || null,
            isGuest: false,
            displayName: game.player1?.name || game.player1?.username || null,
          },
          player2: {
            id: game.player2?.id || null,
            username: game.player2?.username || null,
            isGuest: !game.player2Id && playerRole === "PLAYER_2",
            displayName:
              !game.player2Id && playerRole === "PLAYER_2" && isGuest
                ? input.guestInfo?.displayName || null
                : game.player2?.name || game.player2?.username || null,
          },
        },
        spectatorCount: 0, // TODO: Implement spectator counting
        lastMove: lastMove
          ? {
              from: { row: lastMove.fromRow, col: lastMove.fromCol },
              to: { row: lastMove.toRow, col: lastMove.toCol },
              captures: lastMove.captures
                ? (JSON.parse(lastMove.captures) as Position[])
                : [],
              timestamp: lastMove.createdAt,
            }
          : null,
      };

      // Emit SSE event for player joining
      // TODO: Implement SSE emission
      // await emitSSEEvent(input.gameId, {
      //   type: 'PLAYER_JOINED',
      //   data: { playerRole, connectionId, isGuest }
      // });

      return {
        playerRole,
        gameState,
        connectionId,
      };
    }),

  /**
   * Make a move in a multiplayer game with server-side validation
   * Uses optimistic locking to prevent race conditions
   */
  makeMove: protectedProcedure
    .input(
      z.object({
        gameId: z.string(),
        move: MoveSchema,
        gameVersion: z.number(), // For optimistic locking
        guestSessionId: z.string().optional(), // For guest players
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
        newGameState: GameStateSchema.optional(),
        conflictResolution: z
          .object({
            serverVersion: z.number(),
            conflictingMoves: z.array(MoveSchema),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.db.game.findUnique({
        where: { id: input.gameId },
        include: {
          player1: {
            select: { id: true, username: true, name: true },
          },
          player2: {
            select: { id: true, username: true, name: true },
          },
        },
      });

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      if (game.winner) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game has already ended",
        });
      }

      // Prevent any moves until opponent slot is filled (lobby state)
      if (!game.player2Id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Waiting for opponent to join",
        });
      }

      // Check optimistic locking - prevent race conditions
      if (game.version !== input.gameVersion) {
        // Get moves that happened after client's version
        const conflictingMoves = await ctx.db.gameMove.findMany({
          where: {
            gameId: input.gameId,
            moveIndex: { gte: input.gameVersion },
          },
          orderBy: { moveIndex: "asc" },
        });

        return {
          success: false,
          conflictResolution: {
            serverVersion: game.version,
            conflictingMoves: conflictingMoves.map((move) => ({
              from: { row: move.fromRow, col: move.fromCol },
              to: { row: move.toRow, col: move.toCol },
              captures: move.captures ? JSON.parse(move.captures) : [],
            })),
          },
        };
      }

      const userId = ctx.session.user.id;
      const isGuest = !!input.guestSessionId;

      // Verify player has permission to make moves
      let canMove = false;
      let playerColor: "red" | "black" | null = null;

      if (userId === game.player1Id) {
        canMove = game.currentPlayer === "red";
        playerColor = "red";
      } else if (userId === game.player2Id) {
        canMove = game.currentPlayer === "black";
        playerColor = "black";
      }

      if (!canMove) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "It's not your turn or you don't have permission to move",
        });
      }

      // Parse current board state
      let currentBoard: Board;
      try {
        currentBoard = JSON.parse(game.board);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Invalid board state",
        });
      }

      // Determine board size and validate move bounds dynamically (supports 8/10/12 etc.)
      const boardSize: number =
        typeof (game as any).boardSize === "number" &&
        (game as any).boardSize > 0
          ? (game as any).boardSize
          : Array.isArray(currentBoard)
            ? (currentBoard as any[]).length
            : 8;

      const positionsToCheck = [
        input.move.from,
        input.move.to,
        ...(input.move.captures ?? []),
      ];

      const outOfBounds = positionsToCheck.some(
        (p) =>
          p.row < 0 || p.col < 0 || p.row >= boardSize || p.col >= boardSize,
      );

      if (outOfBounds) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Move is out of bounds",
        });
      }

      // Validate move by checking if it's in the list of valid moves
      const validMoves = getValidMoves(
        currentBoard,
        input.move.from,
        playerColor!,
      );

      const moveObj: Move = {
        from: input.move.from,
        to: input.move.to,
        captures: input.move.captures || [],
      };

      const isValidMove = validMoves.some(
        (validMove) =>
          validMove.from.row === moveObj.from.row &&
          validMove.from.col === moveObj.from.col &&
          validMove.to.row === moveObj.to.row &&
          validMove.to.col === moveObj.to.col,
      );

      if (!isValidMove) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid move",
        });
      }

      // Apply move to board
      const newBoard = makeMove(currentBoard, moveObj);

      // Check for winner after move
      const winner = checkWinner(newBoard);

      // Extract captured pieces from the move (if any)
      const capturedPieces = moveObj.captures || [];

      const nextPlayer = game.currentPlayer === "red" ? "black" : "red";
      const newVersion = game.version + 1;

      // Determine the winner value to save (handle draw results)
      let winnerToSave: string | undefined;
      if (winner) {
        if (typeof winner === "string") {
          winnerToSave = winner;
        } else if (typeof winner === "object" && "type" in winner) {
          // It's a draw result
          winnerToSave = "draw";
        }
      }

      // Update game in database with transaction
      const updatedGame = await ctx.db.$transaction(async (tx) => {
        // Get the next move index using Prisma to avoid case-sensitive raw SQL issues
        const lastMove = await tx.gameMove.findFirst({
          where: { gameId: input.gameId },
          orderBy: { moveIndex: "desc" },
          select: { moveIndex: true },
        });
        const nextMoveIndex = (lastMove?.moveIndex ?? -1) + 1;

        // Save the move
        await tx.gameMove.create({
          data: {
            gameId: input.gameId,
            moveIndex: nextMoveIndex,
            fromRow: input.move.from.row,
            fromCol: input.move.from.col,
            toRow: input.move.to.row,
            toCol: input.move.to.col,
            captures:
              capturedPieces.length > 0 ? JSON.stringify(capturedPieces) : null,
          },
        });

        // Update game state
        const updated = await tx.game.update({
          where: { id: input.gameId },
          data: {
            board: JSON.stringify(newBoard),
            currentPlayer: winner ? game.currentPlayer : nextPlayer,
            moveCount: game.moveCount + 1,
            winner: winnerToSave,
            version: newVersion,
          },
          include: {
            player1: {
              select: { id: true, username: true, name: true },
            },
            player2: {
              select: { id: true, username: true, name: true },
            },
          },
        });

        return updated;
      });

      // Build updated game state
      const newGameState = {
        id: updatedGame.id,
        board: updatedGame.board,
        currentPlayer: updatedGame.currentPlayer as "red" | "black",
        moveCount: updatedGame.moveCount,
        winner: updatedGame.winner,
        version: updatedGame.version,
        players: {
          player1: {
            id: updatedGame.player1?.id || null,
            username: updatedGame.player1?.username || null,
            isGuest: false,
            displayName:
              updatedGame.player1?.name ||
              updatedGame.player1?.username ||
              null,
          },
          player2: {
            id: updatedGame.player2?.id || null,
            username: updatedGame.player2?.username || null,
            isGuest: isGuest && !updatedGame.player2Id,
            displayName:
              updatedGame.player2?.name ||
              updatedGame.player2?.username ||
              null,
          },
        },
        spectatorCount: 0,
        lastMove: {
          from: input.move.from,
          to: input.move.to,
          captures: input.move.captures || [],
          timestamp: new Date(),
        },
      };

      // Emit game move event for real-time synchronization
      const gameMoveEvent = createEvent(SSEEventType.GAME_MOVE, {
        gameId: input.gameId,
        move: input.move,
        playerId: userId,
        playerColor: playerColor!,
        newBoard: newGameState.board,
        currentPlayer: newGameState.currentPlayer,
        winner: newGameState.winner,
        moveCount: newGameState.moveCount,
        version: newGameState.version,
      });
      // Broadcast to all players watching this game
      eventEmitter.emitToChannel(`game:${input.gameId}`, gameMoveEvent);
      // Also emit to both players directly
      if (updatedGame.player1Id) {
        eventEmitter.emitToUser(updatedGame.player1Id, gameMoveEvent);
      }
      if (
        updatedGame.player2Id &&
        updatedGame.player2Id !== updatedGame.player1Id
      ) {
        eventEmitter.emitToUser(updatedGame.player2Id, gameMoveEvent);
      }

      // If game ended, notify players
      if (winnerToSave) {
        const winnerName =
          winnerToSave === "red"
            ? updatedGame.player1?.username || "Red Player"
            : winnerToSave === "black"
              ? updatedGame.player2?.username || "Black Player"
              : "Draw";

        // Notify both players
        if (updatedGame.player1Id) {
          await ctx.db.notification.create({
            data: {
              userId: updatedGame.player1Id,
              type: "GAME_INVITE" as NotificationType,
              title: "Game Finished",
              message: `Game ended. Winner: ${winnerName}`,
              metadata: JSON.stringify({
                gameId: input.gameId,
                winner: winnerToSave,
                gameMode: "online",
              }),
              relatedEntityId: input.gameId,
            },
          });
        }

        if (updatedGame.player2Id) {
          await ctx.db.notification.create({
            data: {
              userId: updatedGame.player2Id,
              type: "GAME_INVITE" as NotificationType,
              title: "Game Finished",
              message: `Game ended. Winner: ${winnerName}`,
              metadata: JSON.stringify({
                gameId: input.gameId,
                winner: winnerToSave,
                gameMode: "online",
              }),
              relatedEntityId: input.gameId,
            },
          });
        }
      }

      return {
        success: true,
        newGameState,
      };
    }),

  /**
   * Get current game state for a multiplayer game
   */
  getGameState: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .output(GameStateSchema)
    .query(async ({ ctx, input }) => {
      const game = await ctx.db.game.findUnique({
        where: { id: input.gameId },
        include: {
          player1: {
            select: { id: true, username: true, name: true },
          },
          player2: {
            select: { id: true, username: true, name: true },
          },
        },
      });

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      // Get last move
      const lastMove = await ctx.db.gameMove.findFirst({
        where: { gameId: input.gameId },
        orderBy: { moveIndex: "desc" },
      });

      return {
        id: game.id,
        board: game.board,
        currentPlayer: game.currentPlayer as "red" | "black",
        moveCount: game.moveCount,
        winner: game.winner,
        version: game.version,
        players: {
          player1: {
            id: game.player1?.id || null,
            username: game.player1?.username || null,
            isGuest: false,
            displayName: game.player1?.name || game.player1?.username || null,
          },
          player2: {
            id: game.player2?.id || null,
            username: game.player2?.username || null,
            isGuest: !game.player2Id,
            displayName: game.player2?.name || game.player2?.username || null,
          },
        },
        spectatorCount: 0, // TODO: Implement spectator counting
        lastMove: lastMove
          ? {
              from: { row: lastMove.fromRow, col: lastMove.fromCol },
              to: { row: lastMove.toRow, col: lastMove.toCol },
              captures: lastMove.captures
                ? (JSON.parse(lastMove.captures) as Position[])
                : [],
              timestamp: lastMove.createdAt,
            }
          : null,
      };
    }),

  /**
   * Leave a multiplayer game
   * Handles clean disconnection and spectator/player management
   */
  leaveGame: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
        connectionId: z.string(),
        guestSessionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.db.game.findUnique({
        where: { id: input.gameId },
        select: {
          id: true,
          player1Id: true,
          player2Id: true,
          winner: true,
        },
      });

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      const userId = ctx.session?.user?.id;
      const isGuest = !!input.guestSessionId;

      // TODO: Handle actual disconnection logic
      // - Remove from spectator count if spectator
      // - Handle player disconnection for active games
      // - Emit SSE event for player leaving

      // Emit SSE event
      // await emitSSEEvent(input.gameId, {
      //   type: 'PLAYER_LEFT',
      //   data: { connectionId: input.connectionId, isGuest }
      // });

      return { success: true };
    }),

  /**
   * Synchronize offline moves with server
   * Used when player reconnects after being offline
   */
  syncGameState: protectedProcedure
    .input(
      z.object({
        gameId: z.string(),
        clientVersion: z.number(),
        pendingMoves: z.array(MoveSchema),
        guestSessionId: z.string().optional(),
      }),
    )
    .output(
      z.object({
        syncResult: z.enum([
          "UP_TO_DATE",
          "SERVER_AHEAD",
          "CONFLICTS_RESOLVED",
        ]),
        gameState: GameStateSchema,
        rejectedMoves: z.array(MoveSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.db.game.findUnique({
        where: { id: input.gameId },
        include: {
          player1: {
            select: { id: true, username: true, name: true },
          },
          player2: {
            select: { id: true, username: true, name: true },
          },
        },
      });

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      let syncResult: "UP_TO_DATE" | "SERVER_AHEAD" | "CONFLICTS_RESOLVED" =
        "UP_TO_DATE";
      const rejectedMoves: Move[] = [];

      if (game.version > input.clientVersion) {
        syncResult = "SERVER_AHEAD";

        // If client has pending moves, they need to be validated against current server state
        if (input.pendingMoves.length > 0) {
          syncResult = "CONFLICTS_RESOLVED";
          // For now, reject all pending moves when there's a version conflict
          // A more sophisticated implementation could try to reconcile moves
          rejectedMoves.push(...input.pendingMoves);
        }
      }

      // Get current game state
      const lastMove = await ctx.db.gameMove.findFirst({
        where: { gameId: input.gameId },
        orderBy: { moveIndex: "desc" },
      });

      const gameState = {
        id: game.id,
        board: game.board,
        currentPlayer: game.currentPlayer as "red" | "black",
        moveCount: game.moveCount,
        winner: game.winner,
        version: game.version,
        players: {
          player1: {
            id: game.player1?.id || null,
            username: game.player1?.username || null,
            isGuest: false,
            displayName: game.player1?.name || game.player1?.username || null,
          },
          player2: {
            id: game.player2?.id || null,
            username: game.player2?.username || null,
            isGuest: !game.player2Id && !!input.guestSessionId,
            displayName: game.player2?.name || game.player2?.username || null,
          },
        },
        spectatorCount: 0,
        lastMove: lastMove
          ? {
              from: { row: lastMove.fromRow, col: lastMove.fromCol },
              to: { row: lastMove.toRow, col: lastMove.toCol },
              captures: lastMove.captures
                ? (JSON.parse(lastMove.captures) as Position[])
                : [],
              timestamp: lastMove.createdAt,
            }
          : null,
      };

      return {
        syncResult,
        gameState,
        rejectedMoves,
      };
    }),

  /**
   * Request a draw in a multiplayer game
   */
  requestDraw: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
        playerId: z.string().nullable(), // null for guests
        guestSessionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.db.game.findUnique({
        where: { id: input.gameId },
        select: {
          id: true,
          player1Id: true,
          player2Id: true,
          currentPlayer: true,
          winner: true,
          syncMetadata: true,
        },
      });

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      if (game.winner) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game has already ended",
        });
      }

      // Determine which player is requesting
      const userId = ctx.session?.user?.id;
      const isPlayer1 = userId === game.player1Id;
      const isPlayer2 =
        userId === game.player2Id || (!userId && input.guestSessionId);

      if (!isPlayer1 && !isPlayer2) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only players can request a draw",
        });
      }

      const requestingPlayer = isPlayer1 ? "red" : "black";

      // Store draw request in syncMetadata
      const syncMetadata = game.syncMetadata
        ? JSON.parse(game.syncMetadata)
        : {};
      syncMetadata.drawRequestedBy = requestingPlayer;
      syncMetadata.drawRequestTime = new Date().toISOString();

      await ctx.db.game.update({
        where: { id: input.gameId },
        data: {
          syncMetadata: JSON.stringify(syncMetadata),
        },
      });

      // Broadcast draw request event
      const drawRequestEvent = createEvent(SSEEventType.DRAW_REQUEST, {
        gameId: input.gameId,
        requestedBy: requestingPlayer,
        timestamp: new Date().toISOString(),
      });
      eventEmitter.emitToChannel(`game:${input.gameId}`, drawRequestEvent);
      // Also emit to both players directly
      if (game.player1Id) {
        eventEmitter.emitToUser(game.player1Id, drawRequestEvent);
      }
      if (game.player2Id && game.player2Id !== game.player1Id) {
        eventEmitter.emitToUser(game.player2Id, drawRequestEvent);
      }

      return { success: true, requestedBy: requestingPlayer };
    }),

  /**
   * Respond to a draw request (accept or decline)
   */
  respondToDraw: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
        accept: z.boolean(),
        playerId: z.string().nullable(),
        guestSessionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.db.game.findUnique({
        where: { id: input.gameId },
        select: {
          id: true,
          player1Id: true,
          player2Id: true,
          syncMetadata: true,
          winner: true,
        },
      });

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      if (game.winner) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game has already ended",
        });
      }

      // Parse syncMetadata to check for draw request
      const syncMetadata = game.syncMetadata
        ? JSON.parse(game.syncMetadata)
        : {};

      if (!syncMetadata.drawRequestedBy) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No pending draw request",
        });
      }

      // Determine which player is responding
      const userId = ctx.session?.user?.id;
      const isPlayer1 = userId === game.player1Id;
      const isPlayer2 =
        userId === game.player2Id || (!userId && input.guestSessionId);

      if (!isPlayer1 && !isPlayer2) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only players can respond to draw requests",
        });
      }

      const respondingPlayer = isPlayer1 ? "red" : "black";

      // Can't respond to your own draw request
      if (respondingPlayer === syncMetadata.drawRequestedBy) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot respond to your own draw request",
        });
      }

      if (input.accept) {
        // Accept draw - end the game
        await ctx.db.game.update({
          where: { id: input.gameId },
          data: {
            winner: "draw",
            syncMetadata: JSON.stringify({
              ...syncMetadata,
              drawRequestedBy: null,
              drawAcceptedAt: new Date().toISOString(),
            }),
          },
        });

        // Broadcast draw acceptance
        const drawAcceptedEvent = createEvent(SSEEventType.DRAW_ACCEPTED, {
          gameId: input.gameId,
          acceptedBy: respondingPlayer,
          timestamp: new Date().toISOString(),
        });
        eventEmitter.emitToChannel(`game:${input.gameId}`, drawAcceptedEvent);
        if (game.player1Id) {
          eventEmitter.emitToUser(game.player1Id, drawAcceptedEvent);
        }
        if (game.player2Id && game.player2Id !== game.player1Id) {
          eventEmitter.emitToUser(game.player2Id, drawAcceptedEvent);
        }

        return { success: true, result: "accepted" };
      } else {
        // Decline draw - clear the request
        delete syncMetadata.drawRequestedBy;
        delete syncMetadata.drawRequestTime;

        await ctx.db.game.update({
          where: { id: input.gameId },
          data: {
            syncMetadata: JSON.stringify(syncMetadata),
          },
        });

        // Broadcast draw decline
        const drawDeclinedEvent = createEvent(SSEEventType.DRAW_DECLINED, {
          gameId: input.gameId,
          declinedBy: respondingPlayer,
          timestamp: new Date().toISOString(),
        });
        eventEmitter.emitToChannel(`game:${input.gameId}`, drawDeclinedEvent);
        if (game.player1Id) {
          eventEmitter.emitToUser(game.player1Id, drawDeclinedEvent);
        }
        if (game.player2Id && game.player2Id !== game.player1Id) {
          eventEmitter.emitToUser(game.player2Id, drawDeclinedEvent);
        }

        return { success: true, result: "declined" };
      }
    }),

  /**
   * Resign from a multiplayer game
   */
  resign: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
        playerId: z.string().nullable(), // null for guests
        guestSessionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.db.game.findUnique({
        where: { id: input.gameId },
        include: {
          player1: { select: { id: true, username: true, name: true } },
          player2: { select: { id: true, username: true, name: true } },
        },
      });

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      if (game.winner) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game has already ended",
        });
      }

      // Determine which player is resigning
      let resigningPlayer: "PLAYER_1" | "PLAYER_2" | null = null;
      let winnerColor: "red" | "black" | null = null;

      if (input.playerId) {
        // Authenticated player
        if (game.player1Id === input.playerId) {
          resigningPlayer = "PLAYER_1";
          winnerColor = "black"; // Player 2 wins
        } else if (game.player2Id === input.playerId) {
          resigningPlayer = "PLAYER_2";
          winnerColor = "red"; // Player 1 wins
        }
      } else if (input.guestSessionId) {
        // Guest player - check sync metadata
        const syncMetadata = game.syncMetadata
          ? (JSON.parse(game.syncMetadata as string) as Record<string, unknown>)
          : {};

        if (syncMetadata.guestPlayer1SessionId === input.guestSessionId) {
          resigningPlayer = "PLAYER_1";
          winnerColor = "black";
        } else if (
          syncMetadata.guestPlayer2SessionId === input.guestSessionId
        ) {
          resigningPlayer = "PLAYER_2";
          winnerColor = "red";
        }
      }

      if (!resigningPlayer || !winnerColor) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a player in this game",
        });
      }

      // Update game status to completed with winner
      await ctx.db.game.update({
        where: { id: input.gameId },
        data: {
          winner: winnerColor,
          syncMetadata: JSON.stringify({
            ...(game.syncMetadata
              ? JSON.parse(game.syncMetadata as string)
              : {}),
            resignedBy: resigningPlayer,
            resignedAt: new Date().toISOString(),
          }),
        },
      });

      // Create notification for the other player if they're authenticated
      const otherPlayerId =
        resigningPlayer === "PLAYER_1" ? game.player2Id : game.player1Id;
      if (otherPlayerId) {
        await ctx.db.notification.create({
          data: {
            userId: otherPlayerId,
            type: "GAME_INVITE" as NotificationType, // Using existing type
            title: "Opponent Resigned",
            message: `Your opponent resigned. You won the game!`,
            metadata: JSON.stringify({
              gameId: input.gameId,
              gameMode: "online",
              winner: winnerColor,
            }),
            relatedEntityId: input.gameId,
          },
        });
      }

      // Broadcast resignation event to all connected clients
      const resignEvent = createEvent(SSEEventType.GAME_RESIGNED, {
        gameId: input.gameId,
        resignedBy: resigningPlayer,
        winner: winnerColor,
        timestamp: new Date().toISOString(),
      });

      eventEmitter.emitToChannel(`game:${input.gameId}`, resignEvent);
      // Also emit to both players directly
      if (game.player1Id) {
        eventEmitter.emitToUser(game.player1Id, resignEvent);
      }
      if (game.player2Id && game.player2Id !== game.player1Id) {
        eventEmitter.emitToUser(game.player2Id, resignEvent);
      }

      return {
        success: true,
        winner: winnerColor,
        message: `${resigningPlayer === "PLAYER_1" ? "Red" : "Black"} resigned. ${winnerColor === "red" ? "Red" : "Black"} wins!`,
      };
    }),
});
