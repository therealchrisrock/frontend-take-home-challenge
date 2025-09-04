# Feature: TICKET-002: Professional Tournament System with Configurable Rules

## Overview
Implement a comprehensive tournament-grade checkers system supporting multiple variants (American Checkers, Brazilian Draughts, International Draughts, and future variants) with both casual and professional tournament modes. This system provides WCDF/FMJD standard compliance, professional time controls, rating systems, and educational features while maintaining backward compatibility with the existing T3 Stack checkers game.

## Game Mode Structure

### Tournament vs Casual Modes

#### Casual Mode Features
- **User Experience**: Relaxed play with learning assistance
- **Undo System**: Allow move takebacks and position resets
- **Visual Hints**: Show valid moves, capture requirements, and strategic suggestions
- **Time Controls**: Shorter, flexible time limits (5+3 to 15+10)
- **Notation**: Optional move recording with export capability
- **Rule Enforcement**: Forgiving with warnings for rule violations
- **Educational**: Interactive tutorials and rule explanations

#### Tournament Mode Features
- **Professional Standards**: WCDF/FMJD compliant rule enforcement
- **Touch-Move Rules**: Strict piece-touch commitment (no undo)
- **Time Controls**: Official tournament formats (30 moves/hour + increment)
- **Mandatory Notation**: Automatic move recording and export
- **Draw Rules**: Official 40-move rule and triple repetition detection
- **Broadcasting**: Spectator mode for high-level games
- **Validation**: Real-time rule compliance checking

## Game Variants Specifications

### American Checkers
#### Casual Mode
- **Board**: 8×8 squares, dark squares used for play
- **Initial Setup**: 12 pieces per player on rows 0-2 (black) and 5-7 (red)
- **Movement**: Men move diagonally forward only; kings move diagonally in any direction
- **Captures**: Mandatory when available, multi-jumps required
- **Kings**: Flying kings (can move multiple diagonal squares)
- **Time Controls**: 10+5, 15+10, or custom
- **Special Features**: Move hints, undo allowed, rule explanations

#### Tournament Mode
- **All Casual Rules Plus**:
- **3-Move Restriction**: Official tournament opening system
- **Time Controls**: 30 moves/90 minutes + 30 second increment
- **Touch-Move**: Strict enforcement, no takebacks
- **Official Notation**: Algebraic notation recording
- **Draw Conditions**: 40-move rule, position repetition
- **Opening Setup**: Pre-selected tournament positions

### Brazilian Draughts
#### Casual Mode
- **Board**: 8×8 squares, same as American
- **Initial Setup**: Same as American (12 pieces per player)
- **Movement**: Men move diagonally forward; kings fly any diagonal distance
- **Captures**: Mandatory captures with flying kings, backward captures allowed for men
- **Maximum Capture**: Must capture the most pieces possible
- **Educational**: Rule difference highlights compared to American

#### Tournament Mode
- **All Casual Rules Plus**:
- **Professional Standards**: Brazilian Draughts Federation compliance
- **Time Controls**: International tournament formats
- **Strict Enforcement**: Maximum capture rule with no exceptions
- **Position Analysis**: Post-game analysis tools

### International Draughts (10×10)
#### Casual Mode
- **Board**: 10×10 squares (100 total, 50 dark squares used)
- **Initial Setup**: 20 pieces per player on rows 0-3 (black) and 6-9 (white)
- **Movement**: Men move diagonally forward one square; kings fly any distance
- **Captures**: Men can capture backward, mandatory maximum capture rule
- **Special Rules**: Majority capture rule, promotion restrictions during jumps
- **Learning Mode**: Complex rule tutorials and interactive examples

#### Tournament Mode
- **All Casual Rules Plus**:
- **FMJD Compliance**: Official World Draughts Federation standards
- **Professional Time**: Classical 2 hours per player
- **Opening Theory**: Integration with official opening databases
- **Broadcasting**: Live game streaming capabilities

### Future Variants (Expansion Ready)
- **Russian Draughts**: 8×8 with non-flying kings
- **Turkish Draughts**: 8×8 with orthogonal movement
- **Thai Draughts**: 8×8 with unique king promotion rules
- **Pool Checkers**: American variant with specific tournament rules

