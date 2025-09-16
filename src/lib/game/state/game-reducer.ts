import {
  createDrawState,
  removeOptimisticPositions,
  serializeBoard,
  updateDrawState,
} from "~/lib/game/draw-detection";
import { createInitialBoard, makeMove } from "~/lib/game/logic";
import { initialGameSyncState } from "~/lib/game/sync/game-sync-reducer";
import type { GameAction, GameState } from "./game-types";

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_RULES": {
      const initialBoard = createInitialBoard(action.payload);
      return {
        ...state,
        rules: action.payload,
        boardVariant: state.boardVariant,
        board: initialBoard,
        boardHistory: [initialBoard],
        moveHistory: [],
        currentMoveIndex: -1,
        moveCount: 0,
        winner: null,
        drawState: createDrawState(),
        drawReason: null,
      };
    }
    case "RESET": {
      return {
        ...state,
        board: action.payload.initialBoard,
        boardHistory: [action.payload.initialBoard],
        moveHistory: [],
        currentMoveIndex: -1,
        moveCount: 0,
        winner: null,
        drawState: createDrawState(),
        drawReason: null,
        isReviewMode: false,
        gameAnalysis: null,
        isAnalyzing: false,
        showWinnerDialog: false,
        showDrawDialog: false,
        drawRequestedBy: null,
        selectedPosition: null,
        draggingPosition: null,
        validMoves: [],
        gameStartTime: new Date(),
      };
    }
    case "APPLY_MOVE": {
      const { newBoard, move, winner } = action.payload;
      const newHistory = [...state.moveHistory, move];
      const newBoardHistory = [
        ...state.boardHistory.slice(0, state.currentMoveIndex + 2),
        newBoard,
      ];

      // Check if promotion occurred (piece became king)
      const pieceBeforeMove = state.board[move.from.row]?.[move.from.col];
      const pieceAfterMove = newBoard[move.to.row]?.[move.to.col];
      const wasPromotion =
        pieceBeforeMove?.type === "regular" && pieceAfterMove?.type === "king";

      // Update draw state with the move
      const nextPlayer = winner
        ? state.currentPlayer
        : state.currentPlayer === "red"
          ? "black"
          : "red";
      const newDrawState = updateDrawState(
        state.drawState,
        newBoard,
        move,
        nextPlayer,
        wasPromotion,
      );

      // Check if winner is a DrawResult object
      const isDrawResult =
        winner && typeof winner === "object" && "type" in winner;
      const finalWinner = isDrawResult ? "draw" : winner;
      const drawReason = isDrawResult ? winner : null;

      return {
        ...state,
        board: newBoard,
        moveHistory: newHistory,
        boardHistory: newBoardHistory,
        moveCount: state.moveCount + 1,
        currentMoveIndex: newHistory.length - 1,
        isViewingHistory: false,
        selectedPosition: null,
        draggingPosition: null,
        validMoves: [],
        winner: finalWinner,
        drawReason,
        drawState: newDrawState,
        showWinnerDialog: !!winner || state.showWinnerDialog,
        currentPlayer: nextPlayer,
      };
    }
    case "NAVIGATE_TO_MOVE": {
      const idx = action.payload;
      const historicalBoard = state.boardHistory[idx + 1];
      if (!historicalBoard) return state;
      const player = idx % 2 === -1 ? "red" : idx % 2 === 0 ? "black" : "red";
      return {
        ...state,
        currentMoveIndex: idx,
        board: historicalBoard,
        selectedPosition: null,
        validMoves: [],
        isViewingHistory: idx < state.moveHistory.length - 1,
        currentPlayer: player,
        moveCount: idx + 1,
      };
    }
    case "SET_SELECTED":
      return { ...state, selectedPosition: action.payload };
    case "SET_DRAGGING":
      return { ...state, draggingPosition: action.payload };
    case "SET_VALID_MOVES":
      return { ...state, validMoves: action.payload };
    case "SET_PLAYER_COLOR":
      return { ...state, playerColor: action.payload };
    case "SET_MODE":
      return { ...state, gameMode: action.payload };
    case "SET_AI_DIFFICULTY":
      return { ...state, aiDifficulty: action.payload };
    case "SET_AI_THINKING":
      return { ...state, isAIThinking: action.payload };
    case "SET_TIMECONTROL":
      return { ...state, timeControl: action.payload };
    case "TOGGLE_REVIEW_MODE":
      return {
        ...state,
        isReviewMode: action.payload,
        showWinnerDialog: action.payload ? false : state.showWinnerDialog,
      };
    case "SET_WINNER":
      return {
        ...state,
        winner: action.payload,
        showWinnerDialog: !!action.payload,
      };
    case "SET_ANALYSIS": {
      const { analysis, isAnalyzing, progress } = action.payload;
      return {
        ...state,
        gameAnalysis: analysis,
        isAnalyzing,
        analyzeProgress: progress ?? state.analyzeProgress,
      };
    }
    case "DIALOGS": {
      const updates = { ...action.payload };
      // If closing draw dialog, also clear the draw request
      if ("showDrawDialog" in updates && !updates.showDrawDialog) {
        return { ...state, ...updates, drawRequestedBy: null } as GameState;
      }
      return { ...state, ...updates } as GameState;
    }
    case "LOAD_SNAPSHOT":
      return { ...state, ...action.payload } as GameState;
    case "RESIGN": {
      const winner = action.payload === "red" ? "black" : "red";
      return {
        ...state,
        winner,
        showWinnerDialog: true,
        selectedPosition: null,
        draggingPosition: null,
        validMoves: [],
      };
    }
    case "REQUEST_DRAW":
      return {
        ...state,
        showDrawDialog: true,
        drawRequestedBy: state.gameMode === "online" ? state.playerColor : state.currentPlayer,
      };
    case "ACCEPT_DRAW":
      return {
        ...state,
        winner: "draw",
        drawReason: {
          type: "draw",
          reason: "stalemate",
          explanation: "The game has ended in a draw by mutual agreement.",
        },
        showWinnerDialog: true,
        showDrawDialog: false,
        drawRequestedBy: null,
        selectedPosition: null,
        draggingPosition: null,
        validMoves: [],
      };

    // Sync-related actions for online multiplayer
    case "SYNC_STATE_UPDATE":
      return {
        ...state,
        syncState: {
          ...(state.syncState || initialGameSyncState),
          ...action.payload,
        },
      };

    case "OPTIMISTIC_MOVE_PREVIEW": {
      const { move, updateId, previewBoard } = action.payload;

      // Store the optimistic move in move history with a special marker
      const optimisticMove = {
        ...move,
        isOptimistic: true,
        optimisticId: updateId,
      };

      // Update board history for potential rollback
      const newBoardHistory = [
        ...state.boardHistory.slice(0, state.currentMoveIndex + 2),
        previewBoard,
      ];

      return {
        ...state,
        board: previewBoard,
        moveHistory: [...state.moveHistory, optimisticMove],
        boardHistory: newBoardHistory,
        moveCount: state.moveCount + 1,
        currentMoveIndex: state.moveHistory.length, // Points to the new optimistic move
        currentPlayer: state.currentPlayer === "red" ? "black" : "red",
        selectedPosition: null,
        draggingPosition: null,
        validMoves: [],
        isViewingHistory: false,
        // Note: Don't update drawState for optimistic moves - this is handled in updateDrawState
      };
    }

    case "OPTIMISTIC_MOVE_ROLLBACK": {
      const { updateId } = action.payload;

      // Find optimistic moves to remove
      const optimisticMovesToRemove = state.moveHistory.filter(
        (move: any) => move.optimisticId === updateId,
      );

      // Remove optimistic moves from history
      const filteredHistory = state.moveHistory.filter(
        (move: any) => move.optimisticId !== updateId,
      );

      // Restore board state to before the optimistic move
      const targetIndex = filteredHistory.length;
      const restoredBoard = state.boardHistory[targetIndex] || state.board;

      // Calculate optimistic positions to remove from draw state
      const optimisticPositions: string[] = [];
      for (const move of optimisticMovesToRemove) {
        // Serialize the board position after this optimistic move
        const moveBoard = makeMove(state.board, move, state.rules);
        const nextPlayer = state.currentPlayer === "red" ? "black" : "red";
        optimisticPositions.push(serializeBoard(moveBoard, nextPlayer));
      }

      // Clean up draw state
      const cleanedDrawState = removeOptimisticPositions(
        state.drawState,
        optimisticPositions,
      );

      return {
        ...state,
        board: restoredBoard,
        moveHistory: filteredHistory,
        boardHistory: state.boardHistory.slice(0, targetIndex + 1),
        moveCount: filteredHistory.length,
        currentMoveIndex: filteredHistory.length - 1,
        currentPlayer: filteredHistory.length % 2 === 0 ? "red" : "black",
        drawState: cleanedDrawState,
        selectedPosition: null,
        draggingPosition: null,
        validMoves: [],
        isViewingHistory: false,
      };
    }

    case "SERVER_STATE_OVERRIDE": {
      const { board, moveCount, currentPlayer, moves, winner } = action.payload;

      // Don't override if user is viewing history
      if (state.isViewingHistory) {
        // Update the moveHistory to stay in sync but don't change the viewed board state
        const serverMoves = moves || state.moveHistory.slice(0, moveCount);
        const cleanedMoves = serverMoves.map((move: any) => {
          const { isOptimistic, optimisticId, ...cleanMove } = move;
          return cleanMove;
        });
        
        // Only update moveHistory and boardHistory, preserve the current view
        return {
          ...state,
          moveHistory: cleanedMoves,
          boardHistory: [...state.boardHistory.slice(0, moveCount), board],
        };
      }

      // Clean up any optimistic moves and replace with server state
      const serverMoves = moves || state.moveHistory.slice(0, moveCount);

      // Remove optimistic flags from confirmed moves
      const cleanedMoves = serverMoves.map((move: any) => {
        const { isOptimistic, optimisticId, ...cleanMove } = move;
        return cleanMove;
      });

      return {
        ...state,
        board,
        moveCount,
        currentPlayer,
        moveHistory: cleanedMoves,
        currentMoveIndex: moveCount - 1,
        isViewingHistory: false,
        selectedPosition: null,
        draggingPosition: null,
        validMoves: [],
        ...(winner !== undefined && { winner, showWinnerDialog: true }),
      };
    }

    case "SYNC_DRAW_REQUEST": {
      // Handle draw request from SSE
      const { requestedBy } = action.payload;
      return {
        ...state,
        showDrawDialog: true,
        drawRequestedBy: requestedBy,
      };
    }

    case "SYNC_DRAW_ACCEPTED": {
      // Handle draw acceptance from SSE
      return {
        ...state,
        winner: "draw",
        drawReason: {
          type: "draw",
          reason: "stalemate",
          explanation: "The game has ended in a draw by mutual agreement.",
        },
        showWinnerDialog: true,
        showDrawDialog: false,
        drawRequestedBy: null,
      };
    }

    case "SYNC_DRAW_DECLINED": {
      // Handle draw decline from SSE
      return {
        ...state,
        showDrawDialog: false,
        drawRequestedBy: null,
      };
    }

    case "CONFLICT_RESOLUTION": {
      const { strategy, conflictData } = action.payload;

      if (strategy === "server-wins") {
        // Accept server state as authoritative
        const truncatedHistory = state.moveHistory.slice(
          0,
          conflictData.serverMoveCount,
        );
        const truncatedBoardHistory = state.boardHistory.slice(
          0,
          conflictData.serverMoveCount + 1,
        );
        return {
          ...state,
          board: conflictData.serverBoard,
          moveCount: conflictData.serverMoveCount,
          currentPlayer:
            conflictData.serverMoveCount % 2 === 0 ? "red" : "black",
          moveHistory: truncatedHistory,
          boardHistory:
            truncatedBoardHistory.length > 0
              ? truncatedBoardHistory
              : [conflictData.serverBoard],
          currentMoveIndex: conflictData.serverMoveCount - 1,
          isViewingHistory: false,
          selectedPosition: null,
          draggingPosition: null,
          validMoves: [],
        };
      } else {
        // Keep optimistic state (default behavior)
        return state;
      }
    }

    default:
      return state;
  }
}
