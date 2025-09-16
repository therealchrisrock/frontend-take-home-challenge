"use client";

import { getBoardOrientationForViewer } from "~/lib/game/board-orientation";
import type {
  Board as BoardType,
  Move,
  PieceColor,
  Position,
} from "~/lib/game/logic";
import type { GameParticipants } from "~/lib/game/playerRoles";
import { Board } from "./Board";

interface OrientedBoardProps {
  board: BoardType;
  participants: GameParticipants;
  currentPlayer: PieceColor;
  selectedPosition: Position | null;
  draggingPosition: Position | null;
  validMoves: Move[];
  mustCapturePositions: Position[];
  keyboardFocusPosition?: Position | null;
  size?: number;
  replayMode?: boolean;
  winner?: PieceColor | "draw" | null;
  viewerId?: string;
  guestId?: string;
  onSquareClick: (position: Position, event?: React.MouseEvent) => void;
  onDragStart: (position: Position) => void;
  onDragEnd: () => void;
  onDrop: (position: Position) => void;
}

/**
 * Board component that automatically orients based on the viewer's perspective
 * Each player sees their pieces at the bottom of the board
 */
export function OrientedBoard({
  board,
  participants,
  currentPlayer,
  selectedPosition,
  draggingPosition,
  validMoves,
  mustCapturePositions,
  keyboardFocusPosition,
  size,
  replayMode = false,
  winner,
  viewerId,
  guestId,
  onSquareClick,
  onDragStart,
  onDragEnd,
  onDrop,
}: OrientedBoardProps) {
  // Calculate board orientation for the current viewer
  const boardOrientation = getBoardOrientationForViewer(
    participants.allParticipants,
    viewerId,
    guestId,
    size ?? board.length
  );

  return (
    <Board
      board={board}
      selectedPosition={selectedPosition}
      draggingPosition={draggingPosition}
      validMoves={validMoves}
      mustCapturePositions={mustCapturePositions}
      currentPlayer={currentPlayer}
      keyboardFocusPosition={keyboardFocusPosition}
      size={size}
      shouldFlip={boardOrientation.rotated}
      replayMode={replayMode}
      winner={winner}
      onSquareClick={onSquareClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
    />
  );
}