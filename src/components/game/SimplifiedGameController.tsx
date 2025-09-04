'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '~/components/ui/dialog';
import { RefreshCw, Users, Bot, Save, Download, Home, Wifi, WifiOff } from 'lucide-react';
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
import { useSingleTabEnforcement } from '~/hooks/useSingleTabEnforcement';
import { useGameSync } from '~/hooks/useGameSync';
import { api } from '~/trpc/react';
import { useRouter } from 'next/navigation';
import { Board } from './Board';
import { GameStats } from './GameStats';
import { IntegratedChat } from '~/components/chat/IntegratedChat';

interface SimplifiedGameControllerProps {
  gameId?: string;
}

export function SimplifiedGameController({ gameId }: SimplifiedGameControllerProps) {
  const router = useRouter();
  
  // Game state
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
  
  // Load game data if gameId is provided
  const { data: gameData } = api.simplifiedGame.load.useQuery(
    { id: gameId! },
    { enabled: !!gameId }
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

  const saveGameMutation = api.simplifiedGame.save.useMutation();

  // Single tab enforcement
  const tabEnforcement = useSingleTabEnforcement(gameId);

  // Storage hook for local games
  const [storageState, storageActions] = useGameStorage({
    storageType: 'hybrid',
    autoSave: !gameId,
    autoSaveInterval: 5000
  });

  // Game sync for online games (simplified)
  const [syncState, syncActions] = useGameSync({
    gameId: gameMode === 'online' ? gameId : undefined,
    enabled: gameMode === 'online' && tabEnforcement.isActiveTab,
    onOpponentMove: (move, gameState) => {
      // Apply opponent's move
      setBoard(gameState.board);
      setCurrentPlayer(gameState.currentPlayer);
      setMoveCount(gameState.moveCount);
      setWinner(gameState.winner);
      setMoveHistory(prev => [...prev, move]);
      setSelectedPosition(null);
      setValidMoves([]);
    },
    onConnectionStatusChange: (connected) => {
      console.log('Connection status:', connected ? 'Connected' : 'Disconnected');
    }
  });

  const handleMove = useCallback(async (move: Move) => {
    // Apply move locally
    const newBoard = makeMove(board, move);
    const newMoveHistory = [...moveHistory, move];
    
    setBoard(newBoard);
    setMoveCount(prev => prev + 1);
    setMoveHistory(newMoveHistory);
    setSelectedPosition(null);
    setValidMoves([]);
    
    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
    } else {
      setCurrentPlayer(prev => prev === 'red' ? 'black' : 'red');
    }
    
    // Save/sync based on game mode
    if (gameMode === 'online' && gameId) {
      // Send move to server for online games
      await syncActions.sendMove(move, board, currentPlayer, moveCount);
    } else if (gameId) {
      // Save to server for games with IDs
      saveGameMutation.mutate({
        id: gameId,
        board: newBoard,
        currentPlayer: currentPlayer === 'red' ? 'black' : 'red',
        moveCount: moveCount + 1,
        gameMode,
        winner: gameWinner,
        moves: newMoveHistory
      });
    } else {
      // Save locally for offline games
      await storageActions.saveGame({
        board: newBoard,
        currentPlayer: currentPlayer === 'red' ? 'black' : 'red',
        moveCount: moveCount + 1,
        moveHistory: newMoveHistory,
        gameMode,
        gameStartTime,
        winner: gameWinner
      });
    }
  }, [board, moveHistory, moveCount, currentPlayer, gameMode, gameStartTime, storageActions, gameId, saveGameMutation, syncActions]);

  const handleSquareClick = (position: Position) => {
    if (!tabEnforcement.isActiveTab) return;
    
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
    if (!tabEnforcement.isActiveTab) return;
    
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
    if (!tabEnforcement.isActiveTab) return;
    
    if (selectedPosition) {
      const move = validMoves.find(
        m => m.to.row === position.row && m.to.col === position.col
      );
      
      if (move) {
        void handleMove(move);
      }
    }
  };

  const resetGame = () => {
    setBoard(createInitialBoard());
    setCurrentPlayer('red');
    setSelectedPosition(null);
    setValidMoves([]);
    setMoveCount(0);
    setMoveHistory([]);
    setWinner(null);
    setGameStartTime(new Date());
    setIsAIThinking(false);
    storageActions.deleteGame();
  };

  // AI Move
  useEffect(() => {
    if (gameMode === 'ai' && currentPlayer === 'black' && !winner && !isAIThinking && tabEnforcement.isActiveTab) {
      setIsAIThinking(true);
      
      const makeAIMove = async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const aiMove = getRandomAIMove(board, 'black');
        if (aiMove) {
          handleMove(aiMove);
        }
        setIsAIThinking(false);
      };
      
      void makeAIMove();
    }
  }, [currentPlayer, gameMode, board, winner, handleMove, isAIThinking, tabEnforcement.isActiveTab]);

  // Check for saved game on mount
  useEffect(() => {
    if (gameId) return;
    
    const checkSavedGame = async () => {
      const savedGame = await storageActions.loadGame();
      if (savedGame) {
        setShowContinueDialog(true);
      }
    };
    
    void checkSavedGame();
  }, [gameId, storageActions]);

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
    }
    setShowContinueDialog(false);
  };
  
  const handleNewGame = () => {
    resetGame();
    setShowContinueDialog(false);
  };

  // Highlight mandatory captures
  const mustCapturePositions = getMustCapturePositions(board, currentPlayer);

  // Show message if another tab is active
  if (tabEnforcement.hasOtherTabs && !tabEnforcement.isActiveTab) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Game Already Open</CardTitle>
            <CardDescription>
              This game is already open in another tab or window.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              To prevent conflicts and ensure the best experience, you can only play the game in one tab at a time.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/')} className="flex-1">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <div className="flex items-center gap-2">
                {gameMode === 'online' && (
                  syncState.isConnected ? (
                    <Wifi className="h-4 w-4 text-green-300" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-300" />
                  )
                )}
              </div>
            </div>
            <CardTitle className="text-4xl font-bold text-center">Checkers Game</CardTitle>
            <CardDescription className="text-center text-amber-100">
              {gameMode === 'ai' && 'Playing against AI'}
              {gameMode === 'local' && 'Local pass & play'}
              {gameMode === 'online' && 'Online multiplayer'}
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
          </div>

          <div className="space-y-4">
            <GameStats
              board={board}
              currentPlayer={currentPlayer}
              moveCount={moveCount}
              winner={winner}
              gameStartTime={gameStartTime}
            />

            {/* Connection Status for Online Games */}
            {gameMode === 'online' && (
              <Card className={`border ${syncState.isConnected ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {syncState.isConnected ? (
                      <>
                        <Wifi className="w-4 h-4 text-green-600" />
                        <span className="text-green-800">Connected</span>
                      </>
                    ) : syncState.isReconnecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 text-orange-600 animate-spin" />
                        <span className="text-orange-800">Reconnecting...</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-red-600" />
                        <span className="text-red-800">Disconnected</span>
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                {syncState.offlineMoveQueue.length > 0 && (
                  <CardContent>
                    <p className="text-xs text-gray-600">
                      {syncState.offlineMoveQueue.length} move{syncState.offlineMoveQueue.length > 1 ? 's' : ''} pending sync
                    </p>
                  </CardContent>
                )}
              </Card>
            )}

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300">
              <CardHeader>
                <CardTitle className="text-amber-900">Game Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={resetGame} 
                  className="w-full bg-amber-600 hover:bg-amber-700"
                  disabled={moveCount === 0}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  New Game
                </Button>
              </CardContent>
            </Card>

            {/* Integrated Chat for online games */}
            {gameMode === 'online' && gameId && (
              <IntegratedChat gameId={gameId} />
            )}
          </div>
        </div>
      </div>

      {/* Continue Game Dialog */}
      <Dialog open={showContinueDialog} onOpenChange={setShowContinueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Continue Previous Game?</DialogTitle>
            <DialogDescription>
              You have an unfinished game with {storageState.savedGameSummary?.moveCount} moves.
              Would you like to continue or start a new game?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleNewGame}>
              Start New Game
            </Button>
            <Button onClick={handleContinueGame}>
              Continue Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}