# Feature: TICKET-004: Time Controls for Checkers Game

## Overview
Implementing comprehensive time controls for the Checkers game application to add competitive time-based gameplay. This feature introduces chess-style time controls with countdown clocks, increment systems, and time-based win/loss conditions, enhancing the strategic depth and competitive nature of the game while maintaining compatibility with the existing T3 Stack architecture and game mechanics.

## Functional Requirements

### Must Have
- FR-001: Display time clocks for both players in "MM:SS" format with millisecond precision tracking
- FR-002: Support time control input in "X|Y" format (X minutes, Y increment seconds) with alternative "X+Y" format
- FR-003: Implement countdown mechanics that decrement active player's time during their turn
- FR-004: Add increment seconds to player's clock after completing a valid move
- FR-005: Detect time expiration and end game with appropriate winner declaration
- FR-006: Integrate time control presets (Bullet 1|0, Blitz 5|0, Rapid 10|5, Classical 30|0)
- FR-007: Visual indication of active player's clock (highlighting, animation, or color change)
- FR-008: Pause/resume functionality for time controls during game interruptions
- FR-009: Store time control settings and remaining time in game state (memory, localStorage, database)
- FR-010: Synchronize time across multi-tab sessions using existing sync infrastructure

### Should Have
- FR-011: Custom time control configuration with validation (min 0.5 minutes, max 180 minutes)
- FR-012: Visual warnings for low time (under 30 seconds, under 10 seconds)
- FR-013: Optional audio warnings for critical time situations (10s, 5s, 3s, 2s, 1s)
- FR-014: Time pressure indicator showing time advantage/disadvantage between players
- FR-015: Move time tracking to display average move time in game statistics
- FR-016: Time control settings persistence across sessions
- FR-017: Keyboard shortcuts for pause/resume (Space bar)
- FR-018: Time handicap options for skill balancing

### Nice to Have
- FR-019: Time odds configuration (different time for each player)
- FR-020: Bronstein delay and Fischer increment variants
- FR-021: Time control history and analytics
- FR-022: Tournament time control templates
- FR-023: Sound customization for time warnings
- FR-024: Visual time bar/progress indicator
- FR-025: Sudden death and overtime formats

## Success Criteria

### Acceptance Tests
- [ ] Given a game with time controls, when a player's time reaches zero, then they lose immediately
- [ ] Given a move is completed, when increment is configured, then the increment is added to the player's clock
- [ ] Given time control preset selection, when "Blitz 5|0" is chosen, then each player starts with 5:00
- [ ] Given an active game, when the current player is thinking, then only their clock decrements
- [ ] Given a paused game, when resumed, then clocks continue from the exact paused time
- [ ] Verify that time synchronizes correctly across multiple browser tabs
- [ ] Verify that time controls work with AI opponent mode
- [ ] Verify that visual and audio warnings trigger at appropriate thresholds
- [ ] Verify that time data persists through page refresh
- [ ] Verify that custom time controls validate input correctly

### Edge Cases
- [ ] Handle browser tab backgrounding (use visibility API to pause/adjust)
- [ ] Handle system clock changes or time zone switches during game
- [ ] Handle network latency in multi-tab synchronization
- [ ] Handle decimal minute inputs (e.g., 2.5 minutes = 2:30)
- [ ] Handle extremely short time controls (under 1 minute)
- [ ] Handle time running out during piece animation
- [ ] Handle pause during AI thinking time
- [ ] Handle time controls with offline mode
- [ ] Handle precision timing near zero (prevent negative time)
- [ ] Handle browser performance throttling in background tabs

## Implementation Checklist

### Phase 1: Foundation
- [ ] **Step 1**: Design time control data structures and types (Complexity: Simple)
  - Implements: FR-001, FR-002
  - Verification: TypeScript types compile without errors
  - Create TimeControl interface with format, initial time, increment
  - Create TimeState interface with remaining time for each player
  - Add time fields to existing game state interfaces

- [ ] **Step 2**: Create time control UI components (Complexity: Medium)
  - Implements: FR-001, FR-007
  - Dependencies: Step 1
  - Verification: Components render with mock data
  - Create TimeDisplay component showing MM:SS format
  - Create TimeControlSelector with preset buttons
  - Add visual active player indication

