"use client";

import { type Position } from "~/lib/game/logic";

interface MoveArrowProps {
  from: Position;
  to: Position;
  boardSize?: number; // Size of the board container for coordinate calculation
}

export function MoveArrow({ from, to, boardSize = 8 }: MoveArrowProps) {
  // Calculate the center coordinates of each square
  const squareSize = 100 / boardSize; // Percentage size of each square

  const fromCenterX = (from.col + 0.5) * squareSize;
  const fromCenterY = (from.row + 0.5) * squareSize;
  const toCenterX = (to.col + 0.5) * squareSize;
  const toCenterY = (to.row + 0.5) * squareSize;

  // Calculate arrow direction
  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;
  const length = Math.sqrt(dx * dx + dy * dy);
  // Remove unused angle variable

  // Normalize direction vector
  const unitX = dx / length;
  const unitY = dy / length;

  // Offset the start and end points by 25% of square size from center
  const offset = squareSize * 0.1;

  // Calculate actual arrow start and end points (offset from center)
  const fromX = fromCenterX + unitX * offset;
  const fromY = fromCenterY + unitY * offset;
  const toX = toCenterX - unitX * offset;
  const toY = toCenterY - unitY * offset;

  // Arrow dimensions as percentages of board size
  const arrowHeadSize = squareSize * 0.3;
  const strokeWidth = squareSize * 0.1;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10"
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        className="absolute inset-0"
      >
        <defs>
          {/* Glow filter */}
          <filter id="arrow-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feMorphology operator="dilate" radius="1" />
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Arrowhead marker */}
          <marker
            id="arrowhead"
            markerWidth={arrowHeadSize}
            markerHeight={arrowHeadSize}
            refX={arrowHeadSize * 0.8}
            refY={arrowHeadSize * 0.5}
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon
              points={`0,0 ${arrowHeadSize},${arrowHeadSize / 2} 0,${arrowHeadSize}`}
              style={{
                fill: "var(--board-arrow-fill)",
                stroke: "var(--board-arrow-stroke)",
                strokeWidth: strokeWidth * 0.5,
              }}
            />
          </marker>
        </defs>

        {/* Arrow line with glow effect */}
        <line
          x1={fromX}
          y1={fromY}
          x2={toX}
          y2={toY}
          style={{
            stroke: "var(--board-arrow-glow)",
            strokeWidth: strokeWidth * 2,
            opacity: 0.3,
          }}
          filter="url(#arrow-glow)"
        />

        {/* Main arrow line */}
        <line
          x1={fromX}
          y1={fromY}
          x2={toX}
          y2={toY}
          style={{
            stroke: "var(--board-arrow-stroke)",
            strokeWidth: strokeWidth,
            strokeLinecap: "round",
          }}
          markerEnd="url(#arrowhead)"
        />

        {/* Animated pulse effect */}
        <line
          x1={fromX}
          y1={fromY}
          x2={toX}
          y2={toY}
          style={{
            stroke: "var(--board-arrow-fill)",
            strokeWidth: strokeWidth * 0.5,
            strokeLinecap: "round",
            opacity: 0.8,
          }}
          className="animate-pulse"
        />
      </svg>
    </div>
  );
}
