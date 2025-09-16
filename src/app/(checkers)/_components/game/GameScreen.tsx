"use client";
import { useEffect } from "react";
import { AiThinkingIndicator } from "~/app/(checkers)/_components/game/AiThinkingIndicator";
import { Board } from "~/app/(checkers)/_components/game/Board";
import { GameWrapper } from "~/app/(checkers)/_components/game/game-wrapper";
import { GameControlPanel } from "~/app/(checkers)/_components/game/GameControlPanel";
import { MoveHistory } from "~/app/(checkers)/_components/game/MoveHistory";
import { PlayerCardContainer } from "~/app/(checkers)/_components/game/player-card-container";
import { PostGameAnalysis } from "~/app/(checkers)/_components/game/PostGameAnalysis";
import { ReviewModeBar } from "~/app/(checkers)/_components/game/ReviewModeBar";
import { WinnerDialog } from "~/app/(checkers)/_components/game/WinnerDialog.motion";
import { useSettings } from "~/contexts/settings-context";
import { useAudioWarnings } from "~/hooks/useAudioWarnings";
import { useGameSounds } from "~/hooks/useGameSounds";
import { useAI } from "~/lib/game/hooks/use-ai";
import { useAutoSave } from "~/lib/game/hooks/use-auto-save";
import { useGameTimers } from "~/lib/game/hooks/use-game-timers";
import { useMustCapture } from "~/lib/game/hooks/use-must-capture";
import { useOnlineMultiplayer } from "~/lib/game/hooks/use-online-multiplayer";
import { useOnlineSyncEnhanced } from "~/lib/game/hooks/use-online-sync-enhanced";
import { useTurnWinnerCheck } from "~/lib/game/hooks/use-turn-winner-check";
import { useGame } from "~/lib/game/state/game-context";


