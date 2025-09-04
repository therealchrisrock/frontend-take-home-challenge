# Multi-Tab Synchronization

## The Problem

Users open multiple tabs → Each tab has its own state → Inconsistent game state

## Solution: BroadcastChannel API + Master Election (Online Games Only)

**Update**: Multi-tab sync is now only enabled for online multiplayer games. Local and AI games maintain independent state per tab.

**Architecture**:
```text
Tab A (Master)          Tab B               Tab C
    |                     |                   |
    ├── Owns game state   ├── Read-only      ├── Read-only
    ├── Processes moves   ├── Receives updates├── Receives updates
    └── Broadcasts state  └── Can request    └── Can request
                              master role        master role
```

## Implementation Details

**useMultiTabSync hook** (GameController.tsx:98-136):
```typescript
// Only connects for online games
if (gameId && !isLoading && gameMode === 'online') {
  syncActions.connect();
}

// Master broadcasts state changes
channel.postMessage({
  type: 'STATE_UPDATE',
  state: gameState,
  tabId: masterTabId
});

// Non-master tabs receive and apply
channel.onmessage = (event) => {
  if (event.data.type === 'STATE_UPDATE') {
    setLocalState(event.data.state);
  }
};
```

**Game Mode Restrictions**:
- **Online games**: Full multi-tab sync enabled
- **Local games**: Each tab independent
- **AI games**: Each tab runs its own AI opponent

## Master Election Protocol

1. **On tab load**: Check for existing master via ping
2. **No response**: Become master
3. **Master exists**: Remain follower
4. **Master closes**: First responder becomes new master

**Trade-offs**:
- ✅ Real-time synchronization
- ✅ No server dependency
- ✅ Works offline
- ❌ Browser API support (86% coverage)
- ❌ Race conditions during election

## Fallback Strategy

**For unsupported browsers**: localStorage + polling
```typescript
// Write state with timestamp
localStorage.setItem('game-state', JSON.stringify({
  data: gameState,
  timestamp: Date.now()
}));

// Poll for changes every 500ms
setInterval(checkForUpdates, 500);
```

**Cost**: Higher CPU usage, slight delay
