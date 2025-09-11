# Test Strategy: Play with a Friend - Multiplayer Checkers System

**Document ID**: TP-729e-20250911123909--multiplayer-test-strategy
**Project UUID**: 729e
**Source Document**: TM-729e-20250911122526--play-with-friend-tasks.md
**Related Docs**:
- Task Breakdown: TM-729e-20250911122526--play-with-friend-tasks.md
- Implementation: BE-{UUID}, FE-{UUID} (when created)
**Created By**: test-planner
**Created At**: 2025-09-11 12:39:09 UTC

---

## Test Overview

### Objectives

- Validate real-time multiplayer game synchronization with offline support
- Ensure robust game invitation system using existing notification infrastructure
- Verify guest session management and URL-based game access
- Test board orientation and spectator functionality
- Validate connection handling during network disruptions
- Ensure proper move permission gating and authorization

### Scope

**In scope**: 
- Game invitation flow via existing `GAME_INVITE` notifications
- Real-time move synchronization with SSE + IndexedDB offline sync
- Guest session management with localStorage/IndexedDB
- Board orientation per player (their color at bottom)
- Spectator system with read-only access
- Connection status tracking and ping display
- Offline move queuing and reconnection sync
- Move permission gating (players vs spectators)
- Guest-to-account conversion flow

**Out of scope**: 
- Existing notification system testing (already implemented)
- Basic checkers game logic (already tested)
- Friend request system (separate feature)
- Authentication system testing

**Assumptions**:
- Existing notification system (`GAME_INVITE` type) is functional
- SSE streaming endpoint `/api/notifications/stream` is operational
- Friend request system provides user selection
- IndexedDB is supported in target browsers

## Test Matrix

| Component                    | Unit Tests | Integration | E2E      | Performance |
| ---------------------------- | ---------- | ----------- | -------- | ----------- |
| Game Invitation System      | Required   | Required    | Required | N/A         |
| Real-time Sync (SSE)        | Required   | Required    | Required | Required    |
| IndexedDB Offline Storage    | Required   | Required    | Optional | Required    |
| Guest Session Management    | Required   | Required    | Required | N/A         |
| Board Orientation            | Required   | Optional    | Required | N/A         |
| Spectator System            | Required   | Required    | Required | N/A         |
| Connection Status Tracking  | Required   | Required    | Required | Required    |
| Move Permission Gating      | Required   | Required    | Required | N/A         |

## Test Specifications by Task Group

### Section 1: Enhanced Game Invitation System Tests

#### 1.1 Unit Tests

##### Test Suite: Game Invitation tRPC Procedures

```typescript
describe("Game Invitation System", () => {
  describe("createGameInvitation", () => {
    it("should create invitation with valid friend selection", async () => {
      // Test specification:
      // - Input: { friendId: "valid-friend-id", gameConfig: {...} }
      // - Expected: Returns invitation with shareable URL
      // - Assertions: Invitation stored, notification sent, URL generated
      
      const mockInput = {
        friendId: "friend-123",
        gameConfig: { timeLimit: 300, variant: "standard" }
      };
      
      const result = await caller.gameInvite.create(mockInput);
      
      expect(result).toMatchObject({
        inviteId: expect.any(String),
        inviteUrl: expect.stringContaining('/game/invite/'),
        expiresAt: expect.any(Date)
      });
    });

    it("should handle invalid friend ID gracefully", async () => {
      const mockInput = {
        friendId: "invalid-friend",
        gameConfig: { timeLimit: 300 }
      };
      
      await expect(caller.gameInvite.create(mockInput)).rejects.toThrow("Friend not found");
    });

    it("should prevent duplicate active invitations", async () => {
      // Create first invitation
      await caller.gameInvite.create({ friendId: "friend-123", gameConfig: {} });
      
      // Attempt duplicate
      await expect(
        caller.gameInvite.create({ friendId: "friend-123", gameConfig: {} })
      ).rejects.toThrow("Active invitation already exists");
    });
  });

  describe("redeemInvitation", () => {
    it("should allow valid invitation redemption", async () => {
      const invitation = await createTestInvitation();
      
      const result = await caller.gameInvite.redeem({
        inviteId: invitation.inviteId,
        guestInfo: { displayName: "Guest Player" }
      });
      
      expect(result.gameId).toBeDefined();
      expect(result.playerRole).toBe("PLAYER_2");
    });

    it("should reject expired invitations", async () => {
      const expiredInvite = await createExpiredInvitation();
      
      await expect(
        caller.gameInvite.redeem({ inviteId: expiredInvite.inviteId })
      ).rejects.toThrow("Invitation expired");
    });
  });
});
```

