# Notification System - Real-time User Notifications

This directory contains the complete notification system for the checkers platform, providing real-time updates for friend requests, messages, game invitations, and system events.

## 📁 Directory Structure

```text
src/components/
├── notifications/
│   ├── notification-bell.tsx      # Dropdown notification center
│   ├── notification-item.tsx      # Individual notification display
│   ├── notification-demo.tsx      # Demo/testing component
│   └── index.ts                   # Exports
├── social/
│   ├── friend-request-card.tsx    # Friend request display & actions
│   ├── friend-request-list.tsx    # List of friend requests
│   ├── send-friend-request-dialog.tsx # Send friend request modal
│   └── index.ts                   # Exports
└── ui/
    └── textarea.tsx               # Added textarea component
```

## 🔔 Notification Components

### NotificationBell
A dropdown notification center component that:
- Shows unread notification badge with count
- Displays real-time connection status indicator
- Lists recent notifications (up to 5)
- Provides "Mark all as read" and refresh actions
- Links to full notifications page
- Handles empty states gracefully

**Usage:**
```tsx
import { NotificationBell } from "~/components/notifications";

function Header() {
  return (
    <div className="flex items-center gap-4">
      <NotificationBell />
    </div>
  );
}
```

### NotificationItem
Individual notification display component featuring:
- Dynamic avatars based on sender info
- Notification type icons and styling
- Read/unread state management
- Relative timestamps
- Dismiss and mark-as-read actions
- Click-to-navigate functionality
- Optimistic updates with error rollback

**Props:**
- `notification`: Notification data object
- `onClose`: Callback when notification is dismissed
- `showDismiss`: Whether to show dismiss button (default: true)

## 👥 Social Components

### FriendRequestCard
Displays individual friend requests with:
- User avatar and profile information
- Request message display
- Accept/Decline/Cancel actions based on context
- Status badges (Pending, Accepted, Declined, Cancelled)
- Relative timestamps
- Loading states during actions
- Error handling with toast feedback

**Props:**
- `friendRequest`: Friend request data object
- `variant`: "received" | "sent" (default: "received")
- `onUpdate`: Callback when request status changes

### FriendRequestList
Manages lists of friend requests featuring:
- Separate views for received/sent requests
- Loading skeletons
- Empty state messaging
- Error handling with retry
- Refresh functionality
- Request count display

**Props:**
- `type`: "received" | "sent"
- `className`: Optional CSS classes

### SendFriendRequestDialog
Modal for sending friend requests with:
- User search by name/email
- Real-time search results
- Duplicate request prevention
- Optional personal message
- Form validation with Zod
- Loading states and error handling
- Friend status checking

**Props:**
- `children`: Trigger element
- `onSuccess`: Callback on successful send

## 🎨 Design Patterns

### Component Styling
- Uses Shadcn/ui component library exclusively
- Follows existing color scheme and spacing
- Consistent with app's design system
- Responsive design with mobile-first approach
- Framer Motion animations for smooth interactions

### State Management
- Optimistic updates for better UX
- Error rollback on failed operations
- Loading states for all async operations
- Real-time updates via SSE integration

### Accessibility
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly
- Focus management
- High contrast support

## 🔗 Integration Points

### Hooks
- `useNotifications`: Main notification hook from context
- `useToast`: Shadcn toast notifications
- tRPC hooks for server communication

### Context Dependencies
- Requires `NotificationProvider` in app root
- Depends on `SessionProvider` for authentication
- Uses tRPC client configuration

### Navigation
- Integrates with Next.js App Router
- Links to `/friends/requests` page
- Click-to-navigate functionality

## 📱 Responsive Design

### Mobile Optimizations
- Touch-friendly button sizes
- Responsive dropdown positioning
- Optimized spacing for small screens
- Swipe gestures support (future enhancement)

### Desktop Features
- Hover states and tooltips
- Keyboard shortcuts
- Right-click context menus (future enhancement)
- Multi-tab synchronization