## Functional Requirements

### Must Have - Core System
- FR-001: Tournament/Casual mode selection with distinct game experiences
- FR-002: Game variant selection UI supporting all variants and modes
- FR-003: Dynamic board size support (8×8 and 10×10)
- FR-004: Configurable piece movement rules per variant
- FR-005: Variant-specific capture validation logic
- FR-006: Database storage of game variant, mode, and rules
- FR-007: Backward compatibility with existing American Checkers games
- FR-008: Rule-specific king promotion and movement
- FR-009: Maximum/majority capture rule implementation for Brazilian/International variants

### Must Have - Tournament Features
- FR-010: Professional time control system with increment support
- FR-011: Touch-move rule enforcement in tournament mode
- FR-012: Automatic move notation recording and export
- FR-013: Official draw rule detection (40-move, repetition)
- FR-014: 3-Move Restriction system for American tournament play
- FR-015: WCDF/FMJD rule compliance validation

### Must Have - Player Systems
- FR-016: Elo-style rating system per variant and mode
- FR-017: Player title system (Master, IM, GM)
- FR-018: Separate rating tracking for casual vs tournament
- FR-019: Skill-based matchmaking system

### Should Have - Enhanced Features
- FR-020: Rule variant display in game interface
- FR-021: Variant-specific AI strategy adaptation
- FR-022: Game statistics tracking per variant and mode
- FR-023: Spectator mode for tournament games
- FR-024: Position setup for tournament openings
- FR-025: Interactive tutorial system per variant
- FR-026: Opening theory integration
- FR-027: Post-game analysis tools

### Nice to Have - Advanced Features
- FR-028: Custom rule configuration interface
- FR-029: Rule explanation system with visual aids
- FR-030: Variant-specific board themes and professional styling
- FR-031: Game broadcasting and streaming features
- FR-032: Tournament bracket management
- FR-033: Training mode with tactical puzzles
- FR-034: Historical game database and analysis

## Technical Architecture

### Rule Configuration System Design

#### Core Abstractions
```typescript
// lib/game-variants.ts
export interface GameVariant {
  id: string;
  name: string;
  description: string;
  boardSize: { rows: number; cols: number };
  rules: GameRules;
}

export interface GameRules {
  movement: MovementRules;
  capture: CaptureRules;
  promotion: PromotionRules;
  victory: VictoryRules;
}

export interface MovementRules {
  regularPiece: {
    directions: Direction[];
    maxDistance: number | 'unlimited';
  };
  king: {
    directions: Direction[];
    maxDistance: number | 'unlimited';
  };
}

export interface CaptureRules {
  mandatory: boolean;
  backwardCapture: {
    regularPiece: boolean;
    king: boolean;
  };
  multiJump: boolean;
  maxCaptureRule: boolean; // Must capture maximum pieces
  flyingKings: boolean;
}
```

#### Variant Definitions
```typescript
// lib/variants/american-checkers.ts
export const AMERICAN_CHECKERS: GameVariant = {
  id: 'american',
  name: 'American Checkers',
  description: 'Classic 8×8 checkers with flying kings',
  boardSize: { rows: 8, cols: 8 },
  rules: {
    movement: {
      regularPiece: {
        directions: [[-1, -1], [-1, 1]], // Forward diagonally only
        maxDistance: 1
      },
      king: {
        directions: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
        maxDistance: 'unlimited'
      }
    },
    capture: {
      mandatory: true,
      backwardCapture: { regularPiece: false, king: true },
      multiJump: true,
      maxCaptureRule: false,
      flyingKings: true
    },
    // ... other rules
  }
};

// lib/variants/brazilian-draughts.ts
// lib/variants/international-draughts.ts
```

### Board Size Abstraction

#### Dynamic Board Creation
```typescript
// lib/board-factory.ts
export function createInitialBoard(variant: GameVariant): Board {
  const { rows, cols } = variant.boardSize;
  const board: Board = Array(rows).fill(null).map(() => Array(cols).fill(null));
  
  // Place pieces according to variant rules
  return placePiecesForVariant(board, variant);
}

export function isValidSquare(row: number, col: number, boardSize: { rows: number; cols: number }): boolean {
  return row >= 0 && row < boardSize.rows && col >= 0 && col < boardSize.cols;
}
```

