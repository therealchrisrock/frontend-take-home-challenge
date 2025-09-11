# Multiplayer Checkers - Working Groups Assignment

**Document ID**: TM-729e-20250911123909--multiplayer-working-groups
**Project UUID**: 729e (matching other documents)
**Related Docs**:
- Task Breakdown: TM-729e-20250911122526--play-with-friend-tasks.md
- Test Strategy: TP-729e-20250911123909--multiplayer-test-strategy.md
**Created By**: task-master
**Created At**: 2025-09-11 12:39:09 UTC

---

## Overview

This document organizes the 6 task groups from the Play with a Friend implementation into specific working group assignments. Each working group can execute in parallel while maintaining proper coordination through defined integration points and dependencies.

### Key Architecture Leverages
- **Existing Notification System**: `GameInviteMetadata` and `GAME_INVITE` type already implemented
- **Database Schema**: `Game` model supports multiplayer with `player1Id`, `player2Id`, `gameMode: 'online'`  
- **SSE Infrastructure**: `/api/notifications/stream` ready for real-time events
- **Friend System**: Complete friend management system in place

### Core UX Deliverables
1. **Game Configuration Screen**: Replace "Create Game" with invitation workflow
2. **Shareable Invite URLs**: `/game/invite/{inviteId}` for guest redemption
3. **Board Orientation**: Each player sees their color at bottom
4. **Guest System**: Full session management with post-game account creation
5. **Spectator Mode**: Open game viewing with move permission gating

---

## Working Group 1: Backend Infrastructure
**Agent Specialization**: backend-developer
**Estimated Effort**: 3-4 days
**Dependencies**: None - extends existing systems
**Parallel Safe**: Yes - isolated backend work

### Specific Implementation Tasks

#### Files to Create/Modify:
- `/src/server/api/routers/gameInvite.ts` (new)
- `/src/server/api/routers/multiplayerGame.ts` (new)  
- `/src/server/api/root.ts` (extend exports)
- `/prisma/schema.prisma` (add GameInvite model)
- `/src/types/notifications.ts` (extend if needed)

#### Core Tasks:
1. **Game Invitation tRPC Router**
   - `createInvitation`: Generate shareable invite with expiration
   - `redeemInvitation`: Process guest redemption and create game session
   - `getActiveInvitations`: List pending invitations for user
   - `cancelInvitation`: Host cancellation support

2. **Multiplayer Game tRPC Router**
   - `joinGame`: Player/spectator join with role assignment
   - `makeMove`: Server-authoritative move validation with optimistic locking
   - `getGameState`: Real-time game state retrieval  
   - `leaveGame`: Clean disconnection handling

3. **Database Schema Extensions**
   ```prisma
   model GameInvite {
     id        String   @id @default(cuid())
     inviteId  String   @unique
     hostId    String
     inviteeId String?  // null for shareable links
     gameConfig Json
     expiresAt DateTime
     status    InviteStatus
     createdAt DateTime @default(now())
     
     host    User  @relation("InviteHost", fields: [hostId], references: [id])
     invitee User? @relation("InviteTarget", fields: [inviteeId], references: [id])
     
     @@map("game_invites")
   }
   ```

4. **Guest Session Management Backend**
   - Guest ID generation and validation
   - Guest-to-account conversion procedures
   - Guest game history persistence

5. **SSE Event Extensions**
   - `GAME_MOVE` events for real-time synchronization
   - `PLAYER_JOINED`/`PLAYER_LEFT` for connection tracking
   - `GAME_STATE_SYNC` for conflict resolution

### Success Criteria:
- [ ] All tRPC procedures tested and documented
- [ ] Database migrations run cleanly
- [ ] SSE events properly typed and emitted
- [ ] Guest session backend fully functional
- [ ] Move validation prevents cheating/invalid moves

### Testing Requirements:
- Reference **TP-729e Section 1** for invitation system testing
- Reference **TP-729e Section 2** for real-time sync testing
- All tRPC procedures require unit tests with >95% coverage
- Integration tests for SSE event emission

### Integration Points:
- **With Group 2**: Provide tRPC types for frontend consumption
- **With Group 3**: Coordinate on invitation workflow APIs
- **With Group 4**: Define spectator role authorization

