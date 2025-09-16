import { type NextRequest } from "next/server";
import { sseHub } from "~/lib/sse/sse-hub";
import type { SSEMessage } from "~/lib/sse/types";
import { getServerAuthSession } from "~/server/auth";
import { db } from "~/server/db";

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const tabId = request.nextUrl.searchParams.get("tabId");

  if (!tabId) {
    return new Response("Missing tabId parameter", { status: 400 });
  }

  // Check if this is a HEAD request (endpoint check)
  if (request.method === "HEAD") {
    return new Response(null, { status: 200 });
  }

  console.log(`Establishing SSE connection for user ${userId}, tab ${tabId}`);

  const encoder = new TextEncoder();
  let heartbeat: NodeJS.Timeout | undefined;

  const customReadable = new ReadableStream({
    async start(controller) {
      try {
        // Register connection with the centralized hub (single-tab per user)
        sseHub.addConnection(
          "notifications",
          userId,
          tabId,
          controller,
          { userId, tabId },
          { enforceSingleClient: true },
        );

        // Update presence timestamp immediately
        try {
          await db.user.update({
            where: { id: userId },
            // Cast to any to avoid transient Prisma type generation mismatch during lint
            data: { lastActive: new Date() } as any,
          });
        } catch (err) {
          console.error("Failed to update presence on connect", err);
        }

        // Broadcast presence:online to friends
        try {
          const friendships = await db.friendship.findMany({
            where: {
              OR: [{ senderId: userId }, { receiverId: userId }],
            },
            select: { senderId: true, receiverId: true },
          });
          const friendIds = friendships.map((f) =>
            f.senderId === userId ? f.receiverId : f.senderId,
          );
          friendIds.forEach((fid) => {
            sseHub.broadcast("notifications", fid, {
              type: "presence",
              data: {
                userId,
                online: true,
                timestamp: Date.now(),
              },
            });
          });
        } catch (err) {
          console.error("Failed to broadcast presence online", err);
        }

        // Send initial heartbeat to confirm connection
        // Initial connection status for NotificationProvider compatibility
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "CONNECTION_STATUS",
              payload: {
                connected: true,
                reconnecting: false,
                error: null,
                lastConnected: new Date().toISOString(),
              },
              timestamp: new Date().toISOString(),
              userId,
            })}\n\n`,
          ),
        );

        // Per-route heartbeat every 30s (uppercase for NotificationProvider compatibility)
        heartbeat = setInterval(() => {
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "HEARTBEAT",
                  payload: { timestamp: new Date().toISOString() },
                  timestamp: new Date().toISOString(),
                  userId,
                })}\n\n`,
              ),
            );
          } catch (_) {
            // best-effort; will be cleaned on cancel
          }
        }, 30000);

        console.log(
          `SSE connection established for user ${userId}, tab ${tabId}`,
        );
      } catch (error) {
        console.error("Error in SSE stream setup:", error);

        const errorMessage: SSEMessage = {
          type: "error",
          data: {
            message: "Failed to initialize notification stream",
            timestamp: Date.now(),
          },
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`),
        );
        controller.close();
      }
    },

    cancel() {
      console.log(`SSE connection cancelled for user ${userId}, tab ${tabId}`);
      if (heartbeat) clearInterval(heartbeat);
      sseHub.removeConnection("notifications", userId, tabId);

      // Mark presence as offline quickly and notify friends
      void (async () => {
        try {
          // Force lastActive sufficiently in the past so server computes offline
          await db.user.update({
            where: { id: userId },
            // Cast to any to avoid transient Prisma type generation mismatch during lint
            data: { lastActive: new Date(Date.now() - 10 * 60 * 1000) } as any,
          });
        } catch (err) {
          console.error("Failed to update presence on disconnect", err);
        }

        try {
          const friendships = await db.friendship.findMany({
            where: {
              OR: [{ senderId: userId }, { receiverId: userId }],
            },
            select: { senderId: true, receiverId: true },
          });
          const friendIds = friendships.map((f) =>
            f.senderId === userId ? f.receiverId : f.senderId,
          );
          friendIds.forEach((fid) => {
            sseHub.broadcast("notifications", fid, {
              type: "presence",
              data: {
                userId,
                online: false,
                timestamp: Date.now(),
              },
            });
          });
        } catch (err) {
          console.error("Failed to broadcast presence offline", err);
        }
      })();
    },
  });

  return new Response(customReadable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      // Prevent buffering in nginx and other proxies
      "X-Accel-Buffering": "no",
    },
  });
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Cache-Control, Authorization",
    },
  });
}