**Test Data Requirements**:
- Valid friend relationships with various user types
- Expired and active invitation fixtures  
- Guest session data with localStorage simulation
- Game configuration variations (time limits, variants)

**Mocking Requirements**:
- Mock notification service: Verify `GAME_INVITE` notifications sent
- Mock URL generation: Test shareable link format
- Mock database: Isolate invitation CRUD operations

#### 1.2 Integration Tests

##### Test Scenario: Complete Invitation Flow

**Objective**: Verify invitation creation, notification delivery, and redemption work together

**Setup**:
1. Create test user accounts (host and friend)
2. Establish friend relationship
3. Initialize notification system mock
4. Prepare IndexedDB test environment

**Test Flow**:
1. Host creates game invitation ’ Verify invitation stored in database
2. System sends notification ’ Verify `GAME_INVITE` notification queued
3. Notification delivered to friend ’ Verify SSE stream receives event  
4. Friend redeems invitation ’ Verify game session created
5. Both users navigate to game ’ Verify proper role assignment

**Cleanup**:
- Remove test invitations and games
- Clear notification queue
- Reset IndexedDB test data

#### 1.3 End-to-End Tests

##### User Journey: Friend Game Invitation via UI

**Scenario**: As a logged-in user, I want to invite a friend to play checkers so that we can compete in real-time

**Test Steps**:
1. Navigate to game creation screen
2. Select friend from friend list (verify pre-selection via `?username=X` works)
3. Configure game settings (time limit, variant)
4. Click "Send Invitation" button
5. Verify invitation sent confirmation and shareable URL generated
6. Copy invitation link to clipboard
7. Open link in incognito window (guest session)
8. Accept invitation as guest user
9. Verify both players navigate to active game
10. Confirm proper board orientation for each player

**Assertions**:
- Friend receives notification in real-time
- Shareable URL contains valid invite ID
- Guest can access game without authentication
- Host sees "ready state" UI while waiting
- Both players see game board with their color at bottom
- Move permissions correctly assigned to both players

### Section 2: Real-time Game Synchronization Tests

#### 2.1 Unit Tests

##### Test Suite: IndexedDB Offline Storage

```typescript
describe("IndexedDB Game Sync", () => {
  describe("queueOfflineMove", () => {
    it("should store move when offline", async () => {
      const gameSync = new GameSyncManager();
      await gameSync.setOffline(true);
      
      const move = { from: [2, 1], to: [3, 2], timestamp: Date.now() };
      await gameSync.queueMove("game-123", move);
      
      const queuedMoves = await gameSync.getQueuedMoves("game-123");
      expect(queuedMoves).toHaveLength(1);
      expect(queuedMoves[0]).toMatchObject(move);
    });

    it("should maintain move order in queue", async () => {
      const gameSync = new GameSyncManager();
      const moves = [
        { from: [2, 1], to: [3, 2], sequence: 1 },
        { from: [5, 2], to: [4, 3], sequence: 2 },
        { from: [3, 2], to: [5, 4], sequence: 3 }
      ];
      
      for (const move of moves) {
        await gameSync.queueMove("game-123", move);
      }
      
      const queuedMoves = await gameSync.getQueuedMoves("game-123");
      expect(queuedMoves.map(m => m.sequence)).toEqual([1, 2, 3]);
    });
  });

  describe("syncOnReconnect", () => {
    it("should replay queued moves on reconnection", async () => {
      const gameSync = new GameSyncManager();
      const mockTrpc = jest.fn();
      
      // Queue moves while offline
      await gameSync.setOffline(true);
      await gameSync.queueMove("game-123", { from: [2, 1], to: [3, 2] });
      await gameSync.queueMove("game-123", { from: [5, 2], to: [4, 3] });
      
      // Reconnect and sync
      await gameSync.setOffline(false);
      await gameSync.syncGame("game-123", mockTrpc);
      
      expect(mockTrpc).toHaveBeenCalledTimes(2);
      expect(await gameSync.getQueuedMoves("game-123")).toHaveLength(0);
    });
  });
});
```