#### Component Adaptations
```typescript
// components/Board.tsx - Enhanced to support dynamic sizing
interface BoardProps {
  board: Board;
  variant: GameVariant;
  onSquareClick: (row: number, col: number) => void;
  validMoves: Position[];
}

export function Board({ board, variant, onSquareClick, validMoves }: BoardProps) {
  const { rows, cols } = variant.boardSize;
  
  return (
    <div 
      className={`grid gap-1 ${getBoardGridClasses(rows, cols)}`}
      style={{ aspectRatio: '1' }}
    >
      {/* Render squares dynamically based on board size */}
    </div>
  );
}

function getBoardGridClasses(rows: number, cols: number): string {
  return `grid-cols-${cols} grid-rows-${rows}`;
}
```

### Enhanced Game Logic Architecture

#### Rule-Based Move Validation
```typescript
// lib/move-validation.ts
export function getValidMoves(
  board: Board, 
  position: Position, 
  currentPlayer: PieceColor, 
  variant: GameVariant
): Move[] {
  const validator = new MoveValidator(variant);
  return validator.getValidMoves(board, position, currentPlayer);
}

class MoveValidator {
  constructor(private variant: GameVariant) {}

  getValidMoves(board: Board, position: Position, currentPlayer: PieceColor): Move[] {
    const piece = at(board, position.row, position.col, this.variant.boardSize);
    if (!piece || piece.color !== currentPlayer) return [];

    const mustCapture = this.getMustCapturePositions(board, currentPlayer);
    
    if (mustCapture.length > 0) {
      if (mustCapture.some(pos => pos.row === position.row && pos.col === position.col)) {
        return this.getCaptureMoves(board, position, piece);
      }
      return [];
    }

    return this.getRegularMoves(board, position, piece);
  }

  private getRegularMoves(board: Board, position: Position, piece: Piece): Move[] {
    const rules = piece.type === 'king' 
      ? this.variant.rules.movement.king 
      : this.variant.rules.movement.regularPiece;

    const directions = this.getDirectionsForPiece(piece, rules.directions);
    const moves: Move[] = [];

    for (const [dRow, dCol] of directions) {
      moves.push(...this.getMovesInDirection(board, position, dRow, dCol, rules.maxDistance));
    }

    return moves;
  }

  private getCaptureMoves(board: Board, position: Position, piece: Piece): Move[] {
    const moves: Move[] = [];
    const captureRules = this.variant.rules.capture;

    // Apply variant-specific capture logic
    if (captureRules.maxCaptureRule) {
      // Brazilian/International: Must capture maximum pieces
      return this.getMaximumCaptureMoves(board, position, piece);
    } else {
      // American: Any valid capture
      return this.getAllCaptureMoves(board, position, piece);
    }
  }
}
```

### Enhanced Database Schema for Tournament System

