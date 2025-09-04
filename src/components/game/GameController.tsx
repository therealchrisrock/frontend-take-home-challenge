'use client';

import { useState, useEffect, useCallback } from 'react';
import { Board } from './Board';
import { GameStats } from './GameStats';
import { TimeControlPanel } from './TimeControlPanel';
import { TimeControlSelector } from './TimeControlSelector';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '~/components/ui/dialog';
import { RefreshCw, Users, Bot, Save, Download, Home, Wifi, WifiOff, Cloud, CloudOff, Clock } from 'lucide-react';
import {
  type Board as BoardType,
  type Position,
  type PieceColor,
  type Move,
  createInitialBoard,
  getValidMoves,
  makeMove,
  checkWinner,
  getRandomAIMove,
  getMustCapturePositions
} from '~/lib/game-logic';
import { useGameStorage } from '~/hooks/useGameStorage';
import { useMultiTabSync } from '~/hooks/useMultiTabSync';
import { useOfflineSync } from '~/hooks/useOfflineSync';
import { useTimer } from '~/hooks/useTimer';
import { Badge } from '~/components/ui/badge';
import { api } from '~/trpc/react';
import { useRouter } from 'next/navigation';
import { IntegratedChat } from '~/components/chat/IntegratedChat';
import { TabStatusIndicator } from '~/components/TabStatusIndicator';
import type { InitialStatePayload, MoveAppliedPayload } from '~/lib/multi-tab/types';
import { type TimeControl, type TimeState } from '~/lib/time-control-types';

interface GameControllerProps {
  gameId?: string;
}

