import { type NextRequest } from "next/server";
import { sseHub } from "~/lib/sse/sse-hub";
import { getServerAuthSession } from "~/server/auth";

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const tabId = request.nextUrl.searchParams.get("tabId");
  if (!tabId) return new Response("Missing tabId", { status: 400 });

  if (request.method === "HEAD") {
    return new Response(null, { status: 200 });
  }

  const encoder = new TextEncoder();
  let heartbeat: NodeJS.Timeout | undefined;
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      sseHub.addConnection(
        "messages",
        userId,
        tabId,
        controller,
        { userId, tabId },
        { enforceSingleClient: true },
      );
      // Send an initial event to flush proxies immediately
      const initEvent = `data: ${JSON.stringify({
        type: "CONNECTION_STATUS",
        data: {
          connected: true,
          reconnecting: false,
          error: null,
          lastConnected: new Date().toISOString(),
        },
      })}\n\n`;
      controller.enqueue(encoder.encode(initEvent));

      // Per-route heartbeat every 15s (UPPERCASE for message channel)
      heartbeat = setInterval(() => {
        const hb = `data: ${JSON.stringify({
          type: "HEARTBEAT",
          data: { timestamp: Date.now() },
        })}\n\n`;
        try {
          controller.enqueue(encoder.encode(hb));
        } catch (_) {
          // ignore
        }
      }, 15000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      sseHub.removeConnection("messages", userId, tabId);
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
    },
  });
}

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
