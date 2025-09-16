"use client";
import { useSession } from "next-auth/react";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import { useSettings } from "~/contexts/settings-context";
import { useGameSounds } from "~/hooks/useGameSounds";
import { GameConfigLoader } from "~/lib/game-engine/config-loader";
import type { VariantConfig } from "~/lib/game-engine/rule-schema";
import type { AIDifficulty } from "~/lib/game/ai-engine";
import { createDrawState } from "~/lib/game/draw-detection";
import type { PieceColor } from "~/lib/game/logic";
import { createInitialBoard, makeMove } from "~/lib/game/logic";
import {
  createAIGamePlayers,
  createLocalGamePlayers,
} from "~/lib/game/player-types";
import type { TimeControl } from "~/lib/game/time-control-types";
import type { BoardVariant } from "~/lib/game/variants";
import { gameReducer } from "./game-reducer";
import type { GameAction, GameMode, GameState } from "./game-types";

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

interface GameConfig {
  boardVariant: BoardVariant;
  rules: VariantConfig;
  playerColor: "red" | "black";
  aiDifficulty: AIDifficulty | null;
  timeControl: TimeControl | null;
}

interface InitialGameData {
  id: string;
  board: any;
  currentPlayer: string;
  moveCount: number;
  gameMode: string;
  winner: string | null;
  gameConfig: GameConfig;
  timeControl: TimeControl | null;
  moves: any[];
  gameStartTime: Date;
  player1Id?: string | null;
  player2Id?: string | null;
}

