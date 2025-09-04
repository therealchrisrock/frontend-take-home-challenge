# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript Checkers game implementation built with the T3 Stack. The application includes:
- Playable 8×8 checkers board with standard game mechanics
- Drag-and-drop piece movement with visual feedback
- AI opponent with random move selection
- Support for captures, multiple jumps, and kinging
- Responsive design for modern browsers (Chrome, Firefox, Safari)

### Tech Stack (T3 Stack)
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **tRPC** - End-to-end typesafe APIs
- **Prisma** - Database ORM with SQLite
- **Tailwind CSS** - Utility-first CSS framework
- **Zod** - TypeScript-first schema validation
- **pnpm** - Fast, disk space efficient package manager

## Development Commands

### Initial Setup
```bash
# This project was bootstrapped with create-t3-app
# To create a similar project:
pnpm create t3-app@latest

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and other config
```

### Common Commands
```bash
# Development server (with Turbopack)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
pnpm preview        # Build and start

# Database operations
pnpm db:push        # Push schema changes to database
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations
pnpm db:studio      # Open Prisma Studio

# Code quality
pnpm lint           # ESLint
pnpm lint:fix       # Fix linting issues
pnpm typecheck      # TypeScript check
pnpm check          # Lint + typecheck

# Formatting
pnpm format:check   # Check formatting
pnpm format:write   # Format code
```

## File Naming Conventions

### Component Naming Standards
- **React Components**: Use PascalCase for all component files
  - `GameController.tsx` (client components)
  - `Board.tsx`, `Square.tsx`, `Piece.tsx`
  - `GameStats.tsx`

### Server/Client Component Pairing
- **Dot Notation**: Use ONLY when a component has both server and client versions
  - `user-menu.tsx` (server version - default behavior in App Router)
  - `user-menu.client.tsx` (client version with "use client" directive)
- **Never use**: `.server.tsx` suffix (server components are the default)
- **Don't use**: `.client.tsx` for standalone client components (use regular `.tsx`)

### File Type Conventions
- **Components**: PascalCase (e.g., `GameController.tsx`, `UserProfile.tsx`)
- **Utilities/Hooks**: camelCase (e.g., `useAuth.ts`, `gameLogic.ts`)
- **API Routes**: kebab-case folders (e.g., `/api/auth/signin/`, `/api/trpc/[trpc]/`)
- **Config Files**: kebab-case (e.g., `next.config.js`, `tailwind.config.js`)
- **Test Files**: Match the file being tested with `.test.ts` or `.test.tsx` suffix
  - `Board.test.tsx`, `game-logic.test.ts`

### Directory Structure Naming
- **Folders**: kebab-case for route segments and feature folders
  - `src/app/forgot-password/` (route)
  - `src/components/game/` (feature grouping)
- **Private Folders**: Prefix with underscore for App Router conventions
  - `src/app/_components/` (private to app directory)

### Shadcn/ui Component Naming
- **UI Components**: kebab-case following Shadcn conventions
  - `button.tsx`, `card.tsx`, `dropdown-menu.tsx`
  - `background-3d-canvas.tsx`, `background-3d-clouds.tsx`

### Examples from Codebase
```bash
✅ Good Examples:
├── components/
│   ├── game/GameController.tsx     # PascalCase component
│   ├── user-menu.tsx              # Server version (kebab-case)
│   ├── user-menu.client.tsx       # Client version (with .client)
│   └── ui/dropdown-menu.tsx       # Shadcn UI (kebab-case)
├── lib/
│   ├── game-logic.ts              # Utility (kebab-case)
│   └── utils.ts                   # Utility (camelCase)
├── app/
│   ├── _components/providers.tsx   # App-specific (camelCase)
│   └── auth/signin/page.tsx       # Route (kebab-case path)

❌ Avoid:
├── components/
│   ├── GameController.client.tsx   # Don't use .client for standalone
│   ├── user-menu.server.tsx       # Never use .server suffix
│   └── User_Menu.tsx              # No underscores in components
```

## Architecture & Key Components

### T3 Stack Project Structure
```text
src/
├── app/                    # Next.js App Router
│   ├── _components/        # App-specific components (private)
│   ├── api/trpc/          # tRPC API routes
│   ├── auth/signin/       # Auth routes (kebab-case)
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable UI components
│   ├── game/              # Game-specific components (PascalCase files)
│   ├── ui/                # Shadcn/ui components (kebab-case)
│   ├── user-menu.tsx      # Server component
│   └── user-menu.client.tsx # Client component pair
├── lib/                   # Utility functions (camelCase/kebab-case)
├── server/                # Backend logic
│   ├── api/               # tRPC routers and procedures
│   └── db.ts              # Prisma client
├── trpc/                  # tRPC client configuration
└── env.js                 # Environment validation
```

