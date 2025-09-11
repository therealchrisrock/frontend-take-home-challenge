# Friend Request Notification System - Task Breakdown

**Document ID**: TM-729e-20250911113147
**Project UUID**: 729e
**Created At (UTC)**: 2025-09-11 11:31:47 UTC
**Created By**: task-master
**Related Docs**:

- Task Breakdown: TM-729e
- [Other agents will add their docs with same UUID]

---

## Assignment Overview
Implement a complete friend request flow with real-time notifications for a T3 Stack Checkers application. This includes database schema updates, SSE endpoints, tRPC routers, React hooks, UI components, and business logic with proper error handling.

## Task Dependency Graph
```text
┌─────────────────────────────────────────────────────────────┐
│                      GROUP 1: Database                       │
│                   (No dependencies)                          │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├─────────────────┬──────────────────┬─────────────────────┐
               ▼                 ▼                  ▼                     ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  GROUP 2: tRPC   │ │  GROUP 3: SSE    │ │ GROUP 4: Hooks   │ │ GROUP 5: Types   │
│  Friend Router   │ │    Endpoint      │ │   & Context      │ │   & Utilities    │
└──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
               │                 │                  │                     │
               └─────────────────┴──────────────────┴─────────────────────┘
                                          │
                           ┌──────────────┴──────────────────┐
                           ▼                                 ▼
               ┌──────────────────┐             ┌──────────────────┐
               │ GROUP 6: Core UI │             │ GROUP 7: Page    │
               │   Components     │             │   Integration    │
               └──────────────────┘             └──────────────────┘
                           │                                 │
                           └─────────────────┬───────────────┘
                                            ▼
                                ┌──────────────────┐
                                │ GROUP 8: Testing │
                                │  & Validation    │
                                └──────────────────┘
```

## Detailed Task Groups

### GROUP 1: Database Schema & Migration
**Group ID:** `group-1-database`  
**Dependencies:** None  
**Estimated Complexity:** Medium  
**Suggested Agent:** `database-specialist`

**Files to Create/Modify:**
- `/Users/groot/Documents/code/checkers/prisma/schema.prisma`
- `/Users/groot/Documents/code/checkers/prisma/migrations/[timestamp]_add_friend_notifications/migration.sql`

**Specific Tasks:**
1. Add `FriendRequest` model to schema:
   ```prisma
   model FriendRequest {
     id         String               @id @default(cuid())
     senderId   String
     receiverId String
     status     FriendRequestStatus  @default(PENDING)
     message    String?              // Optional request message
     createdAt  DateTime             @default(now())
     updatedAt  DateTime             @updatedAt
     
     sender     User                 @relation("SentFriendRequests", fields: [senderId], references: [id], onDelete: Cascade)
     receiver   User                 @relation("ReceivedFriendRequests", fields: [receiverId], references: [id], onDelete: Cascade)
     
     @@unique([senderId, receiverId])
     @@index([receiverId, status])
     @@index([senderId])
   }
   
   enum FriendRequestStatus {
     PENDING
     ACCEPTED
     DECLINED
     CANCELLED
   }
   ```

2. Add `Notification` model:
   ```prisma
   model Notification {
     id              String           @id @default(cuid())
     userId          String
     type            NotificationType
     title           String
     message         String
     read            Boolean          @default(false)
     metadata        String?          // JSON for additional data
     relatedEntityId String?          // ID of related entity (e.g., friendRequestId)
     createdAt       DateTime         @default(now())
     
     user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
     
     @@index([userId, read])
     @@index([userId, createdAt])
   }
   
   enum NotificationType {
     FRIEND_REQUEST
     FRIEND_REQUEST_ACCEPTED
     FRIEND_REQUEST_DECLINED
     MESSAGE
     GAME_INVITE
     SYSTEM
   }
   ```

3. Update `User` model relations:
   - Add `sentFriendRequests` relation
   - Add `receivedFriendRequests` relation
   - Add `notifications` relation

4. Update existing `Friendship` model to work with new flow

5. Run database migration commands

**Success Criteria:**
- Schema compiles without errors
- Migration runs successfully
- Prisma client regenerated with new types
- No breaking changes to existing models