- [ ] **Step 3**: Implement time control configuration UI (Complexity: Medium)
  - Implements: FR-002, FR-006, FR-011
  - Dependencies: Step 1, Step 2
  - Verification: Can select presets and enter custom values
  - Create preset selector with Bullet/Blitz/Rapid/Classical options
  - Add custom input with X|Y and X+Y format parsing
  - Implement input validation and error messages

### Phase 2: Core Timer Functionality
- [ ] **Step 4**: Implement countdown timer logic (Complexity: Complex)
  - Implements: FR-003, FR-004
  - Dependencies: Step 1
  - Verification: Timer counts down accurately
  - Create useTimer hook with start, stop, pause, resume
  - Handle requestAnimationFrame for smooth updates
  - Implement increment addition after moves

- [ ] **Step 5**: Integrate timers with game flow (Complexity: Complex)
  - Implements: FR-003, FR-004, FR-005
  - Dependencies: Step 4
  - Verification: Timers start/stop with turns
  - Start appropriate timer on turn change
  - Stop timer and add increment on valid move
  - Detect time expiration and trigger game end

- [ ] **Step 6**: Add pause/resume functionality (Complexity: Medium)
  - Implements: FR-008, FR-017
  - Dependencies: Step 4, Step 5
  - Verification: Can pause and resume with UI and keyboard
  - Add pause button to game controls
  - Implement space bar keyboard shortcut
  - Store pause state and elapsed time

### Phase 3: Warnings and Feedback
- [ ] **Step 7**: Implement visual time warnings (Complexity: Simple)
  - Implements: FR-012, FR-024
  - Dependencies: Step 2, Step 4
  - Verification: Visual changes at time thresholds
  - Add CSS classes for warning states (30s, 10s)
  - Implement pulsing animation for critical time
  - Add time pressure indicator comparing both clocks

- [ ] **Step 8**: Add audio warning system (Complexity: Medium)
  - Implements: FR-013, FR-023
  - Dependencies: Step 4
  - Verification: Audio plays at correct times
  - Create audio service with warning sounds
  - Add settings to enable/disable audio
  - Implement countdown beeps at 10, 5, 3, 2, 1 seconds

### Phase 4: State Management and Persistence
- [ ] **Step 9**: Integrate with game state management (Complexity: Medium)
  - Implements: FR-009
  - Dependencies: Step 1, Step 5
  - Verification: Time state updates with game state
  - Add time fields to GameController state
  - Update move handler to manage time
  - Include time in game reset logic

- [ ] **Step 10**: Implement persistence layer (Complexity: Medium)
  - Implements: FR-009, FR-016
  - Dependencies: Step 9
  - Verification: Time persists across refresh
  - Add time to localStorage/IndexedDB schema
  - Update save/load functions
  - Add time to database schema if needed

- [ ] **Step 11**: Multi-tab synchronization (Complexity: Complex)
  - Implements: FR-010
  - Dependencies: Step 9, Step 10
  - Verification: Time syncs across tabs
  - Extend multi-tab sync protocol for time updates
  - Handle clock synchronization and drift
  - Implement conflict resolution for time states

### Phase 5: AI Integration
- [ ] **Step 12**: Integrate time controls with AI mode (Complexity: Medium)
  - Implements: FR-003, FR-004
  - Dependencies: Step 5
  - Verification: AI moves respect time controls
  - Start AI timer when AI turn begins
  - Stop timer when AI makes move
  - Add configurable AI thinking time limits

### Phase 6: Statistics and Analytics
- [ ] **Step 13**: Add time tracking to game statistics (Complexity: Simple)
  - Implements: FR-015
  - Dependencies: Step 5
  - Verification: Stats show time information
  - Track move times for statistics
  - Calculate and display average move time
  - Show time used vs time remaining

- [ ] **Step 14**: Implement time control history (Complexity: Medium)
  - Implements: FR-021
  - Dependencies: Step 13
  - Verification: Can view time usage patterns
  - Store time per move in move history
  - Create time usage visualization
  - Add time analytics to game summary

### Phase 7: Advanced Features
- [ ] **Step 15**: Add time handicap system (Complexity: Medium)
  - Implements: FR-018, FR-019
  - Dependencies: Step 3, Step 5
  - Verification: Can set different times per player
  - Extend configuration for asymmetric time
  - Update UI to show different initial times
  - Test with various handicap scenarios