export function GameProvider({
  children,
  gameId,
  initialConfig,
}: {
  children: React.ReactNode;
  gameId?: string;
  initialConfig?: InitialGameData | null;
}) {
  const { data: session } = useSession();
  // If we have initial config from database, use it
  // Otherwise create a default local game
  const initialState: GameState = useMemo(() => {
    if (initialConfig) {
      const { gameConfig } = initialConfig;
      const gameMode = initialConfig.gameMode as GameMode;
      const aiDifficulty = gameConfig.aiDifficulty || "medium";

      // Reconstruct board history from moves
      const boardHistory: any[] = [];
      let currentBoard = createInitialBoard(gameConfig.rules);
      boardHistory.push(currentBoard);

      // Apply each move to reconstruct the board history
      if (initialConfig.moves && initialConfig.moves.length > 0) {
        for (const move of initialConfig.moves) {
          currentBoard = makeMove(currentBoard, move, gameConfig.rules);
          boardHistory.push(currentBoard);
        }
      }

      // Determine viewer-specific color for online games
      const viewerUserId = session?.user?.id;
      let resolvedPlayerColor = gameConfig.playerColor;
      if (gameMode === "online") {
        if (viewerUserId && initialConfig.player1Id === viewerUserId) {
          resolvedPlayerColor = "red";
        } else if (viewerUserId && initialConfig.player2Id === viewerUserId) {
          resolvedPlayerColor = "black";
        } else {
          // Default spectator perspective to red
          resolvedPlayerColor = "red";
        }
      }

      // Build players for online games using server player slots
      const resolvedPlayers =
        gameMode === "ai"
          ? createAIGamePlayers(aiDifficulty)
          : gameMode === "online"
            ? ({
              red: {
                id: initialConfig.player1Id ?? `player-red`,
                name: "Player 1",
                isAI: false,
                isCurrentUser:
                  !!viewerUserId && initialConfig.player1Id === viewerUserId,
                color: "red" as PieceColor,
              },
              black: {
                id: initialConfig.player2Id ?? `player-black`,
                name: "Player 2",
                isAI: false,
                isCurrentUser:
                  !!viewerUserId && initialConfig.player2Id === viewerUserId,
                color: "black" as PieceColor,
              },
            })
            : createLocalGamePlayers();

      return {
        gameId: initialConfig.id,
        rules: gameConfig.rules,
        boardVariant: gameConfig.boardVariant,
        board: initialConfig.board || currentBoard,
        currentPlayer: initialConfig.currentPlayer as "red" | "black",
        playerColor: resolvedPlayerColor,
        selectedPosition: null,
        draggingPosition: null,
        validMoves: [],
        moveCount: initialConfig.moveCount,
        moveHistory: initialConfig.moves || [],
        boardHistory,
        currentMoveIndex: (initialConfig.moves?.length || 0) - 1,
        isViewingHistory: false,
        winner: initialConfig.winner as "red" | "black" | "draw" | null,
        drawState: createDrawState(),
        drawReason: null,
        showWinnerDialog: false,
        showContinueDialog: false,
        showKeyboardHelp: false,
        showTimeControlDialog: false,
        showDrawDialog: false,
        drawRequestedBy: null,
        timeControl: gameConfig.timeControl,
        audioWarningsEnabled: true,
        gameMode,
        aiDifficulty,
        players: resolvedPlayers,
        isAIThinking: false,
        isReviewMode: false,
        gameAnalysis: null,
        isAnalyzing: false,
        analyzeProgress: 0,
        gameStartTime: new Date(initialConfig.gameStartTime),
      };
    } else {
      // Default local game
      const resolved: VariantConfig = GameConfigLoader.loadVariant("american");
      const initialBoard = createInitialBoard(resolved);

      return {
        gameId,
        rules: resolved,
        boardVariant: "american",
        board: initialBoard,
        currentPlayer: "red",
        playerColor: "red",
        selectedPosition: null,
        draggingPosition: null,
        validMoves: [],
        moveCount: 0,
        moveHistory: [],
        boardHistory: [initialBoard],
        currentMoveIndex: -1,
        isViewingHistory: false,
        winner: null,
        drawState: createDrawState(),
        drawReason: null,
        showWinnerDialog: false,
        showContinueDialog: false,
        showKeyboardHelp: false,
        showTimeControlDialog: false,
        showDrawDialog: false,
        drawRequestedBy: null,
        timeControl: null,
        audioWarningsEnabled: true,
        gameMode: "local",
        aiDifficulty: "medium",
        players: createLocalGamePlayers(),
        isAIThinking: false,
        isReviewMode: false,
        gameAnalysis: null,
        isAnalyzing: false,
        analyzeProgress: 0,
        gameStartTime: new Date(),
      };
    }
  }, [gameId, initialConfig, session?.user?.id]);

  const [state, baseDispatch] = useReducer(gameReducer, initialState);
  const { settings } = useSettings();

  const { playMove, playCapture, playKing, playComplete, playStartGame } =
    useGameSounds({
      enabled: settings.soundEffectsEnabled,
      volume: settings.sfxVolume / 100,
    });

  const dispatch = useCallback(
    (action: GameAction) => {
      if (action.type === "APPLY_MOVE") {
        const { move, newBoard } = action.payload;
        const pieceBeforeMove = state.board[move.from.row]?.[move.from.col];
        const pieceAfterMove = newBoard[move.to.row]?.[move.to.col];
        const becameKing =
          pieceBeforeMove &&
          pieceBeforeMove.type === "regular" &&
          pieceAfterMove?.type === "king";

        if (becameKing) {
          playKing();
        } else if (move.captures && move.captures.length > 0) {
          playCapture();
        } else {
          playMove();
        }
      }

      // Start game SFX on reset, controlled by settings-context in useGameSounds
      if (action.type === "RESET") {
        playStartGame();
      }

      // Winner/complete SFX triggers
      if (action.type === "APPLY_MOVE" && action.payload.winner) {
        playComplete();
      } else if (action.type === "SET_WINNER" && action.payload) {
        playComplete();
      } else if (action.type === "RESIGN") {
        // Reducer sets winner accordingly; play on resign as well
        playComplete();
      } else if (action.type === "ACCEPT_DRAW") {
        playComplete();
      }

      baseDispatch(action);
    },
    [
      baseDispatch,
      state.board,
      playMove,
      playCapture,
      playKing,
      playComplete,
      playStartGame,
    ],
  );

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
