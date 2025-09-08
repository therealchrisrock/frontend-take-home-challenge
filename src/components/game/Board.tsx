'use client';

import { type Board as BoardType, type Position, type Move } from '~/lib/game-logic';
import { type BoardConfig, getBoardConfig, getBoardGridStyle } from '~/lib/board-config';
import { Square } from './Square';
import { Piece } from './Piece';
import { MoveSequenceArrows } from './MoveSequenceArrows';

interface BoardProps {
  board: BoardType;
  selectedPosition: Position | null;
  draggingPosition: Position | null;
  validMoves: Move[];
  mustCapturePositions: Position[];
  currentPlayer: 'red' | 'black';
  keyboardFocusPosition?: Position | null;
  config?: BoardConfig;
  onSquareClick: (position: Position, event?: React.MouseEvent) => void;
  onDragStart: (position: Position) => void;
  onDragEnd: () => void;
  onDrop: (position: Position) => void;
}

export function Board({
  board,
  selectedPosition,
  draggingPosition,
  validMoves,
  mustCapturePositions,
  currentPlayer,
  keyboardFocusPosition,
  config = getBoardConfig('american'),
  onSquareClick,
  onDragStart,
  onDragEnd,
  onDrop
}: BoardProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Find multi-jump moves for arrow display
  const multiJumpMoves = validMoves.filter(move => move.path && move.path.length > 2);

  return (
    <div 
      className="relative grid gap-0 border-8 rounded-lg shadow-2xl"
      style={{
        borderColor: 'var(--board-border)',
        backgroundColor: 'var(--board-border)',
        ...getBoardGridStyle(config)
      }}
    >
      {board.map((row, rowIndex) =>
        row.map((piece, colIndex) => {
          const position = { row: rowIndex, col: colIndex };
          const isBlack = (rowIndex + colIndex) % 2 === 1;
          const isSelected = selectedPosition?.row === rowIndex && selectedPosition?.col === colIndex;
          const isDragging = draggingPosition?.row === rowIndex && draggingPosition?.col === colIndex;
          const isKeyboardFocused = keyboardFocusPosition?.row === rowIndex && keyboardFocusPosition?.col === colIndex;
          const isPossibleMove = validMoves.some(
            move => move.to.row === rowIndex && move.to.col === colIndex
          );
          const mustCapture = mustCapturePositions.some(
            pos => pos.row === rowIndex && pos.col === colIndex
          );
          const isDraggable = piece?.color === currentPlayer;

          return (
            <Square
              key={`${rowIndex}-${colIndex}`}
              position={position}
              isBlack={isBlack}
              isHighlighted={false}
              isSelected={isSelected}
              isPossibleMove={isPossibleMove}
              isKeyboardFocused={isKeyboardFocused}
              onClick={(e) => onSquareClick(position, e)}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(position);
              }}
              onDragOver={handleDragOver}
            >
              {piece && (
                <Piece
                  piece={piece}
                  isDraggable={isDraggable}
                  isDragging={isDragging}
                  mustCapture={mustCapture}
                  hasOtherMustCapture={mustCapturePositions.length > 0}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    onDragStart(position);
                  }}
                  onDragEnd={onDragEnd}
                />
              )}
            </Square>
          );
        })
      )}
      
      {/* Arrow overlays for multi-jump sequences */}
      {selectedPosition && multiJumpMoves.map((move, index) => (
        <MoveSequenceArrows
          key={`arrow-${index}`}
          sequence={move.path || []}
          show={selectedPosition.row === move.from.row && selectedPosition.col === move.from.col}
        />
      ))}
    </div>
  );
}