export function GameScreen() {
  const { state, dispatch } = useGame();
  const { settings } = useSettings();
  // Use enhanced sync for online games
  const enhancedSync = useOnlineSyncEnhanced();

  // Only use online multiplayer hook when in online mode to prevent unnecessary re-renders
  const { status: mpStatus, sendMove } = useOnlineMultiplayer({
    gameId: state.gameMode === "online" ? state.gameId : undefined
  });

  const { mustCapturePositions, onSquareClick, onDragStart, onDrop } =
    useMustCapture(async (move) => {
      if (state.gameMode === "online" && state.gameId) {
        // Use enhanced sync for sending moves
        if (enhancedSync.isConnected) {
          await enhancedSync.sendMove(move);
        } else {
          await sendMove(move, { gameVersion: state.moveCount });
        }
      }
    });
  const { playStartGame } = useGameSounds({
    enabled: settings.soundEffectsEnabled,
    volume: settings.sfxVolume / 100,
  });

  // Play start game sound immediately when game starts
  useEffect(() => {
    if (state.moveCount === 0 && !state.winner) {
      playStartGame();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useAI();
  useAutoSave(); // Auto-save game state
  useTurnWinnerCheck(); // Check for winners at turn start

  // Use enhanced sync for all game modes
  const onlineEnabled = enhancedSync.isConnected;
  const canMoveThisTab = true; // EventContext handles tab synchronization internally
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

  // Helper function to check if the current player can make a move
  const canPlayerMove = () => {
    if (state.winner) return false;
    if (state.gameMode === "online" && onlineEnabled && !canMoveThisTab) return false;
    if (state.gameMode === "online") {
      // Only allow moves if it's this viewer's color turn
      if (state.playerColor !== state.currentPlayer) return false;
    }
    if (state.gameMode === "ai") {
      const aiColor = state.playerColor === "red" ? "black" : "red";
      if (state.currentPlayer === aiColor) return false;
    }
    return true;
  };

  // Helper function to get player names based on game mode
  const getPlayerNames = () => ({
    red: state.gameMode === "ai" ? "Player" : "Player 1",
    black: state.gameMode === "ai" ? "AI" : "Player 2",
  });

  return (
    <div className="h-[calc(100vh-var(--header-height))] overflow-auto lg:overflow-hidden p-2 md:p-4">
      <GameWrapper>
        <div className="board-fit-max flex min-h-0 flex-col items-center justify-between h-auto lg:h-full">
          <div className="flex min-h-0 w-full lg:flex-grow flex-col items-center justify-start">
            <div className="mx-auto flex w-full flex-col items-center justify-start rounded-xl border-2 border-gray-300 bg-white p-4 shadow-lg lg:max-w-[855px] lg:h-full">
              {/* Top Player Card - swap based on player color in online mode */}
              <div className="flex min-h-[56px] w-full flex-shrink-0 items-center py-3">
                <PlayerCardContainer
                  player={state.playerColor === "black" ? state.players.red : state.players.black}
                  color={state.playerColor === "black" ? "red" : "black"}
                  position="top"
                  isActive={(state.playerColor === "black" ? state.currentPlayer === "red" : state.currentPlayer === "black") && !state.winner}
                  enableServerData={state.gameMode === "online"}
                  showLoadingSkeleton={true}
                  timeState={showTimer ? timer.timeState : null}
                  isAIThinking={
                    state.gameMode === "ai" &&
                    state.isAIThinking &&
                    (state.playerColor === "black" ? state.currentPlayer === "red" : state.currentPlayer === "black")
                  }
                  className="w-full max-w-md"
                />
                {state.isAIThinking && (state.playerColor === "black" ? state.currentPlayer === "red" : state.currentPlayer === "black") && (
                  <div className="ml-10 mt-1">
                    <AiThinkingIndicator />
                  </div>
                )}
              </div>

              <div className="flex min-h-0 w-full items-center justify-center py-1 lg:flex-grow">
                <div className="relative aspect-square min-h-0 w-full">
                  {state.isReviewMode && (
                    <ReviewModeBar
                      currentMoveIndex={state.currentMoveIndex}
                      totalMoves={state.moveHistory.length}
                      onNavigateToMove={(index) =>
                        dispatch({ type: "NAVIGATE_TO_MOVE", payload: index })
                      }
                      onExitReview={() =>
                        dispatch({
                          type: "TOGGLE_REVIEW_MODE",
                          payload: false,
                        })
                      }
                    />
                  )}

                  <Board
                    board={state.board}
                    selectedPosition={state.selectedPosition}
                    draggingPosition={state.draggingPosition}
                    validMoves={state.validMoves}
                    mustCapturePositions={mustCapturePositions}
                    currentPlayer={state.currentPlayer}
                    keyboardFocusPosition={null}
                    size={state.rules?.board?.size ?? 8}
                    shouldFlip={state.playerColor === "black"}
                    winner={state.winner}
                    onSquareClick={(pos, e) => {
                      if (!canPlayerMove()) return;
                      onSquareClick(pos, e);
                    }}
                    onDragStart={(pos) => {
                      if (!canPlayerMove()) return;
                      onDragStart(pos);
                    }}
                    onDragEnd={() =>
                      dispatch({ type: "SET_DRAGGING", payload: null })
                    }
                    onDrop={(pos) => {
                      if (!canPlayerMove()) return;
                      onDrop(pos);
                    }}
                  />
                </div>
              </div>

              {/* Bottom Player Card - swap based on player color in online mode */}
              <div className="flex min-h-[56px] w-full flex-shrink-0 items-center py-3">
                <PlayerCardContainer
                  player={state.playerColor === "black" ? state.players.black : state.players.red}
                  color={state.playerColor === "black" ? "black" : "red"}
                  position="bottom"
                  isActive={(state.playerColor === "black" ? state.currentPlayer === "black" : state.currentPlayer === "red") && !state.winner}
                  enableServerData={state.gameMode === "online"}
                  showLoadingSkeleton={true}
                  timeState={showTimer ? timer.timeState : null}
                  isAIThinking={
                    state.gameMode === "ai" &&
                    state.isAIThinking &&
                    (state.playerColor === "black" ? state.currentPlayer === "black" : state.currentPlayer === "red")
                  }
                  className="w-full max-w-md"
                />
                {state.isAIThinking && (state.playerColor === "black" ? state.currentPlayer === "black" : state.currentPlayer === "red") && (
                  <div className="ml-10 mt-1">
                    <AiThinkingIndicator />
                  </div>
                )}
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
                  playerNames={getPlayerNames()}
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
                      gameId={state.gameId ?? undefined}
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
            playerNames={getPlayerNames()}
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
                gameId={state.gameId ?? undefined}
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
        gameId={state.gameId ?? undefined}
      />

    </div>
  );
}
