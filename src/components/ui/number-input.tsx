'use client';

import { useState, useRef, useEffect } from 'react';
import { m } from '~/lib/motion';
import { Plus, Minus } from 'lucide-react';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

interface NumberInputProps {
  /** Current value */
  value: number;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Step amount for increment/decrement */
  step?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** ID for the input */
  id?: string;
  /** Whether to show decimal places */
  decimals?: number;
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  disabled = false,
  placeholder,
  className,
  id,
  decimals = 0
}: NumberInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update input value when prop value changes
  useEffect(() => {
    if (!isFocused) {
      setInputValue(formatNumber(value, decimals));
    }
  }, [value, isFocused, decimals]);

  const formatNumber = (num: number, decimalPlaces: number): string => {
    return decimalPlaces > 0 ? num.toFixed(decimalPlaces) : num.toString();
  };

  const clampValue = (val: number): number => {
    return Math.max(min, Math.min(max, val));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    const parsedValue = decimals > 0 ? parseFloat(newValue) : parseInt(newValue, 10);
    if (!isNaN(parsedValue)) {
      const clampedValue = clampValue(parsedValue);
      onChange(clampedValue);
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    const parsedValue = decimals > 0 ? parseFloat(inputValue) : parseInt(inputValue, 10);
    if (isNaN(parsedValue)) {
      setInputValue(formatNumber(value, decimals));
    } else {
      const clampedValue = clampValue(parsedValue);
      setInputValue(formatNumber(clampedValue, decimals));
      if (clampedValue !== value) {
        onChange(clampedValue);
      }
    }
  };

  const handleIncrement = () => {
    const newValue = clampValue(value + step);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = clampValue(value - step);
    onChange(newValue);
  };

  const canIncrement = value < max;
  const canDecrement = value > min;

  return (
    <div className={cn("relative flex items-center", className)}>
      {/* Decrement button */}
      <m.div
        whileHover={canDecrement && !disabled ? { scale: 1.05 } : {}}
        whileTap={canDecrement && !disabled ? { scale: 0.95 } : {}}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0 rounded-r-none border-r-0 hover:bg-muted"
          disabled={disabled || !canDecrement}
          onClick={handleDecrement}
        >
          <m.div
            animate={canDecrement && !disabled ? { rotate: 0 } : { rotate: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Minus className="h-3 w-3" />
          </m.div>
        </Button>
      </m.div>

      {/* Number input */}
      <Input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleInputBlur}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            handleIncrement();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            handleDecrement();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="text-center rounded-none border-x-0 focus:z-10 min-w-0 flex-1"
      />

      {/* Increment button */}
      <m.div
        whileHover={canIncrement && !disabled ? { scale: 1.05 } : {}}
        whileTap={canIncrement && !disabled ? { scale: 0.95 } : {}}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0 rounded-l-none border-l-0 hover:bg-muted"
          disabled={disabled || !canIncrement}
          onClick={handleIncrement}
        >
          <m.div
            animate={canIncrement && !disabled ? { rotate: 0 } : { rotate: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Plus className="h-3 w-3" />
          </m.div>
        </Button>
      </m.div>
    </div>
  );
}