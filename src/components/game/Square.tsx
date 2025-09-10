"use client";

import { type Position } from "~/lib/game-logic";
import { cn } from "~/lib/utils";

interface SquareProps {
  position: Position;
  isBlack: boolean;
  isHighlighted: boolean;
  isSelected: boolean;
  isPossibleMove: boolean;
  isKeyboardFocused?: boolean;
  onClick: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  children?: React.ReactNode;
}

export function Square({
  position,
  isBlack,
  isHighlighted,
  isSelected,
  isPossibleMove,
  isKeyboardFocused = false,
  onClick,
  onDrop,
  onDragOver,
  children,
}: SquareProps) {
  const squareStyle = isBlack
    ? {
        background: `linear-gradient(to bottom right, var(--board-dark-from), var(--board-dark-to))`,
      }
    : {
        background: `linear-gradient(to bottom right, var(--board-light-from), var(--board-light-to))`,
      };

  const ringStyle = isSelected
    ? {
        boxShadow: `inset 0 0 0 4px var(--board-selected-ring)`,
      }
    : isHighlighted
      ? {
          boxShadow: `inset 0 0 0 4px var(--board-highlighted-ring)`,
        }
      : isKeyboardFocused
        ? {
            boxShadow: `inset 0 0 0 3px #3b82f6, 0 0 8px rgba(59, 130, 246, 0.4)`,
            outline: "none",
          }
        : undefined;

  return (
    <div
      className={cn(
        "relative flex aspect-square items-center justify-center transition-all duration-200",
        isPossibleMove && "cursor-pointer",
        !isBlack && "shadow-inner",
      )}
      style={{
        ...squareStyle,
        ...ringStyle,
      }}
      onClick={onClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {isPossibleMove && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={
            {
              "--move-color": "var(--board-possible-move-glow)",
            } as React.CSSProperties
          }
        >
          <div
            className="h-8 w-8 animate-pulse rounded-full shadow-lg"
            style={{
              backgroundColor: "var(--board-possible-move-glow)",
            }}
          />
        </div>
      )}
      {children}
    </div>
  );
}