#### Core Game and Tournament Models
```sql
-- prisma/schema.prisma additions
model Game {
  // ... existing fields
  variant       String     @default("american") // Game variant ID
  gameMode      String     @default("casual")   // casual | tournament
  boardSize     String     @default("8x8")      // Board dimensions
  timeControl   String?    // Time control format (e.g., "30+30")
  notation      String?    // Game notation in standard format
  openingId     String?    // Tournament opening position
  ratingChange  Int?       // Rating change after game
  isRated       Boolean    @default(true)
  customRules   String?    // JSON for custom rule overrides
  
  // Tournament-specific fields
  tournamentId  String?
  tournament    Tournament? @relation(fields: [tournamentId], references: [id])
  spectators    User[]     @relation("GameSpectators")
  broadcastKey  String?    // For live streaming
  analysisData  String?    // Post-game analysis JSON
}

model GameVariant {
  id           String @id
  name         String
  description  String
  rules        String // JSON serialized GameRules
  casualRules  String // JSON for casual mode modifications
  isActive     Boolean @default(true)
  category     String @default("official") // official | experimental
  minRating    Int?   // Minimum rating for tournament play
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model PlayerRating {
  id        String @id @default(cuid())
  userId    String
  variant   String
  gameMode  String // casual | tournament
  rating    Int @default(1200)
  games     Int @default(0)
  wins      Int @default(0)
  draws     Int @default(0)
  losses    Int @default(0)
  peak      Int @default(1200)
  title     String? // CM, FM, IM, GM
  lastGame  DateTime?
  
  user      User @relation(fields: [userId], references: [id])
  
  @@unique([userId, variant, gameMode])
}

model Tournament {
  id          String @id @default(cuid())
  name        String
  variant     String
  format      String // swiss, elimination, round-robin
  timeControl String
  startTime   DateTime
  endTime     DateTime?
  status      String @default("planned") // planned, active, finished
  maxPlayers  Int
  minRating   Int?
  maxRating   Int?
  isRated     Boolean @default(true)
  prizePool   String?
  rules       String // JSON tournament-specific rules
  
  games       Game[]
  players     TournamentPlayer[]
  director    User @relation(fields: [directorId], references: [id])
  directorId  String
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model TournamentPlayer {
  id           String @id @default(cuid())
  tournamentId String
  userId       String
  seed         Int?
  score        Float @default(0)
  tiebreaks    String? // JSON tiebreak scores
  
  tournament   Tournament @relation(fields: [tournamentId], references: [id])
  user         User @relation(fields: [userId], references: [id])
  
  @@unique([tournamentId, userId])
}

model OpeningPosition {
  id          String @id @default(cuid())
  name        String
  variant     String
  description String?
  position    String // FEN-like notation for checkers
  moveCount   Int @default(3)
  category    String // "3-move", "11-man", "custom"
  isOfficial  Boolean @default(false)
  usage       Int @default(0)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model TimeControl {
  id          String @id @default(cuid())
  name        String
  variant     String
  gameMode    String
  initialTime Int // seconds
  increment   Int // seconds per move
  description String
  isOfficial  Boolean @default(false)
  
  createdAt   DateTime @default(now())
}

// Enhanced User model additions
model User {
  // ... existing fields
  ratings          PlayerRating[]
  organizedTournaments Tournament[]
  tournamentEntries TournamentPlayer[]
  spectatingGames  Game[] @relation("GameSpectators")
  
  // Profile enhancements
  country         String?
  title           String?
  coachingRate    String?
  biography       String?
  achievements    String? // JSON array
  preferredVariant String @default("american")
  playStyle       String? // aggressive, positional, tactical
}
```

