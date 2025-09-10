'use client';

import { m, AnimatePresence } from 'framer-motion';
import { type Position } from '~/lib/game-logic';
import { cn } from '~/lib/utils';
import { useState, useEffect, forwardRef } from 'react';
import { useSettings } from '~/contexts/settings-context';

interface SquareProps {
  position: Position;
  isBlack: boolean;
  isHighlighted: boolean;
  isSelected: boolean;
  isPossibleMove: boolean;
  isKeyboardFocused?: boolean;
  onClick?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onFocus?: (e: React.FocusEvent) => void;
  tabIndex?: number;
  role?: string;
  ariaLabel?: string;
  ariaSelected?: boolean;
  children?: React.ReactNode;
}

export const Square = forwardRef<HTMLDivElement, SquareProps>(function Square({
  position,
  isBlack,
  isHighlighted,
  isSelected,
  isPossibleMove,
  isKeyboardFocused = false,
  onClick,
  onDrop,
  onDragOver,
  onKeyDown,
  onFocus,
  tabIndex,
  role,
  ariaLabel,
  ariaSelected,
  children
}: SquareProps, ref) {
  const { settings } = useSettings();
  const [showRipple, setShowRipple] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    onDrop?.(e);
    if (isPossibleMove && !settings.reducedMotion) {
      setShowRipple(true);
      setTimeout(() => setShowRipple(false), 600);
    }
  };

  const squareStyle = isBlack ? {
    background: `linear-gradient(to bottom right, var(--board-dark-from), var(--board-dark-to))`
  } : {
    background: `linear-gradient(to bottom right, var(--board-light-from), var(--board-light-to))`
  };

  const ringStyle = isSelected ? {
    boxShadow: `inset 0 0 0 4px var(--board-selected-ring)`
  } : isHighlighted ? {
    boxShadow: `inset 0 0 0 4px var(--board-highlighted-ring)`
  } : isKeyboardFocused ? {
    boxShadow: `inset 0 0 0 3px #3b82f6`,
    outline: 'none'
  } : undefined;

  const SquareComponent = settings.reducedMotion ? 'div' : m.div;

  return (
    <SquareComponent
      className={cn(
        'relative aspect-square transition-all duration-200 flex items-center justify-center',
        isPossibleMove && 'cursor-pointer',
        !isBlack && 'shadow-inner'
      )}
      style={{
        ...squareStyle,
        ...ringStyle
      }}
      onClick={onClick}
      onDrop={handleDrop}
      onDragOver={onDragOver}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      tabIndex={typeof tabIndex === 'number' ? tabIndex : -1}
      role={role ?? 'button'}
      aria-label={ariaLabel}
      aria-selected={ariaSelected}
      ref={ref as any}
      {...(!settings.reducedMotion && {
        animate: {
          scale: isPossibleMove ? 1.02 : 1,
        },
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 20,
        }
      })}
    >
      {/* Ripple effect when piece lands */}
      <AnimatePresence>
        {showRipple && (
          <m.div
            className="absolute inset-0 rounded-sm pointer-events-none"
            initial={{ scale: 0.5, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              background: `radial-gradient(circle, ${
                isBlack ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'
              } 0%, transparent 70%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Valid move indicator with pulsing animation */}
      {isPossibleMove && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            '--move-color': 'var(--board-possible-move-glow)'
          } as React.CSSProperties}
        >
          {settings.reducedMotion ? (
            <div 
              className="w-8 h-8 rounded-full shadow-lg"
              style={{
                backgroundColor: 'var(--board-possible-move-glow)',
                opacity: 0.8
              }}
            />
          ) : (
            <m.div 
              className="w-8 h-8 rounded-full shadow-lg"
              style={{
                backgroundColor: 'var(--board-possible-move-glow)'
              }}
              initial={{ scale: 0 }}
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                scale: {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                opacity: {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              }}
            />
          )}
        </div>
      )}

      {/* Children (pieces) with animation */}
      {settings.reducedMotion ? (
        <div className="w-full h-full flex items-center justify-center">
          {children}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {children && (
            <m.div
              key={`${position.row}-${position.col}`}
              className="w-full h-full flex items-center justify-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
            >
              {children}
            </m.div>
          )}
        </AnimatePresence>
      )}
    </SquareComponent>
  );
});