---

### GROUP 2: tRPC Friend Request Router
**Group ID:** `group-2-trpc-friend`  
**Dependencies:** `group-1-database`  
**Estimated Complexity:** High  
**Suggested Agent:** `backend-specialist`

**Files to Create/Modify:**
- `/Users/groot/Documents/code/checkers/src/server/api/routers/friendRequest.ts` (create)
- `/Users/groot/Documents/code/checkers/src/server/api/root.ts` (modify)

**Specific Tasks:**
1. Create `friendRequest` router with procedures:
   - `send`: Send friend request with duplicate prevention
   - `getPending`: Get pending requests for current user
   - `getSent`: Get sent requests by current user
   - `accept`: Accept request and create bidirectional friendship
   - `decline`: Decline request
   - `cancel`: Cancel sent request
   - `checkStatus`: Check friendship status between two users

2. Implement business logic:
   - Prevent duplicate requests
   - Check for existing friendship before sending
   - Auto-create notification on request send
   - Auto-create bidirectional friendship on accept
   - Clean up notifications on accept/decline

3. Add proper authorization checks
4. Include transaction handling for data consistency
5. Register router in root.ts

**Success Criteria:**
- All procedures work correctly
- Proper error handling for edge cases
- Authorization prevents unauthorized access
- Transactions ensure data consistency

---

### GROUP 3: SSE Notification Endpoint
**Group ID:** `group-3-sse-endpoint`  
**Dependencies:** `group-1-database`  
**Estimated Complexity:** High  
**Suggested Agent:** `realtime-specialist`

**Files to Create:**
- `/Users/groot/Documents/code/checkers/src/app/api/notifications/stream/route.ts`
- `/Users/groot/Documents/code/checkers/src/lib/sse/connection-manager.ts`

**Specific Tasks:**
1. Create SSE endpoint with:
   - Authentication verification
   - Single-tab enforcement using tab IDs
   - Heartbeat mechanism (30-second intervals)
   - Proper cleanup on disconnect

2. Implement ConnectionManager class:
   - Track active connections by userId
   - Handle tab switching gracefully
   - Cleanup stale connections
   - Broadcast notifications to specific users

3. Message format:
   ```typescript
   interface SSEMessage {
     type: 'notification' | 'heartbeat' | 'connection_established';
     data?: {
       notification?: Notification;
       tabId?: string;
       timestamp: number;
     };
   }
   ```

4. Handle browser reconnection gracefully
5. Implement rate limiting for connections

**Success Criteria:**
- SSE connections establish successfully
- Single-tab enforcement works
- Heartbeat prevents connection timeout
- Clean disconnect handling
- Works across different browsers

---

### GROUP 4: React Hooks & Context
**Group ID:** `group-4-hooks-context`  
**Dependencies:** `group-1-database`, `group-5-types`  
**Estimated Complexity:** High  
**Suggested Agent:** `frontend-specialist`

**Files to Create:**
- `/Users/groot/Documents/code/checkers/src/hooks/useNotifications.ts`
- `/Users/groot/Documents/code/checkers/src/contexts/notification-context.tsx`
- `/Users/groot/Documents/code/checkers/src/hooks/useFriendRequests.ts`

**Specific Tasks:**
1. Create `useNotifications` hook:
   - Establish SSE connection
   - Handle reconnection logic
   - Parse SSE messages
   - Update local state via React Query
   - Provide unread count
   - Handle tab focus/blur events

2. Create NotificationContext:
   - Centralize notification state
   - Provide notification methods
   - Handle badge count updates
   - Manage notification preferences

3. Create `useFriendRequests` hook:
   - Wrap tRPC queries/mutations
   - Provide loading states
   - Handle optimistic updates
   - Cache management

4. Implement connection lifecycle management
5. Add error recovery mechanisms

**Success Criteria:**
- Hooks properly manage SSE lifecycle
- React Query cache updates correctly
- No memory leaks
- Proper cleanup on unmount
- Type-safe throughout

---

### GROUP 5: Type Definitions & Utilities
**Group ID:** `group-5-types`  
**Dependencies:** `group-1-database`  
**Estimated Complexity:** Low  
**Suggested Agent:** `typescript-specialist`

