import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const gameNotesRouter = createTRPCRouter({
  get: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ ctx, input }) => {
      const notes = await ctx.db.gameNotes.findUnique({
        where: { gameId: input.gameId },
      });
      
      return notes?.content ?? "";
    }),

  save: publicProcedure
    .input(z.object({ 
      gameId: z.string(),
      content: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const notes = await ctx.db.gameNotes.upsert({
        where: { gameId: input.gameId },
        update: { content: input.content },
        create: {
          gameId: input.gameId,
          content: input.content,
        },
      });
      
      return notes;
    }),

  delete: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.gameNotes.delete({
        where: { gameId: input.gameId },
      }).catch(() => {
        // Ignore if notes don't exist
      });
      
      return { success: true };
    }),
});