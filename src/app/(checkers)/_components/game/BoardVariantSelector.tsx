"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { type BoardVariant, getBoardVariants } from "~/lib/game/variants";
import { GameConfigLoader } from "~/lib/game-engine/config-loader";

interface BoardVariantSelectorProps {
  value: BoardVariant;
  onValueChange: (variant: BoardVariant) => void;
  disabled?: boolean;
}

export function BoardVariantSelector({
  value,
  onValueChange,
  disabled = false,
}: BoardVariantSelectorProps) {
  const variants = getBoardVariants();

  return (
    <div className="space-y-2">
      <Label htmlFor="board-variant">Board Variant</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id="board-variant" className="w-full">
          <SelectValue placeholder="Select board variant" />
        </SelectTrigger>
        <SelectContent>
          {variants.map((variant) => (
            <SelectItem key={variant} value={variant}>
              <div className="flex flex-col">
                <span className="font-medium">
                  {GameConfigLoader.getVariantMetadata(variant)?.displayName ??
                    variant}
                </span>
                <span className="text-muted-foreground text-sm">
                  {GameConfigLoader.getVariantMetadata(variant)?.description ??
                    ""}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