##### Test Suite: SSE Game Event Handling

```typescript
describe("SSE Game Events", () => {
  describe("handleGameMoveEvent", () => {
    it("should update game state on opponent move", () => {
      const gameState = createTestGameState();
      const moveEvent = {
        type: 'GAME_MOVE',
        gameId: 'game-123',
        move: { from: [2, 1], to: [3, 2] },
        playerColor: 'BLACK',
        timestamp: Date.now()
      };
      
      const newState = handleGameEvent(gameState, moveEvent);
      
      expect(newState.board[3][2]).toEqual({ color: 'BLACK', type: 'regular' });
      expect(newState.board[2][1]).toBeNull();
      expect(newState.currentPlayer).toBe('RED');
    });

    it("should handle move conflicts with server authority", () => {
      const gameState = createTestGameState();
      const conflictingMove = {
        type: 'GAME_MOVE_CONFLICT',
        gameId: 'game-123',
        serverGameState: createServerAuthorityState(),
        conflictedMoveId: 'local-move-123'
      };
      
      const newState = handleGameEvent(gameState, conflictingMove);
      
      expect(newState).toEqual(conflictingMove.serverGameState);
      expect(newState.conflictResolved).toBe(true);
    });
  });
});
```

#### 2.2 Integration Tests

##### Test Scenario: Real-time Move Synchronization

**Objective**: Verify moves synchronize between players in real-time with proper conflict resolution

**Setup**:
1. Create multiplayer game session with two connected players
2. Initialize SSE connections for both players
3. Set up IndexedDB for offline storage
4. Mock network conditions (online/offline/slow)

**Test Flow**:
1. Player 1 makes valid move ’ Verify move sent via SSE to Player 2
2. Player 2 receives move event ’ Verify board state updated locally
3. Player 2 makes counter move ’ Verify synchronization back to Player 1
4. Simulate network interruption ’ Verify moves queue in IndexedDB
5. Restore connection ’ Verify queued moves sync properly
6. Test simultaneous moves ’ Verify server-authoritative conflict resolution

**Performance Requirements**:
- Move synchronization completes within 200ms under normal conditions
- Offline moves queue without data loss
- Reconnection sync completes within 2 seconds
- No memory leaks in long-running games

##### Test Scenario: Connection Status Tracking

**Objective**: Verify real-time connection status and ping display

**Test Flow**:
1. Establish game with connection monitoring
2. Track ping/latency between players
3. Simulate various network conditions
4. Verify UI updates reflect connection status
5. Test reconnection handling

**Assertions**:
- Connection status updates within 1 second of changes
- Ping values displayed accurately (±50ms tolerance)
- Disconnected players shown clearly in UI
- Games continue during temporary disconnections

### Section 3: Guest Session Management Tests

#### 3.1 Unit Tests

##### Test Suite: Guest Session Storage