## 🧪 Testing Components

### NotificationDemo
A comprehensive demo component showcasing:
- All notification features
- System status monitoring
- Interactive friend request management
- Real-time connection status
- Quick action buttons

**Usage:**
```tsx
import { NotificationDemo } from "~/components/notifications/notification-demo";

// Add to any page for testing
<NotificationDemo />
```

## 📋 Props & Types

### Notification Types
```typescript
interface NotificationState {
  id: string;
  type: "FRIEND_REQUEST" | "FRIEND_REQUEST_ACCEPTED" | "FRIEND_REQUEST_DECLINED";
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  relatedEntityId?: string;
  createdAt: string;
  readAt?: string;
}
```

### Friend Request Types
```typescript
interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
  message?: string | null;
  createdAt: Date;
  sender: User;
  receiver: User;
}
```

## 🏗️ System Architecture

### Real-time Infrastructure
- **Server-Sent Events (SSE)** - Primary real-time communication channel
- **Connection Management** - Automatic reconnection with exponential backoff
- **Event Broadcasting** - Efficient server-side event distribution
- **Client Synchronization** - Single-tab enforcement with cross-tab communication

### Notification Types
- **FRIEND_REQUEST** - New friend request notifications
- **FRIEND_REQUEST_ACCEPTED** - Friend request acceptance
- **FRIEND_REQUEST_DECLINED** - Friend request rejection
- **MESSAGE** - New private message notifications
- **GAME_INVITE** - Game invitation notifications
- **SYSTEM** - Platform announcements and updates

### State Management
- **Optimistic Updates** - Immediate UI feedback with server validation
- **Error Rollback** - Automatic reversion on failed operations
- **Persistence Layer** - Database storage with efficient querying
- **Cache Strategy** - Smart invalidation and background refresh

## ⚡ Performance Optimizations

### Current Optimizations
- **React.memo** for notification items to prevent unnecessary re-renders
- **Debounced operations** for search and batch actions
- **Optimistic updates** with rollback for immediate user feedback
- **Efficient queries** with proper database indexing
- **Connection pooling** for SSE stream management

### Planned Improvements
- **Virtual scrolling** for large notification lists (1000+ items)
- **Background sync** for offline notification queuing
- **Push notification** integration for better mobile experience
- **Notification batching** to reduce server load
- **Redis caching** for high-frequency notification scenarios

## 🚧 Known Issues & Limitations

### Current Issues
- **SSE reconnection** may occasionally require manual page refresh
- **Notification ordering** can be inconsistent during high-frequency events
- **Mobile push notifications** not yet implemented
- **Notification persistence** limited to database storage

### Technical Debt
- **Error boundary coverage** needs improvement
- **Type safety** in SSE event handlers could be enhanced
- **Test coverage** for edge cases needs expansion
- **Performance monitoring** metrics not yet implemented

## 🚀 Future Enhancements

### Planned Features
- **Notification grouping** by type and time for better organization
- **Bulk actions** (mark all as read, delete multiple)
- **User preferences** for notification types and delivery methods
- **Sound notifications** with customizable audio cues
- **Browser push notifications** for offline engagement
- **Email digests** for important missed notifications

### Advanced Features
- **Smart filtering** with machine learning for notification relevance
- **Notification templates** for consistent messaging
- **A/B testing** framework for notification effectiveness
- **Analytics dashboard** for notification engagement metrics

## 🔧 Development Notes

### Required Dependencies
- All dependencies already available in project
- Uses existing Shadcn/ui components
- Leverages tRPC and React Query
- Integrates with Framer Motion animations

### Code Quality
- Full TypeScript coverage
- ESLint compliant
- Consistent naming conventions
- Comprehensive error handling
- Loading state management

### Browser Support
- Modern browsers (Chrome 91+, Firefox 90+, Safari 14+)
- Progressive enhancement
- Graceful degradation for older browsers
