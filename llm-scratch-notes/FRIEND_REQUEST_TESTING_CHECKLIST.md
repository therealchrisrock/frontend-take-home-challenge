# Friend Request System - Testing Checklist

## Overview
This checklist covers comprehensive testing for the friend request notification system implemented across Groups 1-8. Use this checklist to validate the complete flow from database operations to real-time UI updates.

## Pre-Testing Setup

### Database Verification
- [ ] Database schema includes `FriendRequest` and `Notification` models
- [ ] All required indexes are created
- [ ] Database migration completed successfully
- [ ] Seed data includes test users for friend request scenarios

### Environment Setup
- [ ] Development server running on expected port
- [ ] SSE endpoint accessible at `/api/notifications/stream`
- [ ] tRPC router properly registered and accessible
- [ ] Authentication working (NextAuth.js)

---

## Unit Testing Validation

### tRPC Procedures (Group 2)
- [ ] All `friendRequest` procedures execute successfully
  - [ ] `send` - Creates request and notification
  - [ ] `getPending` - Returns received requests
  - [ ] `getSent` - Returns sent requests  
  - [ ] `accept` - Creates friendship and notifications
  - [ ] `decline` - Updates status and creates notifications
  - [ ] `cancel` - Cancels request and cleans up
  - [ ] `checkStatus` - Returns correct relationship status

- [ ] Error handling works correctly
  - [ ] Self-requests blocked
  - [ ] Duplicate requests prevented
  - [ ] Blocked user requests rejected
  - [ ] Unauthorized access prevented
  - [ ] Non-existent users handled

### React Hooks Testing (Group 4)
- [ ] `useNotifications` hook functions correctly
  - [ ] SSE connection established when authenticated
  - [ ] Connection state updates properly
  - [ ] Notifications loaded from server
  - [ ] Real-time updates received via SSE
  - [ ] Optimistic updates work
  - [ ] Error recovery handles failures
  - [ ] Cleanup on unmount

### UI Components Testing (Group 6)
- [ ] `NotificationDropdown` component works
  - [ ] Badge count displays correctly
  - [ ] Dropdown opens/closes properly
  - [ ] Friend request notifications shown
  - [ ] Accept/decline buttons functional
  - [ ] Loading states handled
  - [ ] Error states handled
  - [ ] Empty state displayed when needed

---

## Integration Testing

### Database → tRPC Integration
- [ ] Friend request creation writes to database correctly
- [ ] Notifications created with proper metadata
- [ ] Friendship records created on acceptance
- [ ] Status updates persist correctly
- [ ] Related notifications cleaned up properly

### tRPC → React Integration
- [ ] tRPC queries return expected data format
- [ ] React Query cache updates correctly
- [ ] Mutations trigger cache invalidation
- [ ] Loading states shown during API calls
- [ ] Error handling displays user-friendly messages

### SSE → React Integration
- [ ] SSE messages parsed correctly by hooks
- [ ] Notification state updates in real-time
- [ ] Connection state accurately reflects SSE status
- [ ] Reconnection logic works after disconnection
- [ ] Single-tab enforcement functions properly

---

## Manual Testing Scenarios

### Core Friend Request Flow

#### Scenario 1: Send Friend Request
**Prerequisites:** Two authenticated users (User A, User B)

1. **User A sends request to User B:**
   - [ ] Navigate to User B's profile or friends page
   - [ ] Click "Add Friend" or equivalent button
   - [ ] Optional: Enter friend request message
   - [ ] Submit request
   - [ ] **Expected:** Success notification shown
   - [ ] **Expected:** Button changes to "Request Sent" or similar

2. **Verify database state:**
   - [ ] `FriendRequest` record created with status `PENDING`
   - [ ] `Notification` created for User B
   - [ ] No duplicate requests allowed

3. **Verify User B receives notification:**
   - [ ] Notification bell shows unread count
   - [ ] SSE delivers real-time notification
   - [ ] Toast notification appears
   - [ ] Friend request visible in notifications dropdown

#### Scenario 2: Accept Friend Request
**Prerequisites:** User B has pending request from User A

1. **User B accepts request:**
   - [ ] Open notifications dropdown
   - [ ] Locate User A's friend request
   - [ ] Click "Accept" button
   - [ ] **Expected:** Success toast notification
   - [ ] **Expected:** Request removed from pending list

2. **Verify friendship creation:**
   - [ ] `Friendship` record created
   - [ ] `FriendRequest` status updated to `ACCEPTED`
   - [ ] Acceptance notification sent to User A

