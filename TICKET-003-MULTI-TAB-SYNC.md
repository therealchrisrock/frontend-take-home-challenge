# Feature: TICKET-003: Multi-Tab Game Synchronization

## Overview
Implement real-time game state synchronization across multiple browser tabs for the T3 Stack checkers game. This feature will maintain consistent game state when the same game is opened in multiple tabs, provide conflict resolution for simultaneous moves, and include visual indicators for the active tab. The solution leverages Next.js Server-Sent Events, tRPC subscriptions, and optimistic updates to create a seamless multi-tab experience while maintaining T3 Stack patterns and existing game architecture.

## User Stories

### Primary User Stories
- **As a player**, I want to open the same game in multiple tabs and see consistent game state across all tabs, so I can continue playing from any tab
- **As a player**, I want real-time updates when moves are made in any tab, so I don't have to manually refresh
- **As a player**, I want visual feedback showing which tab is "active" for making moves, so I understand interaction permissions
- **As a player**, I want the system to handle conflicts gracefully when I accidentally try to make moves in multiple tabs simultaneously

### Secondary User Stories
- **As a player**, I want the game to remain synchronized even if I temporarily lose network connection in one tab
- **As a player**, I want the game to recover gracefully if I close tabs or if my browser crashes
- **As a developer**, I want the multi-tab system to be testable and maintainable within the existing T3 Stack architecture

## Technical Architecture

### Real-Time Synchronization Strategy
The implementation uses a hybrid approach combining Server-Sent Events (SSE) for real-time updates and tRPC procedures for game mutations:

```typescript
// lib/multi-tab/sync-manager.ts
export class MultiTabSyncManager {
  private gameId: string;
  private tabId: string;
  private eventSource: EventSource | null = null;
  private isActiveTab: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(gameId: string) {
    this.gameId = gameId;
    this.tabId = generateTabId();
    this.setupTabVisibilityHandling();
    this.setupBeforeUnloadHandling();
  }

  async connect(): Promise<void> {
    // Establish SSE connection for real-time updates
    this.eventSource = new EventSource(`/api/game/${this.gameId}/stream?tabId=${this.tabId}`);
    
    // Register tab with server
    await this.registerTab();
    
    // Setup heartbeat to maintain active tab status
    this.startHeartbeat();
  }
}
```

### Server-Sent Events Implementation
```typescript
// app/api/game/[id]/stream/route.ts
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const gameId = params.id;
  const tabId = request.nextUrl.searchParams.get('tabId');
  
  if (!gameId || !tabId) {
    return new Response('Missing required parameters', { status: 400 });
  }

  const encoder = new TextEncoder();
  
  const customReadable = new ReadableStream({
    start(controller) {
      // Register tab and send initial game state
      gameSessionManager.addTab(gameId, tabId, {
        controller,
        lastSeen: new Date(),
      });

      // Send initial state
      const gameState = await getGameState(gameId);
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'INITIAL_STATE',
        payload: gameState
      })}\n\n`));
    },
    
    cancel() {
      gameSessionManager.removeTab(gameId, tabId);
    }
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### Tab Management System
```typescript
// lib/multi-tab/session-manager.ts
export interface TabSession {
  id: string;
  controller: ReadableStreamDefaultController;
  lastSeen: Date;
  isActive: boolean;
}

export interface GameSession {
  gameId: string;
  tabs: Map<string, TabSession>;
  activeTabId: string | null;
  lastMove: Date;
}

export class GameSessionManager {
  private sessions = new Map<string, GameSession>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup inactive tabs every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveTabs();
    }, 30000);
  }

  addTab(gameId: string, tabId: string, session: Omit<TabSession, 'id' | 'isActive'>): void {
    if (!this.sessions.has(gameId)) {
      this.sessions.set(gameId, {
        gameId,
        tabs: new Map(),
        activeTabId: null,
        lastMove: new Date()
      });
    }

    const gameSession = this.sessions.get(gameId)!;
    const isFirstTab = gameSession.tabs.size === 0;
    
    gameSession.tabs.set(tabId, {
      id: tabId,
      isActive: isFirstTab,
      ...session
    });

    // Set as active if first tab
    if (isFirstTab) {
      gameSession.activeTabId = tabId;
    }

    // Broadcast tab status update to all tabs
    this.broadcastToTabs(gameId, {
      type: 'TAB_STATUS_UPDATE',
      payload: {
        activeTabId: gameSession.activeTabId,
        totalTabs: gameSession.tabs.size
      }
    });
  }
}
```