### Component Structure
- **Board**: Main game board component, manages 8×8 grid layout
- **Square**: Individual board square, handles drop targets and highlighting
- **Piece**: Draggable checker piece, shows regular/king states
- **GameController**: Top-level component managing game state and turn logic
- **GameStats**: UI panel for move count, captures, elapsed time

### State Management Approach
- Game state (board positions, current player, move history) should be centralized
- Use tRPC for server-client communication (if needed for persistence)
- Valid moves calculation should be pure functions testable in isolation
- Consider using React Context, Zustand, or server state via tRPC
- Separate game logic from UI components for better testability

### Game Logic Modules
- **lib/game-logic.ts**: Core game logic functions
- **moveValidation**: Functions for checking legal moves, mandatory jumps
- **gameRules**: Capture sequences, kinging conditions, win detection
- **aiStrategy**: Random move selection, potential minimax implementation
- **boardUtils**: Board initialization, piece position helpers

### API Design (tRPC)
Consider adding these procedures if game persistence is needed:
- **game.create**: Start new game
- **game.makeMove**: Submit and validate moves
- **game.getHistory**: Retrieve move history
- **game.getStats**: Get player statistics

## Testing Strategy

### Unit Tests (Required)
Focus on pure game logic functions:
- Move validation for regular pieces and kings
- Capture detection and multi-jump sequences
- Kinging behavior when reaching back row
- Turn alternation and game end conditions
- tRPC procedure testing with mock data

### Integration Tests
Test component interactions:
- Piece selection and highlighting
- Drag and drop operations
- State updates after moves
- tRPC client-server integration

### E2E Tests (Optional)
Use Playwright or Cypress for full gameplay:
- Complete game sequences
- AI opponent interactions
- Responsive layout behavior

### Testing Tools (T3 Stack)
```bash
# Add testing dependencies
pnpm add -D vitest @testing-library/react @testing-library/jest-dom
pnpm add -D @playwright/test  # For E2E testing

# Example test commands
pnpm test              # Run unit tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage
pnpm test:e2e          # Run E2E tests
```

## Implementation Priorities

1. **Core Mechanics First**
   - Board rendering with proper square colors
   - Piece placement in starting positions
   - Basic move validation (diagonal forward moves)
   - Turn alternation

2. **Capture Logic**
   - Mandatory jump detection
   - Sequential multi-jump support
   - Piece removal after captures

3. **Enhanced Features**
   - Kinging when reaching opposite end
   - King movement (forward and backward)
   - Drag-and-drop with visual feedback

4. **AI & Polish**
   - Random AI move selection
   - Move highlighting on hover/select
   - Game stats tracking
   - Win/draw detection

## Key Design Decisions

### Drag and Drop Implementation
- Use HTML5 Drag and Drop API or react-dnd library
- Provide click-to-select fallback for accessibility
- Clear visual indicators for valid drop targets
- Consider using Tailwind CSS classes for drag states

### Board Representation
- 2D array (8×8) or 1D array (64 squares) for board state
- Store piece objects with type (regular/king) and color (red/black)
- Consider using null/undefined for empty squares
- Use Zod schemas for runtime validation of game state

### Move Validation Architecture
- Separate validation logic from React components
- Return arrays of valid moves for highlighting
- Detect mandatory jumps before allowing regular moves
- Consider tRPC procedures for server-side validation if multiplayer

## Browser Compatibility Notes

- Use Tailwind CSS Grid or Flexbox for responsive board layout
- Test drag-and-drop on touch devices (consider touch event polyfills)
- Ensure board scales appropriately on different screen sizes
- Use Tailwind CSS custom properties and dark mode support
- Leverage Next.js automatic polyfills and optimizations

## Performance Considerations

- Memoize expensive calculations (valid moves, board evaluation)
- Use React.memo for Square components to prevent unnecessary re-renders
- Leverage Next.js automatic code splitting and optimization
- Use tRPC's built-in caching and React Query integration
- Consider virtualization if implementing move history display
- Optimize AI move calculation with web workers if implementing minimax
- Use Prisma query optimization for game persistence

## Environment Setup

### Required Environment Variables
Create a `.env` file in the project root:
```bash
# Database
DATABASE_URL="file:./db.sqlite"

# Optional: Skip environment validation during build
# SKIP_ENV_VALIDATION=true
```

