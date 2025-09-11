"use client";

import { getBoardGridStyleFromSize } from "~/lib/board-style";
import { PlayerCardContainer } from "~/features/game/ui/player-card-container";
import {
  type GamePlayers,
  createLocalGamePlayers,
  createAIGamePlayers,
  getPlayerByColor,
} from "~/lib/player-types";

interface BoardPreviewProps {
  size: number;
  players?: GamePlayers;
  gameMode?: "ai" | "local" | "online";
  aiDifficulty?: "easy" | "medium" | "hard" | "expert";
  shouldFlip?: boolean;
}

export function BoardPreview({
  size,
  players,
  gameMode = "ai",
  aiDifficulty = "medium",
  shouldFlip = false,
}: BoardPreviewProps) {
  const totalSquares = size * size;

  // Use provided players or create defaults based on game mode
  const gamePlayers =
    players ??
    (gameMode === "ai"
      ? createAIGamePlayers(aiDifficulty)
      : createLocalGamePlayers());

  return (
    <div className="hidden h-full w-full flex-col lg:flex">
      <div className="board-fit-max mx-auto flex h-full w-full flex-col rounded-xl border-2 border-gray-300 bg-white p-4 shadow-lg lg:max-w-[855px]">
        {/* Top Player Card - shows opponent (red when flipped, black normally) */}
        <div className="w-full flex-shrink-0">
          <div className="hidden min-h-[56px] w-full flex-shrink-0 items-center py-3 lg:flex">
            <PlayerCardContainer
              player={getPlayerByColor(
                gamePlayers,
                shouldFlip ? "red" : "black",
              )}
              color={shouldFlip ? "red" : "black"}
              position="top"
              enableServerData={false}
              showLoadingSkeleton={false}
            />
          </div>
        </div>

        {/* Board Preview - fills remaining vertical space */}
        <div className="flex min-h-0 flex-grow items-center justify-center py-2">
          <div className="relative aspect-square min-h-0 w-full">
            <div
              className="relative box-border grid h-full w-full gap-0 overflow-hidden rounded-lg border-8 shadow-2xl"
              style={{
                borderColor: "var(--board-border)",
                backgroundColor: "var(--board-border)",
                ...getBoardGridStyleFromSize(size),
              }}
            >
              {Array.from({ length: totalSquares }).map((_, index) => {
                // Calculate position based on flip
                let row = Math.floor(index / size);
                let col = index % size;

                // If flipped, reverse the board
                if (shouldFlip) {
                  row = size - 1 - row;
                  col = size - 1 - col;
                }

                const isBlack = (row + col) % 2 === 1;
                const pieceRows = Math.floor(size / 2) - 1; // rough preview
                const hasPiece =
                  (row < pieceRows || row >= size - pieceRows) && isBlack;
                const isRed = row >= size - pieceRows;

                return (
                  <div
                    key={index}
                    className="flex aspect-square items-center justify-center"
                    style={
                      isBlack
                        ? {
                            background: `linear-gradient(to bottom right, var(--board-dark-from), var(--board-dark-to))`,
                          }
                        : {
                            background: `linear-gradient(to bottom right, var(--board-light-from), var(--board-light-to))`,
                          }
                    }
                  >
                    {hasPiece && (
                      <div
                        className="relative h-4/5 w-4/5 rounded-full border-4 shadow-xl"
                        style={{
                          background: isRed
                            ? `linear-gradient(to bottom right, var(--piece-red-from), var(--piece-red-to))`
                            : `linear-gradient(to bottom right, var(--piece-black-from), var(--piece-black-to))`,
                          borderColor: isRed
                            ? "var(--piece-red-border)"
                            : "var(--piece-black-border)",
                        }}
                      >
                        <div className="absolute inset-2 rounded-full bg-gradient-to-tl from-white/20 to-transparent" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Player Card - shows player (black when flipped, red normally) */}
        <div className="flex min-h-[56px] w-full flex-shrink-0 items-center py-3 lg:py-3">
          <PlayerCardContainer
            player={getPlayerByColor(gamePlayers, shouldFlip ? "black" : "red")}
            color={shouldFlip ? "black" : "red"}
            position="bottom"
            enableServerData={false}
            showLoadingSkeleton={false}
          />
        </div>
      </div>
    </div>
  );
}
