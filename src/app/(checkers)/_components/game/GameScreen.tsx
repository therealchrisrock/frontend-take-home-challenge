"use client";
import { History } from "lucide-react";
import { useEffect } from "react";
import { Board } from "~/app/(checkers)/_components/game/Board";
import { GameWrapper } from "~/app/(checkers)/_components/game/game-wrapper";
import { GameControlPanel } from "~/app/(checkers)/_components/game/GameControlPanel";
import { MoveHistory } from "~/app/(checkers)/_components/game/MoveHistory";
import { PlayerCardContainer } from "~/app/(checkers)/_components/game/player-card-container";
import { PostGameAnalysis } from "~/app/(checkers)/_components/game/PostGameAnalysis";
import { WinnerDialog } from "~/app/(checkers)/_components/game/WinnerDialog.motion";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useSettings } from "~/contexts/settings-context";
import { useAudioWarnings } from "~/hooks/useAudioWarnings";
import { useGameSounds } from "~/hooks/useGameSounds";
import { useAI } from "~/lib/game/hooks/use-ai";
import { useAutoSave } from "~/lib/game/hooks/use-auto-save";
import { useGameTimers } from "~/lib/game/hooks/use-game-timers";
import { useMustCapture } from "~/lib/game/hooks/use-must-capture";
import { useOnlineMultiplayer } from "~/lib/game/hooks/use-online-multiplayer";
import { useOnlineSync } from "~/lib/game/hooks/use-online-sync";
import { useGame } from "~/lib/game/state/game-context";