3. **Verify User A receives acceptance:**
   - [ ] Real-time notification received
   - [ ] User B appears in User A's friends list
   - [ ] Both users can see friendship status

#### Scenario 3: Decline Friend Request
**Prerequisites:** User B has pending request from User A

1. **User B declines request:**
   - [ ] Open notifications dropdown  
   - [ ] Click "Decline" button on User A's request
   - [ ] **Expected:** Request removed from UI
   - [ ] **Expected:** Decline confirmation

2. **Verify decline handling:**
   - [ ] `FriendRequest` status updated to `DECLINED`
   - [ ] Notification sent to User A (optional based on UX decision)
   - [ ] No friendship record created

#### Scenario 4: Cancel Sent Request
**Prerequisites:** User A has sent request to User B

1. **User A cancels request:**
   - [ ] Navigate to sent requests
   - [ ] Click "Cancel" on request to User B
   - [ ] **Expected:** Request removed from sent list

2. **Verify cancellation:**
   - [ ] `FriendRequest` status updated to `CANCELLED`
   - [ ] User B's notification removed
   - [ ] User B no longer sees pending request

### Edge Cases and Error Scenarios

#### Scenario 5: Duplicate Request Prevention
1. **User A attempts to send duplicate request:**
   - [ ] Send initial request to User B
   - [ ] Attempt to send another request to User B
   - [ ] **Expected:** Error message "Friend request already exists"
   - [ ] **Expected:** No duplicate database records

#### Scenario 6: Blocked User Interactions
**Prerequisites:** User B has blocked User A

1. **User A attempts to send request:**
   - [ ] Navigate to User B's profile
   - [ ] **Expected:** Add friend option not available OR
   - [ ] Attempt to send request fails with "Cannot send friend request"

#### Scenario 7: Self-Request Prevention
1. **User A attempts to send request to themselves:**
   - [ ] Navigate to own profile
   - [ ] **Expected:** Add friend option not shown OR
   - [ ] Attempt fails with "Cannot send friend request to yourself"

#### Scenario 8: Non-existent User
1. **Send request to non-existent user ID:**
   - [ ] Use invalid user ID in API call
   - [ ] **Expected:** "User not found" error
   - [ ] **Expected:** No database records created

### Real-time & Connection Testing

#### Scenario 9: SSE Connection Management
1. **Test connection establishment:**
   - [ ] Log in to application
   - [ ] **Expected:** SSE connection opened automatically
   - [ ] **Expected:** Connection status shows "connected"

2. **Test reconnection logic:**
   - [ ] Simulate network disconnect
   - [ ] **Expected:** Connection status shows "reconnecting"
   - [ ] Restore network connection
   - [ ] **Expected:** Automatic reconnection within 30 seconds

3. **Test single-tab enforcement:**
   - [ ] Open application in Tab 1
   - [ ] Open application in Tab 2
   - [ ] **Expected:** Only one tab maintains active connection
   - [ ] Switch focus between tabs
   - [ ] **Expected:** Active connection follows focused tab

#### Scenario 10: Multi-user Real-time Updates
**Prerequisites:** Two users with notifications enabled

1. **Test real-time notification delivery:**
   - [ ] User A sends friend request to User B
   - [ ] **Expected:** User B receives notification immediately
   - [ ] **Expected:** Notification bell badge updates in real-time
   - [ ] **Expected:** Toast notification appears

2. **Test bi-directional updates:**
   - [ ] User B accepts User A's request
   - [ ] **Expected:** User A receives acceptance notification immediately
   - [ ] **Expected:** Both users see updated friendship status

### Performance & Load Testing

#### Scenario 11: High Frequency Notifications
1. **Send multiple notifications rapidly:**
   - [ ] Create multiple friend requests quickly
   - [ ] **Expected:** All notifications delivered
   - [ ] **Expected:** UI remains responsive
   - [ ] **Expected:** No notifications lost or duplicated

#### Scenario 12: Large Notification History
1. **Test with many notifications:**
   - [ ] Ensure user has 50+ notifications
   - [ ] Open notifications dropdown
   - [ ] **Expected:** Pagination or virtual scrolling works
   - [ ] **Expected:** Performance remains acceptable

### Cross-browser & Device Testing

#### Scenario 13: Browser Compatibility
Test on each target browser:
- [ ] **Chrome:** All features work correctly
- [ ] **Firefox:** SSE connection and notifications functional
- [ ] **Safari:** Real-time updates work properly

#### Scenario 14: Mobile Responsiveness
- [ ] **Mobile Chrome:** Touch interactions work
- [ ] **Mobile Safari:** Notifications display correctly
- [ ] **Responsive design:** UI adapts to different screen sizes

