"use client";

import React, { useEffect, useState } from "react";
import { History, Users, Eye, Wifi } from "lucide-react";
import { Board } from "~/app/(checkers)/_components/game/Board";
import { GameWrapper } from "~/app/(checkers)/_components/game/game-wrapper";
import { GameControlPanel } from "~/app/(checkers)/_components/game/GameControlPanel";
import { MoveHistory } from "~/app/(checkers)/_components/game/MoveHistory";
import { PlayerCardContainer } from "~/app/(checkers)/_components/game/player-card-container";
import { PostGameAnalysis } from "~/app/(checkers)/_components/game/PostGameAnalysis";
import { WinnerDialog } from "~/app/(checkers)/_components/game/WinnerDialog.motion";
import { ConnectionStatusBar, useConnectionStatus } from "./ConnectionStatusBar";
import { MoveSyncIndicator, OptimisticMoveOverlay } from "./MoveSyncIndicator";
import { OfflineQueuePanel } from "./OfflineQueuePanel";
import { SpectatorPanel, SpectatorIndicator } from "./SpectatorPanel";
import { useMultiplayerGame } from "./MultiplayerGameProvider";
import { GameChat } from "~/components/chat/GameChat";
import { Button } from "~/components/ui/button";
import { ResizablePanels } from "~/components/ui/resizable-panels";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { useSettings } from "~/contexts/settings-context";
import { useAudioWarnings } from "~/hooks/useAudioWarnings";
import { useGameSounds } from "~/hooks/useGameSounds";
import { useGameTimers } from "~/lib/game/hooks/use-game-timers";
import { useMustCapture } from "~/lib/game/hooks/use-must-capture";
import { useGame } from "~/lib/game/state/game-context";
import { cn } from "~/lib/utils";

interface MultiplayerGameScreenProps {
  className?: string;
}