export function GameScreen() {
  const { state, dispatch } = useGame();
  const { settings } = useSettings();
  // Only use online multiplayer hook when in online mode to prevent unnecessary re-renders
  const { status: mpStatus, sendMove } = useOnlineMultiplayer({
    gameId: state.gameMode === "online" ? state.gameId : undefined
  });
  const { mustCapturePositions, onSquareClick, onDragStart, onDrop } =
    useMustCapture(async (move) => {
      if (state.gameMode === "online" && state.gameId) {
        // Minimal send; server validates
        await sendMove(move, { gameVersion: state.moveCount });
      }
    });
  const { playStartGame } = useGameSounds({
    enabled: settings.soundEffectsEnabled,
    volume: settings.sfxVolume / 100,
  });

  // Play start game sound when component mounts
  useEffect(() => {
    if (state.moveCount === 0 && !state.winner) {
      playStartGame();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useAI();
  useAutoSave(); // Auto-save game state
  const { enabled: onlineEnabled, canMoveThisTab } = useOnlineSync();
  const timer = useGameTimers();
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



  return (
    <div className="h-[calc(100vh-var(--header-height))] overflow-auto lg:overflow-hidden p-2 md:p-4">
      <GameWrapper>
        {state.gameMode === "online" && (
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant={mpStatus.isConnected ? "default" : "secondary"}>
                {mpStatus.isConnected ? "Online" : "Reconnecting..."}
              </Badge>
              {onlineEnabled && !canMoveThisTab && (
                <Badge variant="outline">Inactive tab</Badge>
              )}
            </div>
          </div>
        )}
        <div className="board-fit-max flex min-h-0 flex-col items-center justify-between h-auto lg:h-full">
          <div className="flex min-h-0 w-full lg:flex-grow flex-col items-center justify-start">
            <div className="mx-auto flex w-full flex-col items-center justify-start rounded-xl border-2 border-gray-300 bg-white p-4 shadow-lg lg:max-w-[855px] lg:h-full">
              {/* Mobile/Tablet: Top Player Card (now inside container) */}
              <div className="flex min-h-[56px] w-full flex-shrink-0 items-center py-3 lg:hidden">
                <PlayerCardContainer
                  player={state.players.black}
                  color="black"
                  position="top"
                  isActive={state.currentPlayer === "black" && !state.winner}
                  enableServerData={state.gameMode === "online"}
                  showLoadingSkeleton={true}
                  timeState={showTimer ? timer.timeState : null}
                  isAIThinking={
                    state.gameMode === "ai" &&
                    state.isAIThinking &&
                    state.currentPlayer === "black"
                  }
                  className="w-full max-w-md"
                />
              </div>
              <div className="hidden min-h-[56px] w-full flex-shrink-0 items-center py-3 lg:flex">
                <PlayerCardContainer
                  player={state.players.black}
                  color="black"
                  position="top"
                  isActive={state.currentPlayer === "black" && !state.winner}
                  enableServerData={state.gameMode === "online"}
                  showLoadingSkeleton={true}
                  timeState={showTimer ? timer.timeState : null}
                  isAIThinking={
                    state.gameMode === "ai" &&
                    state.isAIThinking &&
                    state.currentPlayer === "black"
                  }
                  className="w-full max-w-md"
                />
              </div>

              <div className="flex min-h-0 w-full items-center justify-center py-1 lg:flex-grow">
                <div className="relative aspect-square min-h-0 w-full">
                  {state.isReviewMode && (
                    <div className="absolute top-2 right-12 left-2 z-10 flex items-center justify-between rounded-lg bg-blue-100/90 px-3 py-2 shadow-md backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-blue-700" />
                        <span className="text-sm font-medium text-blue-900">
                          Game Review Mode - Move {state.currentMoveIndex + 1}{" "}
                          of {state.moveHistory.length}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() =>
                            dispatch({ type: "NAVIGATE_TO_MOVE", payload: 0 })
                          }
                          size="sm"
                          variant="ghost"
                          disabled={state.currentMoveIndex <= -1}
                        >
                          Start
                        </Button>
                        <Button
                          onClick={() =>
                            dispatch({
                              type: "NAVIGATE_TO_MOVE",
                              payload: state.currentMoveIndex - 1,
                            })
                          }
                          size="sm"
                          variant="ghost"
                          disabled={state.currentMoveIndex <= -1}
                        >
                          ← Previous
                        </Button>
                        <Button
                          onClick={() =>
                            dispatch({
                              type: "NAVIGATE_TO_MOVE",
                              payload: state.currentMoveIndex + 1,
                            })
                          }
                          size="sm"
                          variant="ghost"
                          disabled={
                            state.currentMoveIndex >=
                            state.moveHistory.length - 1
                          }
                        >
                          Next →
                        </Button>
                        <Button
                          onClick={() =>
                            dispatch({
                              type: "TOGGLE_REVIEW_MODE",
                              payload: false,
                            })
                          }
                          size="sm"
                          variant="default"
                        >
                          Exit Review
                        </Button>
                      </div>
                    </div>
                  )}
                  {/* {state.isViewingHistory && !state.isReviewMode && (
                    <div className="absolute top-2 right-12 left-2 z-10 flex items-center justify-between rounded-lg bg-amber-100/90 px-3 py-2 shadow-md backdrop-blur-sm">
                      <span className="text-sm font-medium text-amber-900">
                        Viewing move {state.currentMoveIndex + 1} of{" "}
                        {state.moveHistory.length}
                      </span>
                      <Button
                        onClick={() =>
                          dispatch({
                            type: "NAVIGATE_TO_MOVE",
                            payload: state.moveHistory.length - 1,
                          })
                        }
                        size="sm"
                        variant="default"
                        className="text-xs"
                      >
                        Return to Game
                      </Button>
                    </div>
                  )} */}

                  <Board
                    board={state.board}
                    selectedPosition={state.selectedPosition}
                    draggingPosition={state.draggingPosition}
                    validMoves={state.validMoves}
                    mustCapturePositions={mustCapturePositions}
                    currentPlayer={state.currentPlayer}
                    keyboardFocusPosition={null}
                    size={state.rules.board.size}
                    shouldFlip={state.playerColor === "black"}
                    winner={state.winner}
                    onSquareClick={(pos, e) => {
                      if (state.winner) return;
                      if (
                        state.gameMode === "online" &&
                        onlineEnabled &&
                        !canMoveThisTab
                      )
                        return;
                      if (state.gameMode === "ai") {
                        const aiColor =
                          state.playerColor === "red" ? "black" : "red";
                        if (state.currentPlayer === aiColor) return;
                      }
                      onSquareClick(pos, e);
                    }}
                    onDragStart={(pos) => {
                      if (state.winner) return;
                      if (
                        state.gameMode === "online" &&
                        onlineEnabled &&
                        !canMoveThisTab
                      )
                        return;
                      if (state.gameMode === "ai") {
                        const aiColor =
                          state.playerColor === "red" ? "black" : "red";
                        if (state.currentPlayer === aiColor) return;
                      }
                      onDragStart(pos);
                    }}
                    onDragEnd={() =>
                      dispatch({ type: "SET_DRAGGING", payload: null })
                    }
                    onDrop={(pos) => {
                      if (state.winner) return;
                      if (
                        state.gameMode === "online" &&
                        onlineEnabled &&
                        !canMoveThisTab
                      )
                        return;
                      if (state.gameMode === "ai") {
                        const aiColor =
                          state.playerColor === "red" ? "black" : "red";
                        if (state.currentPlayer === aiColor) return;
                      }
                      onDrop(pos);
                    }}
                  />
                </div>
              </div>

              {/* Desktop: Bottom Player Card */}
              <div className="hidden min-h-[56px] w-full flex-shrink-0 items-center py-3 lg:flex">
                <PlayerCardContainer
                  player={state.players.red}
                  color="red"
                  position="bottom"
                  isActive={state.currentPlayer === "red" && !state.winner}
                  enableServerData={state.gameMode === "online"}
                  showLoadingSkeleton={true}
                  timeState={showTimer ? timer.timeState : null}
                  isAIThinking={
                    state.gameMode === "ai" &&
                    state.isAIThinking &&
                    state.currentPlayer === "red"
                  }
                  className="w-full max-w-md"
                />
              </div>

              {/* Mobile/Tablet: Bottom Player Card */}
              <div className="flex min-h-[56px] w-full flex-shrink-0 items-center py-3 lg:hidden">
                <PlayerCardContainer
                  player={state.players.red}
                  color="red"
                  position="bottom"
                  isActive={state.currentPlayer === "red" && !state.winner}
                  enableServerData={state.gameMode === "online"}
                  showLoadingSkeleton={true}
                  timeState={showTimer ? timer.timeState : null}
                  isAIThinking={
                    state.gameMode === "ai" &&
                    state.isAIThinking &&
                    state.currentPlayer === "red"
                  }
                  className="w-full max-w-md"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="hidden h-full w-full overflow-hidden pb-4 lg:flex">
          <div className="flex h-full w-full gap-6">
            <div className="flex h-full w-full flex-col gap-4 overflow-hidden">
              {showPostGameAnalysis ? (
                <PostGameAnalysis
                  analysis={state.gameAnalysis}
                  winner={state.winner}
                  isAnalyzing={state.isAnalyzing}
                  analyzeProgress={state.analyzeProgress}
                  onStartReview={() =>
                    dispatch({ type: "TOGGLE_REVIEW_MODE", payload: true })
                  }
                  onPlayAgain={() => {
                    /* handled by wrapper with server call */
                  }}
                  playerNames={{
                    red: state.gameMode === "ai" ? "Player" : "Player 1",
                    black: state.gameMode === "ai" ? "AI" : "Player 2",
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
                      onNavigateToMove={(i) =>
                        dispatch({ type: "NAVIGATE_TO_MOVE", payload: i })
                      }
                      winner={state.winner}
                      analysis={state.gameAnalysis}
                      showAnalysis={state.isReviewMode}
                      showChat={state.gameMode === "online"}
                      chatGameId={state.gameId ?? undefined}
                      opponentName={
                        state.currentPlayer === "red"
                          ? (state.players.black.name ?? "Player 2")
                          : (state.players.red.name ?? "Player 1")
                      }
                    />
                  </div>
                  <div className="flex-shrink-0 hidden lg:block">
                    <GameControlPanel />
                  </div>
                </>
              )}
            </div>

            {/* Removed side GameChat; Chat now lives in MoveHistory tabs */}
          </div>
        </div>
      </GameWrapper>

      {/* Mobile/Tablet controls and history below the board */}
      <div className="lg:hidden w-full px-2 md:px-4 mt-1 space-y-2">
        {showPostGameAnalysis ? (
          <PostGameAnalysis
            analysis={state.gameAnalysis}
            winner={state.winner}
            isAnalyzing={state.isAnalyzing}
            analyzeProgress={state.analyzeProgress}
            onStartReview={() =>
              dispatch({ type: "TOGGLE_REVIEW_MODE", payload: true })
            }
            onPlayAgain={() => {
              /* handled by wrapper with server call */
            }}
            playerNames={{
              red:
                state.gameMode === "ai"
                  ? "Player"
                  : "Player 1",
              black:
                state.gameMode === "ai"
                  ? "AI"
                  : "Player 2",
            }}
          />
        ) : (
          <>
            <div className="border-t pt-2">
              <GameControlPanel />
            </div>
            <div className="overflow-hidden">
              <MoveHistory
                moves={state.moveHistory}
                currentMoveIndex={state.currentMoveIndex}
                board={state.board}
                boardSize={state.rules.board.size}
                currentPlayer={state.currentPlayer}
                onNavigateToMove={(i) =>
                  dispatch({ type: "NAVIGATE_TO_MOVE", payload: i })
                }
                winner={state.winner}
                analysis={state.gameAnalysis}
                showAnalysis={state.isReviewMode}
                showChat={state.gameMode === "online"}
                chatGameId={state.gameId ?? undefined}
                opponentName={
                  state.currentPlayer === "red"
                    ? (state.players.black.name ?? "Player 2")
                    : (state.players.red.name ?? "Player 1")
                }
              />
            </div>
          </>
        )}
      </div>

      {/* Winner Dialog */}
      <WinnerDialog
        winner={state.winner}
        drawReason={state.drawReason}
        open={state.showWinnerDialog}
        onOpenChange={(open) =>
          dispatch({ type: "DIALOGS", payload: { showWinnerDialog: open } })
        }
        onPlayAgain={() => {
          // Reset the game
          window.location.reload();
        }}
        onStartAnalysis={() => {
          dispatch({ type: "DIALOGS", payload: { showWinnerDialog: false } });
          // Trigger game analysis if needed
        }}
        gameMode={state.gameMode}
        playerColor={state.playerColor}
        boardVariant={state.boardVariant}
        aiDifficulty={state.aiDifficulty}
        timeControl={state.timeControl}
      />

    </div>
  );
}