## API Design (tRPC)

### Enhanced Game Router Procedures
```typescript
// server/api/routers/game.ts - Enhanced for multi-tab support
export const gameRouter = createTRPCRouter({
  // ... existing procedures

  makeMove: publicProcedure
    .input(z.object({
      gameId: z.string(),
      move: MoveSchema,
      tabId: z.string(),
      optimisticMoveId: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate tab is active for this game
      const isActiveTab = await gameSessionManager.isActiveTab(input.gameId, input.tabId);
      if (!isActiveTab) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the active tab can make moves'
        });
      }

      // Apply move with optimistic update handling
      const result = await applyMoveToGame(ctx.db, input.gameId, input.move);
      
      // Broadcast move to all tabs
      gameSessionManager.broadcastToTabs(input.gameId, {
        type: 'MOVE_APPLIED',
        payload: {
          move: input.move,
          newGameState: result.gameState,
          optimisticMoveId: input.optimisticMoveId
        }
      });

      return result;
    }),

  requestTabActivation: publicProcedure
    .input(z.object({
      gameId: z.string(),
      tabId: z.string()
    }))
    .mutation(async ({ input }) => {
      const success = await gameSessionManager.setActiveTab(input.gameId, input.tabId);
      
      if (success) {
        // Broadcast active tab change
        gameSessionManager.broadcastToTabs(input.gameId, {
          type: 'ACTIVE_TAB_CHANGED',
          payload: { activeTabId: input.tabId }
        });
      }

      return { success };
    }),

  getTabStatus: publicProcedure
    .input(z.object({
      gameId: z.string(),
      tabId: z.string()
    }))
    .query(async ({ input }) => {
      const gameSession = gameSessionManager.getSession(input.gameId);
      if (!gameSession) {
        return { isActive: true, totalTabs: 1 };
      }

      return {
        isActive: gameSession.activeTabId === input.tabId,
        totalTabs: gameSession.tabs.size,
        activeTabId: gameSession.activeTabId
      };
    }),

  heartbeat: publicProcedure
    .input(z.object({
      gameId: z.string(),
      tabId: z.string()
    }))
    .mutation(async ({ input }) => {
      await gameSessionManager.updateTabHeartbeat(input.gameId, input.tabId);
      return { success: true };
    })
});
```

### Subscription-Based Updates (Alternative Approach)
```typescript
// server/api/routers/game-subscriptions.ts
export const gameSubscriptionRouter = createTRPCRouter({
  onGameUpdate: publicProcedure
    .input(z.object({
      gameId: z.string(),
      tabId: z.string()
    }))
    .subscription(async function* ({ input }) {
      // Alternative: Use tRPC subscriptions with WebSockets
      const gameStream = gameEventEmitter.subscribe(input.gameId);
      
      try {
        for await (const event of gameStream) {
          yield {
            type: event.type,
            payload: event.payload,
            timestamp: new Date().toISOString()
          };
        }
      } finally {
        gameEventEmitter.unsubscribe(input.gameId, input.tabId);
      }
    })
});
```

## Database Schema Considerations

### Game State Versioning
```sql
-- prisma/schema.prisma enhancements
model Game {
  // ... existing fields
  version       Int       @default(1)     // For optimistic locking
  lastUpdated   DateTime  @updatedAt      // Automatic timestamp updates
  syncMetadata  String?                   // JSON for sync-specific data
}

model GameEvent {
  id            String    @id @default(cuid())
  gameId        String
  eventType     String                    // 'MOVE', 'TAB_ACTIVATED', 'TAB_CLOSED'
  eventData     String                    // JSON event payload
  tabId         String?                   // Which tab triggered the event
  createdAt     DateTime  @default(now())
  
  game          Game      @relation(fields: [gameId], references: [id], onDelete: Cascade)

  @@index([gameId, createdAt])
}
```

