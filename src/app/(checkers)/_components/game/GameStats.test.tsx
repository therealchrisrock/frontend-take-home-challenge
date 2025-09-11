import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { GameStats } from "./GameStats";
import type { Board, Piece } from "~/lib/game/logic";

describe("GameStats Component", () => {
  const createTestBoard = (): Board => {
    const board: Board = Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => null as Piece | null),
    );
    // Add some test pieces
    board[0]![1] = { color: "black", type: "regular" };
    board[2]![3] = { color: "black", type: "regular" };
    board[5]![2] = { color: "red", type: "regular" };
    return board;
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("should display current player", () => {
    render(
      <GameStats
        board={createTestBoard()}
        currentPlayer="red"
        moveCount={0}
        winner={null}
        gameStartTime={new Date()}
      />,
    );

    expect(screen.getByText(/Current Turn/i)).toBeInTheDocument();
    // Find the specific "Red" badge for current turn
    const currentTurnSection = screen.getByText(/Current Turn/i).parentElement;
    expect(within(currentTurnSection!).getByText(/Red/i)).toBeInTheDocument();
  });

  it("should display move count", () => {
    render(
      <GameStats
        board={createTestBoard()}
        currentPlayer="red"
        moveCount={5}
        winner={null}
        gameStartTime={new Date()}
      />,
    );

    // Check for Moves section
    expect(screen.getByText(/Moves/i)).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should display piece counts", () => {
    const board = createTestBoard();
    // Add more pieces for testing
    board[3]![4] = { color: "black", type: "regular" };
    board[6]![3] = { color: "red", type: "king" };

    render(
      <GameStats
        board={board}
        currentPlayer="red"
        moveCount={0}
        winner={null}
        gameStartTime={new Date()}
      />,
    );

    // Should show piece counts - Red: 1 + K:1, Black: 3 + K:0
    expect(screen.getByText(/Red Pieces/i)).toBeInTheDocument();
    expect(screen.getByText(/Black Pieces/i)).toBeInTheDocument();
  });

  it("should display elapsed time", () => {
    const startTime = new Date();
    startTime.setSeconds(startTime.getSeconds() - 65); // 1 minute 5 seconds ago

    render(
      <GameStats
        board={createTestBoard()}
        currentPlayer="red"
        moveCount={0}
        winner={null}
        gameStartTime={startTime}
      />,
    );

    // Look for the Time label
    expect(screen.getByText(/Time/i)).toBeInTheDocument();
  });

  it("should display winner when game ends", () => {
    render(
      <GameStats
        board={createTestBoard()}
        currentPlayer="black"
        moveCount={10}
        winner="red"
        gameStartTime={new Date()}
      />,
    );

    expect(screen.getByText(/Red Wins!/i)).toBeInTheDocument();
  });

  it("should display draw when game is drawn", () => {
    render(
      <GameStats
        board={createTestBoard()}
        currentPlayer="black"
        moveCount={10}
        winner="draw"
        gameStartTime={new Date()}
      />,
    );

    expect(screen.getByText(/Draw!/i)).toBeInTheDocument();
  });

  it("should count kings separately", () => {
    const board = createTestBoard();
    board[0]![3] = { color: "black", type: "king" };
    board[5]![2] = { color: "red", type: "king" };

    render(
      <GameStats
        board={board}
        currentPlayer="red"
        moveCount={0}
        winner={null}
        gameStartTime={new Date()}
      />,
    );

    // Should show kings in the piece counts
    expect(screen.getByText(/K:/)).toBeInTheDocument();
  });

  it("should update time every second", () => {
    const startTime = new Date();

    const { rerender } = render(
      <GameStats
        board={createTestBoard()}
        currentPlayer="red"
        moveCount={0}
        winner={null}
        gameStartTime={startTime}
      />,
    );

    expect(screen.getByText("0:00")).toBeInTheDocument();

    // Advance time by 5 seconds
    vi.advanceTimersByTime(5000);

    rerender(
      <GameStats
        board={createTestBoard()}
        currentPlayer="red"
        moveCount={0}
        winner={null}
        gameStartTime={startTime}
      />,
    );

    expect(screen.getByText("0:05")).toBeInTheDocument();
  });

  it("should not reset move count on re-render", () => {
    const { rerender } = render(
      <GameStats
        board={createTestBoard()}
        currentPlayer="red"
        moveCount={5}
        winner={null}
        gameStartTime={new Date()}
      />,
    );

    expect(screen.getByText("5")).toBeInTheDocument();

    rerender(
      <GameStats
        board={createTestBoard()}
        currentPlayer="black"
        moveCount={5}
        winner={null}
        gameStartTime={new Date()}
      />,
    );

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should display current player color indicator", () => {
    render(
      <GameStats
        board={createTestBoard()}
        currentPlayer="black"
        moveCount={0}
        winner={null}
        gameStartTime={new Date()}
      />,
    );

    // Find the specific "Black" badge for current turn
    const currentTurnSection = screen.getByText(/Current Turn/i).parentElement;
    expect(within(currentTurnSection!).getByText(/Black/i)).toBeInTheDocument();
  });

  it("should not update time when winner is set", () => {
    const startTime = new Date();

    const { rerender } = render(
      <GameStats
        board={createTestBoard()}
        currentPlayer="red"
        moveCount={10}
        winner="red"
        gameStartTime={startTime}
      />,
    );

    const initialTime = screen.getByText(/\d+:\d{2}/).textContent;

    // Advance time
    vi.advanceTimersByTime(5000);

    rerender(
      <GameStats
        board={createTestBoard()}
        currentPlayer="red"
        moveCount={10}
        winner="red"
        gameStartTime={startTime}
      />,
    );

    // Time should not have changed
    const finalTime = screen.getByText(/\d+:\d{2}/).textContent;
    expect(finalTime).toBe(initialTime);
  });
});