```typescript
describe("Guest Session Management", () => {
  describe("createGuestSession", () => {
    it("should generate unique guest ID and store in localStorage", () => {
      const guestManager = new GuestSessionManager();
      const session = guestManager.createGuestSession("Test Player");
      
      expect(session.guestId).toMatch(/^guest_[a-zA-Z0-9]{12}$/);
      expect(session.displayName).toBe("Test Player");
      expect(localStorage.getItem('checkers_guest_session')).toContain(session.guestId);
    });

    it("should restore existing guest session", () => {
      const existingSession = { guestId: "guest_abc123", displayName: "Existing Guest" };
      localStorage.setItem('checkers_guest_session', JSON.stringify(existingSession));
      
      const guestManager = new GuestSessionManager();
      const session = guestManager.getGuestSession();
      
      expect(session).toEqual(existingSession);
    });
  });

  describe("persistGuestGameHistory", () => {
    it("should store completed games for guest users", async () => {
      const guestManager = new GuestSessionManager();
      const gameResult = {
        gameId: "game-123",
        opponent: "Friend User",
        result: "WIN",
        completedAt: new Date()
      };
      
      await guestManager.persistGameHistory("guest_abc123", gameResult);
      
      const history = await guestManager.getGuestGameHistory("guest_abc123");
      expect(history).toContain(gameResult);
    });
  });
});
```

#### 3.2 Integration Tests

##### Test Scenario: Guest Invitation Redemption Flow

**Objective**: Verify guests can redeem invitations and participate in games

**Setup**:
1. Create game invitation from registered user
2. Generate shareable invitation URL
3. Clear browser state to simulate new guest
4. Initialize guest session storage

**Test Flow**:
1. Access invitation URL as guest ’ Verify guest session created
2. Enter display name ’ Verify guest identity stored in localStorage  
3. Redeem invitation ’ Verify game session created with guest as Player 2
4. Play partial game ’ Verify guest moves synchronized properly
5. Complete or abandon game ’ Verify guest game history persisted
6. Navigate to account creation ’ Verify guest data available for conversion

**Cleanup**:
- Clear guest session data
- Remove test game records
- Reset localStorage state

### Section 4: Board Orientation & Spectator System Tests

#### 4.1 Unit Tests

##### Test Suite: Board Orientation Logic

```typescript
describe("Board Orientation", () => {
  describe("calculateBoardRotation", () => {
    it("should show red pieces at bottom for red player", () => {
      const playerRole = "PLAYER_1"; // Red player
      const gameState = createTestGameState();
      
      const orientation = calculateBoardOrientation(gameState, playerRole);
      
      expect(orientation.playerColor).toBe("RED");
      expect(orientation.rotated).toBe(false);
      expect(orientation.bottomRows).toEqual([0, 1, 2]); // Red starting rows at bottom
    });

    it("should show black pieces at bottom for black player", () => {
      const playerRole = "PLAYER_2"; // Black player  
      const gameState = createTestGameState();
      
      const orientation = calculateBoardOrientation(gameState, playerRole);
      
      expect(orientation.playerColor).toBe("BLACK");
      expect(orientation.rotated).toBe(true);
      expect(orientation.bottomRows).toEqual([5, 6, 7]); // Black starting rows at bottom (rotated view)
    });

    it("should maintain orientation during gameplay", () => {
      const gameState = createMidGameState();
      const orientation1 = calculateBoardOrientation(gameState, "PLAYER_1");
      const orientation2 = calculateBoardOrientation(gameState, "PLAYER_2");
      
      expect(orientation1.rotated).toBe(false);
      expect(orientation2.rotated).toBe(true);
    });
  });
});
```

##### Test Suite: Spectator Access Control

```typescript
describe("Spectator System", () => {
  describe("canMakeMove", () => {
    it("should allow registered players to make moves", () => {
      const gameState = {
        player1Id: "user-123",
        player2Id: "user-456",
        currentPlayer: "RED"
      };
      
      expect(canMakeMove(gameState, "user-123", "RED")).toBe(true);
      expect(canMakeMove(gameState, "user-456", "BLACK")).toBe(true);
    });

    it("should prevent spectators from making moves", () => {
      const gameState = {
        player1Id: "user-123", 
        player2Id: "user-456",
        currentPlayer: "RED"
      };
      
      expect(canMakeMove(gameState, "spectator-789", "RED")).toBe(false);
      expect(canMakeMove(gameState, "guest_abc123", "BLACK")).toBe(false);
    });

    it("should prevent moves when not player's turn", () => {
      const gameState = {
        player1Id: "user-123",
        player2Id: "user-456", 
        currentPlayer: "RED"
      };
      
      expect(canMakeMove(gameState, "user-456", "BLACK")).toBe(false); // Black's turn but current is RED
    });
  });

  describe("getPlayerRole", () => {
    it("should identify player roles correctly", () => {
      const gameState = {
        player1Id: "user-123",
        player2Id: "guest_abc456"
      };
      
      expect(getPlayerRole(gameState, "user-123")).toBe("PLAYER_1");
      expect(getPlayerRole(gameState, "guest_abc456")).toBe("PLAYER_2");
      expect(getPlayerRole(gameState, "spectator-789")).toBe("SPECTATOR");
    });
  });
});
```