### Development Dependencies
Key packages already included:
- Shadcn/ui components for consistent UI
- Tailwind CSS for styling
- Prisma for database operations
- tRPC with React Query for API state management
- Zod for schema validation
- TypeScript for type safety

## Code Quality & Conventions

### Enforcing Naming Conventions
The project uses ESLint and Prettier to maintain code quality and consistency. ESLint rules focus on TypeScript naming conventions for types, interfaces, and enums:

```bash
# Check code formatting and linting
pnpm check          # Runs both lint and typecheck
pnpm lint           # ESLint only  
pnpm lint:fix       # Auto-fix ESLint issues
pnpm typecheck      # TypeScript check only
pnpm format:check   # Prettier check
pnpm format:write   # Format code
```

**ESLint Configuration Enforces:**
- `PascalCase` for types, interfaces, type aliases, and enums
- `UPPER_CASE` for enum members
- File naming conventions are enforced through team conventions and code review

### Component File Standards
1. **PascalCase for React Components**: All standalone component files use PascalCase
   - Enforced through team conventions and code reviews
   - Examples: `GameController.tsx`, `UserProfile.tsx`, `Dashboard.tsx`

2. **Server/Client Component Pairs**: Use dot notation only for paired components
   - Server component: `component-name.tsx` (kebab-case)
   - Client component: `component-name.client.tsx` (with .client suffix)
   - Never use `.server.tsx` suffix

3. **Shadcn/ui Components**: Follow kebab-case as per Shadcn conventions
   - Generated components use kebab-case: `dropdown-menu.tsx`, `date-picker.tsx`
   - Custom UI components should follow the same pattern

### Import/Export Conventions
- Use named exports for components when possible
- Default exports are acceptable for page components and single-purpose files
- Consistent import ordering: external libraries, internal components, utilities

### Directory Organization Best Practices
- Group related components in feature directories (`src/components/game/`)
- Use private app directories with underscore prefix (`src/app/_components/`)
- Separate UI components from business logic components
- Keep test files adjacent to source files with `.test.ts` or `.test.tsx` suffix

---

## Quick Reference: T3 Stack File Naming

### Component Files
- **React Components**: `PascalCase.tsx` → `GameController.tsx`, `UserProfile.tsx`
- **Server/Client Pairs**: `kebab-case.tsx` + `kebab-case.client.tsx` → `user-menu.tsx` + `user-menu.client.tsx`
- **UI Components**: `kebab-case.tsx` → `dropdown-menu.tsx`, `date-picker.tsx`

### Other Files
- **Utilities**: `camelCase.ts` or `kebab-case.ts` → `gameLogic.ts`, `auth-utils.ts`
- **Test Files**: `ComponentName.test.tsx`, `utility-name.test.ts`
- **Routes**: `kebab-case/` → `/auth/signin/`, `/forgot-password/`

### Key Rules
1. ✅ Use `.client.tsx` ONLY for server/client component pairs
2. ❌ NEVER use `.server.tsx` (server components are default)
3. ✅ PascalCase for standalone React components
4. ✅ kebab-case for Shadcn/ui components and routes
5. ✅ Private app folders start with underscore (`_components/`)




# Shadcn Component Styling Rule

When generating code that uses shadcn/ui components, Claude should rely on the components' built-in variants and props rather than adding custom Tailwind classes for styling. Shadcn components should serve as the single source of truth for the application's look and feel.

**DO:** Use component variants and props
```jsx
<Button variant="outline" size="sm">Click me</Button>
<Card>Content</Card>
<Dialog>
  <DialogTrigger asChild>
    <Button variant="ghost">Open</Button>
  </DialogTrigger>
</Dialog>
```

**DON'T:** Override with custom Tailwind classes
```jsx
// Avoid this pattern:
<Button variant="outline" className="border-border text-white bg-transparent">Click me</Button>
<Card className="p-6 rounded-lg shadow-md">Content</Card>
```

**Exceptions:** Custom Tailwind classes should only be added to shadcn components in extreme circumstances where:
1. Layout positioning is needed (e.g., `className="mt-4"`, `className="flex-1"`)
2. The required styling genuinely cannot be achieved through existing component variants
3. A one-off edge case requires specific behavior not covered by the design system

When custom classes are absolutely necessary, they should be limited to layout/spacing utilities rather than appearance modifications (colors, borders, shadows, etc.). This ensures consistency across the application and makes theme changes easier to manage.
