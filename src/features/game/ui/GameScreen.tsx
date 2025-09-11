"use client";
import { useEffect } from "react";
import { Board } from "~/app/(checkers)/_components/game/Board";
import { PlayerCardContainer } from "~/features/game/ui/player-card-container";
import { MoveHistory } from "~/app/(checkers)/_components/game/MoveHistory";
import { PostGameAnalysis } from "~/app/(checkers)/_components/game/PostGameAnalysis";
import { GameChat } from "~/components/chat/GameChat";
import { GameControls } from "~/app/(checkers)/_components/game/GameControls";
import { Button } from "~/components/ui/button";
import { History } from "lucide-react";
import { useGame } from "../state/game-context";
import { useMustCapture } from "../hooks/use-must-capture";
import { useAI } from "../hooks/use-ai";
import { useOnlineSync } from "../hooks/use-online-sync";
import { useGameTimers } from "../hooks/use-game-timers";
import { useAutoSave } from "../hooks/use-auto-save";
import { GameWrapper } from "~/app/(checkers)/_components/game/game-wrapper";
import { useAudioWarnings } from "~/hooks/useAudioWarnings";
import { ResizablePanels } from "~/components/ui/resizable-panels";
import { WinnerDialog } from "~/app/(checkers)/_components/game/WinnerDialog.motion";
import { useGameSounds } from "~/hooks/useGameSounds";
import { GameSettings } from "~/app/(checkers)/_components/game/GameSettings";
import { useSettings } from "~/contexts/settings-context";

