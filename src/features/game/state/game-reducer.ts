import { createInitialBoard } from '~/lib/game-logic';
import type { GameAction, GameState } from './game-types';
import { createDrawState, updateDrawState, type DrawResult } from '~/lib/draw-detection';

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_RULES': {
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
    case 'RESET': {
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
    case 'APPLY_MOVE': {
      const { newBoard, move, winner } = action.payload;
      const newHistory = [...state.moveHistory, move];
      const newBoardHistory = [...state.boardHistory.slice(0, state.currentMoveIndex + 2), newBoard];
      
      // Check if promotion occurred (piece became king)
      const pieceBeforeMove = state.board[move.from.row]?.[move.from.col];
      const pieceAfterMove = newBoard[move.to.row]?.[move.to.col];
      const wasPromotion = pieceBeforeMove?.type === 'regular' && pieceAfterMove?.type === 'king';
      
      // Update draw state with the move
      const nextPlayer = winner ? state.currentPlayer : (state.currentPlayer === 'red' ? 'black' : 'red');
      const newDrawState = updateDrawState(
        state.drawState,
        newBoard,
        move,
        nextPlayer,
        wasPromotion
      );
      
      // Check if winner is a DrawResult object
      const isDrawResult = winner && typeof winner === 'object' && 'type' in winner;
      const finalWinner = isDrawResult ? 'draw' : winner;
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
    case 'NAVIGATE_TO_MOVE': {
      const idx = action.payload;
      const historicalBoard = state.boardHistory[idx + 1];
      if (!historicalBoard) return state;
      const player = idx % 2 === -1 ? 'red' : idx % 2 === 0 ? 'black' : 'red';
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
    case 'SET_SELECTED':
      return { ...state, selectedPosition: action.payload };
    case 'SET_DRAGGING':
      return { ...state, draggingPosition: action.payload };
    case 'SET_VALID_MOVES':
      return { ...state, validMoves: action.payload };
    case 'SET_PLAYER_COLOR':
      return { ...state, playerColor: action.payload };
    case 'SET_MODE':
      return { ...state, gameMode: action.payload };
    case 'SET_AI_DIFFICULTY':
      return { ...state, aiDifficulty: action.payload };
    case 'SET_AI_THINKING':
      return { ...state, isAIThinking: action.payload };
    case 'SET_TIMECONTROL':
      return { ...state, timeControl: action.payload };
    case 'TOGGLE_REVIEW_MODE':
      return { ...state, isReviewMode: action.payload, showWinnerDialog: action.payload ? false : state.showWinnerDialog };
    case 'SET_WINNER':
      return { ...state, winner: action.payload, showWinnerDialog: !!action.payload };
    case 'SET_ANALYSIS': {
      const { analysis, isAnalyzing, progress } = action.payload;
      return { ...state, gameAnalysis: analysis, isAnalyzing, analyzeProgress: progress ?? state.analyzeProgress };
    }
    case 'DIALOGS': {
      const updates = { ...action.payload };
      // If closing draw dialog, also clear the draw request
      if ('showDrawDialog' in updates && !updates.showDrawDialog) {
        return { ...state, ...updates, drawRequestedBy: null } as GameState;
      }
      return { ...state, ...updates } as GameState;
    }
    case 'LOAD_SNAPSHOT':
      return { ...state, ...action.payload } as GameState;
    case 'RESIGN': {
      const winner = action.payload === 'red' ? 'black' : 'red';
      return { 
        ...state, 
        winner, 
        showWinnerDialog: true,
        selectedPosition: null,
        draggingPosition: null,
        validMoves: []
      };
    }
    case 'REQUEST_DRAW':
      return { 
        ...state, 
        showDrawDialog: true,
        drawRequestedBy: state.currentPlayer
      };
    case 'ACCEPT_DRAW':
      return { 
        ...state, 
        winner: 'draw', 
        drawReason: {
          type: 'draw',
          reason: 'stalemate',
          explanation: 'The game has ended in a draw by mutual agreement.'
        },
        showWinnerDialog: true,
        showDrawDialog: false,
        drawRequestedBy: null,
        selectedPosition: null,
        draggingPosition: null,
        validMoves: []
      };
    default:
      return state;
  }
}