**Files to Create:**
- `/Users/groot/Documents/code/checkers/src/types/notifications.ts`
- `/Users/groot/Documents/code/checkers/src/lib/notifications/utils.ts`

**Specific Tasks:**
1. Define TypeScript interfaces:
   ```typescript
   interface NotificationData {
     id: string;
     type: NotificationType;
     title: string;
     message: string;
     read: boolean;
     metadata?: Record<string, unknown>;
     relatedEntityId?: string;
     createdAt: Date;
   }
   
   interface FriendRequestData {
     id: string;
     sender: UserInfo;
     receiver: UserInfo;
     status: FriendRequestStatus;
     message?: string;
     createdAt: Date;
   }
   ```

2. Create utility functions:
   - Format notification messages
   - Parse notification metadata
   - Generate notification titles
   - Time formatting (e.g., "2 hours ago")
   - Badge count calculations

3. Create notification factory functions
4. Add type guards for runtime validation

**Success Criteria:**
- Complete type coverage
- No type errors in consuming code
- Utility functions are pure and testable
- Proper JSDoc documentation

---

### GROUP 6: Core UI Components
**Group ID:** `group-6-ui-components`  
**Dependencies:** `group-4-hooks-context`, `group-5-types`  
**Estimated Complexity:** High  
**Suggested Agent:** `ui-specialist`

**Files to Create:**
- `/Users/groot/Documents/code/checkers/src/components/notifications/NotificationBell.tsx`
- `/Users/groot/Documents/code/checkers/src/components/notifications/NotificationDropdown.tsx`
- `/Users/groot/Documents/code/checkers/src/components/friends/FriendRequestCard.tsx`
- `/Users/groot/Documents/code/checkers/src/components/friends/FriendRequestList.tsx`
- `/Users/groot/Documents/code/checkers/src/components/friends/SendFriendRequest.tsx`

**Specific Tasks:**
1. Create NotificationBell component:
   - Show unread count badge
   - Animate on new notification
   - Click to open dropdown
   - Use Shadcn Badge and Button

2. Create NotificationDropdown:
   - List recent notifications
   - Mark as read functionality
   - Group by date
   - Load more pagination
   - Use Shadcn DropdownMenu

3. Create FriendRequestCard:
   - Show sender info and avatar
   - Accept/Decline buttons
   - Optional message display
   - Loading states
   - Use Shadcn Card and Avatar

4. Create FriendRequestList:
   - Tabs for Received/Sent
   - Empty states
   - Loading skeletons
   - Use Shadcn Tabs

5. Create SendFriendRequest:
   - User search/select
   - Optional message input
   - Validation feedback
   - Use Shadcn Dialog and Form

**Success Criteria:**
- Components follow Shadcn patterns
- Accessible (ARIA labels, keyboard nav)
- Responsive design
- Loading and error states
- Smooth animations

---

### GROUP 7: Page Integration
**Group ID:** `group-7-pages`  
**Dependencies:** `group-6-ui-components`  
**Estimated Complexity:** Medium  
**Suggested Agent:** `integration-specialist`

**Files to Modify:**
- `/Users/groot/Documents/code/checkers/src/components/Header.tsx`
- `/Users/groot/Documents/code/checkers/src/app/(checkers)/friends/page.tsx`
- `/Users/groot/Documents/code/checkers/src/app/(checkers)/friends/requests/page.tsx` (create)
- `/Users/groot/Documents/code/checkers/src/app/providers.tsx`

**Specific Tasks:**
1. Update Header component:
   - Add NotificationBell next to user menu
   - Ensure proper spacing and alignment
   - Mobile responsive layout

2. Create `/friends/requests` page:
   - Full-page friend request management
   - Received and sent requests tabs
   - Search and filter functionality
   - Pagination for large lists

3. Update `/friends` page:
   - Add "Friend Requests" link/button
   - Show pending request count
   - Add "Add Friend" button

4. Update providers:
   - Wrap app with NotificationProvider
   - Ensure proper provider ordering

5. Add navigation guards for authenticated routes

