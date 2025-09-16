# Unified tRPC SSE Subscription System - Test Checklist

## Overview
This document provides a comprehensive testing checklist for verifying the unified tRPC SSE subscription system is working correctly.

## Prerequisites
- [ ] Database is running (PostgreSQL/SQLite)
- [ ] Environment variables are configured
- [ ] Application is running in development mode (`pnpm dev`)
- [ ] At least 2 test user accounts exist

## 1. Connection Tests

### 1.1 Initial Connection
- [ ] Open Chrome DevTools → Network tab
- [ ] Login to the application
- [ ] Filter Network tab by "events.onAllEvents"
- [ ] **Verify**: Exactly ONE EventSource connection exists
- [ ] **Verify**: Connection type is "eventsource" or "text/event-stream"
- [ ] **Verify**: Connection remains open (status: pending)
- [ ] **Verify**: Initial CONNECTION_STATUS event received with `connected: true`

### 1.2 Heartbeat
- [ ] Keep the application open for 2 minutes
- [ ] Monitor Network tab → EventSource → Messages
- [ ] **Verify**: HEARTBEAT events received every 30 seconds
- [ ] **Verify**: No connection drops between heartbeats

### 1.3 Reconnection
- [ ] Open Network tab
- [ ] Disconnect internet/WiFi
- [ ] **Verify**: Connection state changes to "disconnected" or "reconnecting"
- [ ] Reconnect internet/WiFi
- [ ] **Verify**: Automatic reconnection occurs
- [ ] **Verify**: CONNECTION_STATUS event with `connected: true` received
- [ ] **Verify**: Only ONE connection exists after reconnection

## 2. Real-Time Notifications

### 2.1 Friend Request Notifications
**Setup**: Use 2 browser windows (User A and User B)

- [ ] User A: Login and navigate to any page
- [ ] User B: Login and go to Friends page
- [ ] User B: Send friend request to User A
- [ ] **Verify** (User A): Notification badge appears immediately
- [ ] **Verify** (User A): Toast notification appears
- [ ] **Verify** (User A): Notification dropdown shows new friend request
- [ ] **Verify** (Network): NOTIFICATION_CREATED event in EventSource

### 2.2 Notification Actions
- [ ] User A: Click "Mark as Read" on notification
- [ ] **Verify**: Notification marked as read visually
- [ ] **Verify** (Network): NOTIFICATION_READ event emitted
- [ ] User A: Click "Mark All as Read"
- [ ] **Verify**: All notifications marked as read
- [ ] **Verify**: Badge count updates to 0

## 3. Real-Time Messaging

### 3.1 Direct Messages
**Setup**: 2 browser windows (User A and User B)

- [ ] Both users: Navigate to Messages page
- [ ] User A: Start conversation with User B
- [ ] User A: Send message "Hello"
- [ ] **Verify** (User B): Message appears instantly
- [ ] **Verify** (User B): Notification badge updates
- [ ] **Verify** (Network): MESSAGE_RECEIVED event in User B's EventSource
- [ ] **Verify**: No duplicate messages appear

### 3.2 Typing Indicators
- [ ] User A: Start typing in message input
- [ ] **Verify** (User B): "User A is typing..." appears
- [ ] **Verify** (Network): TYPING_START event
- [ ] User A: Stop typing (clear input)
- [ ] **Verify** (User B): Typing indicator disappears
- [ ] **Verify** (Network): TYPING_STOP event

### 3.3 Message Read Status
- [ ] User B: Open conversation with unread messages
- [ ] **Verify**: Messages marked as read
- [ ] **Verify** (User A): Read receipts update (if implemented)

## 4. Game Real-Time Updates

### 4.1 Game Moves
**Setup**: 2 browser windows (User A and User B)

- [ ] User A: Create new game
- [ ] User B: Join the game
- [ ] User A: Make a move
- [ ] **Verify** (User B): Board updates immediately
- [ ] **Verify** (User B): Turn indicator changes
- [ ] **Verify** (Network): GAME_MOVE event in EventSource
- [ ] User B: Make a move
- [ ] **Verify** (User A): Board updates immediately

### 4.2 Game Invitations
- [ ] User A: Create private game
- [ ] User A: Send invite to User B
- [ ] **Verify** (User B): Game invite notification appears
- [ ] **Verify** (Network): GAME_INVITE event
- [ ] User B: Accept invitation
- [ ] **Verify**: Both users in same game

### 4.3 Game End Events
- [ ] Complete a game (win/lose/draw)
- [ ] **Verify**: Both players receive game end notification
- [ ] **Verify**: Stats update in real-time

