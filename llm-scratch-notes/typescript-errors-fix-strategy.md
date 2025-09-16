# TypeScript Errors Fix Strategy - Parallel Agent Sessions

## Overview
The project has 272 TypeScript errors after fixing all import issues. These errors are primarily type safety issues that need systematic fixes across different areas of the codebase.

## Error Distribution Summary

### By Error Type
- **TS2532 (165 errors)**: Object is possibly 'undefined' - 60.7% of all errors
- **TS2345 (31 errors)**: Argument type mismatch - 11.4%
- **TS2339 (22 errors)**: Property does not exist on type - 8.1%
- **TS2322 (18 errors)**: Type assignment errors - 6.6%
- **TS2739 (5 errors)**: Type missing properties - 1.8%
- **Other (31 errors)**: Various type issues - 11.4%

### By Directory
- **src/lib (154 errors)**: Core library files and tests - 56.6%
- **src/server (37 errors)**: Server and API routes - 13.6%
- **src/hooks (9 errors)**: React hooks - 3.3%
- **src/components (11 errors)**: UI components - 4.0%
- **prisma (13 errors)**: Database seeding scripts - 4.8%
- **Other (48 errors)**: Various locations - 17.7%

## Parallel Agent Strategy

### Agent 1: Fix Object Possibly Undefined Errors (TS2532)
**Focus**: Test files and database scripts
**File count**: ~80 files with 165 errors

```bash
Fix TS2532 errors (Object is possibly 'undefined') in test files and database scripts.

Primary locations:
1. prisma/seed-games.ts (13 errors) - Add null checks for array access
2. src/lib/*.test.ts files (60+ errors) - Add null checks for board array access
3. src/lib/game-engine/__tests__/*.test.ts (30+ errors) - Add null checks
4. src/server/**/*.test.ts (20+ errors) - Add null checks

Common patterns to fix:
- board[row]![col] instead of board[row][col] when guaranteed to exist
- Add explicit null checks: if (board[row]) { board[row][col] = ... }
- Use optional chaining: board[row]?.[col]
- Use non-null assertion when value is guaranteed: array[0]!

Verify with: pnpm typecheck 2>&1 | grep -c "TS2532"
```

### Agent 2: Fix Type Mismatch and Property Errors (TS2345, TS2339, TS2322)
**Focus**: Component and hook type issues
**File count**: ~35 files with 71 errors

```bash
Fix type mismatch and property errors in components and hooks.

Files to fix:
1. src/app/(checkers)/_components/game/MotionColorSelector.tsx (4 TS2339 errors)
   - Fix union type property access for color options
   
2. src/app/(checkers)/_components/game/Piece.motion.tsx (2 errors)
   - Fix Piece type to include isKing property
   - Fix Variant type assignment

3. src/components/chat/FloatingChat.motion.tsx (4 errors)
   - Fix ChatMessagesProps interface
   - Fix ChatFriendsPopupProps interface
   - Add missing props

4. src/components/chat/IntegratedChat.tsx (3 errors)
   - Fix notification type to include 'game_invite'

5. src/hooks/useGameSync.ts (1 TS2339 error)
   - Fix tRPC router type for simplifiedGame

6. src/hooks/useAudioWarnings.ts (1 TS2322 error)
   - Fix AudioContext type assignment

7. src/components/ui/loading-dots.tsx (1 TS2322 error)
   - Fix Framer Motion transition type

Common fixes:
- Add type guards for union types
- Update interface definitions
- Add missing properties to types
- Fix Framer Motion animation types

Verify with: pnpm typecheck 2>&1 | grep -E "TS2345|TS2339|TS2322" | wc -l
```

### Agent 3: Fix Storage and Multi-tab Sync Errors
**Focus**: Storage system and offline sync
**File count**: ~15 files with 25 errors

```bash
Fix type errors in storage, multi-tab sync, and offline functionality.

Files to fix:
1. src/lib/storage/*.ts (15 errors)
   - Fix IndexedDB type definitions
   - Fix storage interface types
   - Add proper error handling types

2. src/lib/multi-tab/*.ts (3 errors)
   - Fix broadcast channel types
   - Fix sync message types

3. src/hooks/useOfflineSync.ts (2 errors)
   - Fix offline state types
   - Fix sync function return types

4. src/hooks/useGameStorage.ts (2 errors)
   - Fix storage hook types
   - Fix state management types

Common patterns:
- Add proper IndexedDB type definitions
- Fix async function return types
- Add error boundary types
- Fix event handler types

Verify with: pnpm typecheck 2>&1 | grep -E "src/lib/storage|src/lib/multi-tab|useOfflineSync|useGameStorage" | wc -l
```