### Security & Authorization Testing

#### Scenario 15: Authentication Requirements
1. **Unauthenticated access attempts:**
   - [ ] Attempt to access friend request endpoints without login
   - [ ] **Expected:** "UNAUTHORIZED" errors
   - [ ] **Expected:** No data returned

2. **Cross-user authorization:**
   - [ ] User A attempts to accept User C's request to User B
   - [ ] **Expected:** "FORBIDDEN" error
   - [ ] **Expected:** No unauthorized actions allowed

---

## Accessibility Testing

### Keyboard Navigation
- [ ] All buttons accessible via Tab key
- [ ] Enter/Space activate buttons correctly
- [ ] Focus indicators visible
- [ ] Screen reader announcements work

### Screen Reader Testing
- [ ] Notification content read correctly
- [ ] Button purposes clear
- [ ] Status changes announced
- [ ] Error messages accessible

---

## Performance Benchmarks

### Network Efficiency
- [ ] SSE connection uses minimal bandwidth
- [ ] Only necessary data transmitted
- [ ] Efficient reconnection behavior
- [ ] Heartbeat frequency appropriate

### Database Performance  
- [ ] Friend request queries execute quickly (<100ms)
- [ ] Indexes used effectively
- [ ] No N+1 query issues
- [ ] Transaction isolation works correctly

### Frontend Performance
- [ ] Notification updates don't cause layout thrashing
- [ ] Component re-renders minimized
- [ ] Memory usage stable over time
- [ ] No memory leaks from SSE connections

---

## Regression Testing

### After Any Changes
- [ ] All existing tests still pass
- [ ] No new TypeScript errors
- [ ] No console errors in browser
- [ ] Existing functionality unaffected
- [ ] Performance hasn't degraded

---

## Success Criteria Summary

### Functionality ✅
- [ ] All friend request operations work correctly
- [ ] Real-time notifications delivered reliably
- [ ] Error cases handled gracefully
- [ ] UI state updates accurately

### Performance ✅
- [ ] Response times under 200ms for critical operations
- [ ] SSE connection stable for extended periods
- [ ] Memory usage remains stable
- [ ] No blocking operations in UI thread

### Reliability ✅
- [ ] System recovers gracefully from failures
- [ ] Data consistency maintained across operations
- [ ] No data loss during error scenarios
- [ ] Duplicate prevention works 100% of time

### User Experience ✅
- [ ] Clear feedback for all user actions
- [ ] Loading states prevent confusion
- [ ] Error messages are actionable
- [ ] Real-time updates feel immediate

### Security ✅
- [ ] All authorization checks enforced
- [ ] No unauthorized data access possible
- [ ] Input validation prevents injection
- [ ] Session management secure

---

## Testing Tools & Commands

### Run Test Suite
```bash
# Unit and integration tests
pnpm test

# With coverage report
pnpm test --coverage

# Watch mode for development
pnpm test:watch

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

### Database Testing
```bash
# Reset test database
pnpm db:push

# Generate fresh Prisma client
pnpm db:generate

# View database in browser
pnpm db:studio
```

### Manual Testing URLs
```bash
# Development server
http://localhost:3000

# SSE endpoint (authenticated only)
http://localhost:3000/api/notifications/stream?tabId=test

# tRPC panel (if enabled)
http://localhost:3000/api/trpc-panel
```

---

## Issue Tracking Template

When bugs are found, use this template:

**Bug Title:** Brief description
**Severity:** High/Medium/Low  
**Component:** Database/tRPC/SSE/React/UI
**Browser:** Chrome/Firefox/Safari/Mobile
**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected Result:** What should happen
**Actual Result:** What actually happens
**Additional Context:** Screenshots, console logs, etc.

---

## Test Completion Sign-off

### Testing Phase Completed ✅
- [ ] All unit tests passing
- [ ] Integration tests passing  
- [ ] Manual testing scenarios completed
- [ ] Performance benchmarks met
- [ ] Cross-browser testing done
- [ ] Accessibility testing passed
- [ ] Security testing verified

**Tester:** ________________  
**Date:** ________________  
**Version:** ________________  
**Environment:** ________________

### Known Issues
List any known issues or limitations:

1. Issue description - severity - planned resolution

### Recommendations
List any recommendations for improvement:

1. Recommendation - priority - estimated effort

---

*This checklist ensures comprehensive testing coverage for the friend request notification system. Update this document as new features are added or testing procedures are refined.*