### Conflict Resolution Strategy
```typescript
// lib/conflict-resolution.ts
export interface ConflictResolution {
  strategy: 'last-write-wins' | 'first-write-wins' | 'merge' | 'reject';
  winningMove?: Move;
  rejectedMoves?: Move[];
}

export async function resolveMoveConflict(
  gameId: string,
  conflictingMoves: Array<{ move: Move; tabId: string; timestamp: Date }>
): Promise<ConflictResolution> {
  // Sort by timestamp - first move wins
  const sortedMoves = conflictingMoves.sort((a, b) => 
    a.timestamp.getTime() - b.timestamp.getTime()
  );

  const [winningMove, ...rejectedMoves] = sortedMoves;

  return {
    strategy: 'first-write-wins',
    winningMove: winningMove.move,
    rejectedMoves: rejectedMoves.map(m => m.move)
  };
}
```

## Functional Requirements

### Must Have
- FR-001: Real-time game state synchronization across multiple tabs using Server-Sent Events
- FR-002: Active tab designation system with visual indicators in the UI
- FR-003: Conflict resolution for simultaneous moves using first-write-wins strategy
- FR-004: Tab heartbeat system to maintain active sessions and cleanup inactive tabs
- FR-005: Optimistic updates with rollback capability for failed moves
- FR-006: Integration with existing tRPC game procedures for seamless functionality
- FR-007: Database versioning to support optimistic locking and conflict detection
- FR-008: Error handling for network disconnections and tab crashes
- FR-009: Compatibility with existing game variants (American Checkers, Brazilian Draughts, International Draughts)

### Should Have  
- FR-010: Tab activation request system allowing users to switch active tab manually
- FR-011: Game event logging for debugging and analytics
- FR-012: Performance optimization for games with many simultaneous tabs
- FR-013: Graceful degradation when SSE is not available (fallback to polling)
- FR-014: Visual feedback for network connectivity status per tab
- FR-015: Automatic cleanup of abandoned game sessions

### Nice to Have
- FR-016: Tab synchronization across different browsers (same user)
- FR-017: Spectator mode for non-active tabs with read-only access
- FR-018: Multi-tab game statistics and performance metrics
- FR-019: Advanced conflict resolution strategies (merge, user choice)
- FR-020: WebSocket fallback for enhanced real-time performance

## Implementation Plan

### Phase 1: Foundation (Complexity: Medium)
- **Step 1**: Create multi-tab infrastructure types and utilities (Complexity: Simple)
  - Implements: FR-001, FR-002
  - Verification: TypeScript compilation succeeds, sync manager interfaces are defined
  - Files: `src/lib/multi-tab/types.ts`, `src/lib/multi-tab/sync-manager.ts`

- **Step 2**: Implement Server-Sent Events endpoint (Complexity: Medium)  
  - Implements: FR-001, FR-004
  - Dependencies: Step 1
  - Verification: SSE endpoint streams game updates correctly to connected tabs
  - Files: `src/app/api/game/[id]/stream/route.ts`

- **Step 3**: Create game session manager for tab coordination (Complexity: Medium)
  - Implements: FR-002, FR-004, FR-015
  - Dependencies: Step 1
  - Verification: Tab registration, activation, and cleanup work correctly
  - Files: `src/lib/multi-tab/session-manager.ts`

### Phase 2: Core Synchronization (Complexity: High)
- **Step 4**: Enhance tRPC game procedures for multi-tab support (Complexity: High)
  - Implements: FR-003, FR-006, FR-007
  - Dependencies: Step 1-3
  - Verification: Moves are synchronized across tabs with conflict resolution
  - Files: Enhanced `src/server/api/routers/game.ts`

- **Step 5**: Implement optimistic updates with rollback (Complexity: High)
  - Implements: FR-005, FR-008
  - Dependencies: Step 4
  - Verification: Failed moves roll back gracefully, successful moves sync immediately
  - Files: `src/lib/optimistic-updates.ts`, enhanced game components

