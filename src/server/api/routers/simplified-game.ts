import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import { createInitialBoard } from '~/lib/game-logic';
import { STORAGE_VERSION } from '~/lib/storage/types';

// Simplified game router for basic game operations
export const simplifiedGameRouter = createTRPCRouter({
  // Create a new game
  create: publicProcedure
    .input(z.object({
      mode: z.enum(['ai', 'local', 'online']).default('ai')
    }))
    .mutation(async ({ ctx, input }) => {
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
        success: true
      };
    }),

  // Get game state
  get: publicProcedure
    .input(z.object({
      id: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const game = await ctx.db.game.findUnique({
        where: { id: input.id }
      });

      if (!game) {
        return null;
      }

      return {
        id: game.id,
        board: JSON.parse(game.board),
        currentPlayer: game.currentPlayer as 'red' | 'black',
        moveCount: game.moveCount,
        gameMode: game.gameMode as 'ai' | 'local' | 'online',
        winner: game.winner as ('red' | 'black' | 'draw') | null,
        gameStartTime: game.gameStartTime.toISOString(),
        lastSaved: game.lastSaved.toISOString()
      };
    })
});