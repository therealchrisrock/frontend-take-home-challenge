'use client';

import { type Piece as PieceType } from '~/lib/game-logic';
import { cn } from '~/lib/utils';
import { Crown } from 'lucide-react';
import { useSettings } from '~/contexts/settings-context';

interface PieceProps {
  piece: PieceType;
  isDraggable: boolean;
  isDragging?: boolean;
  mustCapture?: boolean;
  hasOtherMustCapture?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export function Piece({ piece, isDraggable, isDragging = false, mustCapture = false, hasOtherMustCapture = false, onDragStart, onDragEnd }: PieceProps) {
  const { settings } = useSettings();
  
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
      onDragStart={(e) => {
        try {
          // Ensure drag starts on Safari/WebKit
          e.dataTransfer?.setData('text/plain', 'piece');
          const target = e.currentTarget as HTMLElement;
          const rect = target.getBoundingClientRect();
          const clone = target.cloneNode(true) as HTMLElement;
          clone.style.position = 'absolute';
          clone.style.top = '-1000px';
          clone.style.left = '-1000px';
          clone.style.opacity = '1';
          clone.style.pointerEvents = 'none';
          // Fix distorted preview by freezing size in pixels
          clone.style.width = `${rect.width}px`;
          clone.style.height = `${rect.height}px`;
          clone.style.transform = 'none';
          clone.style.boxSizing = 'border-box';
          document.body.appendChild(clone);
          // Center the drag image under the cursor
          e.dataTransfer?.setDragImage(clone, rect.width / 2, rect.height / 2);
          // Allow the browser to snapshot, then remove the clone
          setTimeout(() => {
            try { document.body.removeChild(clone); } catch {}
          }, 0);
        } catch {}
        onDragStart?.(e);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'w-[80%] h-[80%] rounded-full relative',
        'shadow-xl border-4',
        // Only apply hover/scale animations if reduced motion is disabled
        !settings.reducedMotion && 'hover:scale-105',
        isDraggable && !hasOtherMustCapture && 'cursor-grab',
        !settings.reducedMotion && isDraggable && !hasOtherMustCapture && 'hover:shadow-2xl active:scale-95',
        isDraggable && hasOtherMustCapture && !mustCapture && 'cursor-not-allowed opacity-75',
        !isDraggable && 'cursor-not-allowed opacity-90',
        isDragging && 'opacity-0',
        mustCapture && 'ring-2 ring-orange-400 ring-opacity-60'
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