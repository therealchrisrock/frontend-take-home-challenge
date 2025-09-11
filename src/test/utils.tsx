import React, { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCMsw } from "msw-trpc";
import type { AppRouter } from "~/server/api/root";
import superjson from "superjson";

// Create a custom render function that includes providers
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

// Create tRPC MSW instance for mocking API calls
export const trpcMsw = createTRPCMsw<AppRouter>({
  transformer: superjson as any,
  links: [],
});

// Test data factories
export const createTestBoard = () => {
  const board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // Place black pieces (top)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row]![col] = { color: "black", type: "regular" };
      }
    }
  }

  // Place red pieces (bottom)
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row]![col] = { color: "red", type: "regular" };
      }
    }
  }

  return board;
};

export const createEmptyBoard = () =>
  Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

export const createBoardWithPiece = (row: number, col: number, piece: any) => {
  const board = createEmptyBoard();
  board[row]![col] = piece;
  return board;
};

// Re-export everything from React Testing Library
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
