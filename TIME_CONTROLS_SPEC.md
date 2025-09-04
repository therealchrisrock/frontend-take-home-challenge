# Time Controls Feature Specification

## Overview
Add chess-style time controls to the Checkers game, allowing players to play with timed moves. Each player has a clock that counts down during their turn, with optional increment added after each move.

## Time Control Formats

### Display Format: "X | Y"
- **X**: Initial time in minutes for each player
- **Y**: Increment in seconds added after each move
- Examples:
  - `5 | 0` - 5 minutes per player, no increment (Blitz)
  - `3 | 2` - 3 minutes per player, 2 seconds added per move
  - `10 | 5` - 10 minutes per player, 5 seconds added per move

### Alternative Format: "X+Y"
- Same meaning as "X | Y" but different notation
- Should be parseable as input but display as "X | Y" for consistency

## User Interface

### Pre-Game Setup
```typescript
interface TimeControlSettings {
  enabled: boolean;
  initialMinutes: number;  // 1-60
  incrementSeconds: number; // 0-30
  preset?: 'bullet' | 'blitz' | 'rapid' | 'classical' | 'custom';
}

// Preset configurations
const TIME_PRESETS = {
  bullet: { minutes: 1, increment: 0, label: "1 | 0 Bullet" },
  blitz: { minutes: 5, increment: 0, label: "5 | 0 Blitz" },
  rapid: { minutes: 10, increment: 5, label: "10 | 5 Rapid" },
  classical: { minutes: 30, increment: 0, label: "30 | 0 Classical" },
};
```

### In-Game Display
- **Clock Position**: Display both player clocks near the board
  - Red player clock: Top of board
  - Black player clock: Bottom of board
- **Active Clock Indicator**: Highlight the active player's clock
- **Time Format**: 
  - MM:SS for times >= 1 minute
  - SS.T for times < 1 minute (showing tenths)
  - Red text when < 10 seconds remaining

### Clock Component Design
```tsx
interface ClockDisplayProps {
  timeRemaining: number; // in milliseconds
  isActive: boolean;
  player: 'red' | 'black';
  isPaused: boolean;
}

// Visual states
- Active: Pulsing border or background
- Low time: Red text, possible audio warning
- Expired: Crossed out, game over indicator
```

## Game Logic Integration

### State Management
```typescript
interface TimeControlState {
  enabled: boolean;
  redTime: number;      // milliseconds remaining
  blackTime: number;    // milliseconds remaining
  activePlayer: 'red' | 'black' | null;
  increment: number;    // milliseconds to add per move
  lastMoveTime: number; // timestamp of last move
  isPaused: boolean;
  winner?: 'red' | 'black' | 'draw';
}
```

### Clock Mechanics
1. **Start**: Clock starts when first move is made
2. **Switch**: Clock switches immediately after a valid move
3. **Increment**: Added to player's time AFTER completing their move
4. **Pause**: Both clocks pause during:
   - Game menu open
   - Connection issues (if online)
   - Browser tab inactive
5. **Resume**: Clocks resume when game resumes

### Time Expiration
- When a player's time reaches 0:
  - Immediate loss for that player
  - Exception: If opponent has insufficient material (lone king vs king)
  - Display "Time expired" message
  - Prevent further moves

## Technical Implementation

### Timer Management
```typescript
class GameTimer {
  private intervalId: NodeJS.Timeout | null;
  private lastUpdate: number;
  
  start(callback: (elapsed: number) => void): void;
  pause(): void;
  resume(): void;
  stop(): void;
  
  // Handle tab visibility changes
  handleVisibilityChange(): void;
}
```

### tRPC Procedures (if multiplayer)
```typescript
// Server procedures
game.setTimeControl.mutation({
  input: z.object({
    gameId: z.string(),
    minutes: z.number().min(1).max(60),
    increment: z.number().min(0).max(30),
  }),
});

game.syncTime.query({
  input: z.object({
    gameId: z.string(),
  }),
  // Returns current time state for both players
});
```

### Database Schema (if persisting)
```prisma
model Game {
  // existing fields...
  timeControlEnabled Boolean @default(false)
  initialMinutes     Int?
  incrementSeconds   Int?
  redTimeRemaining   Int?    // milliseconds
  blackTimeRemaining Int?    // milliseconds
  lastMoveTimestamp  DateTime?
}
```

## Performance Considerations

### Update Frequency
- Update display every 100ms when > 10 seconds
- Update display every 50ms when <= 10 seconds
- Use requestAnimationFrame for smooth updates

### Accuracy
- Use performance.now() for precise timing
- Account for network latency in multiplayer
- Implement server-side validation for competitive play

### Memory Management
- Clear intervals when component unmounts
- Debounce time sync requests
- Cache time calculations

## User Experience Features

### Settings & Preferences
- Save preferred time control as default
- Option to disable low-time warnings
- Volume control for time warning sounds
- Clock position preference (left/right of board)

### Visual Feedback
- Smooth countdown animations
- Color transitions as time decreases:
  - Green: > 60 seconds
  - Yellow: 30-60 seconds  
  - Orange: 10-30 seconds
  - Red: < 10 seconds
  - Flashing: < 5 seconds

### Audio Cues (Optional)
- Tick sound when < 10 seconds
- Warning beep at 5 seconds
- Different sound for time expiration
- Mutable via settings

## Testing Requirements

### Unit Tests
- Time calculation accuracy
- Increment application
- Pause/resume functionality
- Time expiration detection
- Format conversion (X|Y vs X+Y)

### Integration Tests
- Clock synchronization with moves
- Time persistence across refreshes
- Multiplayer time sync
- Tab visibility handling

### E2E Tests
- Complete timed game flow
- Time control preset selection
- Clock display updates
- Game end on time expiration

## Accessibility

- Keyboard shortcuts for pause/resume
- Screen reader announcements for time warnings
- High contrast mode for clock display
- Option for larger clock text

## Future Enhancements

### Phase 2
- Time odds (different times for each player)
- Fischer increment vs Bronstein delay
- Time control changes mid-game (for tournaments)
- Byo-yomi (overtime periods)

### Phase 3
- Tournament time controls (multiple periods)
- Time statistics and analytics
- Speed ratings based on time control
- Time pressure training mode

## Implementation Priority

1. **Core Timer Logic** - Basic countdown functionality
2. **UI Components** - Clock display and controls  
3. **Game Integration** - Connect timers to game flow
4. **Settings UI** - Time control selection
5. **Polish** - Animations, sounds, warnings
6. **Persistence** - Save/restore timed games
7. **Multiplayer** - Sync clocks across clients

## Acceptance Criteria

- [ ] Players can select from preset time controls
- [ ] Players can create custom time controls
- [ ] Clocks display accurately during gameplay
- [ ] Time increments apply after each move
- [ ] Game ends when time expires
- [ ] Clocks pause when game is paused
- [ ] Time controls persist across page refreshes
- [ ] Clear visual indicators for active clock
- [ ] Low time warnings (visual and optional audio)
- [ ] Settings to customize time control preferences
