"use client";

import { useSkin } from "~/lib/skins/skin-context";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Lock, Check } from "lucide-react";

export function SkinSelector({ size = "md" }: { size?: "sm" | "md" }) {
  const { currentSkin, availableSkins, unlockedSkins, selectSkin } = useSkin();

  const tileSize = size === "sm" ? 36 : 50;

  const handleSelectSkin = (skinId: string) => {
    if (unlockedSkins.has(skinId)) {
      selectSkin(skinId);
    }
  };

  const renderMiniCheckerboard = (skin: (typeof availableSkins)[0]) => {
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
            className="relative aspect-square"
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
          </div>,
        );
      }
    }

    return (
      <div className="grid h-full w-full grid-cols-2 gap-0 overflow-hidden rounded-md">
        {squares}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <TooltipProvider>
        <div className="flex flex-wrap items-start justify-start gap-3">
          {availableSkins.map((skin) => {
            const isUnlocked = unlockedSkins.has(skin.id);
            const isSelected = currentSkin.id === skin.id;

            return (
              <Tooltip key={skin.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "relative overflow-hidden p-0",
                      isSelected && "ring-primary ring-2 ring-offset-2",
                      !isUnlocked && "cursor-not-allowed opacity-50",
                    )}
                    style={{ width: tileSize, height: tileSize }}
                    onClick={() => handleSelectSkin(skin.id)}
                    disabled={!isUnlocked}
                  >
                    {/* Selected Check */}
                    {isSelected && (
                      <div className="bg-primary text-primary-foreground absolute top-1 right-1 z-20 rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    )}

                    {/* Lock Icon for locked skins */}
                    {!isUnlocked && (
                      <div className="bg-background/60 absolute inset-0 z-10 flex items-center justify-center">
                        <Lock className="text-muted-foreground h-5 w-5" />
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
                      <p className="text-muted-foreground text-xs">
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