#### 4.2 End-to-End Tests

##### User Journey: Spectator Experience

**Scenario**: As a spectator, I want to watch an ongoing game without interfering so I can learn from other players

**Test Steps**:
1. Access shareable game URL as non-participant
2. Verify game board displays in read-only mode
3. Attempt to interact with pieces (should be prevented)
4. Observe real-time move updates from actual players
5. Verify spectator status clearly indicated in UI
6. Test multiple spectators viewing simultaneously

**Assertions**:
- Board shows current game state accurately
- Pieces cannot be selected or moved by spectators
- Move animations play for spectators in real-time
- Spectator count and status displayed clearly
- No move permission errors shown to spectators
- Multiple spectators don't interfere with each other

### Section 5: Connection Handling & Performance Tests

#### 5.1 Unit Tests  

##### Test Suite: Connection Recovery

```typescript
describe("Connection Recovery", () => {
  describe("handleDisconnection", () => {
    it("should queue moves during disconnection", async () => {
      const connectionManager = new ConnectionManager();
      const moveQueue = [];
      
      connectionManager.onDisconnect(() => {
        connectionManager.setOfflineMode(true);
      });
      
      await connectionManager.simulateDisconnection();
      
      const move = { from: [2, 1], to: [3, 2] };
      await connectionManager.queueMove(move);
      
      expect(connectionManager.getQueuedMoves()).toContain(move);
    });

    it("should maintain game state during disconnection", () => {
      const gameState = createTestGameState();
      const connectionManager = new ConnectionManager(gameState);
      
      connectionManager.handleDisconnection();
      
      expect(connectionManager.getGameState()).toEqual(gameState);
      expect(connectionManager.isOffline()).toBe(true);
    });
  });

  describe("reconnectAndSync", () => {
    it("should sync queued moves on reconnection", async () => {
      const connectionManager = new ConnectionManager();
      const mockSyncFn = jest.fn();
      
      // Queue moves while offline
      await connectionManager.setOfflineMode(true);
      await connectionManager.queueMove({ from: [2, 1], to: [3, 2] });
      await connectionManager.queueMove({ from: [5, 2], to: [4, 3] });
      
      // Reconnect
      await connectionManager.reconnect(mockSyncFn);
      
      expect(mockSyncFn).toHaveBeenCalledTimes(2);
      expect(connectionManager.getQueuedMoves()).toHaveLength(0);
    });
  });
});
```

#### 5.2 Performance Testing

##### Load Testing: Concurrent Multiplayer Games

**Target**: 100 simultaneous games (200 active players)
**Duration**: 10 minutes sustained load
**Success Criteria**:
- Move synchronization < 200ms for 95th percentile
- SSE connection success rate > 99%
- No memory leaks in IndexedDB storage
- CPU usage < 70% on test server

##### Test Configuration:
```javascript
// Performance test setup
const loadTest = {
  concurrent_games: 100,
  moves_per_minute: 30,  // 15 moves per player per minute
  duration_minutes: 10,
  connection_scenarios: [
    { name: "stable", packet_loss: 0.01 },
    { name: "unstable", packet_loss: 0.05 },
    { name: "mobile", latency: "100-300ms" }
  ]
};
```

##### Stress Testing: Connection Recovery

