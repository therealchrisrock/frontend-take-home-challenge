import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "~/trpc/react";
import type { Board, PieceColor, Move } from "~/lib/game-logic";

export interface GameState {
  board: Board;
  currentPlayer: PieceColor;
  moveCount: number;
  moveHistory: Move[];
  gameMode: "ai" | "local" | "online";
  gameStartTime: Date;
  winner: PieceColor | "draw" | null;
}

export interface UseOfflineSyncOptions {
  gameId?: string;
  enabled?: boolean;
  syncInterval?: number;
}

export interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingChanges: number;
  lastSyncTime: Date | null;
  syncError: string | null;
  queueGameUpdate: (gameState: GameState) => void;
  forceSync: () => Promise<void>;
}

export function useOfflineSync(
  options: UseOfflineSyncOptions = {},
): OfflineSyncState {
  const { gameId, enabled = false, syncInterval = 30000 } = options;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const pendingUpdatesRef = useRef<GameState[]>([]);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const createGameMutation = api.game.create.useMutation();
  const saveGameMutation = api.game.save.useMutation();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncError(null);
      // Trigger sync when coming back online
      if (enabled && pendingUpdatesRef.current.length > 0) {
        void syncToServer();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [enabled, syncToServer]);

  // Sync function to send pending updates to server
  const syncToServer = useCallback(async () => {
    if (
      !enabled ||
      !isOnline ||
      isSyncing ||
      pendingUpdatesRef.current.length === 0
    ) {
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const updates = [...pendingUpdatesRef.current];

      for (const gameState of updates) {
        // If no gameId exists, create a new game on server
        let currentGameId = gameId;

        if (!currentGameId) {
          const result = await createGameMutation.mutateAsync({
            mode: gameState.gameMode,
            playerName: "Player",
          });
          currentGameId = result.id;

          // Store the new game ID in local storage for future reference
          if (typeof window !== "undefined") {
            localStorage.setItem("offline_game_id", currentGameId);
          }
        }

        // Save game state to server
        await saveGameMutation.mutateAsync({
          id: currentGameId,
          board: gameState.board,
          currentPlayer: gameState.currentPlayer,
          moveCount: gameState.moveCount,
          gameMode: gameState.gameMode,
          winner: gameState.winner,
          moves: gameState.moveHistory,
        });

        // Remove successfully synced update
        const index = pendingUpdatesRef.current.indexOf(gameState);
        if (index > -1) {
          pendingUpdatesRef.current.splice(index, 1);
        }
      }

      setPendingChanges(pendingUpdatesRef.current.length);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error("Sync failed:", error);
      setSyncError(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  }, [
    enabled,
    isOnline,
    isSyncing,
    gameId,
    createGameMutation,
    saveGameMutation,
  ]);

  // Queue a game update for syncing
  const queueGameUpdate = useCallback(
    (gameState: GameState) => {
      if (!enabled) return;

      // Add to pending updates (replace if same game state)
      pendingUpdatesRef.current = [gameState]; // Keep only latest state
      setPendingChanges(1);

      // Trigger sync if online
      if (isOnline && !isSyncing) {
        void syncToServer();
      }
    },
    [enabled, isOnline, isSyncing, syncToServer],
  );

  // Set up periodic sync interval
  useEffect(() => {
    if (enabled && isOnline && syncInterval > 0) {
      syncIntervalRef.current = setInterval(() => {
        if (pendingUpdatesRef.current.length > 0) {
          void syncToServer();
        }
      }, syncInterval);

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
          syncIntervalRef.current = null;
        }
      };
    }
  }, [enabled, isOnline, syncInterval, syncToServer]);

  // Force sync function
  const forceSync = useCallback(async () => {
    if (isOnline) {
      await syncToServer();
    }
  }, [isOnline, syncToServer]);

  return {
    isOnline,
    isSyncing,
    pendingChanges,
    lastSyncTime,
    syncError,
    queueGameUpdate,
    forceSync,
  };
}
