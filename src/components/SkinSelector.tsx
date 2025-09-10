'use client';

import { useSkin } from '~/lib/skins/skin-context';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip';
import { Lock, Check, Palette } from 'lucide-react';

export function SkinSelector({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { 
    currentSkin, 
    availableSkins, 
    unlockedSkins, 
    selectSkin, 
  } = useSkin();

  const tileSize = size === 'sm' ? 36 : 50;

  const handleSelectSkin = (skinId: string) => {
    if (unlockedSkins.has(skinId)) {
      selectSkin(skinId);
    }
  };

  const renderMiniCheckerboard = (skin: typeof availableSkins[0]) => {
    const squares = [];
    
    // Create a compact 2x2 grid preview
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const isDark = (row + col) % 2 === 1;
        const background = isDark 
          ? `linear-gradient(to bottom right, ${skin.board.darkSquare.from}, ${skin.board.darkSquare.to})`
          : `linear-gradient(to bottom right, ${skin.board.lightSquare.from}, ${skin.board.lightSquare.to})`;
        
        // Only place pieces on dark squares to match a real checkerboard
        const hasPiece = isDark;
        const pieceColor = row === 0 ? skin.pieces.black : skin.pieces.red;
        
        squares.push(
          <div
            key={`${row}-${col}`}
            className="aspect-square relative"
            style={{ background }}
          >
            {hasPiece && (
              <div
                className="absolute inset-[22%] rounded-full border"
                style={{
                  background: `linear-gradient(to bottom right, ${pieceColor.gradient.from}, ${pieceColor.gradient.to})`,
                  borderColor: pieceColor.border,
                }}
              />
            )}
          </div>
        );
      }
    }
    
    return (
      <div className="grid grid-cols-2 gap-0 rounded-md overflow-hidden w-full h-full">
        {squares}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <TooltipProvider>
        <div className="flex flex-wrap gap-3 justify-start items-start">
          {availableSkins.map((skin) => {
            const isUnlocked = unlockedSkins.has(skin.id);
            const isSelected = currentSkin.id === skin.id;
            
            return (
              <Tooltip key={skin.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'relative p-0 overflow-hidden',
                      isSelected && 'ring-2 ring-primary ring-offset-2',
                      !isUnlocked && 'opacity-50 cursor-not-allowed'
                    )}
                    style={{ width: tileSize, height: tileSize }}
                    onClick={() => handleSelectSkin(skin.id)}
                    disabled={!isUnlocked}
                  >
                    {/* Selected Check */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 z-20 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    
                    {/* Lock Icon for locked skins */}
                    {!isUnlocked && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10">
                        <Lock className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Mini Checkerboard Preview */}
                    {renderMiniCheckerboard(skin)}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-medium">{skin.name}</p>
                    {!isUnlocked && skin.unlockCondition && (
                      <p className="text-xs text-muted-foreground">
                        {skin.unlockCondition.description}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}