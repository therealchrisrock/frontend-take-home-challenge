'use client';

import { type Position } from '~/lib/game-logic';
import { MoveArrow } from './MoveArrow';

// Feature flag to enable/disable moving arrows globally
const ARROWS_ENABLED = true;

interface MoveSequenceArrowsProps {
  sequence: Position[];
  show: boolean;
  boardSize?: number;
}

export function MoveSequenceArrows({ sequence, show, boardSize = 8 }: MoveSequenceArrowsProps) {
  if (!ARROWS_ENABLED || !show || sequence.length < 1) {
    return null;
  }

  // Create arrows for each segment of the multi-jump sequence
  const arrows = [];
  for (let i = 0; i < sequence.length - 1; i++) {
    arrows.push(
      <MoveArrow
        key={`${sequence[i]!.row}-${sequence[i]!.col}-to-${sequence[i + 1]!.row}-${sequence[i + 1]!.col}`}
        from={sequence[i]!}
        to={sequence[i + 1]!}
        boardSize={boardSize}
      />
    );
  }

  return <>{arrows}</>;
}