**Approach**: Simulate network failures during peak gameplay
**Metrics to monitor**: 
- Reconnection time (target: <2 seconds)
- Move queue integrity (0% data loss)
- Game state consistency (server authority maintained)

**Recovery testing**: System should handle 50% of connections dropping simultaneously and recover within 30 seconds

#### 5.3 Integration Tests

##### Test Scenario: High-Latency Network Conditions

**Objective**: Verify gameplay remains smooth under poor network conditions

**Setup**:
1. Simulate high-latency connections (500ms-2s delays)
2. Create multiple concurrent games
3. Monitor move synchronization and user experience

**Test Flow**:
1. Establish games with artificial latency
2. Execute rapid move sequences
3. Verify moves eventually synchronize correctly
4. Test timeout handling for very slow connections
5. Confirm no duplicate moves or state corruption

## Test Data Management

### Test Fixtures

```javascript
// Game state fixtures
export const gameFixtures = {
  newGame: {
    gameId: 'test-game-001',
    player1Id: 'user-123',
    player2Id: 'user-456',
    currentPlayer: 'RED',
    board: createInitialBoard(),
    moveHistory: [],
    createdAt: new Date()
  },
  
  midGame: {
    gameId: 'test-game-002', 
    player1Id: 'user-123',
    player2Id: 'guest_abc456',
    currentPlayer: 'BLACK',
    board: createMidGameBoard(),
    moveHistory: createMoveHistory(5),
    spectators: ['spectator-789']
  },
  
  guestGame: {
    gameId: 'test-game-003',
    player1Id: 'user-123',
    player2Id: 'guest_def789',
    gameMode: 'online',
    inviteId: 'invite-abc123'
  }
};

// User fixtures
export const userFixtures = {
  registeredUser: {
    id: 'user-123',
    username: 'testplayer',
    email: 'test@example.com'
  },
  
  friendUser: {
    id: 'user-456', 
    username: 'friendplayer',
    email: 'friend@example.com'
  },
  
  guestUser: {
    guestId: 'guest_abc123',
    displayName: 'Guest Player',
    sessionData: { createdAt: new Date() }
  }
};

// Invitation fixtures
export const inviteFixtures = {
  activeInvite: {
    inviteId: 'invite-abc123',
    hostId: 'user-123',
    inviteeId: 'user-456',
    expiresAt: new Date(Date.now() + 3600000), // 1 hour
    status: 'PENDING'
  },
  
  expiredInvite: {
    inviteId: 'invite-expired',
    hostId: 'user-123', 
    inviteeId: 'user-456',
    expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
    status: 'EXPIRED'
  }
};
```

### Database Seeding

```typescript
// Test database setup
export async function seedTestData() {
  // Create test users
  await db.user.createMany({
    data: [userFixtures.registeredUser, userFixtures.friendUser]
  });
  
  // Create friend relationship
  await db.friendship.create({
    data: {
      requesterId: userFixtures.registeredUser.id,
      addresseeId: userFixtures.friendUser.id,
      status: 'ACCEPTED'
    }
  });
  
  // Create test games
  await db.game.createMany({
    data: Object.values(gameFixtures)
  });
  
  // Create invitations
  await db.gameInvite.createMany({
    data: Object.values(inviteFixtures)
  });
}

export async function cleanupTestData() {
  await db.gameInvite.deleteMany();
  await db.game.deleteMany();  
  await db.friendship.deleteMany();
  await db.user.deleteMany();
}
```

### IndexedDB Test Setup

```typescript
// IndexedDB testing utilities
export class IndexedDBTestHelper {
  async setupTestDB() {
    // Initialize test IndexedDB instance
    const request = indexedDB.open('checkers-test', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create offline moves store
      if (!db.objectStoreNames.contains('offline_moves')) {
        const moveStore = db.createObjectStore('offline_moves', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        moveStore.createIndex('gameId', 'gameId');
        moveStore.createIndex('timestamp', 'timestamp');
      }
      
      // Create guest sessions store
      if (!db.objectStoreNames.contains('guest_sessions')) {
        db.createObjectStore('guest_sessions', { keyPath: 'guestId' });
      }
    };
    
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
  }
  
  async cleanupTestDB() {
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name?.includes('test')) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  }
}
```

