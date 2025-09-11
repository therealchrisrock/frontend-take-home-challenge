"use client";

import { AnimatePresence, m } from "framer-motion";
import { forwardRef, useState } from "react";
import { useSettings } from "~/contexts/settings-context";
import { type Position } from "~/lib/game/logic";
import { cn } from "~/lib/utils";

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
  ariaRowIndex?: number;
  ariaColIndex?: number;
  children?: React.ReactNode;
}

export const Square = forwardRef<HTMLDivElement, SquareProps>(function Square(
  {
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
    ariaRowIndex,
    ariaColIndex,
    children,
  }: SquareProps,
  ref,
) {
  const { settings } = useSettings();
  const [showRipple, setShowRipple] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    onDrop?.(e);
    if (isPossibleMove && !settings.reducedMotion) {
      setShowRipple(true);
      setTimeout(() => setShowRipple(false), 600);
    }
  };

  const squareStyle = isBlack
    ? {
      background: `linear-gradient(to bottom right, var(--board-dark-from), var(--board-dark-to))`,
    }
    : {
      background: `linear-gradient(to bottom right, var(--board-light-from), var(--board-light-to))`,
    };

  const ringStyle = isSelected
    ? {
      boxShadow: `inset 0 0 0 4px var(--board-selected-ring)`,
    }
    : isHighlighted
      ? {
        boxShadow: `inset 0 0 0 4px var(--board-highlighted-ring)`,
      }
      : isKeyboardFocused
        ? {
          boxShadow: `inset 0 0 0 5px #1d4ed8, 0 0 0 3px #ffffff, 0 0 18px rgba(29, 78, 216, 0.7)`,
          outline: "3px solid #1d4ed8",
          outlineOffset: "3px",
          transform: "scale(1.06)",
          zIndex: 10,
        }
        : undefined;

  const SquareComponent = settings.reducedMotion ? "div" : m.div;

  return (
    <SquareComponent
      className={cn(
        "relative flex aspect-square items-center justify-center transition-all duration-200",
        isPossibleMove && "cursor-pointer",
        !isBlack && "shadow-inner",
        isKeyboardFocused && "relative z-10",
      )}
      style={{
        ...squareStyle,
        ...ringStyle,
      }}
      onClick={onClick}
      onDrop={handleDrop}
      onDragOver={onDragOver}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      tabIndex={typeof tabIndex === "number" ? tabIndex : -1}
      role={role ?? "button"}
      aria-label={ariaLabel}
      aria-selected={ariaSelected}
      aria-rowindex={ariaRowIndex}
      aria-colindex={ariaColIndex}
      ref={ref as React.Ref<HTMLDivElement>}
      {...(!settings.reducedMotion && {
        animate: {
          scale: isPossibleMove ? 1.02 : 1,
        },
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 20,
        },
      })}
    >
      {/* Ripple effect when piece lands */}
      <AnimatePresence>
        {showRipple && (
          <m.div
            className="pointer-events-none absolute inset-0 rounded-sm"
            initial={{ scale: 0.5, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              background: `radial-gradient(circle, ${isBlack ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)"
                } 0%, transparent 70%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Valid move indicator with pulsing animation */}
      {isPossibleMove && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={
            {
              "--move-color": "var(--board-possible-move-glow)",
            } as React.CSSProperties
          }
        >
          {settings.reducedMotion ? (
            <div
              className="h-8 w-8 rounded-full shadow-lg"
              style={{
                backgroundColor: "var(--board-possible-move-glow)",
                opacity: 0.8,
              }}
            />
          ) : (
            <m.div
              className="h-8 w-8 rounded-full shadow-lg"
              style={{
                backgroundColor: "var(--board-possible-move-glow)",
              }}
              initial={{ scale: 1 }}
              animate={{
                scale: 0.5,
                opacity: 0.8,
              }}
              transition={{
                scale: {
                  duration: 0.6,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                },
                opacity: {
                  duration: 0.6,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                },
              }}
            />
          )}
        </div>
      )}

      {/* Children (pieces) with animation */}
      {settings.reducedMotion ? (
        <div className="flex h-full w-full items-center justify-center">
          {children}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {children && (
            <m.div
              key={`${position.row}-${position.col}`}
              className="flex h-full w-full items-center justify-center"
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
