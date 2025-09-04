# Offline Support Strategy

## Progressive Web App Approach

**Three-layer resilience**:
1. **Offline-first**: Game fully playable without connection
2. **Sync when online**: Automatic background synchronization
3. **Conflict resolution**: Last-write-wins with version tracking

## Implementation

**useOfflineSync hook**:
```typescript
const { isOnline, pendingSync, syncStatus } = useOfflineSync({
  onReconnect: async () => {
    // 1. Check for pending local changes
    const localChanges = getLocalQueue();
    
    // 2. Push changes to server
    await syncToServer(localChanges);
    
    // 3. Pull latest from server
    const serverState = await fetchServerState();
    
    // 4. Merge states (server wins conflicts)
    mergeStates(localState, serverState);
  }
});
```

## Storage Strategy

**IndexedDB for complex data**:
- Game history
- Move replays
- User preferences
- Friend lists

**localStorage for simple state**:
- Current game
- Settings
- Session data

**Trade-offs**:
- ✅ Full offline capability
- ✅ Seamless experience
- ❌ Storage limits (10MB localStorage, 50MB+ IndexedDB)
- ❌ Sync complexity

## Queue Management

**Actions queued while offline**:
```typescript
interface OfflineQueue {
  actions: Action[];
  timestamp: number;
  retryCount: number;
}

// Add to queue when offline
if (!navigator.onLine) {
  queueAction({ type: 'SAVE_GAME', payload: gameState });
}

// Process queue on reconnect
window.addEventListener('online', processQueue);
```

## Conflict Resolution

**Strategy**: Version vectors + last-write-wins
- Each change has version number
- Server version > local version = accept server
- UI shows conflict notification