### Risk Areas:
- **Race conditions** in simultaneous moves - use optimistic locking
- **Guest session security** - validate all guest operations server-side
- **Database performance** with high concurrent games

---

## Working Group 2: Real-time Infrastructure  
**Agent Specialization**: realtime-developer
**Estimated Effort**: 4-5 days
**Dependencies**: None - can start immediately
**Parallel Safe**: Yes - focused on sync layer

### Specific Implementation Tasks

#### Files to Create/Modify:
- `/src/lib/multiplayer/syncManager.ts` (new)
- `/src/lib/multiplayer/indexedDbStorage.ts` (new)
- `/src/lib/multiplayer/connectionManager.ts` (new)
- `/src/hooks/useMultiplayerSync.ts` (new)
- `/src/contexts/multiplayerContext.tsx` (new)

#### Core Tasks:
1. **IndexedDB Offline Storage Layer**
   - Move queue storage during disconnections
   - Game state caching for offline access
   - Guest session data persistence
   - Automatic sync on reconnection

2. **Real-time Synchronization Manager**
   ```typescript
   class GameSyncManager {
     queueMove(gameId: string, move: GameMove): Promise<void>
     syncOnReconnect(gameId: string): Promise<void>
     handleServerConflict(serverState: GameState): void
     getConnectionStatus(): ConnectionStatus
   }
   ```

3. **Connection Status Tracking**
   - WebSocket/SSE connection monitoring
   - Ping/latency measurement and display
   - Automatic reconnection with exponential backoff
   - Offline mode detection and UI updates

4. **Move Conflict Resolution**
   - Server-authoritative state reconciliation
   - Optimistic UI updates with rollback capability
   - Move sequence validation and correction
   - Clear user feedback for conflicts

5. **Offline Queue Management**
   - FIFO move queue with timestamp ordering
   - Queue persistence across browser sessions
   - Batch sync optimization on reconnection
   - Queue cleanup and validation

### Success Criteria:
- [ ] Moves synchronize in <200ms under normal conditions
- [ ] Offline moves queue without data loss  
- [ ] Connection status updates in real-time
- [ ] Conflict resolution preserves game integrity
- [ ] No memory leaks in long-running games

### Testing Requirements:
- Reference **TP-729e Section 2** for real-time sync testing
- Reference **TP-729e Section 5** for connection handling tests
- Stress test with 100+ concurrent games
- Validate IndexedDB storage quota handling
- Test reconnection scenarios extensively

### Integration Points:
- **With Group 1**: Consume SSE events and tRPC procedures
- **With Group 3**: Provide connection status for UI
- **With Group 5**: Supply sync hooks for game client

### Risk Areas:
- **IndexedDB browser support** - implement fallback strategies
- **Memory usage** in offline queue - implement cleanup policies
- **Sync conflicts** - robust server-authority resolution needed

---

## Working Group 3: Game Configuration UI
**Agent Specialization**: frontend-developer  
**Estimated Effort**: 3 days
**Dependencies**: Group 1 at 50% (needs invitation APIs)
**Parallel Safe**: Partial - needs backend APIs

### Specific Implementation Tasks

#### Files to Create/Modify:
- `/src/app/(checkers)/_components/game/GameInviteScreen.tsx` (new)
- `/src/app/(checkers)/_components/game/PlayerSelectionCard.tsx` (new)
- `/src/app/(checkers)/_components/game/InviteStatusPanel.tsx` (new)
- `/src/app/(checkers)/create-game/page.tsx` (modify existing)
- `/src/components/game/ShareableInviteDialog.tsx` (new)

#### Core Tasks:
1. **Game Configuration Screen Redesign**
   - Replace "Create Game" button with invitation workflow
   - Dynamic UI based on friend pre-selection
   - Support for URL query params (`?username=X`, `?id=Y`)
   - Game settings (time limits, variants) with invitation context

2. **Friend Selection with Pre-selection**
   ```tsx
   <PlayerSelectionCard 
     selectedFriend={preselectedFriend}
     onFriendChange={handleFriendSelection}
     showInviteButton={!!selectedFriend}
   />
   ```

3. **Invitation Status & Ready State UI**
   - "Send Invitation" button with loading states
   - Ready state indicators while waiting for acceptance  
   - Real-time invitation status updates via SSE
   - Clear feedback for invitation sent/received/expired