export function GameController({ gameId }: GameControllerProps = {}) {
  const router = useRouter();
  const [board, setBoard] = useState<BoardType>(createInitialBoard);
  const [currentPlayer, setCurrentPlayer] = useState<PieceColor>('red');
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [moveCount, setMoveCount] = useState(0);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [winner, setWinner] = useState<PieceColor | 'draw' | null>(null);
  const [gameStartTime, setGameStartTime] = useState(new Date());
  const [gameMode, setGameMode] = useState<'ai' | 'local' | 'online'>('ai');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(!!gameId);
  const [timeControl, setTimeControl] = useState<TimeControl | null>(null);
  const [showTimeControlDialog, setShowTimeControlDialog] = useState(false);
  
  // Load game data if gameId is provided
  const { data: gameData } = api.game.load.useQuery(
    { id: gameId! },
    { 
      enabled: !!gameId
    }
  );
  
  // Update state when game data is loaded
  useEffect(() => {
    if (gameData) {
      setBoard(gameData.board);
      setCurrentPlayer(gameData.currentPlayer);
      setMoveCount(gameData.moveCount);
      setMoveHistory(gameData.moveHistory);
      setGameMode(gameData.gameMode);
      setGameStartTime(new Date(gameData.gameStartTime));
      setWinner(gameData.winner);
      setIsLoading(false);
    }
  }, [gameData]);

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

    // Local move handling (for offline mode or fallback)
    const newBoard = makeMove(board, move);
    const newMoveHistory = [...moveHistory, move];
    
    // Handle time control - stop current timer and add increment
    if (timeControl) {
      timer.stopTimer();
      timer.addIncrement(currentPlayer);
    }
    
    setBoard(newBoard);
    setMoveCount(prev => prev + 1);
    setMoveHistory(newMoveHistory);
    setSelectedPosition(null);
    setValidMoves([]);
    
    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
      if (timeControl) {
        timer.stopTimer(); // Stop timer when game ends
      }
    } else {
      const nextPlayer = currentPlayer === 'red' ? 'black' : 'red';
      setCurrentPlayer(nextPlayer);
      
      // Start timer for next player
      if (timeControl) {
        timer.startTimer(nextPlayer);
      }
    }
    
    // Auto-save after move
    if (!gameWinner) {
      if (gameId && !syncState.syncManager) {
        // Save to server if we have a gameId but no sync (fallback mode)
        saveGameMutation.mutate({
          id: gameId,
          board: newBoard,
          currentPlayer: currentPlayer === 'red' ? 'black' : 'red',
          moveCount: moveCount + 1,
          gameMode,
          winner: gameWinner,
          moves: newMoveHistory
        });
      } else if (!gameId) {
        // Save locally with IndexedDB
        const gameState = {
          board: newBoard,
          currentPlayer: currentPlayer === 'red' ? 'black' : 'red' as PieceColor,
          moveCount: moveCount + 1,
          moveHistory: newMoveHistory,
          gameMode,
          gameStartTime,
          winner: gameWinner
        };
        
        await storageActions.saveGame(gameState);
        
        // Queue for sync to server when online (for local games)
        if (offlineSync.isOnline && gameMode !== 'online') {
          offlineSync.queueGameUpdate(gameState);
        }
      }
    }
  }, [board, moveHistory, moveCount, currentPlayer, gameMode, gameStartTime, storageActions, gameId, saveGameMutation, syncState, syncActions, offlineSync]);

  const handleSquareClick = (position: Position) => {
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
        const moves = getValidMoves(board, position, currentPlayer);
        setSelectedPosition(position);
        setValidMoves(moves);
      } else {
        setSelectedPosition(null);
        setValidMoves([]);
      }
    } else if (piece?.color === currentPlayer) {
      const moves = getValidMoves(board, position, currentPlayer);
      setSelectedPosition(position);
      setValidMoves(moves);
    }
  };

  const handleDragStart = (position: Position) => {
    // Check if this tab can make moves (only apply to online games)
    if (gameMode === 'online' && gameId && syncState.syncManager && !syncState.isActiveTab) {
      return; // Inactive tabs cannot drag pieces
    }

    const piece = board[position.row]?.[position.col];
    if (piece?.color === currentPlayer) {
      const moves = getValidMoves(board, position, currentPlayer);
      setSelectedPosition(position);
      setValidMoves(moves);
    }
  };

  const handleDragEnd = () => {
    // Keep selection for visual feedback
  };

  const handleDrop = (position: Position) => {
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

  const resetGame = (clearStorage = true) => {
    setBoard(createInitialBoard());
    setCurrentPlayer('red');
    setSelectedPosition(null);
    setValidMoves([]);
    setMoveCount(0);
    setMoveHistory([]);
    setWinner(null);
    setGameStartTime(new Date());
    setIsAIThinking(false);
    
    // Reset timers
    timer.resetTimers();
    
    if (clearStorage) {
      storageActions.deleteGame();
    }
  };
  
  const handleContinueGame = async () => {
    const savedGame = await storageActions.loadGame();
    if (savedGame) {
      setBoard(savedGame.board);
      setCurrentPlayer(savedGame.currentPlayer);
      setMoveCount(savedGame.moveCount);
      setMoveHistory(savedGame.moveHistory);
      setGameMode(savedGame.gameMode);
      setGameStartTime(savedGame.gameStartTime);
      setWinner(savedGame.winner);
      setSelectedPosition(null);
      setValidMoves([]);
    }
    setShowContinueDialog(false);
  };
  
  const handleNewGame = () => {
    resetGame(true);
    setShowContinueDialog(false);
  };
  
  // Check for saved game on mount
  useEffect(() => {
    if (gameId) return; // Skip if we have a gameId (loading from server)
    
    const checkSavedGame = async () => {
      const hasSaved = await storageActions.checkForSavedGame();
      if (hasSaved && !winner) {
        setShowContinueDialog(true);
      }
    };
    checkSavedGame();
  }, [gameId]); // Only run once when gameId changes or on mount

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
    if (gameMode === 'ai' && currentPlayer === 'black' && !winner && !isAIThinking) {
      setIsAIThinking(true);
      
      const makeAIMove = async () => {
        // Add a small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const aiMove = getRandomAIMove(board, 'black');
        if (aiMove) {
          handleMove(aiMove);
        }
        setIsAIThinking(false);
      };
      
      void makeAIMove();
    }
  }, [currentPlayer, gameMode, board, winner, handleMove, isAIThinking]);

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

  // Highlight mandatory captures
  const mustCapturePositions = getMustCapturePositions(board, currentPlayer);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 p-4">
      <div className="max-w-7xl mx-auto">
        <Card className="mb-6 bg-gradient-to-r from-amber-600 to-orange-600 text-white border-0">
          <CardHeader>
            <div className="flex justify-between items-center mb-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-amber-700/50"
                onClick={() => router.push('/')}
              >
                <Home className="h-5 w-5" />
              </Button>
              {gameId && (
                <Badge variant="secondary" className="text-sm">
                  Game ID: {gameId.slice(0, 8)}
                </Badge>
              )}
              <div className="w-10" /> {/* Spacer for centering */}
            </div>
            <CardTitle className="text-4xl font-bold text-center">Checkers Game</CardTitle>
            <CardDescription className="text-center text-amber-100">
              Classic checkers with drag-and-drop gameplay
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid lg:grid-cols-[1fr_350px] gap-6">
          <div className="flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl aspect-square">
              <Board
                board={board}
                selectedPosition={selectedPosition}
                validMoves={validMoves}
                currentPlayer={currentPlayer}
                onSquareClick={handleSquareClick}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
              />
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

          <div className="space-y-4">
            <GameStats
              board={board}
              currentPlayer={currentPlayer}
              moveCount={moveCount}
              winner={winner}
              gameStartTime={gameStartTime}
            />

            {/* Time Control Panel */}
            <TimeControlPanel
              timeState={timer.timeState}
              timeControl={timeControl}
              gameActive={!winner}
              aiThinking={isAIThinking}
              onPauseResume={() => {
                if (timer.timeState.isPaused) {
                  timer.resumeTimer();
                } else {
                  timer.pauseTimer();
                }
              }}
              onReset={() => timer.resetTimers()}
              onSettings={() => setShowTimeControlDialog(true)}
            />

            {/* Multi-tab synchronization status */}
            {gameId && (
              <TabStatusIndicator
                isConnected={syncState.isConnected}
                isActiveTab={syncState.isActiveTab}
                totalTabs={syncState.totalTabs}
                connectionError={syncState.connectionError}
                isReconnecting={syncState.isReconnecting}
                offlineMoveCount={syncState.offlineMoveCount}
                lastConnected={syncState.lastConnected}
                onRequestActivation={syncActions.requestTabActivation}
                onReconnect={syncActions.connect}
              />
            )}

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300">
              <CardHeader>
                <CardTitle className="text-amber-900">Game Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setGameMode('ai');
                      resetGame();
                    }}
                    variant={gameMode === 'ai' ? 'default' : 'outline'}
                    className="flex-1"
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    vs AI
                  </Button>
                  <Button
                    onClick={() => {
                      setGameMode('local');
                      resetGame();
                    }}
                    variant={gameMode === 'local' ? 'default' : 'outline'}
                    className="flex-1"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    2 Players
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => resetGame(true)} 
                    variant="secondary" 
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    New Game
                  </Button>
                  <Button
                    onClick={() => setShowTimeControlDialog(true)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Time Control
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300">
              <CardHeader>
                <CardTitle className="text-amber-900 text-sm flex items-center justify-between">
                  <span>Storage</span>
                  <div className="flex items-center gap-2">
                    {offlineSync.isOnline ? (
                      <Wifi className="w-3 h-3 text-green-600" />
                    ) : (
                      <WifiOff className="w-3 h-3 text-red-600" />
                    )}
                    {offlineSync.pendingChanges > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {offlineSync.pendingChanges} pending
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Offline sync status */}
                {!gameId && gameMode !== 'online' && (
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-1">
                      {offlineSync.isOnline ? (
                        <>
                          <Cloud className="w-3 h-3 text-green-600" />
                          <span className="text-green-700">Online - Auto-syncing to cloud</span>
                        </>
                      ) : (
                        <>
                          <CloudOff className="w-3 h-3 text-amber-600" />
                          <span className="text-amber-700">Offline - Will sync when online</span>
                        </>
                      )}
                    </div>
                    {offlineSync.isSyncing && (
                      <div className="text-blue-600">Syncing...</div>
                    )}
                    {offlineSync.lastSyncTime && (
                      <div className="text-gray-600">
                        Last sync: {new Date(offlineSync.lastSyncTime).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                )}
                
                {storageState.hasSavedGame && (
                  <div className="text-xs text-amber-700 mb-2">
                    <Badge variant="outline" className="text-xs">
                      Saved: {storageState.savedGameSummary?.moveCount} moves
                    </Badge>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={() => storageActions.saveGame({
                      board,
                      currentPlayer,
                      moveCount,
                      moveHistory,
                      gameMode,
                      gameStartTime,
                      winner
                    })}
                    variant="outline"
                    size="sm"
                    disabled={storageState.saving || winner !== null}
                    className="flex-1"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    {storageState.saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    onClick={handleContinueGame}
                    variant="outline"
                    size="sm"
                    disabled={!storageState.hasSavedGame || storageState.loading}
                    className="flex-1"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Load
                  </Button>
                </div>
                {storageState.error && (
                  <p className="text-xs text-red-600">{storageState.error}</p>
                )}
              </CardContent>
            </Card>

            {gameMode === 'ai' && isAIThinking && (
              <Card className="border-blue-400 bg-blue-50">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-blue-800 animate-pulse">
                    🤖 AI is thinking...
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* Integrated Chat Component */}
            <div className="h-[400px]">
              <IntegratedChat gameId={gameId} />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={winner !== null} onOpenChange={() => winner && resetGame(true)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {winner === 'draw' ? '🤝 Game Draw!' : `🎉 ${winner === 'red' ? 'Red' : 'Black'} Player Wins!`}
            </DialogTitle>
            <DialogDescription>
              Great game! You made {moveCount} moves.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => resetGame(true)} className="w-full">
            Play Again
          </Button>
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
      />
    </div>
  );
}