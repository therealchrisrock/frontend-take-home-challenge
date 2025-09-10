import { type NextRequest } from "next/server";
import { gameSessionManager } from "~/lib/multi-tab/session-manager";
import { db } from "~/server/db";
import type { InitialStatePayload } from "~/lib/multi-tab/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const gameId = resolvedParams.id;
  const tabId = request.nextUrl.searchParams.get("tabId");

  if (!gameId || !tabId) {
    return new Response("Missing required parameters", { status: 400 });
  }

  // Check if this is a HEAD request (endpoint check)
  if (request.method === "HEAD") {
    return new Response(null, { status: 200 });
  }

  const encoder = new TextEncoder();

  const customReadable = new ReadableStream({
    async start(controller) {
      try {
        // Register tab and send initial game state
        gameSessionManager.addTab(gameId, tabId, {
          controller,
          lastSeen: new Date(),
        });

        // Send initial state
        const game = await db.game.findUnique({
          where: { id: gameId },
          include: {
            moves: {
              orderBy: { moveIndex: "asc" },
            },
          },
        });

        if (game) {
          const gameState: InitialStatePayload = {
            board: JSON.parse(game.board) as unknown[][],
            currentPlayer: game.currentPlayer as "red" | "black",
            moveCount: game.moveCount,
            winner: game.winner as "red" | "black" | "draw" | null,
            gameStartTime: game.gameStartTime.toISOString(),
            version: game.version,
          };

          const initialEvent = JSON.stringify({
            type: "INITIAL_STATE",
            payload: gameState,
            timestamp: new Date().toISOString(),
            gameId,
            tabId,
          });

          controller.enqueue(encoder.encode(`data: ${initialEvent}\n\n`));
        }

        // Send initial tab status
        const gameSession = gameSessionManager.getSession(gameId);
        if (gameSession) {
          const statusEvent = JSON.stringify({
            type: "TAB_STATUS_UPDATE",
            payload: {
              activeTabId: gameSession.activeTabId,
              totalTabs: gameSession.tabs.size,
            },
            timestamp: new Date().toISOString(),
            gameId,
            tabId,
          });

          controller.enqueue(encoder.encode(`data: ${statusEvent}\n\n`));
        }
      } catch (error) {
        console.error("Error in SSE stream setup:", error);

        const errorEvent = JSON.stringify({
          type: "CONNECTION_STATUS",
          payload: {
            connected: false,
            reconnecting: false,
            error: "Failed to initialize game stream",
            lastConnected: null,
          },
          timestamp: new Date().toISOString(),
          gameId,
          tabId,
        });

        controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
        controller.close();
      }
    },

    cancel() {
      gameSessionManager.removeTab(gameId, tabId);
    },
  });

  return new Response(customReadable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