## 5. Presence System

### 5.1 Online Status
**Setup**: 2 browser windows (User A and User B are friends)

- [ ] Both users: Go to Friends list
- [ ] **Verify**: Both show as "online" to each other
- [ ] User B: Logout
- [ ] **Verify** (User A): User B changes to "offline" within 10 seconds
- [ ] **Verify** (Network): USER_OFFLINE event

### 5.2 Away Status
- [ ] User A: Set status to "Away" (if available)
- [ ] **Verify** (User B): User A shows as "away"
- [ ] **Verify** (Network): USER_AWAY event

## 6. Performance Tests

### 6.1 Memory Usage
- [ ] Open Chrome DevTools → Performance Monitor
- [ ] Note initial memory usage
- [ ] Keep app open for 30 minutes with activity
- [ ] **Verify**: Memory usage remains stable (no significant growth)
- [ ] **Verify**: No memory leaks in heap snapshot comparison

### 6.2 Multiple Tabs
- [ ] Open application in 3+ tabs (same user)
- [ ] **Verify**: Each tab has its own SSE connection
- [ ] Send notification to this user
- [ ] **Verify**: All tabs receive the notification
- [ ] **Verify**: No duplicate processing

### 6.3 High Frequency Events
- [ ] Trigger rapid events (e.g., fast typing, quick game moves)
- [ ] **Verify**: UI remains responsive
- [ ] **Verify**: No event queue backup
- [ ] **Verify**: Events processed in order

## 7. Error Handling

### 7.1 Server Errors
- [ ] Stop the backend server
- [ ] **Verify**: Connection error displayed to user
- [ ] **Verify**: Reconnection attempts shown
- [ ] Restart backend server
- [ ] **Verify**: Automatic reconnection succeeds

### 7.2 Network Errors
- [ ] Simulate slow network (Chrome DevTools → Network → Slow 3G)
- [ ] **Verify**: App remains functional
- [ ] **Verify**: Events eventually delivered
- [ ] Simulate network failure (Offline)
- [ ] **Verify**: Appropriate error state shown
- [ ] **Verify**: Queued actions (if implemented)

### 7.3 Auth Errors
- [ ] Invalidate session (clear cookies/logout elsewhere)
- [ ] **Verify**: SSE connection closes
- [ ] **Verify**: User redirected to login
- [ ] **Verify**: No auth errors in console

## 8. Browser Compatibility

### 8.1 Chrome/Edge
- [ ] All real-time features work
- [ ] SSE connection stable
- [ ] No console errors

### 8.2 Firefox
- [ ] All real-time features work
- [ ] SSE connection stable
- [ ] No console errors

### 8.3 Safari
- [ ] All real-time features work
- [ ] SSE connection stable
- [ ] No console errors

### 8.4 Mobile Browsers
- [ ] Test on iOS Safari
- [ ] Test on Chrome Android
- [ ] **Verify**: Reconnection works after backgrounding app

## 9. Security Tests

### 9.1 Authorization
- [ ] User A: Try to access User B's private channels
- [ ] **Verify**: No unauthorized events received
- [ ] **Verify**: Server rejects unauthorized subscriptions

### 9.2 Data Validation
- [ ] Inspect event payloads in Network tab
- [ ] **Verify**: No sensitive data exposed
- [ ] **Verify**: User can only receive their own events

## 10. Integration Tests

### 10.1 Full User Journey
- [ ] Login → Receive notification → Read notification
- [ ] Send message → Receive reply → Mark as read
- [ ] Create game → Play moves → Complete game
- [ ] **Verify**: All events flow correctly
- [ ] **Verify**: State consistency across features

### 10.2 State Recovery
- [ ] Refresh page mid-conversation
- [ ] **Verify**: Messages still present
- [ ] **Verify**: SSE reconnects automatically
- [ ] Refresh page mid-game
- [ ] **Verify**: Game state restored
- [ ] **Verify**: Can continue playing

## Test Summary

### Critical Issues Found
- [ ] List any blocking issues

### Non-Critical Issues
- [ ] List any minor issues

### Performance Metrics
- Initial connection time: _____ ms
- Heartbeat interval: _____ seconds
- Reconnection time: _____ seconds
- Event delivery latency: _____ ms
- Memory usage after 30 min: _____ MB

### Browser-Specific Issues
- Chrome: _____
- Firefox: _____
- Safari: _____
- Mobile: _____

## Sign-Off
- [ ] All critical tests passing
- [ ] Performance acceptable
- [ ] No security issues found
- [ ] Ready for production

**Tested by**: _____________
**Date**: _____________
**Version**: _____________
