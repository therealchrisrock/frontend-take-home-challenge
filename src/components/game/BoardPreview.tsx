'use client';

import { getBoardGridStyleFromSize } from '~/lib/board-style';
import { PlayerCardContainer } from '~/features/game/ui/player-card-container';
import { type GamePlayers, createLocalGamePlayers, createAIGamePlayers, getPlayerByColor } from '~/lib/player-types';

interface BoardPreviewProps {
  size: number;
  players?: GamePlayers;
  gameMode?: 'ai' | 'local' | 'online';
  aiDifficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  shouldFlip?: boolean;
}

export function BoardPreview({ 
  size, 
  players, 
  gameMode = 'ai', 
  aiDifficulty = 'medium',
  shouldFlip = false
}: BoardPreviewProps) {
  const totalSquares = size * size;
  
  // Use provided players or create defaults based on game mode
  const gamePlayers = players ?? (gameMode === 'ai' 
    ? createAIGamePlayers(aiDifficulty) 
    : createLocalGamePlayers());
  
  return (
    <div className="flex-col h-full w-full hidden lg:flex">
      <div className="w-full h-full board-fit-max lg:max-w-[855px] mx-auto flex flex-col border-2 border-gray-300 rounded-xl p-4 bg-white shadow-lg">
        {/* Top Player Card - shows opponent (red when flipped, black normally) */}
        <div className="w-full flex-shrink-0">
            <div className="w-full flex-shrink-0 hidden lg:flex items-center py-3 min-h-[56px]">
          <PlayerCardContainer
            player={getPlayerByColor(gamePlayers, shouldFlip ? 'red' : 'black')}
            color={shouldFlip ? 'red' : 'black'}
            position="top"
            enableServerData={false}
            showLoadingSkeleton={false}
          />
          </div>
        </div>
        
        {/* Board Preview - fills remaining vertical space */}
        <div className="flex-grow min-h-0 flex items-center justify-center py-2">
          <div className="relative aspect-square w-full min-h-0">
            <div 
              className="relative grid gap-0 border-8 rounded-lg shadow-2xl w-full h-full box-border overflow-hidden"
              style={{
                borderColor: 'var(--board-border)',
                backgroundColor: 'var(--board-border)',
                ...getBoardGridStyleFromSize(size)
              }}
            >
            {Array.from({ length: totalSquares }).map((_, index) => {
            // Calculate position based on flip
            let row = Math.floor(index / size);
            let col = index % size;
            
            // If flipped, reverse the board
            if (shouldFlip) {
              row = size - 1 - row;
              col = size - 1 - col;
            }
            
            const isBlack = (row + col) % 2 === 1;
            const pieceRows = Math.floor(size / 2) - 1; // rough preview
            const hasPiece = (row < pieceRows || row >= size - pieceRows) && isBlack;
            const isRed = row >= size - pieceRows;
            
            return (
              <div
                key={index}
                className="aspect-square flex items-center justify-center"
                style={isBlack ? {
                  background: `linear-gradient(to bottom right, var(--board-dark-from), var(--board-dark-to))`
                } : {
                  background: `linear-gradient(to bottom right, var(--board-light-from), var(--board-light-to))`
                }}
              >
                {hasPiece && (
                  <div 
                    className="w-4/5 h-4/5 rounded-full shadow-xl border-4 relative"
                    style={{
                      background: isRed 
                        ? `linear-gradient(to bottom right, var(--piece-red-from), var(--piece-red-to))`
                        : `linear-gradient(to bottom right, var(--piece-black-from), var(--piece-black-to))`,
                      borderColor: isRed 
                        ? 'var(--piece-red-border)' 
                        : 'var(--piece-black-border)'
                    }}
                  >
                    <div className="absolute inset-2 rounded-full bg-gradient-to-tl from-white/20 to-transparent" />
                  </div>
                )}
              </div>
            );
          })}
            </div>
          </div>
        </div>

        {/* Bottom Player Card - shows player (black when flipped, red normally) */}
        <div className="w-full flex-shrink-0 flex items-center min-h-[56px] py-3 lg:py-3">
          <PlayerCardContainer
            player={getPlayerByColor(gamePlayers, shouldFlip ? 'black' : 'red')}
            color={shouldFlip ? 'black' : 'red'}
            position="bottom"
            enableServerData={false}
            showLoadingSkeleton={false}
          />
        </div>
      </div>
    </div>
  );
}