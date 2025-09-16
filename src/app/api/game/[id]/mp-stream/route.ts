import { type NextRequest } from "next/server";
import { sseHub } from "~/lib/sse/sse-hub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id: gameId } = params;
  if (!gameId) return new Response("Missing gameId", { status: 400 });

  let heartbeat: NodeJS.Timeout | undefined;
  let clientId: string | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sseHub.addConnection("game", gameId, clientId, controller, { gameId });
      // Emit connection established to mimic previous behavior
      const init = `data: ${JSON.stringify({
        type: "connection_established",
        data: { connectionId: clientId, timestamp: Date.now() },
      })}\n\n`;
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(init));
      // Per-route heartbeat every 30s (lowercase)
      heartbeat = setInterval(() => {
        const hb = `data: ${JSON.stringify({
          type: "heartbeat",
          data: { timestamp: Date.now() },
        })}\n\n`;
        try {
          controller.enqueue(encoder.encode(hb));
        } catch (_) {}
      }, 30000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (clientId) sseHub.removeConnection("game", gameId, clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache, no-store, must-revalidate, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