## Error Scenarios

### API Error Testing

| Endpoint                           | Error Case                      | Expected Response                | Status Code |
| ---------------------------------- | ------------------------------- | -------------------------------- | ----------- |
| POST /api/trpc/gameInvite.create   | Invalid friend ID               | "Friend not found"               | 400         |
| POST /api/trpc/gameInvite.redeem   | Expired invitation              | "Invitation expired"             | 410         |
| POST /api/trpc/multiplayerGame.move| Unauthorized move               | "Not your turn"                  | 403         |
| GET /api/game/invite/{inviteId}    | Invalid invite ID               | "Invitation not found"           | 404         |
| POST /api/trpc/multiplayerGame.join| Game already full              | "Game has maximum players"       | 409         |

### Real-time Error Testing

```typescript
// SSE connection error scenarios
const sseErrorTests = [
  {
    scenario: "Connection timeout",
    setup: () => mockNetworkDelay(5000),
    expected: "Automatic reconnection within 10 seconds"
  },
  {
    scenario: "Invalid game event",
    setup: () => sendMalformedEvent(),
    expected: "Event ignored, game state unchanged"
  },
  {
    scenario: "Move conflict resolution", 
    setup: () => sendSimultaneousMoves(),
    expected: "Server authority applied, local state corrected"
  }
];
```

### UI Error Testing

- **Network failures**: Show connection status, enable offline mode
- **Invalid moves**: Clear validation messages, highlight valid moves
- **Permission errors**: Display spectator mode notice
- **Session expires**: Graceful degradation to read-only mode

## Test Execution Strategy

### Execution Order

1. **Unit tests** (parallel execution)
   - Game invitation logic
   - IndexedDB operations  
   - Board orientation calculations
   - Move permission validation

2. **Integration tests** (sequential where needed)
   - Invitation flow end-to-end
   - Real-time synchronization
   - Guest session management
   - Connection recovery

3. **E2E tests** (sequential)
   - Complete user journeys
   - Cross-browser compatibility
   - Mobile responsive testing

4. **Performance tests** (isolated environment)
   - Load testing with concurrent games
   - Stress testing connection recovery
   - Memory leak detection

### CI/CD Integration

```yaml
# Example CI configuration for multiplayer testing
test:
  unit:
    - run: pnpm test:unit --coverage
    - coverage: >90%
    
  integration:
    - run: pnpm test:integration
    - services: [redis, postgresql]
    
  e2e:
    - run: pnpm playwright test
    - browsers: [chromium, firefox, webkit]
    
  performance:
    - run: pnpm test:load
    - environment: staging
    - require: load-test-approval
```

### Coverage Requirements

- **Unit tests**: >95% coverage for critical game logic
- **Integration tests**: All tRPC procedures and SSE events covered
- **E2E tests**: Primary user journeys and error scenarios
- **Performance tests**: All real-time communication paths
- **Overall**: >90% combined coverage

## Risk Mitigation

### High-Risk Areas

1. **Race Conditions in Move Synchronization**
   - Risk: Simultaneous moves causing game state conflicts
   - Mitigation: Server-authoritative resolution with optimistic locking, comprehensive conflict testing

2. **IndexedDB Storage Failures**
   - Risk: Offline moves lost due to storage quota or corruption  
   - Mitigation: Fallback to memory storage, periodic sync verification, graceful degradation

3. **Guest Session Management**
   - Risk: Guest data loss between sessions, privacy concerns
   - Mitigation: Robust localStorage with backup mechanisms, clear data retention policies

4. **SSE Connection Stability**
   - Risk: Frequent disconnections disrupting gameplay
   - Mitigation: Automatic reconnection with exponential backoff, offline mode support

5. **Spectator Permission Boundaries**
   - Risk: Spectators gaining move permissions through client manipulation
   - Mitigation: Server-side authorization on every move, clear UI boundaries, security testing

