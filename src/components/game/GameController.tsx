'use client';

import { useState, useEffect, useCallback } from 'react';
import { Board } from './Board';
import { TimeControlSelector } from './TimeControlSelector';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '~/components/ui/dialog';
import { RefreshCw, Download, Keyboard, History } from 'lucide-react';
import {
  type Board as BoardType,
  type Position,
  type PieceColor,
  type Move,
  createInitialBoard,
  getValidMoves,
  makeMove,
  checkWinner,
  getMustCapturePositions
} from '~/lib/game-logic';
import { CheckersAI, type AIDifficulty } from '~/lib/ai-engine';
import { type BoardConfig, type BoardVariant, getBoardConfig } from '~/lib/board-config';
import { useGameStorage } from '~/hooks/useGameStorage';
import { useMultiTabSync } from '~/hooks/useMultiTabSync';
import { useOfflineSync } from '~/hooks/useOfflineSync';
import { useTimer } from '~/hooks/useTimer';
import { useAudioWarnings } from '~/hooks/useAudioWarnings';
import { api } from '~/trpc/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IntegratedChat } from '~/components/chat/IntegratedChat';
import { GameSkeleton } from './GameSkeleton';
import { MustCaptureArrow } from './MustCaptureArrow';
import { toast } from '~/hooks/use-toast';
import { useGameSounds } from '~/hooks/useGameSounds';
import { PlayerCardWrapper } from './PlayerCardWrapper';
import { MoveHistory } from './MoveHistory';
import { PostGameAnalysis } from './PostGameAnalysis';
import { MoveEvaluator } from '~/lib/move-evaluation';
import type { GameAnalysis } from '~/lib/types/move-analysis';
import type { InitialStatePayload, MoveAppliedPayload } from '~/lib/multi-tab/types';
import { type TimeControl } from '~/lib/time-control-types';
import { 
  type GamePlayers, 
  createLocalGamePlayers, 
  createAIGamePlayers, 
  getPlayerByColor,
  getOpponentByColor 
} from '~/lib/player-types';

interface GameControllerProps {
  gameId?: string;
  boardVariant?: BoardVariant;
}