4. **Shareable Invite Link Generation**
   - Copy-to-clipboard functionality
   - QR code generation for mobile sharing
   - Social media share buttons integration
   - Link expiration time display

5. **Dynamic Player Cards**
   - Show different states: empty, friend-selected, guest-pending
   - Connection status indicators for each player
   - Guest vs registered user visual distinction
   - Spectator count display

### Success Criteria:
- [ ] Configuration screen intuitively guides invitation flow
- [ ] URL pre-selection works seamlessly
- [ ] Ready state provides clear waiting feedback
- [ ] Shareable links generate and copy correctly
- [ ] All states handled gracefully (loading, error, success)

### Testing Requirements:
- Reference **TP-729e Section 1.3** for invitation UI flow testing
- Test URL parameter handling extensively
- Validate all loading/error/success states
- Cross-browser clipboard functionality testing
- Responsive design validation on mobile

### Integration Points:
- **With Group 1**: Consume game invitation tRPC procedures
- **With Group 2**: Display connection status from sync manager
- **With Group 4**: Hand off to game client after invitation acceptance

### Risk Areas:
- **Complex state management** - use reducer pattern for invitation flow
- **URL handling edge cases** - validate all parameter combinations
- **Mobile sharing UX** - ensure QR codes and links work seamlessly

---

## Working Group 4: Board Orientation & Spectator System
**Agent Specialization**: game-logic-specialist
**Estimated Effort**: 3-4 days  
**Dependencies**: Group 2 substantially complete (needs game sync)
**Parallel Safe**: Partial - requires real-time sync layer

### Specific Implementation Tasks

#### Files to Create/Modify:
- `/src/lib/game/boardOrientation.ts` (new)
- `/src/lib/game/spectatorManager.ts` (new) 
- `/src/lib/game/playerRoles.ts` (new)
- `/src/app/(checkers)/_components/game/OrientedBoard.tsx` (new)
- `/src/app/(checkers)/_components/game/SpectatorIndicator.tsx` (new)
- `/src/components/game/PlayerPermissionGate.tsx` (new)

#### Core Tasks:
1. **Board Orientation Logic**
   ```typescript
   interface BoardOrientation {
     playerColor: 'RED' | 'BLACK'
     rotated: boolean
     bottomRows: number[]
     topRows: number[]
   }
   
   function calculateBoardOrientation(
     gameState: GameState, 
     playerRole: PlayerRole
   ): BoardOrientation
   ```

2. **Player Role Management**
   - Identify first 2 users as active players (host + first joiner)
   - Assign RED/BLACK colors based on join order
   - Additional users automatically become spectators
   - Guest ID integration for non-registered participants

3. **Spectator Access Control**
   - Move permission validation: only active players can make moves
   - Clear visual indicators for spectator status
   - Read-only board interaction for spectators
   - Spectator count display and management

4. **Guest Player Registration**
   - localStorage/IndexedDB guest session integration
   - Guest ID generation and persistence
   - Guest-to-player promotion when joining as first 2 users
   - Guest spectator mode for later joiners

5. **Dynamic Board Rendering**
   - Rotate board 180° for BLACK player (their pieces at bottom)
   - Maintain piece interaction consistency regardless of orientation
   - Coordinate translation between logical and visual positions
   - Animation coordination for moves across different orientations

### Success Criteria:
- [ ] Each player sees board with their color at bottom
- [ ] First 2 users get move permissions, others are spectators
- [ ] Move permission gating prevents unauthorized moves
- [ ] Guest users integrate seamlessly with role system
- [ ] Board orientation maintains throughout gameplay

### Testing Requirements:
- Reference **TP-729e Section 4** for board orientation and spectator testing
- Test all player role combinations (2 players + spectators)
- Validate guest ID persistence and role assignment
- Test board orientation with various game states
- Ensure move permission enforcement is server-validated

### Integration Points:
- **With Group 1**: Use player role validation from backend
- **With Group 2**: Coordinate with real-time move synchronization
- **With Group 5**: Provide oriented board for game client

### Risk Areas:
- **Coordinate system confusion** - maintain clear logical vs visual coordinate mapping
- **Permission bypassing** - ensure server validates all move permissions
- **Guest session reliability** - robust localStorage/IndexedDB handling

