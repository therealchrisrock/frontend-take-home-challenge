import { type NextRequest } from "next/server";
import { gameConnectionManager } from "~/lib/sse/game-connection-manager";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: gameId } = await params;
  if (!gameId) return new Response("Missing gameId", { status: 400 });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const connectionId = gameConnectionManager.addConnection(
        gameId,
        controller,
      );

      // On cancel/close
      // @ts-expect-error: controller has no typed signal here; handled via cancel
      controller.connectionId = connectionId;
    },
    cancel(reason) {
      // @ts-expect-error: custom property set in start
      const connectionId: string | undefined = (this as any)?.controller
        ?.connectionId;
      if (connectionId)
        gameConnectionManager.removeConnection(gameId, connectionId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
