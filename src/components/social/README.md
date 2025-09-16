# Social Features - Complete Social Platform

A comprehensive social system that enables player interaction through friends, messaging, and notifications. The system includes both popup interfaces for in-game access and dedicated pages for full management.

## Overview

The social platform provides multiple interfaces for player interaction:
- **Friend Management**: Add, remove, block/unblock users, manage friend requests
- **Real-time Messaging**: Send messages, view conversations, instant chat
- **Notification System**: Real-time updates via Server-Sent Events
- **Game Integration**: Social features accessible during gameplay

## Component Architecture

### Main Components

#### `FriendMessagePopup`
Main popup container with tabbed interface for in-game social access.

**Props:**
- `isOpen: boolean` - Controls popup visibility
- `onClose: () => void` - Callback when popup is closed

**Features:**
- Keyboard shortcuts (Esc to close, Ctrl+1/2 to switch tabs)
- Minimize/maximize functionality
- Real-time unread count badges
- Responsive design with mobile optimizations

#### `FriendsList`
Complete friend management with full CRUD operations.

**Features:**
- **Create**: Send friend requests with search functionality
- **Read**: View friends, pending requests, blocked users with pagination
- **Update**: Accept/decline requests, block/unblock users with optimistic updates
- **Delete**: Remove friends, cancel requests with confirmation dialogs

**Interface Tabs:**
- **Friends**: Active friendships with message/remove actions
- **Requests**: Incoming/outgoing friend requests with status tracking
- **Search**: User discovery with advanced filtering
- **Blocked**: Blocked user management with unblock capability

#### `MessageCenter`
Real-time messaging system with conversation management.

**Features:**
- **Create**: Start new conversations, send messages with rich text
- **Read**: Conversation history with infinite scroll, unread indicators
- **Update**: Mark messages as read, real-time delivery status
- **Delete**: Archive conversations, delete messages (with permissions)

**Interface Layout:**
- **Conversation Sidebar**: List with search, filters, and unread counts
- **Chat Area**: Message history with user avatars and timestamps
- **Message Input**: Rich text editor with emoji support and file attachments

### New Social Components

#### `FriendRequestCard`
Individual friend request display component with action buttons.

**Props:**
- `friendRequest: FriendRequest` - Request data object
- `variant: "received" | "sent"` - Display mode
- `onUpdate: () => void` - Callback for status changes

**Features:**
- User profile information with avatar
- Accept/decline/cancel actions based on context
- Status badges (Pending, Accepted, Declined, Cancelled)
- Optimistic updates with error rollback
- Loading states and error handling

#### `FriendRequestList`
Container for managing lists of friend requests.

**Props:**
- `type: "received" | "sent"` - Request type to display
- `className?: string` - Optional styling

**Features:**
- Separate views for incoming and outgoing requests
- Loading skeletons and empty states
- Real-time updates via tRPC subscriptions
- Pagination for large request lists
- Bulk actions (accept all, decline all)

#### `SendFriendRequestDialog`
Modal dialog for sending new friend requests.

**Props:**
- `children: ReactNode` - Trigger element
- `onSuccess?: () => void` - Success callback

**Features:**
- User search by name, email, or username
- Real-time search results with debouncing
- Duplicate request prevention
- Optional personal message with character limit
- Form validation with Zod schemas
- Success/error feedback with toast notifications

## Usage

### In Game Controller
```tsx
import { FriendMessagePopup } from '~/components/social/FriendMessagePopup';

function GameController() {
  const [showSocialPopup, setShowSocialPopup] = useState(false);
  
  return (
    <>
      <Button onClick={() => setShowSocialPopup(true)}>
        <MessageSquare className="w-4 h-4 mr-2" />
        Friends & Messages
      </Button>
      
      <FriendMessagePopup
        isOpen={showSocialPopup}
        onClose={() => setShowSocialPopup(false)}
      />
    </>
  );
}
```

