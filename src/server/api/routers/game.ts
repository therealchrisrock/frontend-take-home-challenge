import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import { type Board, type Move, createInitialBoard, makeMove } from '~/lib/game-logic';
import { STORAGE_VERSION } from '~/lib/storage/types';
import { gameSessionManager } from '~/lib/multi-tab/session-manager';
import type { InitialStatePayload, MoveAppliedPayload } from '~/lib/multi-tab/types';

const BoardSchema = z.array(
  z.array(z.union([
    z.object({
      color: z.enum(['red', 'black']),
      type: z.enum(['regular', 'king'])
    }),
    z.null()
  ]))
);

const MoveSchema = z.object({
  from: z.object({ row: z.number(), col: z.number() }),
  to: z.object({ row: z.number(), col: z.number() }),
  captures: z.array(z.object({ row: z.number(), col: z.number() })).optional()
});

// Basic schemas for current functionality
const GameVariantSchema = z.enum(['american', 'brazilian', 'international']);
const PlayModeSchema = z.enum(['casual', 'tournament']);

export const gameRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({
      mode: z.enum(['ai', 'local', 'online']),
      playerName: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Generate a simple 6-character game code
      const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const game = await ctx.db.game.create({
        data: {
          board: JSON.stringify(createInitialBoard()),
          currentPlayer: 'red',
          gameMode: input.mode,
          moveCount: 0,
          version: STORAGE_VERSION
        }
      });

      return {
        id: game.id,
        gameCode,
        success: true
      };
    }),
  
  join: publicProcedure
    .input(z.object({
      gameId: z.string(),
      playerName: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.db.game.findUnique({
        where: { id: input.gameId }
      });

      if (!game) {
        throw new Error('Game not found');
      }

      return {
        id: game.id,
        success: true
      };
    }),

  save: publicProcedure
    .input(z.object({
      id: z.string(),
      board: BoardSchema,
      currentPlayer: z.enum(['red', 'black']),
      moveCount: z.number(),
      gameMode: z.enum(['ai', 'local', 'online']),
      winner: z.enum(['red', 'black', 'draw']).nullable(),
      moves: z.array(MoveSchema).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.db.game.update({
        where: { id: input.id },
        data: {
          board: JSON.stringify(input.board),
          currentPlayer: input.currentPlayer,
          moveCount: input.moveCount,
          gameMode: input.gameMode,
          winner: input.winner
        }
      });

      // Save moves if provided
      if (input.moves && input.moves.length > 0) {
        const existingMoveCount = await ctx.db.gameMove.count({
          where: { gameId: input.id }
        });

        const newMoves = input.moves.slice(existingMoveCount);
        
        if (newMoves.length > 0) {
          await ctx.db.gameMove.createMany({
            data: newMoves.map((move, index) => ({
              gameId: input.id,
              moveIndex: existingMoveCount + index,
              fromRow: move.from.row,
              fromCol: move.from.col,
              toRow: move.to.row,
              toCol: move.to.col,
              captures: move.captures ? JSON.stringify(move.captures) : null
            }))
          });
        }
      }

      return { success: true };
    }),

  load: publicProcedure
    .input(z.object({
      id: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const game = await ctx.db.game.findUnique({
        where: { id: input.id },
        include: {
          moves: {
            orderBy: { moveIndex: 'asc' }
          }
        }
      });

      if (!game) {
        return null;
      }

      const board = JSON.parse(game.board) as Board;
      const moves: Move[] = game.moves.map(move => ({
        from: { row: move.fromRow, col: move.fromCol },
        to: { row: move.toRow, col: move.toCol },
        captures: move.captures ? JSON.parse(move.captures) : undefined
      }));

      return {
        id: game.id,
        board,
        currentPlayer: game.currentPlayer as 'red' | 'black',
        moveCount: game.moveCount,
        moveHistory: moves,
        gameMode: game.gameMode as 'ai' | 'local' | 'online',
        gameStartTime: game.gameStartTime.toISOString(),
        lastSaved: game.lastSaved.toISOString(),
        winner: game.winner as ('red' | 'black' | 'draw') | null,
        version: game.version
      };
    }),

  list: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10)
    }).optional())
    .query(async ({ ctx, input }) => {
      const games = await ctx.db.game.findMany({
        take: input?.limit ?? 10,
        orderBy: { lastSaved: 'desc' },
        select: {
          id: true,
          moveCount: true,
          gameMode: true,
          currentPlayer: true,
          gameStartTime: true,
          lastSaved: true,
          winner: true
        }
      });

      return games.map(game => ({
        id: game.id,
        moveCount: game.moveCount,
        gameMode: game.gameMode as 'ai' | 'local' | 'online',
        currentPlayer: game.currentPlayer as 'red' | 'black',
        gameStartTime: game.gameStartTime.toISOString(),
        lastSaved: game.lastSaved.toISOString(),
        winner: game.winner as ('red' | 'black' | 'draw') | null
      }));
    }),

  delete: publicProcedure
    .input(z.object({
      id: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.game.delete({
        where: { id: input.id }
      });

      return { success: true };
    }),

  deleteAll: publicProcedure
    .mutation(async ({ ctx }) => {
      await ctx.db.game.deleteMany();
      return { success: true };
    }),

  // Multi-tab synchronization procedures
  makeMove: publicProcedure
    .input(z.object({
      gameId: z.string(),
      move: MoveSchema,
      tabId: z.string(),
      optimisticMoveId: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate tab is active for this game
      const isActiveTab = gameSessionManager.isActiveTab(input.gameId, input.tabId);
      if (!isActiveTab) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the active tab can make moves'
        });
      }

      // Get current game state
      const game = await ctx.db.game.findUnique({
        where: { id: input.gameId }
      });

      if (!game) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Game not found'
        });
      }

      const currentBoard = JSON.parse(game.board) as Board;
      
      // Apply move with optimistic locking
      try {
        const newBoard = makeMove(currentBoard, input.move);
        const newMoveCount = game.moveCount + 1;
        const newCurrentPlayer = game.currentPlayer === 'red' ? 'black' : 'red';

        // Update game in database with version check for conflict detection
        const updatedGame = await ctx.db.game.update({
          where: { 
            id: input.gameId,
            version: game.version // Optimistic locking
          },
          data: {
            board: JSON.stringify(newBoard),
            currentPlayer: newCurrentPlayer,
            moveCount: newMoveCount,
            version: game.version + 1
          }
        });

        // Save the move
        await ctx.db.gameMove.create({
          data: {
            gameId: input.gameId,
            moveIndex: newMoveCount - 1,
            fromRow: input.move.from.row,
            fromCol: input.move.from.col,
            toRow: input.move.to.row,
            toCol: input.move.to.col,
            captures: input.move.captures ? JSON.stringify(input.move.captures) : null
          }
        });

        // Create new game state payload
        const newGameState: InitialStatePayload = {
          board: newBoard,
          currentPlayer: newCurrentPlayer,
          moveCount: newMoveCount,
          winner: null, // TODO: Check for winner
          gameStartTime: game.gameStartTime.toISOString(),
          version: updatedGame.version
        };

        // Broadcast move to all tabs
        gameSessionManager.broadcastToTabs(input.gameId, {
          type: 'MOVE_APPLIED',
          payload: {
            move: input.move,
            newGameState,
            optimisticMoveId: input.optimisticMoveId
          } as MoveAppliedPayload,
          timestamp: new Date().toISOString(),
          gameId: input.gameId
        }, input.tabId); // Exclude the tab that made the move

        return {
          success: true,
          gameState: newGameState
        };

      } catch (error) {
        // Handle version conflict (optimistic locking failure)
        if (error instanceof Error && error.message.includes('version')) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Game state has been modified by another tab. Please retry.'
          });
        }
        throw error;
      }
    }),

  requestTabActivation: publicProcedure
    .input(z.object({
      gameId: z.string(),
      tabId: z.string()
    }))
    .mutation(async ({ input }) => {
      const success = gameSessionManager.setActiveTab(input.gameId, input.tabId);
      
      if (success) {
        // Broadcast active tab change
        gameSessionManager.broadcastToTabs(input.gameId, {
          type: 'ACTIVE_TAB_CHANGED',
          payload: { activeTabId: input.tabId },
          timestamp: new Date().toISOString(),
          gameId: input.gameId
        });
      }

      return { success };
    }),

  getTabStatus: publicProcedure
    .input(z.object({
      gameId: z.string(),
      tabId: z.string()
    }))
    .query(async ({ input }) => {
      const gameSession = gameSessionManager.getSession(input.gameId);
      if (!gameSession) {
        return { isActive: true, totalTabs: 1 };
      }

      return {
        isActive: gameSession.activeTabId === input.tabId,
        totalTabs: gameSession.tabs.size,
        activeTabId: gameSession.activeTabId
      };
    }),

  heartbeat: publicProcedure
    .input(z.object({
      gameId: z.string(),
      tabId: z.string()
    }))
    .mutation(async ({ input }) => {
      gameSessionManager.updateTabHeartbeat(input.gameId, input.tabId);
      return { success: true };
    }),

  // Get session stats for monitoring
  getSessionStats: publicProcedure
    .query(async () => {
      return gameSessionManager.getStats();
    }),

  // Sync offline moves when reconnecting
  syncOfflineMoves: publicProcedure
    .input(z.object({
      gameId: z.string(),
      moves: z.array(MoveSchema),
      tabId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const successfulMoves: Move[] = [];
      const failedMoves: Move[] = [];
      
      // Get current game state
      const game = await ctx.db.game.findUnique({
        where: { id: input.gameId }
      });

      if (!game) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Game not found'
        });
      }

      let currentBoard = JSON.parse(game.board) as Board;
      let currentPlayer = game.currentPlayer as 'red' | 'black';
      let moveCount = game.moveCount;

      // Process each offline move
      for (const move of input.moves) {
        try {
          // Apply move
          const newBoard = makeMove(currentBoard, move);
          const newCurrentPlayer = currentPlayer === 'red' ? 'black' : 'red';
          
          // Update database
          await ctx.db.game.update({
            where: { id: input.gameId },
            data: {
              board: JSON.stringify(newBoard),
              currentPlayer: newCurrentPlayer,
              moveCount: moveCount + 1,
              version: game.version + 1
            }
          });

          // Save move to history
          await ctx.db.gameMove.create({
            data: {
              gameId: input.gameId,
              moveIndex: moveCount,
              fromRow: move.from.row,
              fromCol: move.from.col,
              toRow: move.to.row,
              toCol: move.to.col,
              captures: move.captures ? JSON.stringify(move.captures) : null
            }
          });

          // Update state for next iteration
          currentBoard = newBoard;
          currentPlayer = newCurrentPlayer;
          moveCount++;
          successfulMoves.push(move);

        } catch (error) {
          console.error('Failed to sync offline move:', error);
          failedMoves.push(move);
        }
      }

      // Broadcast updated state to all tabs
      const newGameState: InitialStatePayload = {
        board: currentBoard,
        currentPlayer,
        moveCount,
        winner: null, // TODO: Check for winner
        gameStartTime: game.gameStartTime.toISOString(),
        version: game.version + successfulMoves.length
      };

      gameSessionManager.broadcastToTabs(input.gameId, {
        type: 'INITIAL_STATE',
        payload: newGameState,
        timestamp: new Date().toISOString(),
        gameId: input.gameId
      });

      return {
        success: true,
        syncedMoves: successfulMoves.length,
        failedMoves: failedMoves.length,
        gameState: newGameState
      };
    })
});