### Agent 4: Fix Server and Auth Test Errors
**Focus**: Server tests and authentication
**File count**: ~20 files with 45 errors

```bash
Fix type errors in server tests and authentication files.

Files to fix:
1. src/server/auth.test.ts (10+ errors)
   - Fix mock user types
   - Fix session types
   - Add proper test context types

2. src/server/auth-config.test.ts (5+ errors)
   - Fix configuration types
   - Fix provider types

3. src/server/api/routers/*.test.ts (15+ errors)
   - Fix tRPC test context types
   - Fix mock data types
   - Fix procedure input/output types

4. src/test/mocks/auth-handlers.ts (2 errors)
   - Fix MSW handler types
   - Fix mock response types

5. src/test/utils.tsx (5 errors)
   - Fix test utility types
   - Fix render wrapper types

Common fixes:
- Update mock data to match schemas
- Fix async test return types
- Add proper type assertions
- Fix MSW v2 handler types

Verify with: pnpm typecheck 2>&1 | grep -E "src/server.*test|src/test" | wc -l
```

### Agent 5: Fix Remaining Misc Errors
**Focus**: CSS properties, build types, and edge cases
**File count**: ~15 files with 16 errors

```bash
Fix remaining TypeScript errors including CSS properties and build types.

Files to fix:
1. src/lib/board-config.test.ts (3 TS7053 errors)
   - Fix CSS custom property types
   - Use proper type assertions for style objects

2. .next/types/* (2 errors)
   - These are auto-generated, may need to check Next.js config
   - Possibly fixed by cleaning .next directory

3. src/components/ui/use-toast.ts (1 error)
   - Fix ToasterToast interface

4. Various files with TS7006 (implicit any)
   - Add explicit types to parameters

5. Various files with TS2304 (cannot find name)
   - Add missing type imports

Common fixes:
- Cast CSS properties: style['--board-size' as any]
- Add explicit parameter types
- Import missing type definitions
- Clean and rebuild .next directory

Verify with: pnpm typecheck 2>&1 | grep -E "TS7053|TS7006|TS2304|TS2353" | wc -l
```

## Coordination Instructions

### Pre-flight checks (all agents):
```bash
# Ensure you're on the latest code
git pull

# Check current error count for your assigned errors
pnpm typecheck 2>&1 | grep "YOUR_ERROR_CODES" | wc -l
```

### After all agents complete:
```bash
# Main session should run:
pnpm typecheck 2>&1 | grep -c "error TS"

# If errors remain, identify which types:
pnpm typecheck 2>&1 | grep "error TS" | sed 's/.*error //' | cut -d: -f1 | sort | uniq -c

# Run linting to ensure code style:
pnpm lint

# Run build to ensure everything compiles:
pnpm build
```

## Priority Order

1. **Critical**: Agent 1 (TS2532) - Largest number of errors, mostly mechanical fixes
2. **High**: Agent 2 (Component/Hook types) - User-facing functionality
3. **Medium**: Agent 3 (Storage/Sync) - Infrastructure but not blocking
4. **Medium**: Agent 4 (Tests) - Important for CI/CD but not runtime
5. **Low**: Agent 5 (Misc) - Edge cases and build artifacts

## Success Metrics

- Zero TypeScript errors: `pnpm typecheck` runs clean
- All tests pass: `pnpm test` (if available)
- Successful build: `pnpm build` completes without errors
- Clean linting: `pnpm lint` shows no errors

## Common Fix Patterns Reference

### TS2532 - Object possibly undefined
```typescript
// Before
board[row][col] = piece;

// After - Option 1: Non-null assertion (when certain)
board[row]![col] = piece;

// After - Option 2: Guard clause
if (board[row]) {
  board[row][col] = piece;
}

// After - Option 3: Optional chaining
const piece = board[row]?.[col];
```

### TS2339 - Property does not exist
```typescript
// Before
if (option.color) { } // error when 'color' not on all union members

// After - Type guard
if ('color' in option) { }

// Or type narrowing
if (option.id !== 'random') {
  // Now TypeScript knows option has 'color'
  console.log(option.color);
}
```

### TS2345 - Argument type mismatch
```typescript
// Usually requires updating function signatures or casting
// Check the expected vs actual types in error message
```

### TS2322 - Type not assignable
```typescript
// Often requires updating interface definitions
// Or adding type assertions where appropriate
```

## Notes

- Most errors are in test files, making them lower risk to fix
- The TS2532 errors are mostly mechanical fixes (adding ! or null checks)
- Component type errors may require understanding the business logic
- Some errors in .next/types are auto-generated and may resolve after other fixes
- Consider using `--strict` flag selectively if too many false positives