- **Step 6**: Add database schema for versioning and event logging (Complexity: Medium)
  - Implements: FR-007, FR-011
  - Dependencies: Step 4
  - Verification: Database migration succeeds, version conflicts are detected
  - Files: `prisma/schema.prisma`, migration files

### Phase 3: UI Integration (Complexity: Medium)
- **Step 7**: Update GameController for multi-tab awareness (Complexity: Medium)
  - Implements: FR-002, FR-005
  - Dependencies: Step 5
  - Verification: Game controller handles tab states and optimistic updates
  - Files: Enhanced `src/components/GameController.tsx`

- **Step 8**: Add visual indicators for active tab status (Complexity: Simple)
  - Implements: FR-002, FR-010
  - Dependencies: Step 7
  - Verification: Users can identify active tab and request activation
  - Files: `src/components/TabStatusIndicator.tsx`, UI component updates

- **Step 9**: Implement tab activation request UI (Complexity: Simple)
  - Implements: FR-010
  - Dependencies: Step 8
  - Verification: Users can switch active tab through UI interaction
  - Files: Enhanced game UI components

### Phase 4: Error Handling & Resilience (Complexity: Medium)
- **Step 10**: Implement network error handling and reconnection (Complexity: Medium)
  - Implements: FR-008, FR-014
  - Dependencies: Step 5
  - Verification: Tabs reconnect automatically after network interruptions
  - Files: Enhanced sync manager, connection status components

- **Step 11**: Add fallback polling for unsupported browsers (Complexity: Medium)
  - Implements: FR-013
  - Dependencies: Step 10
  - Verification: Game sync works even without SSE support
  - Files: `src/lib/multi-tab/polling-fallback.ts`

- **Step 12**: Implement comprehensive conflict resolution (Complexity: High)
  - Implements: FR-003, FR-019
  - Dependencies: Step 6
  - Verification: All conflict scenarios are handled gracefully
  - Files: `src/lib/conflict-resolution.ts`

### Phase 5: Performance & Polish (Complexity: Medium)
- **Step 13**: Optimize performance for multiple concurrent tabs (Complexity: Medium)
  - Implements: FR-012, FR-018
  - Dependencies: All previous steps
  - Verification: System performs well with 5+ tabs per game
  - Files: Performance optimizations across sync system

- **Step 14**: Comprehensive testing suite for multi-tab scenarios (Complexity: High)
  - Implements: All FRs
  - Dependencies: All previous steps
  - Verification: Test coverage >85% for multi-tab logic, E2E tests pass
  - Files: `src/lib/multi-tab/*.test.ts`, E2E test files

- **Step 15**: Documentation and monitoring setup (Complexity: Simple)
  - Implements: FR-011, FR-018
  - Dependencies: Step 14
  - Verification: Multi-tab system is documented and monitorable
  - Files: Documentation updates, monitoring setup

## Error Handling and Edge Cases

### Network Disconnection Scenarios
```typescript
// lib/multi-tab/connection-manager.ts
export class ConnectionManager {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  async handleDisconnection(): Promise<void> {
    while (this.reconnectAttempts < this.maxReconnectAttempts) {
      try {
        await this.attemptReconnection();
        this.onReconnectionSuccess();
        break;
      } catch (error) {
        this.reconnectAttempts++;
        this.reconnectDelay *= 2; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
      }
    }
  }

  private async attemptReconnection(): Promise<void> {
    // Attempt to restore SSE connection
    // Resync game state
    // Update UI connection status
  }
}
```

### Tab Lifecycle Management
- **Tab Closing**: Automatic cleanup of tab sessions using `beforeunload` event
- **Browser Crashes**: Server-side cleanup based on heartbeat timeouts
- **Network Partition**: Graceful degradation with offline indicators
- **Simultaneous Moves**: First-write-wins resolution with user feedback
- **State Desynchronization**: Periodic state validation and resync

## Success Criteria

### Acceptance Tests
- [ ] Given a game open in multiple tabs, when a move is made in one tab, then all other tabs update within 500ms
- [ ] Given multiple tabs with the same game, when only one tab is active, then moves can only be made in the active tab
- [ ] Given simultaneous moves in different tabs, when conflicts occur, then first-write-wins resolution applies
- [ ] Given a tab loses network connection, when reconnected, then game state synchronizes correctly
- [ ] Given a user closes a tab, when other tabs remain open, then one becomes active automatically
- [ ] Verify that optimistic updates provide immediate feedback and roll back on conflicts
- [ ] Verify that tab status indicators clearly show which tab is active
- [ ] Verify that the system handles 5+ simultaneous tabs without performance degradation

