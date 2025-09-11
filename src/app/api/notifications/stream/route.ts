import { type NextRequest } from "next/server";
import { getServerAuthSession } from "~/server/auth";
import { notificationConnectionManager } from "~/lib/sse/connection-manager";
import type { SSEMessage } from "~/lib/sse/types";

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

  const customReadable = new ReadableStream({
    async start(controller) {
      try {
        // Register connection with the manager
        notificationConnectionManager.addConnection(userId, tabId, controller);

        // Send initial heartbeat to confirm connection
        const heartbeatMessage: SSEMessage = {
          type: 'heartbeat',
          data: {
            tabId,
            timestamp: Date.now(),
          },
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(heartbeatMessage)}\n\n`)
        );

        console.log(`SSE connection established for user ${userId}, tab ${tabId}`);
      } catch (error) {
        console.error("Error in SSE stream setup:", error);

        const errorMessage: SSEMessage = {
          type: 'error',
          data: {
            message: "Failed to initialize notification stream",
            timestamp: Date.now(),
          },
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`)
        );
        controller.close();
      }
    },

    cancel() {
      console.log(`SSE connection cancelled for user ${userId}, tab ${tabId}`);
      notificationConnectionManager.removeConnection(userId, tabId);
    },
  });

  return new Response(customReadable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Connection": "keep-alive",
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