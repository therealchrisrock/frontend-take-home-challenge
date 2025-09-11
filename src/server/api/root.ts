import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { gameRouter } from "~/server/api/routers/game";
import { authRouter } from "~/server/api/routers/auth";
import { userRouter } from "~/server/api/routers/user";
import { messageRouter } from "~/server/api/routers/message";
import { friendRequestRouter } from "~/server/api/routers/friendRequest";
import { gameInviteRouter } from "~/server/api/routers/gameInvite";
import { multiplayerGameRouter } from "~/server/api/routers/multiplayerGame";

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
