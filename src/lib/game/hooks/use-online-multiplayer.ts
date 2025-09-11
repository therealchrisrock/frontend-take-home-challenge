import { useCallback, useEffect, useRef, useState } from "react";
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

  const eventSourceRef = useRef<EventSource | null>(null);

  const joinGame = api.multiplayerGame.joinGame.useMutation();
  const makeMove = api.multiplayerGame.makeMove.useMutation();

  const connect = useCallback(async () => {
    if (!gameId || eventSourceRef.current) return;
    try {
      // Join to determine role and get a connection id
      const res = await joinGame.mutateAsync({ gameId });

      // Open SSE for this game
      const es = new EventSource(`/api/game/${gameId}/mp-stream`);
      eventSourceRef.current = es;

      es.onopen = () => {
        setStatus({
          isConnected: true,
          connectionId: res.connectionId,
          error: null,
        });
      };

      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.type === "GAME_MOVE") {
            // Consumers should listen via GameScreen's existing state sync in getById polling or extend as needed
            // Minimal implementation: no-op here; game state is updated on client by move apply already
          }
        } catch {}
      };

      es.onerror = () => {
        setStatus((s) => ({
          ...s,
          isConnected: false,
          error: "mp-stream error",
        }));
        eventSourceRef.current?.close();
        eventSourceRef.current = null;
      };
    } catch (e) {
      setStatus({
        isConnected: false,
        connectionId: null,
        error: e instanceof Error ? e.message : "join failed",
      });
    }
  }, [gameId, joinGame.mutateAsync]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStatus((s) => ({ ...s, isConnected: false }));
  }, []);

  useEffect(() => {
    if (!gameId || eventSourceRef.current) return;

    const connectToGame = async () => {
      try {
        // Join to determine role and get a connection id
        const res = await joinGame.mutateAsync({ gameId });

        // Open SSE for this game
        const es = new EventSource(`/api/game/${gameId}/mp-stream`);
        eventSourceRef.current = es;

        es.onopen = () => {
          setStatus({
            isConnected: true,
            connectionId: res.connectionId,
            error: null,
          });
        };

        es.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            if (data.type === "GAME_MOVE") {
              // Consumers should listen via GameScreen's existing state sync in getById polling or extend as needed
              // Minimal implementation: no-op here; game state is updated on client by move apply already
            }
          } catch {}
        };

        es.onerror = () => {
          setStatus((s) => ({
            ...s,
            isConnected: false,
            error: "mp-stream error",
          }));
          eventSourceRef.current?.close();
          eventSourceRef.current = null;
        };
      } catch (e) {
        setStatus({
          isConnected: false,
          connectionId: null,
          error: e instanceof Error ? e.message : "join failed",
        });
      }
    };

    void connectToGame();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setStatus((s) => ({ ...s, isConnected: false }));
    };
  }, [gameId]); // Remove joinGame.mutateAsync from dependencies

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

  return {
    status,
    sendMove,
  } as const;
}
