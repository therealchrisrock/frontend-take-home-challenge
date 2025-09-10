"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Clock, Trophy, Target } from "lucide-react";
import { type Board, type PieceColor } from "~/lib/game-logic";
import { useEffect, useState } from "react";

interface GameStatsProps {
  board: Board;
  currentPlayer: PieceColor;
  moveCount: number;
  winner: PieceColor | "draw" | null;
  gameStartTime: Date;
}

export function GameStats({
  board,
  currentPlayer,
  moveCount,
  winner,
  gameStartTime,
}: GameStatsProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (winner) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - gameStartTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStartTime, winner]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const countPieces = () => {
    let red = 0,
      redKings = 0,
      black = 0,
      blackKings = 0;

    for (const row of board) {
      for (const piece of row) {
        if (piece) {
          if (piece.color === "red") {
            if (piece.type === "king") redKings++;
            else red++;
          } else {
            if (piece.type === "king") blackKings++;
            else black++;
          }
        }
      }
    }

    return { red, redKings, black, blackKings };
  };

  const pieces = countPieces();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-amber-900">Game Stats</span>
          {winner && (
            <Badge variant="default" className="bg-green-600">
              <Trophy className="mr-1 h-4 w-4" />
              {winner === "draw"
                ? "Draw!"
                : `${winner === "red" ? "Red" : "Black"} Wins!`}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-amber-800">
            Current Turn
          </span>
          <Badge
            variant="outline"
            className={
              currentPlayer === "red"
                ? "border-red-600 text-red-600"
                : "border-gray-800 text-gray-800"
            }
          >
            {currentPlayer === "red" ? "Red" : "Black"}
          </Badge>
        </div>

        <Separator className="bg-amber-300" />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800">
              Red Pieces
            </span>
            <div className="flex gap-2">
              <Badge variant="outline" className="border-red-600 text-red-600">
                {pieces.red} Regular
              </Badge>
              {pieces.redKings > 0 && (
                <Badge
                  variant="outline"
                  className="border-red-600 bg-red-50 text-red-600"
                >
                  {pieces.redKings} Kings
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800">
              Black Pieces
            </span>
            <div className="flex gap-2">
              <Badge
                variant="outline"
                className="border-gray-800 text-gray-800"
              >
                {pieces.black} Regular
              </Badge>
              {pieces.blackKings > 0 && (
                <Badge
                  variant="outline"
                  className="border-gray-800 bg-gray-100 text-gray-800"
                >
                  {pieces.blackKings} Kings
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Separator className="bg-amber-300" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-700" />
            <span className="text-sm font-medium text-amber-800">Moves</span>
          </div>
          <Badge variant="secondary">{moveCount}</Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-700" />
            <span className="text-sm font-medium text-amber-800">Time</span>
          </div>
          <Badge variant="secondary">{formatTime(elapsedTime)}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
