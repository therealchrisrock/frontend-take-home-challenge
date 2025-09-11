# Import Fix - Parallel Agent Sessions

## Overview
The refactoring in commit f8fc906 moved several files from `src/lib/` to `src/lib/game/` and renamed `game-logic.ts` to `logic.ts`. This left broken imports throughout the codebase that need to be fixed.

## Agent Session Prompts

### Agent 1: Fix src/lib/game/ internal imports

```bash
Fix the broken imports in all files within src/lib/game/ directory. These files were part of a refactoring where game-logic.ts was renamed to logic.ts in the same directory.

Files to fix:
- src/lib/game/checkers-notation.ts (line 1): change from "./game-logic" to "./logic"
- src/lib/game/draw-detection.ts (line 1): change from "./game-logic" to "./logic"
- src/lib/game/move-evaluation.ts (lines 1-2): change from "./game-logic" to "./logic"
- src/lib/game/player-types.ts (line 1): change from "./game-logic" to "./logic"  
- src/lib/game/time-control-types.ts (lines 1, 4): change from "./game-logic" to "./logic"

Also fix these path issues in move-evaluation.ts:
- Line 3: change from "./game-engine/rule-schema" to "../game-engine/rule-schema"
- Line 4: change from "./game-engine/rule-configs/american" to "../game-engine/rule-configs/american"
- Lines 14, 18: change from "./types/move-analysis" to "../types/move-analysis"

And in draw-detection.ts:
- Line 2: change from "./game-engine/rule-schema" to "../game-engine/rule-schema"

After making changes, verify with: pnpm typecheck 2>&1 | grep -E "src/lib/game.*TS2307"
```

### Agent 2: Fix test files in src/lib/

```bash
Fix broken imports in test files located in src/lib/ root directory. The refactoring moved files from src/lib/ to src/lib/game/ and renamed game-logic.ts to logic.ts.

Files to fix:
- src/lib/game-logic.test.ts (line 12): change from "./game-logic" to "./game/logic"
- src/lib/game-logic-multi-board.test.ts (line 13): change from "./game-logic" to "./game/logic"
- src/lib/game-logic-multi-board.test.ts (line 15): change from "./variants" to "./game/variants"
- src/lib/draw-detection.test.ts (line 11): change from "./draw-detection" to "./game/draw-detection"
- src/lib/draw-detection.test.ts (line 12): change from "./game-logic" to "./game/logic"
- src/lib/draw-detection.test.ts (lines 416, 431): change from "./game-logic" to "./game/logic"
- src/lib/board-config.test.ts (line 3): change from "./board-style" to "../app/(checkers)/_lib/board-style"
- src/lib/board-config.test.ts (line 4): change from "./variants" to "./game/variants"

After making changes, verify with: pnpm typecheck 2>&1 | grep -E "src/lib/.*\.test.*TS2307"
```

### Agent 3: Fix src/lib/__tests__/ and game-engine core files

```bash
Fix broken imports in src/lib/__tests__/ directory and game-engine core files. The refactoring moved game-logic.ts to src/lib/game/logic.ts.

Files to fix:
- src/lib/__tests__/backward-capture.test.ts (line 8): change from "../game-logic" to "../game/logic"
- src/lib/__tests__/illegal-moves.test.ts (line 13): change from "../game-logic" to "../game/logic"
- src/lib/game-engine/game-rules.ts (line 14): change from "../game-logic" to "../game/logic"
- src/lib/game-engine/index.ts (line 161): change from "../game-logic" to "../game/logic"
- src/lib/game-engine/index.ts (line 168): change from "../game-logic" to "../game/logic"
- src/lib/types/move-analysis.ts (line 1): change from "../game-logic" to "../game/logic"

After making changes, verify with: pnpm typecheck 2>&1 | grep -E "src/lib/(__|game-engine|types).*TS2307"
```

### Agent 4: Fix game-engine test files

```bash
Fix broken imports in src/lib/game-engine/__tests__/ directory. The refactoring moved game-logic.ts to src/lib/game/logic.ts.

Files to fix:
- src/lib/game-engine/__tests__/cross-variant.test.ts (line 9): change from "../../game-logic" to "../../game/logic"
- src/lib/game-engine/__tests__/edge-cases.test.ts (line 9): change from "../../game-logic" to "../../game/logic"
- src/lib/game-engine/__tests__/integration.test.ts (line 10): change from "../../game-logic" to "../../game/logic"

After making changes, verify with: pnpm typecheck 2>&1 | grep -E "src/lib/game-engine/__tests__.*TS2307"
```

## Coordination Instructions

After all agents complete their tasks, run in the main session:

```bash
# Verify all import errors are fixed
pnpm typecheck 2>&1 | grep -c "TS2307"

# If the count is 0, all import errors are fixed
# Then run full typecheck to see remaining issues
pnpm typecheck

# Finally run lint to ensure code quality
pnpm lint
```

## Important Notes

1. Each agent should work independently and make their edits without waiting for others
2. The file changes don't overlap, so there won't be any merge conflicts
3. All agents are fixing imports only - no logic changes
4. Each agent has a verification command to check their specific work

## File Movement Summary (for reference)

### Files moved from `src/lib/` to `src/lib/game/`:
- `game-logic.ts` → `logic.ts` (renamed)
- `ai-engine.ts`
- `checkers-notation.ts`
- `draw-detection.ts`
- `move-evaluation.ts`
- `player-types.ts`
- `time-control-types.ts`
- `variants.ts`

### Files moved to other locations:
- `board-style.ts` → `src/app/(checkers)/_lib/board-style.ts`