export function GameScreen() {
  const { state, dispatch } = useGame();
  const { settings } = useSettings();
  const { mustCapturePositions, onSquareClick, onDragStart, onDrop } =
    useMustCapture();
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
    <div className="h-[calc(100vh-var(--header-height))] overflow-hidden p-2 md:p-4">
      <GameWrapper>
        <div className="board-fit-max flex h-full min-h-0 flex-col items-center justify-between">
          <div className="flex w-full items-center justify-between px-2 py-1 lg:hidden">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1 ${state.currentPlayer === "black" ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-600"}`}
            >
              <span className="text-sm font-medium">Player 2</span>
              {state.currentPlayer === "black" && (
                <span className="animate-pulse text-xs">Playing...</span>
              )}
            </div>
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1 ${state.currentPlayer === "red" ? "bg-red-600 text-white" : "bg-red-200 text-red-800"}`}
            >
              <span className="text-sm font-medium">Player 1</span>
              {state.currentPlayer === "red" && (
                <span className="animate-pulse text-xs">Playing...</span>
              )}
            </div>
          </div>

          <div className="flex min-h-0 w-full flex-grow flex-col items-center justify-start">
            <div className="mx-auto flex h-full w-full flex-col items-center justify-start rounded-xl border-2 border-gray-300 bg-white p-4 shadow-lg lg:max-w-[855px]">
              <div className="hidden min-h-[56px] w-full flex-shrink-0 items-center justify-center py-3 lg:flex">
                <PlayerCardContainer
                  player={
                    state.playerColor === "red"
                      ? state.players.black
                      : state.players.red
                  }
                  color={state.playerColor === "red" ? "black" : "red"}
                  position="top"
                  isActive={
                    state.currentPlayer ===
                      (state.playerColor === "red" ? "black" : "red") &&
                    !state.winner
                  }
                  enableServerData={state.gameMode === "online"}
                  showLoadingSkeleton={true}
                  timeState={showTimer ? timer.timeState : null}
                  isAIThinking={
                    state.gameMode === "ai" &&
                    state.isAIThinking &&
                    state.currentPlayer ===
                      (state.playerColor === "red" ? "black" : "red")
                  }
                  className="w-full max-w-md"
                />
              </div>

              <div className="flex min-h-0 w-full flex-grow items-center justify-center py-2">
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
                  {state.isViewingHistory && !state.isReviewMode && (
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
                    shouldFlip={state.playerColor === "black"}
                    onSquareClick={(pos, e) => {
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

              <div className="hidden min-h-[56px] w-full flex-shrink-0 items-center justify-center py-3 lg:flex">
                <PlayerCardContainer
                  player={
                    state.playerColor === "red"
                      ? state.players.red
                      : state.players.black
                  }
                  color={state.playerColor === "red" ? "red" : "black"}
                  position="bottom"
                  isActive={
                    state.currentPlayer === state.playerColor && !state.winner
                  }
                  enableServerData={state.gameMode === "online"}
                  showLoadingSkeleton={true}
                  timeState={showTimer ? timer.timeState : null}
                  isAIThinking={
                    state.gameMode === "ai" &&
                    state.isAIThinking &&
                    state.currentPlayer === state.playerColor
                  }
                  className="w-full max-w-md"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="hidden h-full w-full overflow-hidden pb-4 lg:flex">
          {state.gameMode === "online" ? (
            <ResizablePanels
              direction="vertical"
              defaultSize={60}
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
                    onStartReview={() =>
                      dispatch({ type: "TOGGLE_REVIEW_MODE", payload: true })
                    }
                    onPlayAgain={() => {
                      /* handled by wrapper with server call */
                    }}
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
                        onNavigateToMove={(i) =>
                          dispatch({ type: "NAVIGATE_TO_MOVE", payload: i })
                        }
                        winner={state.winner}
                        analysis={state.gameAnalysis}
                        showAnalysis={state.isReviewMode}
                      />
                    </div>

                    {/* Game Controls Section */}
                    {!state.isReviewMode &&
                      !state.isViewingHistory &&
                      !state.winner && (
                        <div className="flex-shrink-0 border-t pt-4">
                          <GameControls
                            currentPlayer={state.currentPlayer}
                            winner={state.winner}
                            isViewingHistory={state.isViewingHistory}
                            isReviewMode={state.isReviewMode}
                            gameMode={state.gameMode}
                            playerColor={state.playerColor}
                            onResign={(player) =>
                              dispatch({ type: "RESIGN", payload: player })
                            }
                            onRequestDraw={() =>
                              dispatch({ type: "REQUEST_DRAW" })
                            }
                            onAcceptDraw={() =>
                              dispatch({ type: "ACCEPT_DRAW" })
                            }
                            onDeclineDraw={() =>
                              dispatch({
                                type: "DIALOGS",
                                payload: { showDrawDialog: false },
                              })
                            }
                            showDrawDialog={state.showDrawDialog}
                            drawRequestedBy={state.drawRequestedBy}
                          />
                        </div>
                      )}
                  </>
                )}
              </div>

              <div className="h-full overflow-hidden">
                <GameChat
                  gameId={state.gameId ?? ""}
                  opponentName={
                    state.currentPlayer === "red"
                      ? (state.players.black.name ?? "Player 2")
                      : (state.players.red.name ?? "Player 1")
                  }
                />
              </div>
            </ResizablePanels>
          ) : (
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
                    />
                  </div>

                  {/* Game Controls Section */}
                  {!state.isReviewMode &&
                    !state.isViewingHistory &&
                    !state.winner && (
                      <div className="flex w-full flex-shrink-0 justify-between border-t pt-4">
                        <GameControls
                          currentPlayer={state.currentPlayer}
                          winner={state.winner}
                          isViewingHistory={state.isViewingHistory}
                          isReviewMode={state.isReviewMode}
                          gameMode={state.gameMode}
                          playerColor={state.playerColor}
                          onResign={(player) =>
                            dispatch({ type: "RESIGN", payload: player })
                          }
                          onRequestDraw={() =>
                            dispatch({ type: "REQUEST_DRAW" })
                          }
                          onAcceptDraw={() => dispatch({ type: "ACCEPT_DRAW" })}
                          onDeclineDraw={() =>
                            dispatch({
                              type: "DIALOGS",
                              payload: { showDrawDialog: false },
                            })
                          }
                          showDrawDialog={state.showDrawDialog}
                          drawRequestedBy={state.drawRequestedBy}
                        />
                        <GameSettings />
                      </div>
                    )}
                </>
              )}
            </div>
          )}
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
