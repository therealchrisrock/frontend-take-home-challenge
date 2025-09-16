import { useCallback, useState } from "react";
import type { Board, Move, PieceColor } from "~/lib/game/logic";
import { api } from "~/trpc/react";

interface MultiplayerStatus {
  isConnected: boolean;
  connectionId: string | null;
  error: string | null;
}

interface UseOnlineMultiplayerOptions {
  gameId?: string;
}

export function useOnlineMultiplayer({ gameId }: UseOnlineMultiplayerOptions) {
  const [status, setStatus] = useState<MultiplayerStatus>({
    isConnected: false,
    connectionId: null,
    error: null,
  });

  const joinGame = api.multiplayerGame.joinGame.useMutation();
  const makeMove = api.multiplayerGame.makeMove.useMutation();
  const requestDraw = api.multiplayerGame.requestDraw.useMutation();
  const respondToDraw = api.multiplayerGame.respondToDraw.useMutation();

  const sendMove = useCallback(
    async (
      move: Move,
      opts?: {
        board?: Board;
        currentPlayer?: PieceColor;
        moveCount?: number;
        gameVersion?: number;
      },
    ) => {
      if (!gameId) return false;
      try {
        const res = await makeMove.mutateAsync({
          gameId,
          move,
          gameVersion: opts?.gameVersion ?? 0,
        });
        return !!res.success;
      } catch (e) {
        return false;
      }
    },
    [gameId, makeMove],
  );

  const sendDrawRequest = useCallback(
    async (playerId?: string | null, guestSessionId?: string) => {
      if (!gameId) return false;
      try {
        const res = await requestDraw.mutateAsync({
          gameId,
          playerId: playerId ?? null,
          guestSessionId,
        });
        return res.success;
      } catch (e) {
        console.error("Failed to send draw request:", e);
        return false;
      }
    },
    [gameId, requestDraw],
  );

  const sendDrawResponse = useCallback(
    async (accept: boolean, playerId?: string | null, guestSessionId?: string) => {
      if (!gameId) return false;
      try {
        const res = await respondToDraw.mutateAsync({
          gameId,
          accept,
          playerId: playerId ?? null,
          guestSessionId,
        });
        return res.success;
      } catch (e) {
        console.error("Failed to send draw response:", e);
        return false;
      }
    },
    [gameId, respondToDraw],
  );

  // Note: SSE connection is now handled by useGameSync hook
  // This hook only handles sending moves via tRPC
  return {
    status,
    sendMove,
    sendDrawRequest,
    sendDrawResponse,
  } as const;
}
