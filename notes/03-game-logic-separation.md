# Game Logic Separation

## Pure Functions vs UI Components

**Decision**: Complete separation of game rules from React components

**Structure**:
```text
lib/game-logic.ts     # Pure functions, no React
├── createInitialBoard()
├── getValidMoves()
├── makeMove()
├── checkWinner()
└── getRandomAIMove()

components/game/      # React components, no game rules
├── GameController    # Orchestrates state
├── Board            # Renders 8x8 grid
├── Square           # Drop targets
└── Piece            # Draggable UI
```

## Benefits vs Costs

**Benefits**:
- ✅ Testable without React/DOM
- ✅ Reusable across platforms (mobile, CLI)
- ✅ Clear separation of concerns
- ✅ Easy to add new rules

**Costs**:
- ❌ Extra abstraction layer
- ❌ More files to maintain
- ❌ Potential over-engineering for simple game

## Move Validation Architecture

**Decision**: Centralized validation with mandatory capture detection

```typescript
// Single source of truth for rules
export function getValidMoves(board, position, forceCaptures = true) {
  // 1. Check if captures are available globally
  const mustCapture = getMustCapturePositions(board, currentPlayer);
  
  // 2. If captures exist, only return capture moves
  if (mustCapture.length > 0 && forceCaptures) {
    return onlyCaptureMovesFrom(position);
  }
  
  // 3. Otherwise return all valid moves
  return allValidMovesFrom(position);
}
```

**Trade-off**: Performance (checking all pieces) vs. correctness

## AI Strategy

**Current**: Random valid move selection
**Future**: Minimax with alpha-beta pruning

**Trade-off**: Simplicity now vs. better gameplay later
