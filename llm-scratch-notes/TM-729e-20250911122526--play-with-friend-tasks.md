# Play with a Friend - Updated Task Breakdown

**Document ID**: TM-729e-20250911122526
**Project UUID**: 729e (same as friend-request-system-tasks)
**Created At (UTC)**: 2025-09-11 12:25:26 UTC
**Created By**: task-master
**Related Docs**: Friend request system tasks

---

## Refined Requirements Summary

### Key Changes from Original Comprehensive Prompt:
1. **Notification System**: Existing system has excellent abstraction - `GameInviteMetadata` and `GAME_INVITE` notification type already exist
2. **Real-time Complexity**: Full real-time synchronization with offline sync using IndexedDB
3. **Connection Handling**: Games do NOT pause on disconnect - continue with timeouts, show connection status/ping
4. **Game Persistence**: Save ALL games permanently for replay functionality
5. **UI Integration**: Use exact same interface as other game modes with minimal UX differences

### Core UX/UI Deliverables:
1. **Game Configuration Screen**: Replace "Create Game" button with "Send Invitation" when player selected
2. **Shareable Invite URLs**: `/game/invite/{inviteId}` - redeemable by guest sessions
3. **Guest Account Flow**: After game completion, guests directed to create account or sign in
4. **URL Pre-selection**: Support `?username=X` or `?id=Y` query params to pre-select player
5. **Dynamic Player Cards**: Show different states when friend preselected during configuration
6. **Ready State UI**: Display "ready up" status while host waits for opponent acceptance
7. **Auto-navigation**: Immediate game start when invitation accepted (both players navigate)

### Board & Spectator System:
1. **Board Orientation**: Each player views board with their color at bottom
2. **Player Identification**: First 2 users (host + first joiner) get move permissions
3. **Guest Registration**: Use guest IDs from localStorage/IndexedDB for non-registered users
4. **Open Spectation**: Anyone can view games via link but cannot make moves
5. **Move Gating**: Restrict moves to registered game participants only

## Updated Task Groups

### Group 1: Enhanced Game Invitation System
**Dependencies**: None - extends existing notification infrastructure
**Key Changes**: Leverage existing `GAME_INVITE` notification type, add shareable URLs

**Tasks**:
- Extend existing friendRequest tRPC router with game invitation procedures
- Create `GameInvite` model linking to notification system
- Implement `/game/invite/{inviteId}` route for guest redemption
- Add URL query param handling for player pre-selection (`?username=X`)
- Create guest session management with localStorage/IndexedDB integration

### Group 2: Real-time Game Synchronization with Offline Storage
**Dependencies**: None - can start immediately
**Key Changes**: Add IndexedDB offline sync, continuous gameplay during disconnections

**Tasks**:
- Create multiplayer game tRPC router with optimistic locking
- Implement IndexedDB offline synchronization layer
- Add connection status tracking with ping/latency display
- Extend SSE system for game-specific events with offline queuing
- Implement move validation with timeout handling (no game pausing)

### Group 3: Game Configuration UI with Invitation Flow
**Dependencies**: Group 1 at 50% (invitation system needed)
**Key Changes**: Focus on configuration screen as primary UX deliverable

**Tasks**:
- Redesign game configuration screen with invitation workflow
- Create dynamic player selection with pre-selection support
- Implement "Send Invitation" button replacing "Create Game"
- Add ready state UI showing invitation status
- Create shareable invite link generation and clipboard functionality

### Group 4: Board Orientation & Spectator System  
**Dependencies**: Group 2 complete (game sync needed)
**Key Changes**: Board orientation per player, open spectation with move gating

**Tasks**:
- Implement dynamic board rotation based on player color
- Add player identification system (host + first joiner get move permissions)
- Create spectator mode with read-only game access
- Implement guest player registration via localStorage/IndexedDB
- Add move permission gating and clear spectator indicators

### Group 5: Real-time Game Client with Connection Status
**Dependencies**: Groups 2 and 4 substantially complete
**Key Changes**: Connection status display, continuous gameplay during disconnects

**Tasks**:
- Enhance GameProvider with connection status tracking
- Add ping/latency indicators to player cards
- Implement offline move queuing with IndexedDB
- Create reconnection handling without game interruption
- Add timeout-based turn management (no waiting for disconnected players)

### Group 6: Guest Flow & Post-Game Integration
**Dependencies**: Groups 3 and 5 complete
**Key Changes**: Guest account creation flow, permanent game storage

**Tasks**:
- Implement guest session to account conversion flow
- Create post-game account creation/signin prompts
- Add permanent game storage for replay functionality
- Integrate guest game history with new account creation
- Polish all multiplayer components for consistency

## Technical Architecture Notes

### Existing Infrastructure to Leverage:
- **Notification System**: `NotificationType.GAME_INVITE` and `GameInviteMetadata` already defined
- **Database Schema**: `Game` model supports `player1Id`, `player2Id`, and `gameMode: 'online'`
- **SSE System**: `/api/notifications/stream` ready for game events
- **Friend System**: Complete friend request/management system in place

### New Components Required:
- **GameInvite Model**: Links invitations to notification system
- **IndexedDB Layer**: Offline game state synchronization
- **Guest Session Manager**: localStorage/IndexedDB guest identification
- **Board Rotation System**: Dynamic orientation based on player position
- **Spectator Mode**: Read-only game access with clear indicators

### Key Implementation Patterns:
1. **URL-based Player Selection**: `?username=X` → pre-populate game config
2. **Guest ID Management**: localStorage + IndexedDB for non-registered users
3. **Move Permission Gating**: Check user against first 2 registered players
4. **Connection Status Display**: Real-time ping/status on player cards
5. **Offline Synchronization**: IndexedDB queue with reconnection sync

## Success Criteria

### Core Functionality:
- [ ] Friends can send game invitations via existing notification system
- [ ] Shareable invite links work for guest users
- [ ] Real-time move synchronization with offline queue support
- [ ] Board orientation adapts per player (their color at bottom)
- [ ] Open spectation with proper move permission gating
- [ ] Guest to account conversion flow after games

### Performance Requirements:
- [ ] Move synchronization <200ms typical latency
- [ ] Games continue during temporary disconnections
- [ ] Offline moves queue properly and sync on reconnection
- [ ] Connection status updates in real-time
- [ ] No game interruption from network issues

### User Experience:
- [ ] Configuration screen clearly shows invitation workflow
- [ ] Ready state provides clear feedback while waiting
- [ ] Player cards show connection status and ping
- [ ] Spectators can view but clearly cannot interact
- [ ] Guest users smoothly convert to accounts post-game

## Risk Mitigation

### Technical Risks:
- **Offline Sync Conflicts**: Use server-authoritative resolution with clear user feedback
- **Race Conditions**: Implement optimistic locking with game versioning
- **Guest Session Management**: Robust localStorage/IndexedDB with fallback strategies

### User Experience Risks:  
- **Complex Configuration**: Keep invitation flow simple with clear visual states
- **Connection Confusion**: Clear status indicators and error messaging
- **Spectator Boundaries**: Obvious visual distinction between players and spectators

This updated breakdown focuses on the key UX deliverables (configuration screen, invitation flow, guest system, board orientation, spectator mode) while leveraging the excellent existing infrastructure for notifications, friends, and real-time communication.
