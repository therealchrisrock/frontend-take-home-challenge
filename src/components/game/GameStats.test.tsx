import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameStats } from './GameStats';
import type { Board, Piece } from '~/lib/game-logic';

describe('GameStats Component', () => {
  const createTestBoard = (): Board => {
    const board: Board = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null as Piece | null));
    // Add some pieces
    board[0]![1] = { color: 'black', type: 'regular' };
    board[0]![3] = { color: 'black', type: 'regular' };
    board[5]![2] = { color: 'red', type: 'regular' };
    board[5]![4] = { color: 'red', type: 'king' };
    return board;
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should display current player', () => {
    render(
      <GameStats
        board={createTestBoard()}
        currentPlayer="red"
        moveCount={0}
        winner={null}
        gameStartTime={new Date()}
      />
    );

    expect(screen.getByText(/Current Turn/i)).toBeInTheDocument();
    expect(screen.getByText(/Red/i)).toBeInTheDocument();
  });

  it('should display move count', () => {
    render(
      <GameStats
        board={createTestBoard()}
        currentPlayer="red"
        moveCount={15}
        winner={null}
        gameStartTime={new Date()}
      />
    );

    expect(screen.getByText(/Total Moves/i)).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('should display piece counts', () => {
    render(
      <GameStats
        board={createTestBoard()}
        currentPlayer="red"
        moveCount={0}
        winner={null}
        gameStartTime={new Date()}
      />
    );

    // Check for piece count display
    expect(screen.getByText(/Red Pieces/i)).toBeInTheDocument();
    expect(screen.getByText(/Black Pieces/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 red pieces
    expect(screen.getAllByText('2')[1]).toBeInTheDocument(); // 2 black pieces
  });

  it('should display elapsed time', () => {
    const startTime = new Date('2024-01-01T10:00:00');
    const now = new Date('2024-01-01T10:05:30'); // 5 minutes 30 seconds later
    
    vi.setSystemTime(now);
    
    const { rerender } = render(
      <GameStats
        board={createTestBoard()}
        currentPlayer="red"
        moveCount={0}
        winner={null}
        gameStartTime={startTime}
      />
    );

    // Advance timers to trigger update
    vi.advanceTimersByTime(1000);
    rerender(
      <GameStats
        board={createTestBoard()}
        currentPlayer="red"
        moveCount={0}
        winner={null}
        gameStartTime={startTime}
      />
    );

    expect(screen.getByText(/Time Elapsed/i)).toBeInTheDocument();
    expect(screen.getByText(/05:3\d/)).toBeInTheDocument(); // 5:30 or 5:31
  });

  it('should display winner when game ends', () => {
    render(
      <GameStats
        board={createTestBoard()}
        currentPlayer="red"
        moveCount={25}
        winner="red"
        gameStartTime={new Date()}
      />
    );

    expect(screen.getByText(/Winner/i)).toBeInTheDocument();
    expect(screen.getByText(/Red Wins!/i)).toBeInTheDocument();
  });

  it('should display draw when game is drawn', () => {
    render(
      <GameStats
        board={createTestBoard()}
        currentPlayer="red"
        moveCount={50}
        winner="draw"
        gameStartTime={new Date()}
      />
    );

    expect(screen.getByText(/Game Draw!/i)).toBeInTheDocument();
  });

  it('should count kings separately', () => {
    const board: Board = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null as Piece | null));
    board[0]![1] = { color: 'black', type: 'king' };
    board[0]![3] = { color: 'black', type: 'regular' };
    board[5]![2] = { color: 'red', type: 'king' };
    board[5]![4] = { color: 'red', type: 'king' };
    
    render(
      <GameStats
        board={board}
        currentPlayer="red"
        moveCount={0}
        winner={null}
        gameStartTime={new Date()}
      />
    );

    // Should show king counts
    expect(screen.getByText(/Kings:/)).toBeInTheDocument();
  });

  it('should update time every second', () => {
    const startTime = new Date();
    
    render(
      <GameStats
        board={createTestBoard()}
        currentPlayer="red"
        moveCount={0}
        winner={null}
        gameStartTime={startTime}
      />
    );

    // Initial display
    expect(screen.getByText('00:00')).toBeInTheDocument();
    
    // Advance time
    vi.advanceTimersByTime(3000);
    
    // Should update to show 3 seconds
    expect(screen.getByText('00:03')).toBeInTheDocument();
  });

  it('should display current player color indicator', () => {
    render(
      <GameStats
        board={createTestBoard()}
        currentPlayer="black"
        moveCount={0}
        winner={null}
        gameStartTime={new Date()}
      />
    );

    expect(screen.getByText(/Black/i)).toBeInTheDocument();
  });

  it('should not update time when winner is set', () => {
    const startTime = new Date();
    
    const { rerender } = render(
      <GameStats
        board={createTestBoard()}
        currentPlayer="red"
        moveCount={10}
        winner="red"
        gameStartTime={startTime}
      />
    );

    const initialTime = screen.getByText(/\d{2}:\d{2}/).textContent;
    
    // Advance time
    vi.advanceTimersByTime(5000);
    
    rerender(
      <GameStats
        board={createTestBoard()}
        currentPlayer="red"
        moveCount={10}
        winner="red"
        gameStartTime={startTime}
      />
    );
    
    // Time should not have changed
    const finalTime = screen.getByText(/\d{2}:\d{2}/).textContent;
    expect(finalTime).toBe(initialTime);
  });
});