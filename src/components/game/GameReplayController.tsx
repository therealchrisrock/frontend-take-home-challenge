"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Slider } from "~/components/ui/slider";
import { Skeleton } from "~/components/ui/skeleton";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Separator } from "~/components/ui/separator";
import { Board } from "./Board";
import type {
  Board as BoardType,
  Move,
  Position,
  PieceColor,
} from "~/lib/game-logic";
import {
  createInitialBoard,
  getValidMoves,
  makeMove as applyMove,
  getMustCapturePositions,
} from "~/lib/game-logic";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Zap,
  Target,
  Trophy,
} from "lucide-react";

interface GameReplayControllerProps {
  gameId: string;
  userId: string;
  analysisMode?: boolean;
}

interface GameAnalysis {
  evaluation: number; // -100 to 100, negative favors black, positive favors red
  bestMove?: Move;
  blunder?: boolean;
  missed?: boolean;
  brilliant?: boolean;
  critical?: boolean;
}

export default function GameReplayController({
  gameId,
  userId,
  analysisMode = false,
}: GameReplayControllerProps) {
  const {
    data: gameData,
    isLoading,
    error,
  } = api.game.getGameWithMoves.useQuery({ gameId });

  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [board, setBoard] = useState<BoardType>(() => createInitialBoard());
  const [currentPlayer, setCurrentPlayer] = useState<PieceColor>("red");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // ms between moves
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(
    null,
  );
  const [validMoves, setValidMoves] = useState<Move[]>([]);

  // Reconstruct board state up to current move
  useEffect(() => {
    if (!gameData?.moves) return;

    let reconstructedBoard: BoardType = createInitialBoard();
    let player: PieceColor = "red";

    // Apply moves up to currentMoveIndex
    for (let i = 0; i < currentMoveIndex && i < gameData.moves.length; i++) {
      const move = gameData.moves[i];
      if (move) {
        const gameMove: Move = {
          from: { row: move.fromRow, col: move.fromCol },
          to: { row: move.toRow, col: move.toCol },
          captures: move.captures
            ? (JSON.parse(move.captures) as Position[])
            : [],
        };

        reconstructedBoard = applyMove(reconstructedBoard, gameMove);
        player = player === "red" ? "black" : "red";
      }
    }

    setBoard(reconstructedBoard);
    setCurrentPlayer(player);

    // Analyze current position if in analysis mode
    if (analysisMode) {
      analyzePosition(reconstructedBoard, player);
    }
  }, [currentMoveIndex, gameData, analysisMode]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || !gameData?.moves) return;

    const timer = setTimeout(() => {
      if (currentMoveIndex < gameData.moves.length) {
        setCurrentMoveIndex((prev) => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }, playbackSpeed);

    return () => clearTimeout(timer);
  }, [isPlaying, currentMoveIndex, playbackSpeed, gameData]);

  const analyzePosition = (board: BoardType, player: PieceColor) => {
    // Simple evaluation function for demonstration
    let evaluation = 0;
    let redPieces = 0;
    let blackPieces = 0;
    let redKings = 0;
    let blackKings = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row]?.[col];
        if (piece) {
          if (piece.color === "red") {
            redPieces++;
            if (piece.type === "king") redKings++;
          } else {
            blackPieces++;
            if (piece.type === "king") blackKings++;
          }
        }
      }
    }

    // Simple material evaluation
    evaluation = (redPieces - blackPieces) * 10 + (redKings - blackKings) * 5;

    // Get valid moves for analysis - get all moves for all pieces of current player
    const allMoves: Move[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row]?.[col];
        if (piece && piece.color === player) {
          const pieceMoves = getValidMoves(board, { row, col }, player);
          allMoves.push(...pieceMoves);
        }
      }
    }
    const bestMove = allMoves[0]; // In a real implementation, this would use minimax

    setAnalysis({
      evaluation,
      bestMove,
      blunder: false, // Would need move comparison to determine
      missed: false,
      brilliant: false,
      critical: Math.abs(evaluation) > 50,
    });
  };

  const handleNextMove = () => {
    if (gameData?.moves && currentMoveIndex < gameData.moves.length) {
      setCurrentMoveIndex((prev) => prev + 1);
    }
  };

  const handlePreviousMove = () => {
    if (currentMoveIndex > 0) {
      setCurrentMoveIndex((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    setCurrentMoveIndex(0);
    setIsPlaying(false);
  };

  const handleMoveClick = (index: number) => {
    setCurrentMoveIndex(index + 1);
    setIsPlaying(false);
  };

  const handleSquareClick = (position: Position) => {
    const piece = board[position.row]?.[position.col];

    if (piece && analysisMode) {
      setSelectedPosition(position);
      const moves = getValidMoves(board, position, currentPlayer);
      setValidMoves(moves);
    } else {
      setSelectedPosition(null);
      setValidMoves([]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load game data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const moves = gameData.moves ?? [];
  const currentMove = moves[currentMoveIndex - 1];
  const playerColor = gameData.player1Id === userId ? "red" : "black";
  // const isUserTurn = currentPlayer === playerColor;

  const getPlayerName = (color: PieceColor) => {
    if (gameData.gameMode === "ai") {
      return color === "red" ? "Player" : "AI";
    }
    if (color === "red") {
      return gameData.player1?.name ?? gameData.player1?.username ?? "Player 1";
    }
    return gameData.player2?.name ?? gameData.player2?.username ?? "Player 2";
  };

  const mustCapturePositions = getMustCapturePositions(board, currentPlayer);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Game Replay</h1>
          <p className="text-muted-foreground mt-1">
            {getPlayerName("red")} vs {getPlayerName("black")} •{" "}
            {new Date(gameData.gameStartTime).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {analysisMode && (
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              Analysis Mode
            </Badge>
          )}
          {gameData.winner && (
            <Badge
              variant={
                gameData.winner === playerColor ? "default" : "destructive"
              }
            >
              {gameData.winner === "draw"
                ? "Draw"
                : gameData.winner === playerColor
                  ? "You Won!"
                  : "You Lost"}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Game Board */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="board-fit-max relative aspect-square min-h-0 w-full lg:max-w-[855px]">
                  <Board
                    board={board}
                    currentPlayer={currentPlayer}
                    onSquareClick={analysisMode ? handleSquareClick : () => {}}
                    selectedPosition={analysisMode ? selectedPosition : null}
                    validMoves={analysisMode ? validMoves : []}
                    onDragStart={() => {
                      /* No-op in replay mode */
                    }}
                    onDragEnd={() => {
                      /* No-op in replay mode */
                    }}
                    onDrop={() => {
                      /* No-op in replay mode */
                    }}
                    draggingPosition={null}
                    mustCapturePositions={[]}
                    replayMode={true}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Playback Controls */}
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="text-muted-foreground flex justify-between text-sm">
                    <span>
                      Move {currentMoveIndex} of {moves.length}
                    </span>
                    <span>
                      {currentPlayer === "red" ? "Red" : "Black"} to move
                    </span>
                  </div>
                  <Slider
                    value={[currentMoveIndex]}
                    max={moves.length}
                    step={1}
                    onValueChange={(value) =>
                      setCurrentMoveIndex(value[0] ?? 0)
                    }
                    className="w-full"
                  />
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleReset}
                    disabled={currentMoveIndex === 0}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousMove}
                    disabled={currentMoveIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="default"
                    size="icon"
                    onClick={() => setIsPlaying(!isPlaying)}
                    disabled={currentMoveIndex >= moves.length}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextMove}
                    disabled={currentMoveIndex >= moves.length}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMoveIndex(moves.length)}
                    disabled={currentMoveIndex >= moves.length}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>

                {/* Playback Speed */}
                <div className="flex items-center justify-center gap-4">
                  <span className="text-muted-foreground text-sm">Speed:</span>
                  <div className="flex gap-1">
                    {[0.5, 1, 2, 3].map((speed) => (
                      <Button
                        key={speed}
                        variant={
                          playbackSpeed === 1000 / speed ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setPlaybackSpeed(1000 / speed)}
                      >
                        {speed}x
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Analysis Panel */}
          {analysisMode && analysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Position Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Evaluation Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Black</span>
                    <span>Red</span>
                  </div>
                  <div className="relative h-4 overflow-hidden rounded-full bg-black">
                    <div
                      className="absolute h-full bg-red-600 transition-all duration-300"
                      style={{ width: `${50 + analysis.evaluation / 2}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground text-center text-sm">
                    {analysis.evaluation > 0 ? "+" : ""}
                    {analysis.evaluation / 10}
                  </p>
                </div>

                {/* Move Quality */}
                {currentMove && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Move Quality</p>
                    <div className="flex gap-2">
                      {analysis.brilliant && (
                        <Badge variant="default" className="gap-1">
                          <Zap className="h-3 w-3" />
                          Brilliant!
                        </Badge>
                      )}
                      {analysis.blunder && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Blunder
                        </Badge>
                      )}
                      {!analysis.brilliant && !analysis.blunder && (
                        <Badge variant="secondary">Good Move</Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Best Move Suggestion */}
                {analysis.bestMove && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Engine Suggestion</p>
                    <p className="text-muted-foreground text-sm">
                      {String.fromCharCode(97 + analysis.bestMove.from.col)}
                      {8 - analysis.bestMove.from.row} →{" "}
                      {String.fromCharCode(97 + analysis.bestMove.to.col)}
                      {8 - analysis.bestMove.to.row}
                    </p>
                  </div>
                )}

                {analysis.critical && (
                  <Alert>
                    <Target className="h-4 w-4" />
                    <AlertDescription>
                      Critical position! The game outcome may depend on the next
                      moves.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Move List */}
          <Card>
            <CardHeader>
              <CardTitle>Move List</CardTitle>
              <CardDescription>
                Click on any move to jump to that position
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 space-y-1 overflow-y-auto">
                {moves.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No moves yet</p>
                ) : (
                  moves.map((move, index) => {
                    const moveNotation = move
                      ? `${String.fromCharCode(97 + move.fromCol)}${8 - move.fromRow} → ${String.fromCharCode(97 + move.toCol)}${8 - move.toRow}`
                      : "Invalid move";

                    return (
                      <Button
                        key={index}
                        variant={
                          currentMoveIndex === index + 1 ? "default" : "ghost"
                        }
                        size="sm"
                        className="w-full justify-start font-mono text-xs"
                        onClick={() => handleMoveClick(index)}
                      >
                        <span className="mr-2 font-bold">
                          {Math.floor(index / 2) + 1}.
                        </span>
                        {index % 2 === 0 ? (
                          <span className="text-red-600">Red: </span>
                        ) : (
                          <span>Black: </span>
                        )}
                        {moveNotation}
                        {move?.captures &&
                          (JSON.parse(move.captures) as Position[]).length >
                            0 && (
                            <Badge variant="outline" className="ml-auto">
                              x
                              {(JSON.parse(move.captures) as Position[]).length}
                            </Badge>
                          )}
                      </Button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Game Info */}
          <Card>
            <CardHeader>
              <CardTitle>Game Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode:</span>
                <Badge variant="outline">{gameData.gameMode}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Moves:</span>
                <span>{moves.length}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Result:</span>
                <span className="font-medium">
                  {gameData.winner === "draw"
                    ? "Draw"
                    : gameData.winner === "red"
                      ? "Red wins"
                      : gameData.winner === "black"
                        ? "Black wins"
                        : "In progress"}
                </span>
              </div>
              {gameData.winner && gameData.winner !== "draw" && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Winner:</span>
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3 w-3" />
                      {getPlayerName(gameData.winner as PieceColor)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
