'use client';

import { type BoardConfig, getBoardGridStyle } from '~/lib/board-config';
import { PlayerCardWrapper } from './PlayerCardWrapper';
import { type GamePlayers, createLocalGamePlayers, createAIGamePlayers, getPlayerByColor } from '~/lib/player-types';

interface BoardPreviewProps {
  config: BoardConfig;
  players?: GamePlayers;
  gameMode?: 'ai' | 'local' | 'online';
  aiDifficulty?: 'easy' | 'medium' | 'hard' | 'expert';
}

export function BoardPreview({ 
  config, 
  players, 
  gameMode = 'ai', 
  aiDifficulty = 'medium' 
}: BoardPreviewProps) {
  const totalSquares = config.size * config.size;
  
  // Use provided players or create defaults based on game mode
  const gamePlayers = players || (gameMode === 'ai' 
    ? createAIGamePlayers(aiDifficulty) 
    : createLocalGamePlayers());
  
  return (
    <div className="flex flex-col h-full w-full">
      {/* Top Player Card (Black - Opponent) */}
      <div className="w-full flex-shrink-0">
        <PlayerCardWrapper
          player={getPlayerByColor(gamePlayers, 'black')}
          color="black"
          position="top"
          enableServerData={false}
          showLoadingSkeleton={false}
        />
      </div>
      
      {/* Board Preview - fills remaining vertical space */}
      <div className="flex-grow min-h-0 flex items-center justify-center py-2">
        <div className="relative aspect-square w-full h-full max-w-[400px] max-h-[400px]">
          <div 
            className="grid gap-0 border-4 border-gray-700 rounded w-full h-full"
            style={getBoardGridStyle(config)}
          >
            {Array.from({ length: totalSquares }).map((_, index) => {
            const row = Math.floor(index / config.size);
            const col = index % config.size;
            const isBlack = (row + col) % 2 === 1;
            const hasPiece = (row < config.pieceRows || row >= config.size - config.pieceRows) && isBlack;
            const isRed = row >= config.size - config.pieceRows;
            
            return (
              <div
                key={index}
                className={`aspect-square flex items-center justify-center ${
                  isBlack ? 'bg-green-700' : 'bg-green-100'
                }`}
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

      {/* Bottom Player Card (Red - Player) */}
      <div className="w-full flex-shrink-0">
        <PlayerCardWrapper
          player={getPlayerByColor(gamePlayers, 'red')}
          color="red"
          position="bottom"
          enableServerData={false}
          showLoadingSkeleton={false}
        />
      </div>
    </div>
  );
}