# SSE Implementation Test Checklist

## Test the simplified "always alive" SSE implementation

### 1. Firefox Hard Refresh Test
- [ ] Open the app in Firefox
- [ ] Open Developer Console (F12)
- [ ] Press Ctrl+F5 (hard refresh)
- [ ] Check console - should NOT show "connection interrupted" error
- [ ] Verify SSE reconnects automatically (look for "SSE: Connection opened" in console)

### 2. Background Tab Test  
- [ ] Open the app in any browser
- [ ] Open Developer Console
- [ ] Switch to another tab for 1+ minute
- [ ] Return to the app tab
- [ ] Check that connection is still alive (look for heartbeat messages)
- [ ] Verify notifications are still received

### 3. Network Interruption Test
- [ ] Open the app
- [ ] Open Developer Console
- [ ] Disable network (Developer tools > Network > Offline)
- [ ] Wait 10 seconds
- [ ] Re-enable network
- [ ] Verify auto-reconnection happens (look for "SSE: Browser reconnecting..." then "SSE: Connection opened")

### 4. Page Navigation Test
- [ ] Open the app
- [ ] Navigate to a different page in the app
- [ ] Navigate back
- [ ] Verify new SSE connection is established cleanly
- [ ] Check for any console errors

### 5. Multiple Tabs Test
- [ ] Open the app in multiple tabs (3+)
- [ ] Check Developer Console in each tab
- [ ] Verify each tab maintains its own SSE connection
- [ ] Send a notification and verify all tabs receive it

### 6. Long Running Test
- [ ] Open the app
- [ ] Leave it open for 10+ minutes
- [ ] Monitor console for heartbeat messages
- [ ] Verify connection remains stable
- [ ] Check that no "connection interrupted" errors appear

## Expected Console Messages

### Good (Expected):
```text
SSE: Connecting to /api/notifications/stream?tabId=tab_xxxxx
SSE: Connection opened
SSE: Heartbeat received
SSE state change: disconnected -> connecting (/api/notifications/stream)
SSE state change: connecting -> connected (/api/notifications/stream)
```

### Bad (Should NOT appear):
```text
connection interrupted
intentionally_disconnected
SSE heartbeat timeout, connection may be stale
```

## Summary of Changes

The SSE client has been simplified from ~370 lines to ~270 lines with these improvements:

1. **Removed complex state machine** - No more `intentionally_disconnected` state
2. **Always alive pattern** - Connection stays active during normal usage
3. **Browser-managed reconnection** - Let EventSource handle auto-reconnection
4. **Firefox-specific cleanup** - Proper handling of pagehide/beforeunload events
5. **Simplified error handling** - No manual reconnection logic

The connection is now "dumb" - it always tries to stay connected unless explicitly destroyed.