**Success Criteria:**
- Seamless navigation between pages
- Notification bell visible on all pages
- Mobile-friendly layouts
- Proper loading states
- No layout shifts

---

### GROUP 8: Testing & Validation
**Group ID:** `group-8-testing`  
**Dependencies:** All other groups  
**Estimated Complexity:** Medium  
**Suggested Agent:** `testing-specialist`

**Files to Create:**
- `/Users/groot/Documents/code/checkers/src/server/api/routers/friendRequest.test.ts`
- `/Users/groot/Documents/code/checkers/src/hooks/__tests__/useNotifications.test.ts`
- `/Users/groot/Documents/code/checkers/src/components/notifications/__tests__/NotificationBell.test.tsx`
- `/Users/groot/Documents/code/checkers/e2e/friend-requests.spec.ts`

**Specific Tasks:**
1. Unit tests for tRPC procedures:
   - Test all happy paths
   - Test error cases
   - Test authorization
   - Mock database calls

2. Hook tests:
   - Test SSE connection lifecycle
   - Test reconnection logic
   - Test error handling
   - Mock SSE events

3. Component tests:
   - Test user interactions
   - Test loading states
   - Test error states
   - Accessibility tests

4. E2E tests:
   - Complete friend request flow
   - Test real-time notifications
   - Test multi-tab behavior
   - Test error recovery

5. Manual testing checklist:
   - Cross-browser testing
   - Mobile device testing
   - Network interruption testing
   - Performance testing

**Success Criteria:**
- >80% code coverage
- All tests passing
- No console errors
- Accessibility audit passes
- Performance metrics acceptable

---

## Execution Order Recommendations

### Phase 1: Foundation (Parallel)
- GROUP 1: Database Schema
- GROUP 5: Type Definitions

### Phase 2: Backend Services (Parallel after Phase 1)
- GROUP 2: tRPC Router
- GROUP 3: SSE Endpoint

### Phase 3: Frontend Infrastructure (Parallel after Phase 2)
- GROUP 4: Hooks & Context
- GROUP 6: UI Components

### Phase 4: Integration (Sequential after Phase 3)
- GROUP 7: Page Integration

### Phase 5: Validation (After Phase 4)
- GROUP 8: Testing

## Integration Points

1. **Database ↔ tRPC**: Prisma types flow from schema to routers
2. **tRPC ↔ Hooks**: tRPC client types consumed by React hooks
3. **SSE ↔ Hooks**: SSE messages parsed and managed by useNotifications
4. **Hooks ↔ Components**: Hooks provide data and methods to UI components
5. **Components ↔ Pages**: Components composed into page layouts

## Risk Factors & Mitigation

### High-Risk Areas:
1. **SSE Connection Management**
   - Risk: Connection drops, memory leaks
   - Mitigation: Implement robust reconnection logic, proper cleanup

2. **Single-Tab Enforcement**
   - Risk: Race conditions, tab detection failures
   - Mitigation: Use unique tab IDs, server-side connection tracking

3. **Real-time Synchronization**
   - Risk: Stale data, missed notifications
   - Mitigation: React Query invalidation, optimistic updates

4. **Database Transactions**
   - Risk: Partial updates, data inconsistency
   - Mitigation: Wrap related operations in transactions

### Performance Considerations:
- Lazy load notification history
- Implement virtual scrolling for long lists
- Cache friend request data appropriately
- Debounce user search inputs
- Optimize database queries with proper indexes

## Shared Conventions

All agents should follow:
1. Use existing Shadcn components (no custom Tailwind classes)
2. Follow T3 Stack naming conventions from CLAUDE.md
3. Use Zod for runtime validation
4. Implement proper TypeScript types
5. Add loading and error states to all async operations
6. Use transactions for multi-step database operations
7. Follow existing code patterns in the codebase
8. Write pure, testable functions where possible

## Notes for Agents

- The codebase uses SQLite, so some Prisma features may be limited
- Authentication is handled by NextAuth
- The app uses the Next.js App Router
- Tailwind CSS is configured with custom properties
- React Query is integrated via tRPC
- Follow the existing error handling patterns
- Respect the existing file structure and naming conventions