export function GameController({ gameId, boardVariant = 'american' }: GameControllerProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [boardConfig, setBoardConfig] = useState<BoardConfig>(getBoardConfig(boardVariant));
  const [flyingKingsEnabled, setFlyingKingsEnabled] = useState(boardConfig.flyingKings ?? false);
  const [board, setBoard] = useState<BoardType>(() => createInitialBoard(boardConfig));
  const [currentPlayer, setCurrentPlayer] = useState<PieceColor>('red');
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [draggingPosition, setDraggingPosition] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [mustCaptureTooltipPosition, setMustCaptureTooltipPosition] = useState<{ x: number; y: number } | undefined>();
  const [incorrectClickCount, setIncorrectClickCount] = useState(0);
  const [showMustCaptureArrow, setShowMustCaptureArrow] = useState(false);
  const [arrowTarget, setArrowTarget] = useState<Position | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [boardHistory, setBoardHistory] = useState<BoardType[]>([createInitialBoard(boardConfig)]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1); // -1 means at initial position
  const [isViewingHistory, setIsViewingHistory] = useState(false); // true when not at latest position
  const [winner, setWinner] = useState<PieceColor | 'draw' | null>(null);
  const [gameStartTime, setGameStartTime] = useState(new Date());
  const [gameMode, setGameMode] = useState<'ai' | 'local' | 'online'>('ai');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [aiEngine] = useState(() => new CheckersAI({ difficulty: 'medium' }, boardConfig));
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(!!gameId);
  const [isInitializing, setIsInitializing] = useState(true);
  const [timeControl, setTimeControl] = useState<TimeControl | null>(null);
  const [showTimeControlDialog, setShowTimeControlDialog] = useState(false);
  const [audioWarningsEnabled, setAudioWarningsEnabled] = useState(true);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [players, setPlayers] = useState<GamePlayers>(() => createAIGamePlayers('medium'));
  
  // Keyboard navigation state
  const [keyboardFocusPosition, setKeyboardFocusPosition] = useState<Position | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  
  // Game review state
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [showWinnerDialog, setShowWinnerDialog] = useState(false);
  const [gameAnalysis, setGameAnalysis] = useState<GameAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  
  // Load game data if gameId is provided
  const { data: gameData, isLoading: isLoadingGame } = api.game.load.useQuery(
    { id: gameId! },
    { 
      enabled: !!gameId
    }
  );
  
  // Create game mutation for rematch functionality
  const createGameMutation = api.game.create.useMutation({
    onSuccess: (data) => {
      // Navigate to the new game with preserved settings
      const newSearchParams = new URLSearchParams();
      if (timeControl) {
        newSearchParams.set('timeControl', JSON.stringify(timeControl));
      }
      newSearchParams.set('gameMode', gameMode);
      // Get current board variant from the URL or determine from config
      const currentVariant = searchParams.get('boardVariant') || 
        (boardConfig.size === 10 ? 'international' : 
         boardConfig.size === 12 ? 'canadian' : 
         boardConfig.allowBackwardCapture ? 'brazilian' : 'american');
      newSearchParams.set('boardVariant', currentVariant);
      
      const url = `/game/${data.id}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`;
      router.push(url);
      
      // Reset state for new game
      resetGame(true);
    },
  });
  
  // Parse time control and board variant from URL parameters on mount
  useEffect(() => {
    const timeControlParam = searchParams.get('timeControl');
    const gameModeParam = searchParams.get('gameMode');
    const boardVariantParam = searchParams.get('boardVariant');
    
    if (timeControlParam) {
      try {
        const parsedTimeControl = JSON.parse(decodeURIComponent(timeControlParam)) as TimeControl;
        setTimeControl(parsedTimeControl);
      } catch (error) {
        console.warn('Failed to parse timeControl from URL:', error);
      }
    }
    
    if (gameModeParam && ['ai', 'local', 'online'].includes(gameModeParam)) {
      setGameMode(gameModeParam as 'ai' | 'local' | 'online');
    }
    
    if (boardVariantParam && ['american', 'brazilian', 'international', 'canadian'].includes(boardVariantParam)) {
      const newBoardConfig = getBoardConfig(boardVariantParam as BoardVariant);
      setBoardConfig(newBoardConfig);
      setFlyingKingsEnabled(newBoardConfig.flyingKings ?? false);
      // Only set initial board if game hasn't started yet
      if (moveCount === 0 && !gameId) {
        setBoard(createInitialBoard(newBoardConfig));
        setBoardHistory([createInitialBoard(newBoardConfig)]);
      }
    }
  }, [searchParams]);

  // Update players when game mode or AI difficulty changes
  useEffect(() => {
    if (gameMode === 'ai') {
      setPlayers(createAIGamePlayers(aiDifficulty));
    } else if (gameMode === 'local') {
      setPlayers(createLocalGamePlayers());
    } else {
      // For online games, we'll keep existing players or use defaults
      setPlayers(createLocalGamePlayers());
    }
  }, [gameMode, aiDifficulty]);

  // Update state when game data is loaded
  useEffect(() => {
    if (gameData) {
      setBoard(gameData.board);
      setCurrentPlayer(gameData.currentPlayer);
      setMoveCount(gameData.moveCount);
      setMoveHistory(gameData.moveHistory);
      
      // Rebuild boardHistory from moveHistory
      const rebuiltBoardHistory: BoardType[] = [createInitialBoard(boardConfig)];
      let currentBoard = createInitialBoard(boardConfig);
      
      for (const move of gameData.moveHistory) {
        currentBoard = makeMove(currentBoard, move, boardConfig);
        rebuiltBoardHistory.push(currentBoard);
      }
      
      setBoardHistory(rebuiltBoardHistory);
      setCurrentMoveIndex(gameData.moveHistory.length - 1);
      
      setGameMode(gameData.gameMode);
      setGameStartTime(new Date(gameData.gameStartTime));
      setWinner(gameData.winner);
      setIsLoading(false);
    }
  }, [gameData, boardConfig]);

  const saveGameMutation = api.game.save.useMutation();

  // Storage hook (using IndexedDB for better offline support)
  const [storageState, storageActions] = useGameStorage({
    storageType: 'indexeddb', // Use IndexedDB for better offline storage
    autoSave: !gameId, // Only auto-save locally if no gameId
    autoSaveInterval: 5000
  });

  // Offline sync hook for syncing to server when online
  const offlineSync = useOfflineSync({
    gameId,
    enabled: !gameId && gameMode !== 'online', // Enable for local games without gameId
    syncInterval: 30000 // Sync every 30 seconds when online
  });

  // Multi-tab synchronization hook
  const [syncState, syncActions] = useMultiTabSync({
    gameId,
    onGameStateUpdate: (payload: InitialStatePayload) => {
      setBoard(payload.board as BoardType);
      setCurrentPlayer(payload.currentPlayer);
      setMoveCount(payload.moveCount);
      setWinner(payload.winner);
      setGameStartTime(new Date(payload.gameStartTime));
    },
    onMoveApplied: (payload: MoveAppliedPayload) => {
      // Update game state from server
      const gameState = payload.newGameState;
      setBoard(gameState.board as BoardType);
      setCurrentPlayer(gameState.currentPlayer);
      setMoveCount(gameState.moveCount);
      setWinner(gameState.winner);
      
      // Clear selection state
      setSelectedPosition(null);
      setValidMoves([]);
      
      // Add move to history if not already there
      setMoveHistory(prev => {
        const moveExists = prev.some(m => 
          m.from.row === payload.move.from.row &&
          m.from.col === payload.move.from.col &&
          m.to.row === payload.move.to.row &&
          m.to.col === payload.move.to.col
        );
        return moveExists ? prev : [...prev, payload.move];
      });
    },
    onTabStatusUpdate: (_payload) => {
      // Tab status updates are handled in the TabStatusIndicator component
    },
    onConnectionStatusChange: (_status) => {
      // Connection status updates are handled in the TabStatusIndicator component
    }
  });

  // Timer hook for time controls
  const timer = useTimer({
    timeControl,
    onTimeExpired: (player) => {
      setWinner(player === 'red' ? 'black' : 'red');
    },
    onTimeUpdate: (timeState) => {
      // Optional: sync time state if needed
    }
  });

  // Audio warnings hook
  const audioWarnings = useAudioWarnings({
    enabled: audioWarningsEnabled && !!timeControl,
    timeState: timer.timeState
  });
  
  // Game sounds hook
  const gameSounds = useGameSounds({
    enabled: soundEffectsEnabled,
    volume: 0.5
  });

  const handleMove = useCallback(async (move: Move) => {
    // Only use multi-tab sync for online games
    if (gameMode === 'online') {
      // If we have multi-tab sync and this is an active tab, use optimistic updates
      if (gameId && syncState.syncManager && syncState.isActiveTab) {
        try {
          await syncActions.makeOptimisticMove(move, board, currentPlayer, moveCount);
          return; // Multi-tab sync will handle state updates
        } catch (error) {
          console.error('Multi-tab move failed, falling back to local:', error);
          // Fall through to local handling
        }
      }

      // Check if this tab can make moves (either no sync or is active tab)
      if (gameId && syncState.syncManager && !syncState.isActiveTab) {
        console.warn('Cannot make move: tab is not active');
        return;
      }
    }

    // If viewing history, jump to latest position before making new move
    if (isViewingHistory) {
      // Move to latest position first
      const latestIndex = moveHistory.length - 1;
      if (latestIndex >= -1) {
        setCurrentMoveIndex(latestIndex);
        setBoard(boardHistory[latestIndex + 1] ?? board);
        setIsViewingHistory(false);
      }
    }

    // Local move handling (for offline mode or fallback)
    const newBoard = makeMove(board, move, boardConfig);
    const newMoveHistory = [...moveHistory, move];
    const newBoardHistory = [...boardHistory.slice(0, currentMoveIndex + 2), newBoard];
    
    // Play appropriate sound for the move
    if (move.captures && move.captures.length > 0) {
      // Play capture sound for captures
      gameSounds.playCapture();
    } else {
      // Play move sound for regular moves
      gameSounds.playMove();
    }
    
    // Handle time control - stop current timer and add increment
    if (timeControl) {
      timer.stopTimer();
      timer.addIncrement(currentPlayer);
    }
    
    setBoard(newBoard);
    setMoveCount(prev => prev + 1);
    setMoveHistory(newMoveHistory);
    setBoardHistory(newBoardHistory);
    setCurrentMoveIndex(newMoveHistory.length - 1);
    setIsViewingHistory(false); // We're back at the latest move
    setSelectedPosition(null);
    setDraggingPosition(null);
    setValidMoves([]);
    setIncorrectClickCount(0);
    setShowMustCaptureArrow(false);
    
    const gameWinner = checkWinner(newBoard, boardConfig);
    if (gameWinner) {
      setWinner(gameWinner);
      setShowWinnerDialog(true);
      if (timeControl) {
        timer.stopTimer(); // Stop timer when game ends
      }
      // Start analyzing the game automatically
      void analyzeGame(newMoveHistory, createInitialBoard(boardConfig));
    } else {
      const nextPlayer = currentPlayer === 'red' ? 'black' : 'red';
      setCurrentPlayer(nextPlayer);
      setIncorrectClickCount(0);
      setShowMustCaptureArrow(false);
      
      // Start timer for next player
      if (timeControl) {
        timer.startTimer(nextPlayer);
      }
    }
    
    // Auto-save after move (including final move when game ends)
    if (gameId && !syncState.syncManager) {
      // Save to server if we have a gameId but no sync (fallback mode)
      saveGameMutation.mutate({
        id: gameId,
        board: newBoard,
        currentPlayer: gameWinner ? currentPlayer : (currentPlayer === 'red' ? 'black' : 'red'),
        moveCount: moveCount + 1,
        gameMode,
        winner: gameWinner,
        moves: newMoveHistory
      });
    } else if (!gameId) {
      // Save locally with IndexedDB
      const gameState = {
        board: newBoard,
        currentPlayer: gameWinner ? currentPlayer : (currentPlayer === 'red' ? 'black' : 'red') as PieceColor,
        moveCount: moveCount + 1,
        moveHistory: newMoveHistory,
        gameMode,
        gameStartTime,
        winner: gameWinner,
        timeControl,
        timeState: timer.timeState,
        audioWarningsEnabled,
        soundEffectsEnabled
      };
      
      await storageActions.saveGame(gameState);
      
      // Queue for sync to server when online (for local games)
      if (offlineSync.isOnline && gameMode !== 'online') {
        offlineSync.queueGameUpdate(gameState);
      }
    }
  }, [board, moveHistory, moveCount, currentPlayer, gameMode, gameStartTime, storageActions, gameId, saveGameMutation, syncState, syncActions, offlineSync, boardHistory, currentMoveIndex, isViewingHistory, boardConfig, timer, timeControl]);

  const handleSquareClick = (position: Position, event?: React.MouseEvent) => {
    // Don't allow moves when viewing history or in review mode
    if (isViewingHistory || isReviewMode) return;
    
    // Check if this tab can make moves (only apply to online games)
    if (gameMode === 'online' && gameId && syncState.syncManager && !syncState.isActiveTab) {
      return; // Inactive tabs cannot make moves
    }

    const piece = board[position.row]?.[position.col];
    
    if (selectedPosition) {
      const move = validMoves.find(
        m => m.to.row === position.row && m.to.col === position.col
      );
      
      if (move) {
        void handleMove(move);
      } else if (piece?.color === currentPlayer) {
        const clickPos = event ? { x: event.clientX, y: event.clientY } : undefined;
        if (!checkMandatoryCapture(position, clickPos)) return;
        const moves = getValidMoves(board, position, currentPlayer, boardConfig);
        setSelectedPosition(position);
        setValidMoves(moves);
      } else {
        setSelectedPosition(null);
        setValidMoves([]);
      }
    } else if (piece?.color === currentPlayer) {
      const clickPos = event ? { x: event.clientX, y: event.clientY } : undefined;
      if (!checkMandatoryCapture(position, clickPos)) return;
      const moves = getValidMoves(board, position, currentPlayer, boardConfig);
      setSelectedPosition(position);
      setValidMoves(moves);
    }
  };

  const handleDragStart = (position: Position) => {
    // Don't allow moves when viewing history or in review mode
    if (isViewingHistory || isReviewMode) return;
    
    // Check if this tab can make moves (only apply to online games)
    if (gameMode === 'online' && gameId && syncState.syncManager && !syncState.isActiveTab) {
      return; // Inactive tabs cannot drag pieces
    }

    const piece = board[position.row]?.[position.col];
    if (piece?.color === currentPlayer) {
      if (!checkMandatoryCapture(position)) return;
      const moves = getValidMoves(board, position, currentPlayer, boardConfig);
      setSelectedPosition(position);
      setDraggingPosition(position);
      setValidMoves(moves);
    }
  };

  const handleDragEnd = () => {
    setDraggingPosition(null);
  };

  const handleDrop = (position: Position) => {
    // Don't allow moves when viewing history or in review mode
    if (isViewingHistory || isReviewMode) return;
    
    // Check if this tab can make moves (only apply to online games)
    if (gameMode === 'online' && gameId && syncState.syncManager && !syncState.isActiveTab) {
      return; // Inactive tabs cannot drop pieces
    }

    if (selectedPosition) {
      const move = validMoves.find(
        m => m.to.row === position.row && m.to.col === position.col
      );
      
      if (move) {
        void handleMove(move);
      }
    }
  };

  const resetGame = (clearStorage = true, playSound = true) => {
    // Update board config with flying kings setting
    const updatedConfig = { ...boardConfig, flyingKings: flyingKingsEnabled };
    setBoardConfig(updatedConfig);
    const initialBoard = createInitialBoard(updatedConfig);
    setBoard(initialBoard);
    setCurrentPlayer('red');
    setSelectedPosition(null);
    setDraggingPosition(null);
    setValidMoves([]);
    setMoveCount(0);
    setMoveHistory([]);
    setBoardHistory([initialBoard]);
    setCurrentMoveIndex(-1);
    setIsViewingHistory(false);
    setWinner(null);
    setShowWinnerDialog(false);
    setIsReviewMode(false);
    setGameAnalysis(null);
    setIsAnalyzing(false);
    setGameStartTime(new Date());
    setIsAIThinking(false);
    
    // Reset timers
    timer.resetTimers();
    
    if (clearStorage) {
      storageActions.deleteGame();
    }
    
    // Reset keyboard focus
    setKeyboardFocusPosition(null);
    
    // Play start game sound
    if (playSound) {
      gameSounds.playStartGame();
    }
  };
  
  const enterReviewMode = async () => {
    setIsReviewMode(true);
    setShowWinnerDialog(false);
    
    // Start analyzing if not already done
    if (!gameAnalysis && !isAnalyzing && moveHistory.length > 0) {
      await analyzeGame(moveHistory, createInitialBoard(boardConfig));
    }
    
    // Navigate to the first move for review
    if (moveHistory.length > 0) {
      navigateToMove(0);
    }
  };
  
  
  const analyzeGame = async (moves: Move[], initialBoard: BoardType) => {
    setIsAnalyzing(true);
    setAnalyzeProgress(0);
    
    try {
      const evaluator = new MoveEvaluator(boardConfig, aiDifficulty === 'expert' ? 'expert' : 'hard');
      
      // Simulate progress updates for better UX
      const progressInterval = setInterval(() => {
        setAnalyzeProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const analysis = await evaluator.analyzeGame(moves, initialBoard, {
        depth: 4,
        timeLimit: 1000,
        includeAlternatives: true,
        detectBrilliant: true,
        useCache: true
      });
      
      clearInterval(progressInterval);
      setAnalyzeProgress(100);
      setGameAnalysis(analysis);
      setIsAnalyzing(false);
    } catch (error) {
      console.error('Failed to analyze game:', error);
      setIsAnalyzing(false);
    }
  };

  // Keyboard navigation functions
  const moveKeyboardFocus = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (winner || isAIThinking) return;
    
    const centerPos = Math.floor(boardConfig.size / 2);
    const currentFocus = keyboardFocusPosition || { row: centerPos, col: centerPos }; // Start in center if no focus
    let newRow = currentFocus.row;
    let newCol = currentFocus.col;
    
    switch (direction) {
      case 'up':
        newRow = Math.max(0, currentFocus.row - 1);
        break;
      case 'down':
        newRow = Math.min(boardConfig.size - 1, currentFocus.row + 1);
        break;
      case 'left':
        newCol = Math.max(0, currentFocus.col - 1);
        break;
      case 'right':
        newCol = Math.min(boardConfig.size - 1, currentFocus.col + 1);
        break;
    }
    
    setKeyboardFocusPosition({ row: newRow, col: newCol });
  }, [keyboardFocusPosition, winner, isAIThinking, boardConfig]);

  const handleKeyboardSelect = useCallback(() => {
    if (!keyboardFocusPosition || winner || isAIThinking) return;
    
    // Check if this tab can make moves (only apply to online games)
    if (gameMode === 'online' && gameId && syncState.syncManager && !syncState.isActiveTab) {
      return;
    }
    
    const piece = board[keyboardFocusPosition.row]?.[keyboardFocusPosition.col];
    
    if (selectedPosition) {
      // Try to make a move
      const move = validMoves.find(
        m => m.to.row === keyboardFocusPosition.row && m.to.col === keyboardFocusPosition.col
      );
      
      if (move) {
        void handleMove(move);
      } else if (piece?.color === currentPlayer) {
        // Select different piece
        if (!checkMandatoryCapture(keyboardFocusPosition)) return;
        const moves = getValidMoves(board, keyboardFocusPosition, currentPlayer);
        setSelectedPosition(keyboardFocusPosition);
        setValidMoves(moves);
      } else {
        // Clear selection
        setSelectedPosition(null);
        setValidMoves([]);
      }
    } else if (piece?.color === currentPlayer) {
      // Select piece
      if (!checkMandatoryCapture(keyboardFocusPosition)) return;
      const moves = getValidMoves(board, keyboardFocusPosition, currentPlayer);
      setSelectedPosition(keyboardFocusPosition);
      setValidMoves(moves);
    }
  }, [keyboardFocusPosition, selectedPosition, validMoves, board, currentPlayer, winner, isAIThinking, gameMode, gameId, syncState, handleMove]);

  const handleKeyboardCancel = useCallback(() => {
    setSelectedPosition(null);
    setValidMoves([]);
  }, []);

  // Navigation functions for move history
  const navigateToMove = useCallback((moveIndex: number) => {
    if (moveIndex < -1 || moveIndex >= moveHistory.length) return;
    
    // Ensure we have a valid board state in history
    const historicalBoard = boardHistory[moveIndex + 1];
    if (!historicalBoard) {
      console.error('Board state not found for move index:', moveIndex);
      return;
    }
    
    setCurrentMoveIndex(moveIndex);
    setBoard(historicalBoard);
    setSelectedPosition(null);
    setValidMoves([]);
    
    // Track if we're viewing history (not at latest position)
    setIsViewingHistory(moveIndex < moveHistory.length - 1);
    
    // Calculate current player based on move index
    const player = moveIndex % 2 === -1 ? 'red' : moveIndex % 2 === 0 ? 'black' : 'red';
    setCurrentPlayer(player);
    
    // Update move count
    setMoveCount(moveIndex + 1);
  }, [moveHistory, boardHistory]);
  
  const handleContinueGame = async () => {
    const savedGame = await storageActions.loadGame();
    if (savedGame) {
      // Check if saved game board size matches current configuration
      const savedBoardSize = savedGame.board.length;
      if (savedBoardSize === boardConfig.size) {
        setBoard(savedGame.board);
        setCurrentPlayer(savedGame.currentPlayer);
        setMoveCount(savedGame.moveCount);
        setMoveHistory(savedGame.moveHistory);
        
        // Rebuild boardHistory from moveHistory
        const rebuiltBoardHistory: BoardType[] = [createInitialBoard(boardConfig)];
        let currentBoard = createInitialBoard(boardConfig);
        
        for (const move of savedGame.moveHistory) {
          currentBoard = makeMove(currentBoard, move, boardConfig);
          rebuiltBoardHistory.push(currentBoard);
        }
        
        setBoardHistory(rebuiltBoardHistory);
        setCurrentMoveIndex(savedGame.moveHistory.length - 1);
        
        setGameMode(savedGame.gameMode);
        setGameStartTime(savedGame.gameStartTime);
        setWinner(savedGame.winner);
        setSelectedPosition(null);
        setValidMoves([]);
        
        // Restore time control settings
        if (savedGame.timeControl) {
          setTimeControl(savedGame.timeControl);
        }
        if (savedGame.audioWarningsEnabled !== undefined) {
          setAudioWarningsEnabled(savedGame.audioWarningsEnabled);
        }
        if (savedGame.soundEffectsEnabled !== undefined) {
          setSoundEffectsEnabled(savedGame.soundEffectsEnabled);
        }
        if (savedGame.timeState) {
          timer.setTimeState(savedGame.timeState);
        }
        // Don't play start sound when continuing a saved game
      } else {
        // Board size mismatch - start new game with current config
        console.log(`Saved game is ${savedBoardSize}x${savedBoardSize} but current config is ${boardConfig.size}x${boardConfig.size}. Starting new game.`);
        await storageActions.deleteGame();
        // Board is already initialized with correct size from useState
        gameSounds.playStartGame(); // Play sound for new game after mismatch
      }
    }
    setShowContinueDialog(false);
    setIsInitializing(false); // Make sure skeleton is hidden after loading
  };
  
  const handleNewGame = () => {
    resetGame(true);
    setShowContinueDialog(false);
    setIsInitializing(false); // Make sure skeleton is hidden after new game
  };
  
  // Check for saved game on mount
  useEffect(() => {
    if (gameId) return; // Skip if we have a gameId (loading from server)
    
    const checkSavedGame = async () => {
      const hasSaved = await storageActions.checkForSavedGame();
      if (hasSaved && !winner) {
        // Load the saved game to check board size
        const savedGame = await storageActions.loadGame();
        if (savedGame && savedGame.board.length === boardConfig.size) {
          setShowContinueDialog(true);
          // Don't hide skeleton yet - wait for user choice
        } else {
          // Saved game has different board size, clear it
          if (savedGame) {
            console.log(`Clearing saved ${savedGame.board.length}x${savedGame.board.length} game as it doesn't match ${boardConfig.size}x${boardConfig.size} config`);
            await storageActions.deleteGame();
          }
          setIsInitializing(false);
        }
      } else {
        // No saved games, safe to show the UI immediately
        setIsInitializing(false);
        // Play start game sound for fresh game
        gameSounds.playStartGame();
      }
    };
    checkSavedGame();
  }, [gameId, boardConfig.size]); // Run when gameId or board size changes

  // Handle initialization completion for server-loaded games
  useEffect(() => {
    if (gameId && !isLoadingGame) {
      // Query has finished loading (with or without data)
      setIsInitializing(false);
    }
  }, [gameId, isLoadingGame]);

  // Handle initialization for games that don't need server loading
  useEffect(() => {
    if (!gameId && !isLoading) {
      // For local games without gameId, initialization should complete once storage is checked
      // This is handled in the checkSavedGame effect above
    }
  }, [gameId, isLoading]);

  // Connect to multi-tab sync when gameId is available and game is online
  useEffect(() => {
    // Only connect for online games that need multi-tab sync
    if (gameId && !isLoading && gameMode === 'online') {
      syncActions.connect().catch(error => {
        console.error('Failed to connect to multi-tab sync:', error);
      });
    }

    return () => {
      syncActions.disconnect();
    };
  }, [gameId, isLoading, gameMode]);

  // AI Move
  useEffect(() => {
    if (gameMode === 'ai' && currentPlayer === 'black' && !winner && !isAIThinking && !isViewingHistory && !isReviewMode) {
      setIsAIThinking(true);
      
      const makeAIMove = async () => {
        // Add a small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Use the advanced AI engine instead of random moves
        aiEngine.setDifficulty(aiDifficulty);
        const aiMove = await aiEngine.getBestMove(board, 'black', moveCount);
        if (aiMove) {
          handleMove(aiMove);
        }
        setIsAIThinking(false);
      };
      
      void makeAIMove();
    }
  }, [currentPlayer, gameMode, board, winner, handleMove, isAIThinking, aiDifficulty, aiEngine, moveCount, isViewingHistory, isReviewMode]);

  // Start timer for first move when time control is enabled
  useEffect(() => {
    if (timeControl && !winner && moveCount === 0 && !timer.isRunning) {
      timer.startTimer('red'); // Red always goes first
    }
  }, [timeControl, winner, moveCount, timer]);

  // Pause/resume timer based on AI thinking (don't count AI thinking time)
  useEffect(() => {
    if (timeControl && gameMode === 'ai') {
      if (isAIThinking && timer.isRunning) {
        timer.pauseTimer();
      } else if (!isAIThinking && timer.timeState.isPaused && timer.timeState.activePlayer === 'black') {
        timer.resumeTimer();
      }
    }
  }, [isAIThinking, timeControl, gameMode, timer]);

  // Enhanced keyboard shortcuts and navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore keyboard events if dialogs are open
      if (showContinueDialog || showTimeControlDialog || showKeyboardHelp) {
        return;
      }

      // Arrow key navigation for board OR history
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        // If holding Ctrl/Cmd, navigate history instead of board
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          if (event.code === 'ArrowLeft') {
            // Previous move
            if (currentMoveIndex >= 0) {
              navigateToMove(currentMoveIndex - 1);
            }
          } else if (event.code === 'ArrowRight') {
            // Next move
            if (currentMoveIndex < moveHistory.length - 1) {
              navigateToMove(currentMoveIndex + 1);
            }
          }
        } else {
          // Normal board navigation
          event.preventDefault();
          const direction = event.code.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';
          moveKeyboardFocus(direction);
        }
        return;
      }

      // Enter or Space to select/confirm (when no time control or no piece selected)
      if ((event.code === 'Enter' || (event.code === 'Space' && (!timeControl || selectedPosition)))) {
        event.preventDefault();
        handleKeyboardSelect();
        return;
      }

      // Space bar for pause/resume (only if time control is active and no piece selected)
      if (event.code === 'Space' && timeControl && !winner && !selectedPosition) {
        event.preventDefault();
        if (timer.timeState.isPaused) {
          timer.resumeTimer();
        } else {
          timer.pauseTimer();
        }
        return;
      }

      // Escape to cancel selection
      if (event.code === 'Escape') {
        event.preventDefault();
        handleKeyboardCancel();
        return;
      }

      // H or F1 for help
      if (event.code === 'KeyH' || event.code === 'F1') {
        event.preventDefault();
        setShowKeyboardHelp(true);
        return;
      }

      // Number keys 1-N for quick column navigation (when row is focused)
      const digitMatch = event.code.match(/^Digit([1-9])$/);
      if (keyboardFocusPosition && digitMatch && digitMatch[1]) {
        event.preventDefault();
        const col = parseInt(digitMatch[1]) - 1;
        if (col < boardConfig.size) {
          setKeyboardFocusPosition({ ...keyboardFocusPosition, col });
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    timeControl, 
    timer, 
    winner, 
    selectedPosition,
    keyboardFocusPosition,
    showContinueDialog, 
    showTimeControlDialog, 
    showKeyboardHelp,
    moveKeyboardFocus, 
    handleKeyboardSelect, 
    handleKeyboardCancel,
    currentMoveIndex,
    moveHistory,
    navigateToMove,
    boardConfig
  ]);

  // Highlight mandatory captures (only if board is valid)
  const mustCapturePositions = board && board.length > 0 
    ? getMustCapturePositions(board, currentPlayer, boardConfig)
    : [];

  // Helper function to handle mandatory capture enforcement
  const checkMandatoryCapture = (position: Position, clickPosition?: { x: number; y: number }): boolean => {
    if (mustCapturePositions.length > 0) {
      const pieceCanCapture = mustCapturePositions.some(
        pos => pos.row === position.row && pos.col === position.col
      );
      
      if (!pieceCanCapture) {
        // Increment incorrect click count
        const newClickCount = incorrectClickCount + 1;
        setIncorrectClickCount(newClickCount);
        
        const firstCapturePosition = mustCapturePositions[0];
        
        // On second incorrect click, show toast and arrow
        if (newClickCount >= 2) {
          toast({
            title: "You must capture!",
            description: "When a capture is available, you must take it.",
            duration: 3000,
          });
          
          if (clickPosition) {
            setMustCaptureTooltipPosition(clickPosition);
            setArrowTarget(firstCapturePosition ?? null);
            setShowMustCaptureArrow(true);
            
            // Hide arrow after 3 seconds
            setTimeout(() => {
              setShowMustCaptureArrow(false);
              setArrowTarget(null);
              setMustCaptureTooltipPosition(undefined);
            }, 3000);
          }
          
          // Reset counter after showing help
          setTimeout(() => {
            setIncorrectClickCount(0);
          }, 3000);
        }
        
        if (firstCapturePosition) {
          const moves = getValidMoves(board, firstCapturePosition, currentPlayer);
          // Clear any existing selection state first
          setSelectedPosition(null);
          setDraggingPosition(null);
          setValidMoves([]);
          
          // Then set the new selection after a brief delay to ensure state is cleared
          setTimeout(() => {
            setSelectedPosition(firstCapturePosition);
            setValidMoves(moves);
          }, 10);
        }
        return false; // Prevent the original selection
      } else {
        // Reset counter on correct selection
        setIncorrectClickCount(0);
      }
    }
    return true; // Allow the selection
  };

  // Show skeleton while initializing (prevents flash of wrong state)
  if (isInitializing || (gameId && isLoadingGame)) {
    return (
      <>
        <GameSkeleton config={boardConfig} />
        {/* Show continue dialog over skeleton if needed */}
        <Dialog open={showContinueDialog} onOpenChange={setShowContinueDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Continue Previous Game?</DialogTitle>
              <DialogDescription>
                You have a saved game with {storageState.savedGameSummary?.moveCount || 0} moves.
                Would you like to continue or start a new game?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button
                onClick={handleNewGame}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                New Game
              </Button>
              <Button
                onClick={handleContinueGame}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 p-2 md:p-4 overflow-hidden">
      <div className="h-full max-w-7xl mx-auto">

        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] gap-2 md:gap-4 lg:gap-6 h-full">
          <div className="flex flex-col items-center justify-between min-h-0 h-full">
            {/* Mobile Player Indicators */}
            <div className="lg:hidden w-full flex justify-between items-center px-2 py-1">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${currentPlayer === 'black' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-600'}`}>
                <span className="text-sm font-medium">Player 2</span>
                {currentPlayer === 'black' && <span className="text-xs animate-pulse">Playing...</span>}
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${currentPlayer === 'red' ? 'bg-red-600 text-white' : 'bg-red-200 text-red-800'}`}>
                <span className="text-sm font-medium">Player 1</span>
                {currentPlayer === 'red' && <span className="text-xs animate-pulse">Playing...</span>}
              </div>
            </div>

            {/* Board and Player Cards Container */}
            <div className="flex-grow flex flex-col items-center justify-start p-1 md:p-2 lg:p-4 w-full min-h-0">
              <div className="flex flex-col items-center justify-start w-full max-w-[calc(100vh-120px)] lg:max-w-[855px] h-full gap-2 lg:gap-3">
                {/* Desktop Top Player Card (Black - Opponent) */}
                <div className="w-full flex-shrink-0 hidden lg:block">
                  <PlayerCardWrapper
                    player={getPlayerByColor(players, 'black')}
                    color="black"
                    position="top"
                    isActive={currentPlayer === 'black' && !winner}
                    enableServerData={gameMode === 'online'}
                    showLoadingSkeleton={true}
                  />
                </div>
                
                {/* Board container */}
                <div className="relative aspect-square w-full min-h-0">
                  {/* Review mode indicator */}
                  {isReviewMode && (
                    <div className="absolute top-2 left-2 right-2 z-10 bg-blue-100/90 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center justify-between shadow-md">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-blue-700" />
                        <span className="text-sm font-medium text-blue-900">
                          Game Review Mode - Move {currentMoveIndex + 1} of {moveHistory.length}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => navigateToMove(0)}
                          size="sm"
                          variant="ghost"
                          disabled={currentMoveIndex <= -1}
                        >
                          Start
                        </Button>
                        <Button
                          onClick={() => navigateToMove(currentMoveIndex - 1)}
                          size="sm"
                          variant="ghost"
                          disabled={currentMoveIndex <= -1}
                        >
                          ← Previous
                        </Button>
                        <Button
                          onClick={() => navigateToMove(currentMoveIndex + 1)}
                          size="sm"
                          variant="ghost"
                          disabled={currentMoveIndex >= moveHistory.length - 1}
                        >
                          Next →
                        </Button>
                        <Button
                          onClick={() => {
                            setIsReviewMode(false);
                            setShowWinnerDialog(true);
                          }}
                          size="sm"
                          variant="default"
                        >
                          Exit Review
                        </Button>
                      </div>
                    </div>
                  )}
                  {/* History viewing indicator (for during-game navigation) */}
                  {isViewingHistory && !isReviewMode && (
                    <div className="absolute top-2 left-2 right-2 z-10 bg-amber-100/90 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center justify-between shadow-md">
                      <span className="text-sm font-medium text-amber-900">
                        Viewing move {currentMoveIndex + 1} of {moveHistory.length}
                      </span>
                      <Button
                        onClick={() => navigateToMove(moveHistory.length - 1)}
                        size="sm"
                        variant="default"
                        className="text-xs"
                      >
                        Return to Game
                      </Button>
                    </div>
                  )}
                  <Board
                    board={board}
                    selectedPosition={selectedPosition}
                    draggingPosition={draggingPosition}
                    validMoves={validMoves}
                    mustCapturePositions={mustCapturePositions}
                    currentPlayer={currentPlayer}
                    keyboardFocusPosition={keyboardFocusPosition}
                    config={boardConfig}
                    onSquareClick={handleSquareClick}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                  />
                </div>

                {/* Desktop Bottom Player Card (Red - Player) */}
                <div className="w-full flex-shrink-0 hidden lg:block">
                  <PlayerCardWrapper
                    player={getPlayerByColor(players, 'red')}
                    color="red"
                    position="bottom"
                    isActive={currentPlayer === 'red' && !winner}
                    enableServerData={gameMode === 'online'}
                    showLoadingSkeleton={true}
                  />
                </div>
              </div>
            </div>
            
            {/* {mustCapturePositions.length > 0 && !winner && (
              <Card className="mt-4 border-orange-400 bg-orange-50">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-orange-800">
                    ⚠️ You must capture when possible!
                  </p>
                </CardContent>
              </Card>
            )} */}
          </div>

          <div className="hidden lg:flex lg:flex-col gap-4 h-full overflow-hidden pb-4">
            {/* Show PostGameAnalysis when game is over and analyzing/complete, otherwise show MoveHistory */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {winner && (gameAnalysis || isAnalyzing) && !isReviewMode ? (
                <PostGameAnalysis
                  analysis={gameAnalysis}
                  winner={winner}
                  isAnalyzing={isAnalyzing}
                  analyzeProgress={analyzeProgress}
                  onStartReview={() => void enterReviewMode()}
                  onPlayAgain={() => {
                    const currentVariant = searchParams.get('boardVariant') || 
                      (boardConfig.size === 10 ? 'international' : 
                       boardConfig.size === 12 ? 'canadian' : 
                       boardConfig.allowBackwardCapture ? 'brazilian' : 'american');
                    createGameMutation.mutate({
                      mode: gameMode,
                      playerName: undefined,
                      boardVariant: currentVariant as any,
                    });
                  }}
                  playerNames={{
                    red: gameMode === 'ai' ? 'Player' : 'Player 1',
                    black: gameMode === 'ai' ? 'AI' : 'Player 2'
                  }}
                />
              ) : (
                <MoveHistory
                  moves={moveHistory}
                  currentMoveIndex={currentMoveIndex}
                  board={board}
                  boardConfig={boardConfig}
                  currentPlayer={currentPlayer}
                  onNavigateToMove={navigateToMove}
                  winner={winner}
                  analysis={gameAnalysis}
                  showAnalysis={isReviewMode}
                />
              )}
            </div>

            {gameMode === 'ai' && isAIThinking && (
              <Card className="border-blue-400 bg-blue-50 flex-shrink-0">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-blue-800 animate-pulse">
                    🤖 {aiDifficulty === 'expert' ? 'Chinook' : `AI (${aiDifficulty})`} is thinking...
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* Integrated Chat Component - fixed height at bottom */}
            <div className="h-64 flex-shrink-0 min-h-0">
              <IntegratedChat gameId={gameId} />
            </div>
          </div>
        </div>
      </div>

      {/* Winner Dialog */}
      <Dialog open={showWinnerDialog} onOpenChange={setShowWinnerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {winner === 'draw' ? '🤝 Game Draw!' : `🎉 ${winner === 'red' ? 'Red' : 'Black'} Player Wins!`}
            </DialogTitle>
            <DialogDescription>
              Great game! You made {moveCount} moves.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button 
              onClick={() => void enterReviewMode()} 
              className="flex-1"
            >
              <History className="w-4 h-4 mr-2" />
              Review Game
            </Button>
            <Button 
              onClick={() => {
                // Create a new game for rematch
                setShowWinnerDialog(false);
                const currentVariant = searchParams.get('boardVariant') || 
                  (boardConfig.size === 10 ? 'international' : 
                   boardConfig.size === 12 ? 'canadian' : 
                   boardConfig.allowBackwardCapture ? 'brazilian' : 'american');
                createGameMutation.mutate({
                  mode: gameMode,
                  playerName: undefined,
                  boardVariant: currentVariant as any,
                });
              }} 
              variant="secondary"
              className="w-full"
              disabled={createGameMutation.isPending}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {createGameMutation.isPending ? 'Creating...' : 'Play Again'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      <Dialog open={showContinueDialog} onOpenChange={setShowContinueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Continue Previous Game?</DialogTitle>
            <DialogDescription>
              You have a saved game with {storageState.savedGameSummary?.moveCount || 0} moves.
              Would you like to continue or start a new game?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              onClick={handleNewGame}
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              New Game
            </Button>
            <Button
              onClick={handleContinueGame}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TimeControlSelector
        timeControl={timeControl}
        open={showTimeControlDialog}
        onOpenChange={setShowTimeControlDialog}
        onTimeControlChange={(newTimeControl) => {
          setTimeControl(newTimeControl);
          timer.resetTimers(); // Reset timers when time control changes
        }}
        gameActive={!winner && moveCount > 0}
        audioEnabled={audioWarningsEnabled}
        onAudioEnabledChange={setAudioWarningsEnabled}
      />
      
      <MustCaptureArrow
        show={showMustCaptureArrow}
        fromPosition={mustCaptureTooltipPosition}
        toPosition={arrowTarget ?? undefined}
      />

      {/* Keyboard Shortcuts Help Dialog */}
      <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Use your keyboard to play checkers efficiently
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Navigation</h4>
              <div className="space-y-1 text-gray-700">
                <div className="flex justify-between">
                  <span>Move focus</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Arrow Keys</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Quick column jump</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">1-8</kbd>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Actions</h4>
              <div className="space-y-1 text-gray-700">
                <div className="flex justify-between">
                  <span>Select piece / Make move</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Enter</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Select piece / Make move</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Space</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Cancel selection</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Escape</kbd>
                </div>
              </div>
            </div>

            {timeControl && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Time Control</h4>
                <div className="space-y-1 text-gray-700">
                  <div className="flex justify-between">
                    <span>Pause/Resume timer</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Space</kbd>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Help</h4>
              <div className="space-y-1 text-gray-700">
                <div className="flex justify-between">
                  <span>Show this help</span>
                  <div className="space-x-1">
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">H</kbd>
                    <span className="text-gray-500">or</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">F1</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Tip:</strong> The blue outline shows your keyboard focus. Use arrow keys to move around the board and Enter/Space to interact with squares.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}