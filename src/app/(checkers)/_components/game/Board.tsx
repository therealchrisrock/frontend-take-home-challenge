"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBoardGridStyleFromSize } from "~/app/(checkers)/_lib/board-style";
import {
  type Board as BoardType,
  type Move,
  type Position,
} from "~/lib/game/logic";
import { MoveSequenceArrows } from "./MoveSequenceArrows";
import { Piece } from "./Piece";
import { Square } from "./Square.motion";

interface BoardProps {
  board: BoardType;
  selectedPosition: Position | null;
  draggingPosition: Position | null;
  validMoves: Move[];
  mustCapturePositions: Position[];
  currentPlayer: "red" | "black";
  keyboardFocusPosition?: Position | null;
  size?: number;
  shouldFlip?: boolean;
  replayMode?: boolean;
  winner?: "red" | "black" | "draw" | null;
  onSquareClick?: (position: Position, event?: React.MouseEvent) => void;
  onDragStart?: (position: Position) => void;
  onDragEnd?: () => void;
  onDrop?: (position: Position) => void;
}

export function Board({
  board,
  selectedPosition,
  draggingPosition,
  validMoves,
  mustCapturePositions,
  currentPlayer,
  keyboardFocusPosition,
  size,
  shouldFlip = false,
  replayMode = false,
  winner,
  onSquareClick,
  onDragStart,
  onDragEnd,
  onDrop,
}: BoardProps) {
  const boardSize = size ?? board.length;
  const [, setInternalFocus] = useState<Position | null>(
    keyboardFocusPosition ?? selectedPosition ?? { row: 0, col: 0 },
  );
  // Remove unused effectiveFocus variable

  const squareRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const setSquareRef = useCallback(
    (key: string, node: HTMLDivElement | null) => {
      if (!node) {
        squareRefs.current.delete(key);
      } else {
        squareRefs.current.set(key, node);
      }
    },
    [],
  );

  const focusSquare = useCallback((pos: Position | null) => {
    if (!pos) return;
    setInternalFocus(pos);
    const k = `${pos.row}-${pos.col}`;
    const node = squareRefs.current.get(k);
    if (node) {
      queueMicrotask(() => node.focus());
    }
  }, []);

  useEffect(() => {
    if (selectedPosition) {
      focusSquare(selectedPosition);
    }
  }, [selectedPosition, focusSquare]);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Find multi-jump moves for arrow display
  const multiJumpMoves = validMoves.filter(
    (move) => move.path && move.path.length > 2,
  );

  // Helper function to transform positions when board is flipped
  const transformPosition = (pos: Position): Position => {
    if (!shouldFlip) return pos;
    const boardSize = size ?? board.length;
    return {
      row: boardSize - 1 - pos.row,
      col: boardSize - 1 - pos.col,
    };
  };

  // Transform positions for rendering when board is flipped
  const renderBoard = shouldFlip
    ? [...board].reverse().map((row) => [...row].reverse())
    : board;

  const moveFocus = useCallback(
    (from: Position, dRow: number, dCol: number): Position => {
      const mult = shouldFlip ? -1 : 1;
      const nextRow = Math.min(
        Math.max(from.row + dRow * mult, 0),
        boardSize - 1,
      );
      const nextCol = Math.min(
        Math.max(from.col + dCol * mult, 0),
        boardSize - 1,
      );
      return { row: nextRow, col: nextCol };
    },
    [boardSize, shouldFlip],
  );

  const moveFocusTab = useCallback(
    (from: Position, reverse: boolean): Position | null => {
      let r = from.row;
      let c = from.col + (reverse ? -1 : 1);
      if (c < 0) {
        c = boardSize - 1;
        r -= 1;
      } else if (c >= boardSize) {
        c = 0;
        r += 1;
      }
      if (r < 0 || r >= boardSize) return null;
      return { row: r, col: c };
    },
    [boardSize],
  );

  return (
    <div
      className="relative box-border grid h-full w-full gap-0 overflow-hidden rounded-lg border-8 shadow-2xl"
      role="grid"
      aria-label="Checkers board"
      aria-rowcount={boardSize}
      aria-colcount={boardSize}
      style={{
        borderColor: "var(--board-border)",
        backgroundColor: "var(--board-border)",
        ...getBoardGridStyleFromSize(boardSize),
      }}
    >
      {renderBoard.map((row, rowIndex) => (
        <div key={`row-${rowIndex}`} role="row" className="contents">
          {row.map((piece, colIndex) => {
            // Calculate actual position (accounting for flip)
            const actualRow = shouldFlip ? board.length - 1 - rowIndex : rowIndex;
            const actualCol = shouldFlip ? board.length - 1 - colIndex : colIndex;
            const position = { row: actualRow, col: actualCol };
            const isBlack = (actualRow + actualCol) % 2 === 1;
            const isSelected =
              selectedPosition?.row === actualRow &&
              selectedPosition?.col === actualCol;
            const isDragging =
              draggingPosition?.row === actualRow &&
              draggingPosition?.col === actualCol;
            const isKeyboardFocused =
              keyboardFocusPosition?.row === actualRow &&
              keyboardFocusPosition?.col === actualCol;
            const isPossibleMove = validMoves.some(
              (move) => move.to.row === actualRow && move.to.col === actualCol,
            );
            const mustCapture = mustCapturePositions.some(
              (pos) => pos.row === actualRow && pos.col === actualCol,
            );
            const isDraggable = !replayMode && !winner && piece?.color === currentPlayer;
            const key = `${actualRow}-${actualCol}`;

            return (
              <Square
                key={`${rowIndex}-${colIndex}`}
                position={position}
                isBlack={isBlack}
                isHighlighted={false}
                isSelected={isSelected && !replayMode}
                isPossibleMove={isPossibleMove && !replayMode}
                isKeyboardFocused={isKeyboardFocused && !replayMode}
                onClick={() => !replayMode && onSquareClick && onSquareClick(position)}
                onKeyDown={(e) => {
                  if (replayMode) return;
                  if (
                    e.key === "Enter" ||
                    e.key === " " ||
                    e.key === "Spacebar" ||
                    (e).code === "Space"
                  ) {
                    e.preventDefault();
                    if (onSquareClick) {
                      onSquareClick(position);
                    }
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const next = moveFocus(position, -1, 0);
                    focusSquare(next);
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const next = moveFocus(position, 1, 0);
                    focusSquare(next);
                  } else if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    const next = moveFocus(position, 0, -1);
                    focusSquare(next);
                  } else if (e.key === "ArrowRight") {
                    e.preventDefault();
                    const next = moveFocus(position, 0, 1);
                    focusSquare(next);
                  } else if (e.key === "Tab") {
                    const next = moveFocusTab(position, e.shiftKey);
                    if (next) {
                      e.preventDefault();
                      focusSquare(next);
                    }
                  }
                }}
                onFocus={() => {
                  if (!isKeyboardFocused) setInternalFocus(position);
                }}
                tabIndex={isKeyboardFocused ? 0 : -1}
                role="gridcell"
                ariaLabel={`Square ${actualRow + 1}, ${actualCol + 1}`}
                ariaSelected={isSelected}
                ariaRowIndex={actualRow + 1}
                ariaColIndex={actualCol + 1}
                ref={(node) => setSquareRef(key, node)}
                onDrop={
                  replayMode || !onDrop
                    ? undefined
                    : (e) => {
                      e.preventDefault();
                      onDrop(position);
                    }
                }
                onDragOver={replayMode ? undefined : handleDragOver}
              >
                {piece && (
                  <Piece
                    piece={piece}
                    isDraggable={isDraggable}
                    isDragging={isDragging}
                    mustCapture={mustCapture}
                    hasOtherMustCapture={mustCapturePositions.length > 0}
                    onDragStart={
                      replayMode || !onDragStart
                        ? undefined
                        : (e: React.DragEvent) => {
                          e.dataTransfer.effectAllowed = "move";
                          onDragStart(position);
                        }
                    }
                    onDragEnd={
                      replayMode || !onDragEnd
                        ? undefined
                        : (_e: React.DragEvent) => {
                          // ignore event, just delegate to parent
                          onDragEnd();
                        }
                    }
                  />
                )}
              </Square>
            );
          })}
        </div>
      ))}

      {/* Arrow overlays for multi-jump sequences */}
      {selectedPosition &&
        multiJumpMoves.map((move, index) => {
          const transformedPath =
            shouldFlip && move.path
              ? move.path.map((pos) => transformPosition(pos))
              : (move.path ?? []);

          return (
            <MoveSequenceArrows
              key={`arrow-${index}`}
              sequence={transformedPath}
              show={
                selectedPosition.row === move.from.row &&
                selectedPosition.col === move.from.col
              }
              boardSize={size ?? board.length}
            />
          );
        })}
    </div>
  );
}