---

## Working Group 5: Real-time Game Client
**Agent Specialization**: frontend-game-developer
**Estimated Effort**: 4 days
**Dependencies**: Groups 2 and 4 substantially complete
**Parallel Safe**: No - requires sync and orientation systems

### Specific Implementation Tasks

#### Files to Create/Modify:
- `/src/app/(checkers)/_components/game/MultiplayerGameProvider.tsx` (new)
- `/src/app/(checkers)/_components/game/ConnectionStatusBar.tsx` (new)
- `/src/app/(checkers)/_components/game/MultiplayerGameScreen.tsx` (new)
- `/src/hooks/useMultiplayerGame.ts` (new)
- `/src/app/(checkers)/game/[gameId]/page.tsx` (modify existing)

#### Core Tasks:
1. **Enhanced GameProvider for Multiplayer**
   ```tsx
   <MultiplayerGameProvider gameId={gameId}>
     <ConnectionStatusBar />
     <OrientedBoard />
     <PlayerCards />
     <SpectatorPanel />
   </MultiplayerGameProvider>
   ```

2. **Connection Status Display**
   - Real-time ping/latency indicators on player cards
   - Connection quality visualization (green/yellow/red)
   - Offline mode indicators with sync queue status
   - Reconnection progress and error messaging

3. **Real-time Move Synchronization UI**
   - Optimistic move updates with rollback on conflicts
   - Move animation coordination between players
   - Turn indicator updates in real-time
   - Move history synchronization across all participants

4. **Offline Queue Management UI**
   - Visual indicator when moves are queued offline
   - Queue status display (X moves pending sync)
   - Sync progress indication during reconnection
   - Clear messaging about offline mode limitations

5. **Spectator Experience Integration**
   - Read-only game display for spectators
   - Spectator chat/reactions (if implemented)
   - Clear "spectating" mode indicators
   - Seamless spectator join/leave without game disruption

### Success Criteria:
- [ ] Connection status displays accurately in real-time
- [ ] Moves synchronize with <200ms latency when online
- [ ] Offline moves queue and display properly  
- [ ] Spectators can view but not interfere with gameplay
- [ ] Game continues smoothly during connection issues

### Testing Requirements:
- Reference **TP-729e Section 5** for real-time client testing
- Test various network conditions (slow, intermittent, offline)
- Validate move synchronization accuracy across players
- Test spectator experience doesn't affect active gameplay
- Performance testing with extended gameplay sessions

### Integration Points:
- **With Group 2**: Use sync manager and connection status hooks
- **With Group 4**: Integrate oriented board and spectator controls
- **With Group 6**: Coordinate guest flow integration

### Risk Areas:
- **UI performance** with frequent real-time updates - optimize render cycles
- **State synchronization bugs** - thorough testing of edge cases needed
- **Memory leaks** in long games - proper cleanup of SSE connections

---

## Working Group 6: Guest Flow & Integration
**Agent Specialization**: integration-specialist
**Estimated Effort**: 2-3 days
**Dependencies**: Groups 3 and 5 complete
**Parallel Safe**: No - requires completed UI flows

### Specific Implementation Tasks

#### Files to Create/Modify:
- `/src/app/game/invite/[inviteId]/page.tsx` (new)
- `/src/components/guest/GuestSessionManager.tsx` (new)
- `/src/components/guest/PostGameAccountFlow.tsx` (new)
- `/src/app/(checkers)/_components/game/GuestConversionPrompt.tsx` (new)
- `/src/lib/guest/sessionStorage.ts` (new)

#### Core Tasks:
1. **Guest Session Redemption Page**
   ```tsx
   // /game/invite/{inviteId}
   <GuestInviteRedemption 
     inviteId={inviteId}
     onSessionCreated={handleGuestSession}
     onGameStart={navigateToGame}
   />
   ```

2. **Guest-to-Account Conversion Flow**
   - Post-game prompts for account creation
   - Guest game history preservation during conversion
   - Seamless data transfer from guest session to new account
   - Option to continue as guest or create account

3. **Guest Session Persistence**
   - localStorage guest ID management with fallbacks
   - IndexedDB guest game history storage  
   - Session restoration across browser tabs/windows
   - Guest session cleanup and privacy management

