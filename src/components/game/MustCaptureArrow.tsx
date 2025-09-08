'use client';

import { useEffect, useState } from 'react';
import { cn } from '~/lib/utils';
import { type Position } from '~/lib/game-logic';

interface MustCaptureArrowProps {
  show: boolean;
  fromPosition?: { x: number; y: number };
  toPosition?: Position;
}

export function MustCaptureArrow({ show, fromPosition, toPosition }: MustCaptureArrowProps) {
  const [arrowPath, setArrowPath] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  useEffect(() => {
    if (show && fromPosition && toPosition) {
      // Calculate the target square's position on the board
      const board = document.querySelector('[class*="grid-cols-8"]');
      if (!board) return;

      const squares = board.querySelectorAll('[class*="aspect-square"]');
      const targetSquareIndex = toPosition.row * 8 + toPosition.col;
      const targetSquare = squares[targetSquareIndex] as HTMLElement;
      
      if (targetSquare) {
        const rect = targetSquare.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Start point is the click position
        const startX = fromPosition.x;
        const startY = fromPosition.y;

        // Calculate arrow path
        setArrowPath({
          x1: startX,
          y1: startY,
          x2: centerX,
          y2: centerY
        });
      }
    } else {
      setArrowPath(null);
    }
  }, [show, fromPosition, toPosition]);

  if (!show || !arrowPath) return null;

  // Calculate angle for arrow head
  const angle = Math.atan2(arrowPath.y2 - arrowPath.y1, arrowPath.x2 - arrowPath.x1);
  const arrowLength = 15;
  const arrowAngle = 0.5; // radians

  return (
    <svg
      className={cn(
        'fixed inset-0 pointer-events-none z-40',
        'transition-opacity duration-300',
        show ? 'opacity-100' : 'opacity-0'
      )}
      style={{ width: '100vw', height: '100vh' }}
    >
      {/* Arrow line */}
      <line
        x1={arrowPath.x1}
        y1={arrowPath.y1}
        x2={arrowPath.x2}
        y2={arrowPath.y2}
        stroke="rgb(251 146 60)"
        strokeWidth="3"
        strokeDasharray="5,5"
        className="animate-pulse"
      />
      
      {/* Arrow head */}
      <polygon
        points={`
          ${arrowPath.x2},${arrowPath.y2}
          ${arrowPath.x2 - arrowLength * Math.cos(angle - arrowAngle)},${arrowPath.y2 - arrowLength * Math.sin(angle - arrowAngle)}
          ${arrowPath.x2 - arrowLength * Math.cos(angle + arrowAngle)},${arrowPath.y2 - arrowLength * Math.sin(angle + arrowAngle)}
        `}
        fill="rgb(251 146 60)"
        className="animate-pulse"
      />

      {/* Pulsing circle at target */}
      <circle
        cx={arrowPath.x2}
        cy={arrowPath.y2}
        r="25"
        fill="none"
        stroke="rgb(251 146 60)"
        strokeWidth="2"
        className="animate-ping"
      />
    </svg>
  );
}