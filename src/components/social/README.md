# Social Feature - Friends & Messages Popup

A comprehensive popup-based social system that allows users to manage friends and messages while playing the game.

## Overview

This feature provides a floating popup interface that can be accessed during gameplay, containing:
- **Friend Management**: Add, remove, block/unblock users, manage friend requests
- **Message Center**: Send messages, view conversations, real-time chat

## Components

### `FriendMessagePopup`
Main popup container with tabbed interface for friends and messages.

**Props:**
- `isOpen: boolean` - Controls popup visibility
- `onClose: () => void` - Callback when popup is closed

**Features:**
- Keyboard shortcuts (Esc to close, Ctrl+1/2 to switch tabs)
- Minimize/maximize functionality
- Real-time unread count badges
- Responsive design

### `FriendsList`
Complete friend management with CRUD operations.

**Features:**
- **Create**: Send friend requests, search for users
- **Read**: View friends, pending requests, blocked users
- **Update**: Accept/decline requests, block/unblock users
- **Delete**: Remove friends, cancel requests

**Tabs:**
- **Friends**: List of accepted friends with message/remove actions
- **Requests**: Incoming friend requests with accept/decline options
- **Search**: User search with friend request functionality
- **Blocked**: Manage blocked users with unblock capability

### `MessageCenter`
Real-time messaging system with conversation management.

**Features:**
- **Create**: Send new messages, start conversations
- **Read**: View conversation history, unread indicators
- **Update**: Mark messages as read, real-time updates
- **Delete**: Clear conversations (planned)

**Layout:**
- **Sidebar**: Conversation list with search functionality
- **Chat Area**: Message history with avatar display
- **Input**: Send messages with Enter key support

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

## API Integration

The components use tRPC procedures from:
- `api.user.*` - Friend management operations
- `api.message.*` - Message operations

### Required tRPC Procedures

**User Router:**
- `getFriends` - Get user's friends list
- `getPendingFriendRequests` - Get incoming requests
- `getBlockedUsers` - Get blocked users
- `searchUsers` - Search for users
- `sendFriendRequest` - Send friend request
- `respondToFriendRequest` - Accept/decline request
- `removeFriend` - Remove friend
- `blockUser` - Block user
- `unblockUser` - Unblock user

**Message Router:**
- `getConversations` - Get conversation list
- `getConversation` - Get messages for conversation
- `sendMessage` - Send new message
- `markAsRead` - Mark message as read
- `getUnreadCount` - Get unread message count

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

## Future Enhancements

- Online status indicators
- Message reactions and threading
- File/image sharing
- Group conversations
- Push notifications
- Message encryption
