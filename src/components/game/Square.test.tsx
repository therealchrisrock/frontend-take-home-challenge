import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Square } from './Square';

describe('Square Component', () => {
  const mockOnClick = vi.fn();
  const mockOnDrop = vi.fn();
  const mockOnDragOver = vi.fn();

  const defaultProps = {
    position: { row: 0, col: 0 },
    isBlack: false,
    isHighlighted: false,
    isSelected: false,
    isPossibleMove: false,
    onClick: mockOnClick,
    onDrop: mockOnDrop,
    onDragOver: mockOnDragOver,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render light square', () => {
    const { container } = render(<Square {...defaultProps} />);
    
    const square = container.firstChild as HTMLElement;
    expect(square.className).toContain('from-amber-100');
    expect(square.className).toContain('to-amber-200');
    expect(square.className).toContain('shadow-inner');
  });

  it('should render dark square', () => {
    const { container } = render(
      <Square {...defaultProps} isBlack={true} />
    );
    
    const square = container.firstChild as HTMLElement;
    expect(square.className).toContain('from-amber-800');
    expect(square.className).toContain('to-amber-900');
  });

  it('should show selection ring when selected', () => {
    const { container } = render(
      <Square {...defaultProps} isSelected={true} />
    );
    
    const square = container.firstChild as HTMLElement;
    expect(square.className).toContain('ring-4');
    expect(square.className).toContain('ring-blue-500');
  });

  it('should show highlight ring when highlighted', () => {
    const { container } = render(
      <Square {...defaultProps} isHighlighted={true} />
    );
    
    const square = container.firstChild as HTMLElement;
    expect(square.className).toContain('ring-4');
    expect(square.className).toContain('ring-yellow-400');
  });

  it('should show move indicator when possible move', () => {
    const { container } = render(
      <Square {...defaultProps} isPossibleMove={true} />
    );
    
    // Check for the move indicator div
    const indicator = container.querySelector('.before\\:bg-green-400\\/50');
    expect(indicator).toBeDefined();
    
    const square = container.firstChild as HTMLElement;
    expect(square.className).toContain('cursor-pointer');
  });

  it('should handle click events', () => {
    const { container } = render(<Square {...defaultProps} />);
    
    const square = container.firstChild as HTMLElement;
    fireEvent.click(square);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should handle drop events', () => {
    const { container } = render(<Square {...defaultProps} />);
    
    const square = container.firstChild as HTMLElement;
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'preventDefault', {
      value: vi.fn(),
      writable: false
    });
    
    fireEvent.drop(square);
    
    expect(mockOnDrop).toHaveBeenCalled();
  });

  it('should handle dragOver events', () => {
    const { container } = render(<Square {...defaultProps} />);
    
    const square = container.firstChild as HTMLElement;
    fireEvent.dragOver(square);
    
    expect(mockOnDragOver).toHaveBeenCalled();
  });

  it('should render children', () => {
    const { container, getByText } = render(
      <Square {...defaultProps}>
        <div>Test Child</div>
      </Square>
    );
    
    expect(getByText('Test Child')).toBeInTheDocument();
  });

  it('should apply transition classes', () => {
    const { container } = render(<Square {...defaultProps} />);
    
    const square = container.firstChild as HTMLElement;
    expect(square.className).toContain('transition-all');
    expect(square.className).toContain('duration-200');
  });

  it('should have correct layout classes', () => {
    const { container } = render(<Square {...defaultProps} />);
    
    const square = container.firstChild as HTMLElement;
    expect(square.className).toContain('aspect-square');
    expect(square.className).toContain('flex');
    expect(square.className).toContain('items-center');
    expect(square.className).toContain('justify-center');
  });

  it('should show pulse animation for possible moves', () => {
    const { container } = render(
      <Square {...defaultProps} isPossibleMove={true} />
    );
    
    const indicator = container.querySelector('.before\\:animate-pulse');
    expect(indicator).toBeDefined();
  });
});