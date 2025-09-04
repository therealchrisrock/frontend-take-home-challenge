# State Management Design

## Core Game State

**Decision**: Local React state in GameController component

```typescript
const [board, setBoard] = useState<Board>(createInitialBoard);
const [currentPlayer, setCurrentPlayer] = useState<PieceColor>('red');
const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
```

**Trade-offs**:
- ✅ Simple and direct
- ✅ No external dependencies
- ✅ Easy to test
- ❌ State lost on refresh (mitigated by localStorage)
- ❌ Prop drilling for deeply nested components

## Persistence Strategy

**Three-tier approach**:
1. **Memory** (React state) - Immediate updates
2. **localStorage** - Browser persistence via `useGameStorage` hook
3. **Database** - Long-term storage via tRPC/Prisma

**Key Decision**: Debounced saves to prevent excessive writes
```typescript
// Save to localStorage immediately
// Save to database every 5 moves or on game end
```

## State Synchronization

**Multi-tab sync via BroadcastChannel API**:
- Master tab owns game state
- Other tabs receive updates
- Automatic master election on tab close

**Trade-offs**:
- ✅ Real-time sync without server roundtrip
- ✅ Works offline
- ❌ Browser API compatibility (fallback to localStorage polling)
- ❌ Complex conflict resolution

## Optimistic Updates

**Decision**: Update UI immediately, reconcile with server

**Implementation**:
```typescript
// 1. Update local state
setBoard(newBoard);
// 2. Send to server (async)
saveGame.mutate({ board: newBoard });
// 3. Rollback on error
onError: () => setBoard(previousBoard)
```

**Trade-off**: Better UX vs. potential inconsistency
