import { authRouter } from "~/server/api/routers/auth";
import { friendRequestRouter } from "~/server/api/routers/friendRequest";
import { gameRouter } from "~/server/api/routers/game";
import { gameInviteRouter } from "~/server/api/routers/gameInvite";
import { gameNotesRouter } from "~/server/api/routers/gameNotes";
import { messageRouter } from "~/server/api/routers/message";
import { multiplayerGameRouter } from "~/server/api/routers/multiplayerGame";
import { notificationRouter } from "~/server/api/routers/notification";
import { userRouter } from "~/server/api/routers/user";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  game: gameRouter,
  auth: authRouter,
  user: userRouter,
  message: messageRouter,
  friendRequest: friendRequestRouter,
  gameInvite: gameInviteRouter,
  multiplayerGame: multiplayerGameRouter,
  gameNotes: gameNotesRouter,
  notification: notificationRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
