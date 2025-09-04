import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      const result = cn('base-class', 'additional-class');
      expect(result).toBe('base-class additional-class');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'included', false && 'excluded');
      expect(result).toBe('base included');
    });

    it('should handle undefined values', () => {
      const result = cn('base', undefined, 'other');
      expect(result).toBe('base other');
    });

    it('should merge Tailwind classes correctly', () => {
      // tailwind-merge should merge conflicting classes
      const result = cn('p-2 p-4', 'px-3');
      expect(result).toBe('p-4 px-3');
    });

    it('should handle arrays', () => {
      const result = cn(['base', 'second'], 'third');
      expect(result).toBe('base second third');
    });

    it('should handle objects', () => {
      const result = cn('base', {
        'active': true,
        'disabled': false,
        'hover': true
      });
      expect(result).toBe('base active hover');
    });
  });
});