### Standalone Usage
```tsx
import { FriendMessagePopup } from '~/components/social/FriendMessagePopup';

function App() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <FriendMessagePopup
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    />
  );
}
```

## Real-time Integration

### Server-Sent Events (SSE)
The social system uses SSE for real-time updates:

- **Notification Stream** (`/api/notifications/stream`) - Friend requests, messages, system notifications
- **Message Stream** (`/api/messages/stream`) - Real-time message delivery and read receipts
- **Connection Management** - Automatic reconnection with exponential backoff

### tRPC API Integration

The components integrate with the following tRPC routers:

#### User Router (`api.user`)
- `getFriends` - Retrieve user's friend list with pagination
- `searchUsers` - Search users by username, name, or email
- `getUserProfile` - Get detailed user profile information
- `updateProfile` - Update user profile and preferences
- `getBlockedUsers` - Retrieve blocked users list
- `blockUser` / `unblockUser` - Block/unblock user management

#### Friend Request Router (`api.friendRequest`)
- `send` - Send new friend request with optional message
- `getReceived` - Get incoming friend requests with pagination
- `getSent` - Get outgoing friend requests with status
- `respond` - Accept or decline friend request
- `cancel` - Cancel sent friend request
- `remove` - Remove existing friendship

#### Message Router (`api.message`)
- `getConversations` - Get conversation list with unread counts
- `getConversation` - Get message history for specific conversation
- `send` - Send new message with delivery confirmation
- `markAsRead` - Mark messages as read with timestamps
- `getUnreadCount` - Get total unread message count
- `searchConversations` - Search through conversation history

#### Notification Router (`api.notification`)
- `getAll` - Get user notifications with filtering
- `markAsRead` - Mark single or multiple notifications as read
- `markAllAsRead` - Mark all notifications as read
- `getUnreadCount` - Get unread notification count
- `dismiss` - Dismiss/delete specific notifications

## Styling

Uses Tailwind CSS with Shadcn/ui components:
- Dialog for popup overlay
- Tabs for navigation
- ScrollArea for scrollable content
- Avatar for user profiles
- Badge for unread counts
- AlertDialog for confirmations

## Keyboard Shortcuts

- `Escape` - Close popup
- `Ctrl/Cmd + 1` - Switch to Friends tab
- `Ctrl/Cmd + 2` - Switch to Messages tab
- `Enter` - Send message (in message input)

## Accessibility

- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader friendly
- High contrast support

## Performance

- Real-time updates with polling (30s for messages, immediate for actions)
- Efficient re-rendering with React.memo patterns
- Auto-scroll to new messages
- Optimistic updates for better UX

## Current Status & Known Issues

### ✅ Implemented Features
- Complete friend management system
- Real-time messaging with SSE
- Notification system with multiple types
- User search and discovery
- Block/unblock functionality
- Responsive design for all screen sizes

### 🧪 Beta Features
- **Message delivery status** - Real-time delivery confirmation
- **Notification batching** - Grouped notifications for better UX
- **Advanced search** - Search across friends, messages, and users

### 🚧 Known Issues
- **Message ordering** - Occasional race conditions in high-frequency messaging
- **SSE reconnection** - May require page refresh in some edge cases
- **Mobile notifications** - Push notifications not yet implemented
- **Large conversation loading** - Performance optimization needed for 1000+ messages

## Future Enhancements

### Planned Features
- **Online status indicators** - Real-time presence with last seen timestamps
- **Message reactions** - Emoji reactions and threading support
- **File/image sharing** - Secure file uploads with preview support
- **Group conversations** - Multi-user chat rooms and group management
- **Push notifications** - Browser and mobile push notification support
- **Message encryption** - End-to-end encryption for private conversations
- **Voice/video calls** - WebRTC integration for voice and video chat

### Performance Improvements
- **Message virtualization** - Efficient rendering of large conversation histories
- **Connection pooling** - Optimized SSE connection management
- **Caching strategies** - Redis integration for improved response times
- **Image optimization** - CDN integration for avatar and file storage