4. **Cross-Component Integration Testing**
   - End-to-end invitation → game → conversion flow
   - Multi-browser testing (guest in incognito, host in normal)
   - Mobile responsive testing for all guest flows
   - Error handling and edge case validation

5. **Polish and Consistency**
   - Ensure all multiplayer components match existing UI patterns
   - Consistent error messaging and loading states
   - Accessibility improvements for all new components
   - Documentation for multiplayer feature usage

### Success Criteria:
- [ ] Guest users can redeem invitations without registration
- [ ] Post-game conversion flow works seamlessly
- [ ] Guest session data persists properly
- [ ] All components integrate without breaking existing functionality
- [ ] Mobile and cross-browser compatibility verified

### Testing Requirements:
- Reference **TP-729e Section 3** for guest session testing
- Complete end-to-end user journey validation
- Cross-browser compatibility testing
- Mobile responsive testing for all flows
- Data persistence testing across browser sessions

### Integration Points:
- **With All Groups**: Final integration and polishing
- **With Existing Codebase**: Ensure no regressions in current features
- **With Test Strategy**: Execute comprehensive test suite

### Risk Areas:
- **Data loss during conversion** - robust backup and validation needed
- **Browser compatibility** - thorough testing across target browsers
- **Existing feature regressions** - comprehensive regression testing required

---

## Execution Strategy

### Phase 1: Foundation (Days 1-2)
- **Groups 1 & 2** start immediately (backend infrastructure + real-time sync)
- **Group 3** begins planning and design work
- **Groups 4, 5, 6** conduct design reviews and preparation

### Phase 2: Core Implementation (Days 3-5) 
- **Group 1** completes backend APIs (50% done)
- **Group 2** continues real-time infrastructure
- **Group 3** begins frontend implementation using Group 1 APIs
- **Group 4** starts with Group 2 integration

### Phase 3: Integration (Days 6-8)
- **Groups 2 & 4** complete and integrate
- **Group 5** begins with dependencies met
- **Group 3** completes and coordinates with Group 5
- **Group 6** starts final integration work

### Phase 4: Testing & Polish (Days 9-10)
- **All Groups** contribute to integration testing
- **Group 6** leads final polish and cross-browser testing
- Comprehensive test suite execution per TP-729e
- Performance validation and optimization

## Communication Protocol

### Daily Coordination
- **9 AM UTC**: Brief async status update in project channel
- **5 PM UTC**: Integration checkpoint for dependent groups
- Use project UUID **729e** in all communications
- Update status in shared tracking document

### Integration Checkpoints
- **Day 2**: Groups 1 & 2 provide initial APIs/hooks for downstream consumption
- **Day 4**: Groups 3 & 4 demo integrated UX components  
- **Day 6**: Group 5 demonstrates working multiplayer game client
- **Day 8**: Group 6 demonstrates complete guest flow

### Risk Escalation
- **Blocking dependencies**: Escalate within 4 hours
- **Technical challenges**: Daily standup discussion
- **Integration conflicts**: Immediate coordination required
- **Testing failures**: Halt progression until resolved

---

## Success Metrics

### Per Working Group Completion Criteria

**Group 1 (Backend)**: All tRPC procedures tested, SSE events emitting, database schema deployed
**Group 2 (Real-time)**: Move sync <200ms, offline queue functional, connection status accurate
**Group 3 (Configuration)**: Invitation flow complete, URL handling working, shareable links functional  
**Group 4 (Orientation)**: Board rotation per player, spectator permissions enforced, guest roles assigned
**Group 5 (Game Client)**: Real-time gameplay working, connection status displayed, spectator mode functional
**Group 6 (Integration)**: Guest conversion working, cross-browser tested, no regressions in existing features

### Overall Project Success
- [ ] Complete invitation-to-gameplay flow functional
- [ ] Real-time multiplayer with offline support working
- [ ] Guest system enables account-free participation
- [ ] Spectator mode provides open game viewing
- [ ] Performance meets <200ms move sync target
- [ ] All tests pass per TP-729e strategy
- [ ] Cross-browser compatibility confirmed
- [ ] Mobile responsive design functional

This working group structure enables maximum parallel development while ensuring proper coordination and integration. Each group has clear deliverables, dependencies, and success criteria aligned with the overall project goals and test strategy.