### Edge Cases
- [ ] Handle rapid successive moves across different tabs
- [ ] Handle server restart while multiple tabs are connected
- [ ] Handle browser refresh in active tab (maintain game state)
- [ ] Handle switch between tabs during AI move calculation
- [ ] Handle tab reactivation after extended inactivity
- [ ] Handle malformed SSE messages gracefully
- [ ] Handle database version conflicts during concurrent updates
- [ ] Handle SSE connection limits (browser/server)

## Testing Strategy

### Unit Tests (Required)
- **Sync Manager**: Test tab registration, activation, and cleanup logic
- **Session Manager**: Test game session lifecycle and tab coordination
- **Conflict Resolution**: Test various conflict scenarios and resolution strategies
- **Optimistic Updates**: Test update application and rollback mechanisms
- **Connection Manager**: Test reconnection logic and error handling
- **SSE Handler**: Test event stream creation and message broadcasting

### Integration Tests
- **tRPC Procedures**: Test enhanced game procedures with multi-tab inputs
- **Database Operations**: Test versioning and conflict detection
- **Event Broadcasting**: Test message delivery to multiple connected tabs
- **State Synchronization**: Test game state consistency across tabs

### E2E Tests (Critical)
- **Multi-Tab Game Flow**: Complete game with moves across different tabs
- **Tab Activation**: Test manual and automatic tab activation scenarios
- **Network Resilience**: Test disconnect/reconnect scenarios
- **Conflict Resolution**: Test simultaneous moves and resolution feedback
- **Performance**: Test system performance with multiple concurrent tabs

### Load Testing
- **Concurrent Tabs**: Test system with 20+ tabs across multiple games
- **SSE Connections**: Test server limits and connection handling
- **Message Broadcasting**: Test message delivery performance at scale

## Security and Performance Considerations

### Security Measures
- **Tab Validation**: Verify tab ownership before allowing moves
- **Rate Limiting**: Prevent abuse of SSE connections and move requests
- **Input Sanitization**: Validate all game moves and tab operations
- **Session Security**: Prevent session hijacking across tabs
- **CSRF Protection**: Maintain CSRF protection for game mutations

### Performance Optimizations
- **Message Batching**: Batch multiple game updates into single SSE messages
- **Connection Pooling**: Efficient management of SSE connections
- **Memory Management**: Cleanup inactive sessions and prevent memory leaks
- **Database Optimization**: Efficient queries for game state and versioning
- **Client-Side Caching**: Cache game state to reduce server requests

### Monitoring and Analytics
```typescript
// lib/monitoring/multi-tab-metrics.ts
export interface MultiTabMetrics {
  activeGames: number;
  totalTabs: number;
  averageTabsPerGame: number;
  connectionErrors: number;
  conflictResolutions: number;
  messageDeliveryLatency: number[];
}

export class MultiTabMonitoring {
  async recordTabConnection(gameId: string, tabId: string): Promise<void> {
    // Record connection metrics
  }

  async recordMoveConflict(gameId: string, resolutionStrategy: string): Promise<void> {
    // Record conflict resolution metrics
  }
}
```

## Technical Notes
- Reference ticket: TICKET-003
- Related tickets: TICKET-001 (auth infrastructure), TICKET-002 (game variants compatibility)
- Dependencies: T3 Stack (Next.js 15, tRPC, Prisma, Tailwind CSS)
- Real-time Technology: Server-Sent Events with tRPC fallback
- Database: Enhanced schema with versioning and event logging
- Testing: Vitest with multi-tab E2E scenarios
- Performance Target: <500ms synchronization latency, support for 10+ concurrent tabs per game
- Browser Compatibility: Modern browsers with SSE support, graceful degradation for others
- Naming Conventions: PascalCase components, kebab-case utilities following T3 Stack patterns