- [ ] **Step 16**: Implement alternative time control formats (Complexity: Complex)
  - Implements: FR-020, FR-025
  - Dependencies: Step 4
  - Verification: Alternative formats work correctly
  - Add Bronstein delay option
  - Implement Fischer increment variant
  - Add sudden death overtime format

### Phase 8: Testing and Polish
- [ ] **Step 17**: Comprehensive testing (Complexity: Medium)
  - Implements: All FRs
  - Dependencies: All previous steps
  - Verification: All tests pass
  - Unit tests for timer logic
  - Integration tests for game flow
  - E2E tests for complete time control scenarios
  - Performance tests for timer accuracy

- [ ] **Step 18**: Documentation and polish (Complexity: Simple)
  - Dependencies: All previous steps
  - Verification: Documentation complete
  - Add help text for time controls
  - Create user guide for time formats
  - Polish animations and transitions

## Technical Notes

### Architecture Considerations
- **Timer Implementation**: Use requestAnimationFrame for smooth visual updates, with Date.now() for accuracy
- **State Management**: Extend existing game state with TimeControlState interface
- **Multi-tab Sync**: Leverage existing WebSocket/SSE infrastructure for time synchronization
- **Performance**: Minimize re-renders using React.memo and useCallback for timer components

### Data Models
```typescript
interface TimeControl {
  format: 'X|Y' | 'X+Y'; // Display format preference
  initialMinutes: number; // Starting time in minutes
  incrementSeconds: number; // Seconds added per move
  preset?: 'bullet' | 'blitz' | 'rapid' | 'classical' | 'custom';
}

interface TimeState {
  redTime: number; // Milliseconds remaining
  blackTime: number; // Milliseconds remaining
  activePlayer: PieceColor | null;
  isPaused: boolean;
  lastUpdateTime: number; // Timestamp for sync
}

interface TimedMove extends Move {
  timeSpent: number; // Milliseconds
  timeRemaining: number; // After move
}
```

### Component Structure
- **TimeDisplay**: Shows individual clock with formatting
- **TimeControlPanel**: Contains both clocks and controls
- **TimeControlSelector**: Configuration UI for game setup
- **TimeWarning**: Visual/audio warning component
- **TimePressureBar**: Visual comparison of time remaining

### Integration Points
1. **GameController**: Main integration for time state management
2. **GameStats**: Display time-related statistics
3. **useGameStorage**: Persist time state
4. **useMultiTabSync**: Synchronize time across tabs
5. **Board**: Visual feedback for time pressure
6. **Game Database Schema**: Add time control fields

### Performance Requirements
- Timer accuracy: ±50ms tolerance
- Visual update rate: 60 FPS (using RAF)
- State update rate: 100ms for network sync
- Audio latency: <100ms for warnings
- Background tab handling: Pause or compensate for throttling

### Browser Compatibility
- Page Visibility API for background detection
- Web Audio API for warning sounds
- Performance.now() for high-precision timing
- localStorage/IndexedDB for persistence
- WebWorker consideration for timer isolation

### Accessibility
- Screen reader announcements for time warnings
- Keyboard controls for pause/resume
- High contrast mode for time displays
- Configurable warning thresholds
- Option to disable audio warnings

## Testing Strategy

### Unit Tests
- Timer accuracy and increment logic
- Time format parsing and validation
- Time expiration detection
- Warning threshold calculations

### Integration Tests
- Timer integration with game flow
- Persistence and restoration
- Multi-tab synchronization
- AI mode compatibility

### E2E Tests
- Complete games with various time controls
- Pause/resume during gameplay
- Time expiration scenarios
- Cross-browser compatibility

### Performance Tests
- Timer accuracy under load
- Memory usage over long games
- Synchronization latency
- Background throttling impact

## Risk Mitigation
- **Browser Throttling**: Use Page Visibility API and compensate for lost time
- **Network Latency**: Use optimistic updates with server reconciliation
- **Timer Drift**: Periodic sync with server timestamp
- **Audio Support**: Graceful fallback if Web Audio unavailable
- **Performance**: Option to reduce update frequency on low-end devices

## Dependencies
- No new external dependencies required
- Utilizes existing T3 Stack infrastructure
- Leverages current multi-tab sync system
- Extends existing game state management

## References
- Related ticket: TICKET-003 (Multi-tab synchronization)
- Chess.com time control implementation
- Lichess.org time control documentation
- FIDE time control regulations for reference
