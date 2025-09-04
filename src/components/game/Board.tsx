'use client';

import { type Board as BoardType, type Position, type Move } from '~/lib/game-logic';
import { Square } from './Square';
import { Piece } from './Piece';

interface BoardProps {
  board: BoardType;
  selectedPosition: Position | null;
  validMoves: Move[];
  currentPlayer: 'red' | 'black';
  onSquareClick: (position: Position) => void;
  onDragStart: (position: Position) => void;
  onDragEnd: () => void;
  onDrop: (position: Position) => void;
}

export function Board({
  board,
  selectedPosition,
  validMoves,
  currentPlayer,
  onSquareClick,
  onDragStart,
  onDragEnd,
  onDrop
}: BoardProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div 
      className="grid grid-cols-8 gap-0 border-8 rounded-lg shadow-2xl"
      style={{ 
        borderColor: 'var(--board-border)',
        backgroundColor: 'var(--board-border)'
      }}
    >
      {board.map((row, rowIndex) =>
        row.map((piece, colIndex) => {
          const position = { row: rowIndex, col: colIndex };
          const isBlack = (rowIndex + colIndex) % 2 === 1;
          const isSelected = selectedPosition?.row === rowIndex && selectedPosition?.col === colIndex;
          const isPossibleMove = validMoves.some(
            move => move.to.row === rowIndex && move.to.col === colIndex
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
              onClick={() => onSquareClick(position)}
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
    </div>
  );
}