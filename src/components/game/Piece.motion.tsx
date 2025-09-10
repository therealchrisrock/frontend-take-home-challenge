'use client';

import { type Piece as PieceType } from '~/lib/game-logic';
import { m, AnimatePresence } from "framer-motion";
import { pieceCapture } from "~/lib/motion/variants";
import { Crown, Shield } from 'lucide-react';

interface MotionPieceProps {
  piece: PieceType;
  isDragging?: boolean;
  pieceStyle?: 'classic' | 'modern' | 'minimal' | 'neon' | 'wooden';
  layoutId?: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

/**
 * Animated Piece component with smooth movement and capture animations
 * Uses layout animations for smooth position transitions
 */
export function MotionPiece({ 
  piece, 
  isDragging = false,
  pieceStyle = 'classic',
  layoutId,
  onDragStart,
  onDragEnd
}: MotionPieceProps) {
  const getColorClasses = () => {
    switch (pieceStyle) {
      case 'modern':
        return piece.color === 'red' 
          ? 'bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/50' 
          : 'bg-gradient-to-br from-gray-700 to-gray-900 shadow-lg shadow-gray-700/50';
      case 'minimal':
        return piece.color === 'red'
          ? 'bg-red-500 border-2 border-red-600'
          : 'bg-gray-800 border-2 border-gray-900';
      case 'neon':
        return piece.color === 'red'
          ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)] border-2 border-red-400'
          : 'bg-gray-800 shadow-[0_0_20px_rgba(31,41,55,0.8)] border-2 border-gray-600';
      case 'wooden':
        return piece.color === 'red'
          ? 'bg-gradient-to-br from-amber-600 to-amber-800 shadow-md'
          : 'bg-gradient-to-br from-stone-700 to-stone-900 shadow-md';
      default: // classic
        return piece.color === 'red' 
          ? 'bg-red-600 shadow-md' 
          : 'bg-gray-800 shadow-md';
    }
  };

  const getKingIcon = () => {
    switch (pieceStyle) {
      case 'modern':
        return <Crown className="w-5 h-5 text-yellow-400 drop-shadow-lg" />;
      case 'minimal':
        return <div className="w-2 h-2 bg-yellow-400 rounded-full" />;
      case 'neon':
        return <Crown className="w-5 h-5 text-yellow-300 animate-pulse" />;
      case 'wooden':
        return <Shield className="w-5 h-5 text-yellow-600" />;
      default:
        return <Crown className="w-5 h-5 text-yellow-400" />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <m.div
        layoutId={layoutId}
        drag
        dragSnapToOrigin
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        whileDrag={{ 
          scale: 1.1,
          rotate: isDragging ? 5 : 0,
          zIndex: 100,
          cursor: "grabbing",
          filter: "brightness(1.2)"
        }}
        whileHover={{
          scale: 1.05,
          transition: {
            duration: 0.2,
            ease: "easeOut"
          }
        }}
        whileTap={{
          scale: 0.95
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: 1, 
          opacity: 1,
          transition: {
            type: "spring",
            stiffness: 500,
            damping: 25
          }
        }}
        exit={pieceCapture.exit}
        className={`
          relative
          ${getColorClasses()}
          rounded-full
          flex items-center justify-center
          transition-all duration-200
          ${isDragging ? 'cursor-grabbing z-50' : 'cursor-grab'}
          ${pieceStyle === 'minimal' ? 'w-[80%] h-[80%]' : 'w-[85%] h-[85%]'}
        `}
        style={{
          aspectRatio: '1',
        }}
      >
        {piece.isKing && (
          <m.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ 
              scale: 1, 
              rotate: 0,
              transition: {
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: 0.2
              }
            }}
          >
            {getKingIcon()}
          </m.div>
        )}
        
        {/* Inner highlight for depth */}
        {pieceStyle !== 'minimal' && (
          <m.div 
            className={`
              absolute inset-2 rounded-full pointer-events-none
              ${piece.color === 'red' 
                ? 'bg-gradient-to-tl from-transparent to-red-400/30' 
                : 'bg-gradient-to-tl from-transparent to-gray-600/30'
              }
            `}
            animate={{
              opacity: isDragging ? 0.8 : 0.5
            }}
          />
        )}
      </m.div>
    </AnimatePresence>
  );
}