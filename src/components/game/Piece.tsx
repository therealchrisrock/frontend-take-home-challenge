'use client';

import { type Piece as PieceType } from '~/lib/game-logic';
import { cn } from '~/lib/utils';
import { Crown } from 'lucide-react';

interface PieceProps {
  piece: PieceType;
  isDraggable: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

export function Piece({ piece, isDraggable, onDragStart, onDragEnd }: PieceProps) {
  const pieceStyle = piece.color === 'red' ? {
    background: `linear-gradient(to bottom right, var(--piece-red-from), var(--piece-red-to))`,
    borderColor: 'var(--piece-red-border)'
  } : {
    background: `linear-gradient(to bottom right, var(--piece-black-from), var(--piece-black-to))`,
    borderColor: 'var(--piece-black-border)'
  };

  const crownColor = piece.color === 'red' 
    ? 'var(--piece-red-crown)' 
    : 'var(--piece-black-crown)';

  return (
    <div
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'w-[80%] h-[80%] rounded-full cursor-move relative',
        'shadow-xl transition-transform hover:scale-105',
        'border-4',
        isDraggable && 'hover:shadow-2xl active:scale-95',
        !isDraggable && 'cursor-not-allowed opacity-90'
      )}
      style={pieceStyle}
    >
      {piece.type === 'king' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Crown 
            className="w-8 h-8 drop-shadow-lg"
            style={{ color: crownColor }}
          />
        </div>
      )}
      <div className="absolute inset-2 rounded-full bg-gradient-to-tl from-white/20 to-transparent" />
    </div>
  );
}