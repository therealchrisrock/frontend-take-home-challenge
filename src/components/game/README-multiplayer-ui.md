# Multiplayer Game System (BETA)

## Overview

The multiplayer game system provides real-time online checkers gameplay with invitation management, spectating capabilities, and social integration. The system supports both friend-to-friend games and open invitations for casual matchmaking.

> **🧪 BETA STATUS**: The multiplayer system is currently in beta with known synchronization issues. See [Known Issues](#known-issues) section for details.

## 🎮 Core Features

### Game Invitation System
- **Friend Invitations**: Direct invitations to friends with personalized messages
- **Open Invitations**: Shareable links for casual matchmaking
- **Game Configuration**: Choose variants, time controls, and player colors
- **Real-time Status**: Live invitation tracking with expiration timers

### Multiplayer Gameplay (BETA)
- **Real-time Moves**: Synchronized game state across all clients
- **Turn Management**: Enforced turn order with move validation
- **Conflict Resolution**: Automatic handling of simultaneous move attempts
- **Connection Recovery**: Automatic reconnection and state synchronization

### Spectating System (IN PROGRESS)
- **Live Viewing**: Watch ongoing games in real-time
- **Move History**: Review past moves and game progression
- **Player Information**: View player profiles and ratings
- **Chat Integration**: Spectator chat during games

## 🧩 UI Components

### 1. GameInviteScreen

**Location**: `src/app/(checkers)/_components/game/GameInviteScreen.tsx`

Main invitation workflow component that handles the complete game setup process.

**Features:**
- Multi-step invitation wizard (player selection → game configuration → waiting room)
- URL parameter handling for pre-selected friends
- Game variant selection (American, International, Brazilian, Canadian)
- Time control configuration with preset options
- Real-time invitation status updates

**Props:**
- `preselectedFriendId?: string` - Pre-select a friend by ID
- `preselectedUsername?: string` - Pre-select a friend by username

**Usage:**
```tsx
<GameInviteScreen
  preselectedFriendId="user123"
  preselectedUsername="john_doe"
/>
```

### 2. PlayerSelectionCard

**File**: `src/app/(checkers)/_components/game/PlayerSelectionCard.tsx`

Friend selection interface with search and filtering capabilities.

**Features:**

- Toggle between "Specific Friend" and "Anyone" (shareable link) modes
- Friend search with real-time filtering
- Visual friend selector with avatars and user info
- Integration with existing friends API
- Selection summary with status badges

**Props:**

- `selectedFriend: string | null` - Currently selected friend ID
- `onFriendChange: (friendId: string | null) => void` - Selection callback
- `showInviteButton?: boolean` - Whether to show invite button

### 3. InviteStatusPanel

**File**: `src/app/(checkers)/_components/game/InviteStatusPanel.tsx`

Real-time invitation status tracking and management.

**Features:**

- Live invitation status updates (Pending/Accepted/Declined/Expired)
- Countdown timer with progress bar
- Friend information display
- Cancel invitation functionality
- Responsive status indicators with appropriate colors and icons
- Mock implementation ready for real-time polling

**Props:**

- `inviteId: string` - Invitation identifier
- `selectedFriendId: string | null` - Friend who was invited
- `onGameReady: (gameId: string) => void` - Game start callback
- `onInviteExpired?: () => void` - Expiration callback

### 4. ShareableInviteDialog

**File**: `src/components/game/ShareableInviteDialog.tsx`

Dialog for sharing invitation links with QR codes and social media integration.

**Features:**

- Copy-to-clipboard functionality with visual feedback
- QR code generation using QR-Server API
- Social media sharing buttons (WhatsApp, Email, SMS)
- Native Web Share API support when available
- Tabbed interface for link sharing vs QR code
- Privacy notice about link expiration

**Props:**

- `open: boolean` - Dialog visibility state
- `onOpenChange: (open: boolean) => void` - Dialog state callback
- `inviteId: string` - Invitation identifier for URL generation

## URL Patterns & Routing

### Friend Game Page

**Route**: `/game/online`
**Query Parameters:**

- `friendId` - Pre-select friend by user ID
- `username` - Pre-select friend by username

**Example URLs:**

- `/game/online?friendId=user123` - Pre-select specific friend
- `/game/online?username=john_doe` - Pre-select friend by username

### Invitation Redemption (for Guest Flow - Working Group 6)

**Expected Route**: `/game/invite/[inviteId]`
**Purpose**: Allow guests to redeem invitations without accounts

## API Integration Requirements

The following API endpoints need to be implemented by Working Group 1:

### Game Invitation Router (`api.gameInvite`)

#### `createInvitation`

```typescript
input: {
  inviteeId: string | null; // null for shareable links
  gameConfig: {
    boardVariant: "american" | "brazilian" | "international" | "canadian";
    timeControl: TimeControl | null;
    playerColor: "red" | "black";
  }
}
output: {
  inviteId: string;
  expiresAt: Date;
}
```

#### `getInviteStatus`

```typescript
input: { inviteId: string }
output: {
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  expiresAt: Date;
  gameId: string | null; // Present when accepted
  host: UserInfo;
  invitee?: UserInfo; // For direct invitations
}
```

#### `cancelInvitation`

```typescript
input: {
  inviteId: string;
}
output: {
  success: boolean;
}
```

### Real-time Updates

The components expect real-time updates via Server-Sent Events (SSE) for:

- Invitation status changes
- Game readiness notifications
- Connection status updates

## 🔗 API Integration

### Real-time Communication

The multiplayer system uses multiple channels for real-time updates:

#### Server-Sent Events (SSE)
- **Game State Updates** (`/api/game/[id]/mp-stream`) - Real-time move synchronization
- **Invitation Status** (`/api/notifications/stream`) - Invitation acceptance/decline
- **Connection Status** - Player connection monitoring

#### tRPC Procedures

##### Game Invitation Router (`api.gameInvite`)
- `create` - Create new game invitation
- `getStatus` - Get current invitation status
- `cancel` - Cancel pending invitation
- `accept` - Accept received invitation
- `decline` - Decline received invitation

##### Multiplayer Game Router (`api.multiplayerGame`)
- `join` - Join an existing game
- `makeMove` - Submit a move with validation
- `getGameState` - Retrieve current game state
- `resign` - Resign from game
- `requestDraw` - Request/respond to draw offers

### Guest Integration

The system supports guest players through:
- **Guest Session Management** - Temporary accounts for non-registered users
- **Invitation Redemption** - Direct game joining via shareable links
- **Post-game Conversion** - Account creation flow after guest games

## ⚠️ Known Issues

### Multiplayer Synchronization (Beta)
- **Move Conflicts**: Simultaneous moves may cause temporary desync
- **Connection Recovery**: Some edge cases require manual page refresh
- **State Validation**: Occasional discrepancies between client and server state
- **Turn Timer Sync**: Minor timing differences across clients

### Performance Issues
- **Large Game History**: Games with 100+ moves may load slowly
- **Concurrent Games**: Performance degrades with 10+ simultaneous games
- **Memory Leaks**: Long gaming sessions may require page refresh

### Browser Compatibility
- **Safari Mobile**: Drag-and-drop occasionally fails on iOS Safari
- **Firefox**: SSE connections may timeout more frequently
- **WebKit**: Some animation artifacts on older WebKit versions

## 🏗️ Architectural Decisions

### Real-time Synchronization Strategy

**Decision**: Hybrid SSE + Optimistic Updates
- **Server-Sent Events** for authoritative game state broadcasts
- **Optimistic Updates** for immediate UI feedback
- **Conflict Resolution** through server-side validation and rollback

**Trade-offs:**
- ✅ Low latency user experience
- ✅ Scales better than WebSocket polling
- ❌ Complex conflict resolution logic
- ❌ Potential temporary desync states

### State Management Architecture

**Decision**: Distributed State with Central Authority
- **Client State**: Local game representation for immediate updates
- **Server State**: Authoritative game state with move validation
- **Sync Mechanism**: Periodic reconciliation and conflict detection

**Design Patterns:**
- **Event Sourcing**: All moves stored as immutable events
- **CQRS**: Separate read/write models for game state
- **Optimistic Concurrency**: Version-based conflict detection

### Invitation System Design

**Decision**: Token-based Invitations with Expiration
- **Unique Tokens**: Cryptographically secure invitation identifiers
- **Flexible Recipients**: Support both friend and guest invitations
- **Time-bounded**: Automatic expiration to prevent stale invitations

**Benefits:**
- Secure sharing without exposing user IDs
- Supports guest players without accounts
- Prevents invitation abuse through expiration

### Spectating Architecture (IN PROGRESS)

**Decision**: Read-only SSE Streams with Permission Gates
- **Separate Streams**: Spectator-specific SSE endpoints
- **Permission System**: View access based on game visibility settings
- **Minimal State**: Spectators receive move events, not full game state

**Planned Implementation:**
- Real-time move broadcasting to spectator clients
- Spectator count tracking and display
- Optional spectator chat with moderation

## 🔧 Performance Optimizations

### Database Design
- **Indexed Queries**: Strategic indexing for game lookups and move history
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Minimized N+1 queries with proper relations

### Client-Side Optimizations
- **Component Memoization**: React.memo for expensive renders
- **State Batching**: Grouped state updates to prevent excessive renders
- **Lazy Loading**: Code splitting for invitation and game components

### Network Efficiency
- **SSE Heartbeats**: Efficient connection monitoring
- **Differential Updates**: Only broadcast changed game state
- **Compression**: Gzip compression for move data

## 🚧 Technical Debt & Future Improvements

### Current Technical Debt
- **Error Boundary Coverage**: Inconsistent error handling across components
- **Test Coverage**: Integration tests needed for multiplayer flows
- **Type Safety**: Some any types in SSE event handling
- **Performance Monitoring**: Need metrics for sync latency and conflicts

### Planned Refactoring
- **State Machine**: Formal state machine for game flow management
- **Event Bus**: Centralized event system for loose coupling
- **Service Layer**: Abstraction layer for game logic
- **Caching Strategy**: Redis integration for session management

## 📊 Monitoring & Analytics

### Key Metrics (Planned)
- **Game Completion Rate**: Percentage of started games that finish
- **Sync Conflict Frequency**: Rate of move conflicts requiring resolution
- **Connection Stability**: SSE disconnection and reconnection rates
- **Invitation Conversion**: Rate of sent invitations that result in games

### Error Tracking
- Move validation failures
- SSE connection errors
- State synchronization conflicts
- Client-server state mismatches

---

This architectural documentation reflects the current implementation status and planned improvements for the multiplayer checkers system.