#### Migration Strategy
```typescript
// prisma/migrations/add-game-variants.sql
ALTER TABLE Game ADD COLUMN variant TEXT DEFAULT 'american';
ALTER TABLE Game ADD COLUMN boardSize TEXT DEFAULT '8x8';
ALTER TABLE Game ADD COLUMN customRules TEXT;

-- Create variant definitions table
CREATE TABLE GameVariant (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  rules TEXT NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Implementation Plan

### Phase 1: Tournament System Foundation (Complexity: High)
- **Step 1**: Create game mode and variant type system (Complexity: Medium)
  - Implements: FR-001, FR-002, FR-004
  - Verification: TypeScript compilation succeeds, tournament and casual modes defined
  - Files: `src/lib/game-modes.ts`, `src/lib/game-variants.ts`, `src/lib/types/tournament.ts`

- **Step 2**: Implement comprehensive rule definitions for all modes (Complexity: High)  
  - Implements: FR-004, FR-005, FR-008, FR-015
  - Dependencies: Step 1
  - Verification: All variants have both casual and tournament rule sets with WCDF/FMJD compliance
  - Files: `src/lib/variants/*.ts`, `src/lib/rules/wcdf-compliance.ts`

- **Step 3**: Enhanced database schema for tournament system (Complexity: High)
  - Implements: FR-006, FR-007, FR-016, FR-017, FR-018
  - Dependencies: Step 1
  - Verification: Database supports ratings, tournaments, time controls, and player profiles
  - Files: `prisma/schema.prisma`, comprehensive migration files

- **Step 4**: Time control and notation system (Complexity: Medium)
  - Implements: FR-010, FR-012
  - Dependencies: Step 1-3
  - Verification: Professional time controls work with increment, notation records properly
  - Files: `src/lib/time-control.ts`, `src/lib/notation.ts`

### Phase 2: Professional Game Engine (Complexity: High)
- **Step 5**: Tournament-grade game logic engine (Complexity: High)
  - Implements: FR-003, FR-005, FR-008, FR-009, FR-011, FR-013
  - Dependencies: Step 1-4
  - Verification: Touch-move enforcement, official draw detection, rule compliance
  - Files: `src/lib/tournament-engine.ts`, `src/lib/draw-detection.ts`, `src/lib/rule-validator.ts`

- **Step 6**: 3-Move Restriction and opening system (Complexity: High)
  - Implements: FR-014, FR-024
  - Dependencies: Step 4-5
  - Verification: Tournament openings work, 3-move restriction enforced properly
  - Files: `src/lib/opening-system.ts`, `src/lib/three-move-restriction.ts`

- **Step 7**: Professional move validation with variant support (Complexity: High)
  - Implements: FR-004, FR-005, FR-008, FR-009, FR-015
  - Dependencies: Step 5
  - Verification: All variants work in both modes with proper rule enforcement
  - Files: `src/lib/move-validation.ts`, `src/lib/variant-engine.ts`

- **Step 8**: Rating system and skill tracking (Complexity: High)
  - Implements: FR-016, FR-017, FR-018, FR-019
  - Dependencies: Step 3, 5
  - Verification: Elo ratings calculate correctly, separate tracking per mode
  - Files: `src/lib/rating-system.ts`, `src/lib/matchmaking.ts`

### Phase 3: Tournament UI and Professional Interface (Complexity: High)
- **Step 9**: Tournament/Casual mode selection interface (Complexity: Medium)
  - Implements: FR-001, FR-002, FR-020
  - Dependencies: Step 1-2
  - Verification: Clear mode selection with rule explanations
  - Files: `src/components/GameModeSelector.tsx`, `src/components/VariantSelector.tsx`

- **Step 10**: Professional tournament board interface (Complexity: High)
  - Implements: FR-003, FR-020, FR-030
  - Dependencies: Step 5, 7
  - Verification: Tournament-grade board with notation panel, time controls, touch-move feedback
  - Files: `src/components/tournament/TournamentBoard.tsx`, `src/components/tournament/NotationPanel.tsx`

- **Step 11**: Time control system and clock interface (Complexity: Medium)
  - Implements: FR-010
  - Dependencies: Step 4
  - Verification: Professional chess clocks with increment, overtime handling
  - Files: `src/components/tournament/GameClock.tsx`, `src/components/TimeControlSelector.tsx`

- **Step 12**: Enhanced GameController for tournament features (Complexity: High)
  - Implements: FR-011, FR-012, FR-013, FR-021
  - Dependencies: Step 5-8
  - Verification: Full tournament rule enforcement, notation recording, draw detection
  - Files: `src/components/tournament/TournamentGameController.tsx`

- **Step 13**: Player rating and profile system UI (Complexity: Medium)
  - Implements: FR-016, FR-017, FR-018
  - Dependencies: Step 8
  - Verification: Rating displays, title system, separate casual/tournament tracking
  - Files: `src/components/profile/PlayerRating.tsx`, `src/components/profile/PlayerProfile.tsx`

### Phase 4: Tournament API and Advanced Features (Complexity: High)
- **Step 14**: Tournament and rating system tRPC APIs (Complexity: High)
  - Implements: FR-016, FR-017, FR-018, FR-019, FR-022
  - Dependencies: Step 3, 8
  - Verification: Tournament creation, rating updates, matchmaking work properly
  - Files: `src/server/api/routers/tournament.ts`, `src/server/api/routers/rating.ts`

- **Step 15**: Enhanced game persistence with tournament features (Complexity: Medium)
  - Implements: FR-006, FR-012, FR-022
  - Dependencies: Step 3, 5
  - Verification: Games save with notation, time data, tournament context
  - Files: Enhanced `src/server/api/routers/game.ts`

- **Step 16**: Educational and tutorial system (Complexity: High)
  - Implements: FR-025, FR-026, FR-029
  - Dependencies: Step 2, 7
  - Verification: Interactive tutorials work for each variant and mode
  - Files: `src/components/education/TutorialSystem.tsx`, `src/lib/tutorial-engine.ts`

- **Step 17**: Advanced AI with tournament-level play (Complexity: High)
  - Implements: FR-021
  - Dependencies: Step 7
  - Verification: AI adapts strategy per variant and difficulty level
  - Files: `src/lib/tournament-ai.ts`, enhanced AI system

- **Step 18**: Spectator mode and broadcasting features (Complexity: High)
  - Implements: FR-023, FR-031
  - Dependencies: Step 12, 14
  - Verification: Live game viewing, commentary features work
  - Files: `src/components/spectator/SpectatorMode.tsx`, `src/lib/broadcasting.ts`

### Phase 5: Advanced Tournament Features (Complexity: High)
- **Step 19**: Tournament bracket and pairing system (Complexity: High)
  - Implements: FR-032
  - Dependencies: Step 14
  - Verification: Swiss pairings, elimination brackets work correctly
  - Files: `src/lib/tournament-pairing.ts`, `src/components/tournament/TournamentBracket.tsx`

- **Step 20**: Post-game analysis and training tools (Complexity: High)
  - Implements: FR-027, FR-033
  - Dependencies: Step 16
  - Verification: Game analysis, tactical puzzles, training modes functional
  - Files: `src/components/analysis/GameAnalysis.tsx`, `src/lib/puzzle-engine.ts`

- **Step 21**: Historical database and opening integration (Complexity: Medium)
  - Implements: FR-026, FR-034
  - Dependencies: Step 6
  - Verification: Opening database works, historical games searchable
  - Files: `src/lib/opening-database.ts`, `src/components/database/GameDatabase.tsx`

### Phase 6: Testing and Deployment (Complexity: High)
- **Step 22**: Comprehensive tournament system testing (Complexity: High)
  - Implements: All FRs
  - Dependencies: All previous steps
  - Verification: >95% test coverage, WCDF compliance verified, performance benchmarks met
  - Files: Comprehensive test suites across all modules

- **Step 23**: Performance optimization and professional polish (Complexity: Medium)
  - Implements: FR-030, FR-031
  - Dependencies: All UI steps
  - Verification: Tournament-grade performance, professional appearance
  - Files: Performance optimizations across components

## Success Criteria

### Acceptance Tests - Game Modes
- [ ] Given a player selects "Casual Mode", when playing, then undo is available and hints are shown
- [ ] Given a player selects "Tournament Mode", when touching a piece, then touch-move rules are enforced
- [ ] Given a tournament game, when 40 moves pass without capture, then draw is offered
- [ ] Given a tournament game, when position repeats 3 times, then draw is declared
- [ ] Given a casual game, when time expires, then player gets extra time or game pauses
- [ ] Given a tournament game, when time expires, then game ends immediately

### Acceptance Tests - Professional Features
- [ ] Given American tournament mode, when game starts, then 3-Move Restriction opening is used
- [ ] Given any tournament game, when moves are made, then notation is recorded automatically
- [ ] Given a tournament game completion, when ratings are updated, then Elo changes correctly
- [ ] Given a player's rating, when viewing profile, then separate casual/tournament ratings are shown
- [ ] Given a high-rated tournament game, when spectators join, then they can view without affecting game
- [ ] Given WCDF rule compliance, when invalid moves are attempted, then they are rejected with explanation

### Acceptance Tests - Variant Compliance
- [ ] Given "American Checkers Tournament", when created, then WCDF-standard rules are enforced
- [ ] Given "International Draughts", when playing, then FMJD rules are followed exactly
- [ ] Given "Brazilian Draughts", when maximum capture is available, then it must be taken
- [ ] Given any variant, when kings are promoted, then promotion rules are variant-specific
- [ ] Given International Draughts, when piece promotes mid-jump, then jump sequence ends

### Acceptance Tests - Educational System
- [ ] Given a new player, when selecting a variant, then tutorial is offered
- [ ] Given variant differences, when explained, then clear visual demonstrations are provided
- [ ] Given opening theory, when accessed, then positions are set up correctly for study
- [ ] Given post-game analysis, when requested, then critical positions are highlighted

### Edge Cases - Professional Standards
- [ ] Handle tournament time control edge cases (overtime, disconnection)
- [ ] Handle rating system edge cases (new player, rating floor/ceiling)
- [ ] Handle tournament pairing edge cases (odd numbers, byes, withdrawals)
- [ ] Handle notation edge cases (ambiguous moves, special symbols)
- [ ] Handle spectator edge cases (reconnection, chat moderation)
- [ ] Handle opening database edge cases (position transpositions, move variations)
- [ ] Validate WCDF/FMJD compliance under all rule combinations
- [ ] Handle backward compatibility with existing games during schema migration

## Breaking Changes & Migration

### Impact on Existing Games
- **Low Impact**: Existing games use default "american" variant
- **Database**: Add new columns with defaults, no data loss
- **API**: Backward compatible tRPC procedures
- **UI**: Existing game interface remains functional

### Migration Strategy
1. **Database Migration**: Add variant columns with American defaults
2. **Code Migration**: Gradual refactoring with fallbacks to current logic
3. **User Migration**: Existing games automatically tagged as "American Checkers"
4. **Testing**: Extensive regression testing on existing game flows

### Backward Compatibility Plan
```typescript
// Migration compatibility layer
function getVariantForGame(game: Game): GameVariant {
  // Default to American Checkers for legacy games
  const variantId = game.variant ?? 'american';
  return getVariant(variantId);
}

// Gradual API updates with version detection  
if (game.version < 2) {
  // Use legacy game logic
  return legacyGameLogic(board, move);
} else {
  // Use variant-specific logic
  return variantGameLogic(board, move, game.variant);
}
```

## Testing Strategy

### Unit Tests (Required) - Professional Standards
- **WCDF/FMJD Compliance**: Test official rule implementation for each variant
- **Tournament Engine**: Test touch-move enforcement, draw detection, time controls
- **Rating System**: Test Elo calculations, title awarding, separate mode tracking
- **3-Move Restriction**: Test tournament opening system and position setup
- **Notation System**: Test algebraic notation recording and export
- **Time Control**: Test increment handling, overtime scenarios, clock synchronization
- **Opening Database**: Test position lookup, transposition handling
- **Rule Validation**: Test variant-specific move validation with edge cases
- **Maximum Capture**: Test Brazilian/International capture requirements
- **Draw Detection**: Test 40-move rule, repetition detection, insufficient material

### Integration Tests - Tournament System
- **Tournament Creation**: Test tournament setup with pairings and brackets
- **Game Flow**: Test complete tournament games with notation and rating updates
- **Spectator Mode**: Test live viewing without game interference
- **Broadcasting**: Test game streaming and commentary features
- **Education System**: Test tutorial flows and interactive learning
- **Matchmaking**: Test skill-based pairing algorithms
- **Profile System**: Test rating displays, achievement tracking
- **API Integration**: Test tRPC procedures for all tournament features

### Performance Tests - Professional Requirements
- **Tournament Load**: Test system under tournament conditions (100+ concurrent games)
- **Database Performance**: Test rating updates, game saves under load
- **Real-time Features**: Test spectator updates, live notation, clock synchronization
- **AI Performance**: Test tournament-strength AI response times
- **Memory Usage**: Test long tournament games and notation storage

### Compliance Tests - Standards Validation
- **WCDF Standards**: Verify American Checkers tournament compliance
- **FMJD Standards**: Verify International Draughts compliance
- **Brazilian Federation**: Verify Brazilian Draughts rule accuracy
- **Cross-Platform**: Test tournament features across browsers and devices
- **Accessibility**: Test tournament interfaces for screen readers and keyboard navigation

### Regression Tests - Backward Compatibility  
- **Legacy Games**: Ensure existing casual games continue working
- **API Compatibility**: Verify old clients can access basic features
- **Performance**: Ensure tournament features don't impact casual play
- **Database Migration**: Test smooth upgrade from existing schema
- **Rating Migration**: Test existing player data preservation

## Technical Notes
- Reference ticket: TICKET-002
- Related tickets: TICKET-001 (existing auth/testing infrastructure)
- Dependencies: T3 Stack (Next.js 15, tRPC, Prisma, Tailwind CSS)
- Database: SQLite with Prisma ORM
- Testing: Vitest with React Testing Library
- Naming conventions: PascalCase components, kebab-case utilities
- File structure follows established T3 Stack patterns