### Regression Testing

**Critical paths that must never break**:
- Game invitation creation and redemption flow
- Real-time move synchronization between players  
- Guest session persistence and conversion
- Board orientation consistency per player
- Move permission enforcement for spectators

**Automated regression suite scope**:
- All invitation workflow variants
- Connection handling scenarios  
- Guest user experience paths
- Cross-browser compatibility for real-time features

**Manual testing requirements**:
- Complex network condition scenarios
- Multi-device synchronization testing
- Extended gameplay sessions (>1 hour)
- Stress testing with maximum concurrent users

## Test Environment

### Requirements

- **Node.js version**: 18+ (matching production)
- **Database**: PostgreSQL 15+ (test instance)
- **Redis**: 7+ (for SSE connection state)  
- **Browsers**: Chrome 100+, Firefox 100+, Safari 15+
- **IndexedDB**: Supported in all target browsers

### Environment Variables

```bash
# Test environment configuration
DATABASE_URL="postgresql://test:test@localhost:5432/checkers_test"
REDIS_URL="redis://localhost:6379/1" 
NEXTAUTH_SECRET="test-secret-key"
NODE_ENV="test"

# Test-specific settings
TEST_TIMEOUT=10000
ENABLE_TEST_LOGS=true
MOCK_SSE_CONNECTIONS=false
```

### Setup Instructions

1. **Install dependencies**: `pnpm install`
2. **Setup test database**: `pnpm db:test:setup`
3. **Start Redis instance**: `docker run -d redis:7-alpine`
4. **Seed test data**: `pnpm db:test:seed`  
5. **Run all tests**: `pnpm test:multiplayer`

### Specialized Test Commands

```bash
# Multiplayer-specific testing
pnpm test:multiplayer         # Full multiplayer test suite
pnpm test:realtime           # Real-time synchronization only
pnpm test:offline            # IndexedDB and offline functionality  
pnpm test:load               # Performance and load testing
pnpm test:guest-flow         # Guest user experience testing
pnpm test:spectator          # Spectator system testing

# Cross-browser testing
pnpm test:browsers           # Run E2E across all browsers
pnpm test:mobile             # Mobile-specific responsive testing
```

## Success Metrics

### Functional Requirements
- [ ] Friends can send game invitations via notification system
- [ ] Shareable invite URLs work for guest users without registration
- [ ] Real-time move synchronization <200ms average latency
- [ ] Board orientation displays correctly per player (their color at bottom)
- [ ] Spectators can view games but cannot make moves
- [ ] Games continue during temporary network disconnections  
- [ ] Offline moves queue and sync on reconnection
- [ ] Guest users can convert to full accounts post-game
- [ ] Connection status displays in real-time

### Performance Benchmarks
- [ ] 100+ concurrent games supported without degradation
- [ ] Move synchronization: 95% under 200ms, 99% under 500ms  
- [ ] Connection recovery: <2 seconds for reconnection
- [ ] IndexedDB operations: <50ms for read/write
- [ ] SSE connection success rate: >99%
- [ ] Memory usage stable during extended gameplay (no leaks)

### User Experience Quality
- [ ] Invitation flow intuitive and error-free
- [ ] Guest experience seamless without authentication friction  
- [ ] Spectator boundaries clear and enforceable
- [ ] Connection issues handled gracefully with clear feedback
- [ ] All features work consistently across target browsers
- [ ] Mobile responsive design maintains functionality

### Technical Robustness
- [ ] All unit tests pass with >95% coverage
- [ ] Integration tests cover all multiplayer scenarios
- [ ] E2E tests validate complete user journeys  
- [ ] Performance tests meet defined thresholds
- [ ] Security testing confirms move permission enforcement
- [ ] Load testing validates concurrent user capacity
- [ ] No critical or high-severity bugs in test results

This comprehensive test strategy ensures the multiplayer checkers system will be robust, performant, and provide an excellent user experience for both registered users and guests across all supported scenarios including real-time gameplay, offline support, spectator modes, and seamless invitation workflows.