export function MultiplayerGameScreen({ className }: MultiplayerGameScreenProps) {
  const { state, dispatch } = useGame();
  const { state: multiplayerState, actions: multiplayerActions } = useMultiplayerGame();
  const { settings } = useSettings();
  const connectionStatus = useConnectionStatus();
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  const { mustCapturePositions, onSquareClick, onDragStart, onDrop } = useMustCapture();
  const { playStartGame, playMove } = useGameSounds({
    enabled: settings.soundEffectsEnabled,
    volume: settings.sfxVolume / 100,
  });

  const timer = useGameTimers();
  
  // Determine board orientation based on multiplayer state
  const shouldFlipBoard = multiplayerState.boardOrientation === 'flipped';
  
  // Show post-game analysis
  const showPostGameAnalysis = 
    state.winner && 
    (state.gameAnalysis ?? state.isAnalyzing) && 
    !state.isReviewMode;
  
  const showTimer = state.timeControl && !state.isReviewMode;

  // Enable audio warnings when timer is active
  useAudioWarnings({
    enabled: state.audioWarningsEnabled && !!state.timeControl && !state.winner,
    timeState: timer.timeState,
  });

  // Play start game sound when component mounts
  useEffect(() => {
    if (state.moveCount === 0 && !state.winner && multiplayerState.isConnected) {
      playStartGame();
    }
  }, [multiplayerState.isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show offline alert when connection is lost
  useEffect(() => {
    if (!connectionStatus.isOnline && connectionStatus.hasQueuedMoves) {
      setShowOfflineAlert(true);
    } else {
      setShowOfflineAlert(false);
    }
  }, [connectionStatus.isOnline, connectionStatus.hasQueuedMoves]);

  // Check if current user can make moves
  const canMakeMove = () => {
    if (state.winner) return false;
    if (multiplayerState.playerRole === 'SPECTATOR') return false;
    if (state.currentPlayer !== multiplayerState.playerColor) return false;
    return true;
  };

  // Enhanced move handling with multiplayer sync
  const handleMove = async (moveFunction: () => void, moveData?: any) => {
    if (!canMakeMove()) return;

    // Execute the move locally (optimistic update)
    moveFunction();

    // If we have move data, send it to other players
    if (moveData && multiplayerState.isConnected) {
      const success = await multiplayerActions.sendMove(moveData, {
        board: state.board,
        currentPlayer: state.currentPlayer,
        moveCount: state.moveCount
      });
      
      if (success) {
        playMove();
      }
    }
  };

  return (
    <div className={cn("h-[calc(100vh-var(--header-height))] overflow-hidden p-2 md:p-4", className)}>
      <GameWrapper>
        {/* Connection Status and Controls */}
        <div className="mb-2 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <ConnectionStatusBar className="flex-1" />
            <div className="flex items-center gap-2">
              <MoveSyncIndicator variant="minimal" />
              <SpectatorIndicator />
            </div>
          </div>
          
          {/* Offline Alert */}
          {showOfflineAlert && (
            <Alert className="border-yellow-500 bg-yellow-50">
              <Wifi className="h-4 w-4" />
              <AlertDescription>
                You're offline. Your moves are being queued and will sync when connection is restored.
                {connectionStatus.queuedMovesCount > 0 && 
                  ` (${connectionStatus.queuedMovesCount} moves queued)`}
              </AlertDescription>
            </Alert>
          )}

          {/* Offline Queue Panel */}
          {connectionStatus.hasQueuedMoves && (
            <OfflineQueuePanel variant="compact" />
          )}

          {/* Player Role and Game Status */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={multiplayerState.playerRole === 'SPECTATOR' ? 'secondary' : 'default'}>
                {multiplayerState.playerRole === 'SPECTATOR' ? (
                  <>
                    <Eye className="mr-1 h-3 w-3" />
                    Spectating
                  </>
                ) : (
                  <>Playing as {multiplayerState.playerColor}</>
                )}
              </Badge>
              
              {multiplayerState.spectatorCount > 0 && (
                <Badge variant="outline">
                  <Users className="mr-1 h-3 w-3" />
                  {multiplayerState.spectatorCount} watching
                </Badge>
              )}
            </div>

            {!multiplayerState.opponentConnected && multiplayerState.playerRole !== 'SPECTATOR' && (
              <Badge variant="outline" className="text-yellow-600">
                Waiting for opponent...
              </Badge>
            )}
          </div>
        </div>

        <div className="board-fit-max flex h-full min-h-0 flex-col items-center justify-between">
          {/* Mobile/Tablet: Top Player Card */}
          <div className="flex min-h-[56px] w-full flex-shrink-0 items-center py-3 lg:hidden">
            <PlayerCardContainer
              player={shouldFlipBoard ? state.players.red : state.players.black}
              color={shouldFlipBoard ? "red" : "black"}
              position="top"
              isActive={
                state.currentPlayer === (shouldFlipBoard ? "red" : "black") && 
                !state.winner
              }
              enableServerData={true}
              showLoadingSkeleton={true}
              timeState={showTimer ? timer.timeState : null}
              className="w-full max-w-md"
            />
          </div>

          <div className="flex min-h-0 w-full flex-grow flex-col items-center justify-start">
            <div className="mx-auto flex h-full w-full flex-col items-center justify-start rounded-xl border-2 border-gray-300 bg-white p-4 shadow-lg lg:max-w-[855px]">
              {/* Desktop: Top Player Card */}
              <div className="hidden min-h-[56px] w-full flex-shrink-0 items-center py-3 lg:flex">
                <PlayerCardContainer
                  player={shouldFlipBoard ? state.players.red : state.players.black}
                  color={shouldFlipBoard ? "red" : "black"}
                  position="top"
                  isActive={
                    state.currentPlayer === (shouldFlipBoard ? "red" : "black") && 
                    !state.winner
                  }
                  enableServerData={true}
                  showLoadingSkeleton={true}
                  timeState={showTimer ? timer.timeState : null}
                  className="w-full max-w-md"
                />
              </div>

              {/* Game Board */}
              <div className="flex min-h-0 w-full flex-grow items-center justify-center py-2">
                <div className="relative aspect-square min-h-0 w-full">
                  {/* Review Mode Indicator */}
                  {state.isReviewMode && (
                    <div className="absolute top-2 right-12 left-2 z-10 flex items-center justify-between rounded-lg bg-blue-100/90 px-3 py-2 shadow-md backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-blue-700" />
                        <span className="text-sm font-medium text-blue-900">
                          Game Review Mode - Move {state.currentMoveIndex + 1} of {state.moveHistory.length}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => dispatch({ type: "NAVIGATE_TO_MOVE", payload: 0 })}
                          size="sm"
                          variant="ghost"
                          disabled={state.currentMoveIndex <= -1}
                        >
                          Start
                        </Button>
                        <Button
                          onClick={() => dispatch({
                            type: "NAVIGATE_TO_MOVE",
                            payload: state.currentMoveIndex - 1,
                          })}
                          size="sm"
                          variant="ghost"
                          disabled={state.currentMoveIndex <= -1}
                        >
                          ← Previous
                        </Button>
                        <Button
                          onClick={() => dispatch({
                            type: "NAVIGATE_TO_MOVE",
                            payload: state.currentMoveIndex + 1,
                          })}
                          size="sm"
                          variant="ghost"
                          disabled={state.currentMoveIndex >= state.moveHistory.length - 1}
                        >
                          Next →
                        </Button>
                        <Button
                          onClick={() => dispatch({ type: "TOGGLE_REVIEW_MODE", payload: false })}
                          size="sm"
                          variant="default"
                        >
                          Exit Review
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* History Viewing Indicator */}
                  {state.isViewingHistory && !state.isReviewMode && (
                    <div className="absolute top-2 right-12 left-2 z-10 flex items-center justify-between rounded-lg bg-amber-100/90 px-3 py-2 shadow-md backdrop-blur-sm">
                      <span className="text-sm font-medium text-amber-900">
                        Viewing move {state.currentMoveIndex + 1} of {state.moveHistory.length}
                      </span>
                      <Button
                        onClick={() => dispatch({
                          type: "NAVIGATE_TO_MOVE",
                          payload: state.moveHistory.length - 1,
                        })}
                        size="sm"
                        variant="default"
                        className="text-xs"
                      >
                        Return to Game
                      </Button>
                    </div>
                  )}

                  <Board
                    board={state.board}
                    selectedPosition={state.selectedPosition}
                    draggingPosition={state.draggingPosition}
                    validMoves={state.validMoves}
                    mustCapturePositions={mustCapturePositions}
                    currentPlayer={state.currentPlayer}
                    keyboardFocusPosition={null}
                    size={state.rules.board.size}
                    shouldFlip={shouldFlipBoard}
                    winner={state.winner}
                    onSquareClick={(pos, e) => {
                      handleMove(() => onSquareClick(pos, e));
                    }}
                    onDragStart={(pos) => {
                      if (canMakeMove()) {
                        onDragStart(pos);
                      }
                    }}
                    onDragEnd={() => dispatch({ type: "SET_DRAGGING", payload: null })}
                    onDrop={(pos) => {
                      handleMove(() => onDrop(pos));
                    }}
                  />
                </div>
              </div>

              {/* Desktop: Bottom Player Card */}
              <div className="hidden min-h-[56px] w-full flex-shrink-0 items-center py-3 lg:flex">
                <PlayerCardContainer
                  player={shouldFlipBoard ? state.players.black : state.players.red}
                  color={shouldFlipBoard ? "black" : "red"}
                  position="bottom"
                  isActive={
                    state.currentPlayer === (shouldFlipBoard ? "black" : "red") && 
                    !state.winner
                  }
                  enableServerData={true}
                  showLoadingSkeleton={true}
                  timeState={showTimer ? timer.timeState : null}
                  className="w-full max-w-md"
                />
              </div>

              {/* Mobile/Tablet: Bottom Player Card */}
              <div className="flex min-h-[56px] w-full flex-shrink-0 items-center py-3 lg:hidden">
                <PlayerCardContainer
                  player={shouldFlipBoard ? state.players.black : state.players.red}
                  color={shouldFlipBoard ? "black" : "red"}
                  position="bottom"
                  isActive={
                    state.currentPlayer === (shouldFlipBoard ? "black" : "red") && 
                    !state.winner
                  }
                  enableServerData={true}
                  showLoadingSkeleton={true}
                  timeState={showTimer ? timer.timeState : null}
                  className="w-full max-w-md"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel - Move History, Chat, and Spectator Panel */}
        <div className="hidden h-full w-full overflow-hidden pb-4 lg:flex">
          <ResizablePanels
            direction="vertical"
            defaultSize={multiplayerState.spectatorCount > 0 || multiplayerState.playerRole === 'SPECTATOR' ? 50 : 60}
            minSize={20}
            className="gap-2"
            panelClassName="min-h-0"
          >
            <div className="flex h-full w-full flex-col gap-4 overflow-hidden">
              {showPostGameAnalysis ? (
                <PostGameAnalysis
                  analysis={state.gameAnalysis}
                  winner={state.winner}
                  isAnalyzing={state.isAnalyzing}
                  analyzeProgress={state.analyzeProgress}
                  onStartReview={() => dispatch({ type: "TOGGLE_REVIEW_MODE", payload: true })}
                  onPlayAgain={() => window.location.reload()}
                  playerNames={{
                    red: "Player 1",
                    black: "Player 2",
                  }}
                />
              ) : (
                <>
                  <div className="flex-1 overflow-hidden">
                    <MoveHistory
                      moves={state.moveHistory}
                      currentMoveIndex={state.currentMoveIndex}
                      board={state.board}
                      boardSize={state.rules.board.size}
                      currentPlayer={state.currentPlayer}
                      onNavigateToMove={(i) => dispatch({ type: "NAVIGATE_TO_MOVE", payload: i })}
                      winner={state.winner}
                      analysis={state.gameAnalysis}
                      showAnalysis={state.isReviewMode}
                    />
                  </div>

                  {/* Multiplayer-specific panels */}
                  <div className="space-y-2">
                    {/* Move Sync Indicator */}
                    <MoveSyncIndicator />
                    
                    {/* Offline Queue Panel */}
                    {(connectionStatus.hasQueuedMoves || !connectionStatus.isOnline) && (
                      <OfflineQueuePanel />
                    )}

                    {/* Spectator Panel */}
                    {(multiplayerState.spectatorCount > 0 || multiplayerState.playerRole === 'SPECTATOR') && (
                      <SpectatorPanel />
                    )}
                  </div>

                  {/* Game Control Panel */}
                  <div className="flex-shrink-0 border-t pt-4">
                    <GameControlPanel
                      currentMoveIndex={state.currentMoveIndex + 1}
                      totalMoves={state.moveHistory.length}
                      canNavigateHistory={true}
                      onGoToStart={() => dispatch({ type: "NAVIGATE_TO_MOVE", payload: -1 })}
                      onPreviousMove={() => dispatch({ type: "NAVIGATE_TO_MOVE", payload: state.currentMoveIndex - 1 })}
                      onTogglePlay={() => console.log("Toggle play clicked")}
                      onNextMove={() => dispatch({ type: "NAVIGATE_TO_MOVE", payload: state.currentMoveIndex + 1 })}
                      onGoToEnd={() => dispatch({ type: "NAVIGATE_TO_MOVE", payload: state.moveHistory.length - 1 })}
                      
                      currentPlayer={state.currentPlayer}
                      winner={state.winner}
                      isViewingHistory={state.isViewingHistory}
                      isReviewMode={state.isReviewMode}
                      gameMode="online"
                      playerColor={multiplayerState.playerColor ?? 'red'}
                      onResign={(player) => dispatch({ type: "RESIGN", payload: player })}
                      onRequestDraw={() => dispatch({ type: "REQUEST_DRAW" })}
                      onAcceptDraw={() => dispatch({ type: "ACCEPT_DRAW" })}
                      onDeclineDraw={() => dispatch({
                        type: "DIALOGS",
                        payload: { showDrawDialog: false },
                      })}
                      showDrawDialog={state.showDrawDialog}
                      drawRequestedBy={state.drawRequestedBy}
                      onOpenSettings={() => console.log("Settings clicked")}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Chat Panel */}
            <div className="h-full overflow-hidden">
              <GameChat
                gameId={multiplayerState.gameId}
                opponentName={
                  state.currentPlayer === "red"
                    ? (state.players.black.name ?? "Player 2")
                    : (state.players.red.name ?? "Player 1")
                }
              />
            </div>
          </ResizablePanels>
        </div>
      </GameWrapper>

      {/* Winner Dialog */}
      <WinnerDialog
        winner={state.winner}
        drawReason={state.drawReason}
        open={state.showWinnerDialog}
        onOpenChange={(open) =>
          dispatch({ type: "DIALOGS", payload: { showWinnerDialog: open } })
        }
        onPlayAgain={() => window.location.reload()}
        onStartAnalysis={() => {
          dispatch({ type: "DIALOGS", payload: { showWinnerDialog: false } });
        }}
        gameMode="online"
        playerColor={multiplayerState.playerColor ?? 'red'}
        boardVariant={state.boardVariant}
        aiDifficulty={state.aiDifficulty}
        timeControl={state.timeControl}
      />
    </div>
  );
}