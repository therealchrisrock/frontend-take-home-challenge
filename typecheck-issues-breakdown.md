# TypeScript Issues Breakdown for Parallel Resolution

## Group 1: Next.js Auth Route Issues
**Files:** 
- `.next/types/app/api/auth/[...nextauth]/route.ts`
- `.next/types/validator.ts`

**Issues:**
- NextAuth route handler type incompatibility
- GET handler type mismatch with Next.js route expectations

**Resolution Strategy:**
- Update auth route exports to match Next.js App Router requirements
- Ensure proper typing for NextAuth route handlers

---

## Group 2: Motion/Animation Library Issues
**Files:**
- `src/app/(checkers)/_components/game/Piece.motion.tsx`
- `src/lib/motion/dynamic.ts`

**Issues:**
- Missing `MotionProps` type import
- JSX namespace not found
- Type indexing errors with motion components

**Resolution Strategy:**
- Add proper framer-motion imports
- Fix motion component type definitions
- Ensure JSX types are properly imported

---

## Group 3: Chat & Friends Component Type Issues
**Files:**
- `src/components/chat/IntegratedChat.tsx`
- `src/components/friends-mini-drawer.tsx`

**Issues:**
- Type comparison errors for message types
- Conversation interface mismatches
- Missing properties on Conversation type (userId, user, unreadCount)
- Friend type incompatibility with state setter

**Resolution Strategy:**
- Update Conversation and Friend type definitions
- Fix message type union to include all possible types
- Align component props with actual data structures

---

## Group 4: Game Engine & Rules Issues
**Files:**
- `src/lib/game-engine/__tests__/integration.test.ts`
- `src/lib/game-engine/game-rules.ts`
- `src/lib/game/ai-engine.ts`

**Issues:**
- Missing `openingRestrictions` property on variant type
- Typo: `promotionRows` should be `promotion`
- Invalid comparison between DrawResult and string literal

**Resolution Strategy:**
- Update variant type definitions to include openingRestrictions
- Fix property name typo
- Correct type comparisons in AI engine

---

## Group 5: Hook & Utility Issues
**Files:**
- `src/hooks/useGameSync.ts`
- `src/hooks/useSingleTabEnforcement.ts`
- `src/lib/optimistic-updates.test.ts`

**Issues:**
- Missing required arguments in function calls
- Extra arguments passed to functions

**Resolution Strategy:**
- Review function signatures and update calls
- Remove or add arguments as needed

---

## Group 6: Test Configuration Issues
**Files:**
- `src/server/auth.test.ts`
- `src/test/mocks/auth-handlers.ts`
- `src/test/utils.tsx`

**Issues:**
- Missing properties in auth callback test params
- JWT type incompatibility (username null vs string)
- TRPCMswConfig missing 'links' property

**Resolution Strategy:**
- Update test mocks to match expected types
- Add missing configuration properties
- Fix JWT mock data types

---

## Group 7: ESLint Configuration Issue
**Files:**
- `eslint.config.js`

**Issues:**
- Duplicate property names in object literal

**Resolution Strategy:**
- Remove or rename duplicate properties in ESLint config

---

## Execution Plan

Each group can be assigned to a separate agent working in parallel:

1. **Agent 1**: Fix Next.js Auth Route issues (Group 1)
2. **Agent 2**: Fix Motion/Animation issues (Group 2)
3. **Agent 3**: Fix Chat & Friends components (Group 3)
4. **Agent 4**: Fix Game Engine & Rules (Group 4)
5. **Agent 5**: Fix Hooks & Utilities (Group 5)
6. **Agent 6**: Fix Test configurations (Group 6)
7. **Agent 7**: Fix ESLint configuration (Group 7)

## Priority Order
1. **High Priority**: Groups 1, 3, 4 (core functionality)
2. **Medium Priority**: Groups 2, 5 (UI and utilities)
3. **Low Priority**: Groups 6, 7 (tests and config)

## Notes for Agents
- Each agent should focus only on their assigned group
- Run `pnpm typecheck` after fixes to verify resolution
- Do not modify files outside your assigned group
- If a fix requires changes to shared types, coordinate with other agents
