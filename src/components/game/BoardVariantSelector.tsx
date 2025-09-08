'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Label } from '~/components/ui/label';
import { type BoardVariant, getBoardVariants, getBoardConfig } from '~/lib/board-config';

interface BoardVariantSelectorProps {
  value: BoardVariant;
  onValueChange: (variant: BoardVariant) => void;
  disabled?: boolean;
}

export function BoardVariantSelector({ value, onValueChange, disabled = false }: BoardVariantSelectorProps) {
  const variants = getBoardVariants();

  return (
    <div className="space-y-2">
      <Label htmlFor="board-variant">Board Variant</Label>
      <Select 
        value={value} 
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger id="board-variant" className="w-full">
          <SelectValue placeholder="Select board variant" />
        </SelectTrigger>
        <SelectContent>
          {variants.map((variant) => {
            const config = getBoardConfig(variant);
            return (
              <SelectItem key={variant} value={variant}>
                <div className="flex flex-col">
                  <span className="font-medium">{config.name}</span>
                  <span className="text-sm text-muted-foreground">{config.description}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}