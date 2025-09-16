# Notification System Architecture

This document describes the real-time notification system architecture for the checkers platform, providing comprehensive documentation on how notifications, messages, game events, and presence updates work together through a unified event system.

## 🏗️ Core Architecture

### Unified Event System
The notification system is built on a **unified real-time event architecture** that consolidates all real-time communications through a single tRPC subscription endpoint using Server-Sent Events (SSE).

```text
┌─────────────────────────────────────────────────────────┐
│                    CLIENT SIDE                          │
├─────────────────────────────────────────────────────────┤
│  EventContext (Single SSE Connection)                   │
│  └── tRPC Subscription: api.events.onAllEvents          │
│      ├── Notifications                                  │
│      ├── Messages                                       │
│      ├── Game Events                                    │
│      ├── Friend Requests                                │
│      └── Presence Updates                               │
├─────────────────────────────────────────────────────────┤
│                    SERVER SIDE                          │
├─────────────────────────────────────────────────────────┤
│  EventEmitter (Central Event Hub)                       │
│  ├── User Channels (user:userId)                        │
│  ├── Game Channels (game:gameId)                        │
│  └── Chat Channels (chat:chatId)                        │
└─────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. EventContext (`/src/contexts/event-context.tsx`)
The central hub for all real-time data on the client side:
- **Single SSE Connection**: One connection per browser (respects ~6 connection limit)
- **State Management**: Centralized reducer for all event types
- **Type Safety**: Full TypeScript support with discriminated unions
- **Auto-reconnection**: Built-in reconnection with exponential backoff
- **Hooks**: Specialized hooks for different features

#### 2. Event Router (`/src/server/api/routers/events.ts`)
The tRPC router that manages the unified subscription:
- **Single Endpoint**: `onAllEvents` subscription handles everything
- **Observable Pattern**: Uses RxJS observables for event streaming
- **Channel Subscriptions**: Automatic subscription to relevant channels
- **Heartbeat**: Periodic keepalive to maintain connection

#### 3. Event Emitter (`/src/server/event-emitter.ts`)
Server-side event distribution system:
- **Channel-based**: Events targeted to specific channels or users
- **Type-safe**: Strongly typed event payloads
- **Efficient**: Single event can reach multiple subscribers

## 📁 File Structure

```text
src/
├── contexts/
│   └── event-context.tsx           # Unified event context & hooks
├── hooks/
│   ├── useNotifications.ts         # Notification-specific hook
│   ├── useMessages.ts              # Message-specific hook
│   ├── useFriendRequests.ts        # Friend request hook
│   └── useGameState.ts             # Game state hook
├── components/
│   ├── notifications/
│   │   ├── notification-bell.tsx   # Notification dropdown UI
│   │   └── notification-item.tsx   # Individual notification
│   └── social/
│       ├── friend-request-card.tsx # Friend request UI
│       └── friend-request-list.tsx # Friend request list
├── server/
│   ├── api/
│   │   └── routers/
│   │       ├── events.ts           # Unified event router
│   │       ├── notification.ts     # Notification mutations
│   │       ├── friendRequest.ts    # Friend request mutations
│   │       └── message.ts          # Message mutations
│   └── event-emitter.ts            # Server event emitter
└── types/
    └── sse-events.ts               # Event type definitions
```

## 🔔 How Notifications Work

### 1. Event Flow

```typescript
// User Action → Server Mutation → Database Update → Event Emission → Client Update

// Example: Friend Request Flow
1. User clicks "Add Friend" 
2. Calls api.friendRequest.send mutation
3. Server creates friend request in database
4. Server emits FRIEND_REQUEST_RECEIVED event
5. EventEmitter broadcasts to recipient's channel
6. EventContext receives event via SSE subscription
7. Reducer updates local state
8. React components re-render with new data
9. User sees notification bell update + toast
```

### 2. Event Types

All events are defined in `/src/types/sse-events.ts`:

```typescript
export enum SSEEventType {
  // Notifications
  NOTIFICATION_CREATED = "NOTIFICATION_CREATED",
  NOTIFICATION_READ = "NOTIFICATION_READ",
  NOTIFICATION_DELETED = "NOTIFICATION_DELETED",
  
  // Messages
  MESSAGE_RECEIVED = "MESSAGE_RECEIVED",
  TYPING_START = "TYPING_START",
  TYPING_STOP = "TYPING_STOP",
  
  // Games
  GAME_MOVE = "GAME_MOVE",
  GAME_INVITE = "GAME_INVITE",
  GAME_ENDED = "GAME_ENDED",
  
  // Friend Requests
  FRIEND_REQUEST_RECEIVED = "FRIEND_REQUEST_RECEIVED",
  FRIEND_REQUEST_ACCEPTED = "FRIEND_REQUEST_ACCEPTED",
  
  // Presence
  USER_ONLINE = "USER_ONLINE",
  USER_OFFLINE = "USER_OFFLINE",
}
```

### 3. Channel System

Events are distributed through channels:

```typescript
// User-specific channel (private events)
`user:${userId}` // Notifications, friend requests, direct messages

// Game channel (game participants)
`game:${gameId}` // Moves, draw requests, game state

// Chat channel (conversation participants)
`chat:${chatId}` // Messages, typing indicators
```

## 🎯 Using the System

### For Notifications

```tsx
import { useNotifications } from "~/hooks/useNotifications";

function MyComponent() {
  const { 
    notifications,      // All notifications
    unreadCount,        // Number of unread
    connectionState,    // SSE connection status
    markAsRead,        // Mark notification as read
    markAllAsRead,     // Mark all as read
    dismiss,           // Remove notification
    refetch            // Manual refresh
  } = useNotifications();
  
  return <NotificationBell />;
}
```

### For Messages

```tsx
import { useMessages } from "~/hooks/useMessages";

function ChatComponent() {
  const {
    messages,           // Message history
    unreadCounts,      // Unread per conversation
    sendMessage,       // Send new message
    markAsRead,        // Mark messages read
    setTyping,         // Update typing status
  } = useMessages();
}
```

### For Game State

```tsx
import { useGameState } from "~/contexts/event-context";

function GameComponent() {
  const {
    gameState,         // Current game state
    isConnected,       // Connection status
    sendMove,          // Make a move
    reconnect,         // Force reconnection
  } = useGameState(gameId);
}
```

### For Friend Requests

```tsx
import { useFriendRequests } from "~/hooks/useFriendRequests";

function FriendsComponent() {
  const {
    requests,          // Pending friend requests
    totalPending,      // Count of pending
    accept,            // Accept request
    decline,           // Decline request
    cancel,            // Cancel sent request
  } = useFriendRequests();
}
```

## ⚡ Performance & Optimization

### Browser SSE Limits
- **6 Connection Limit**: Browsers limit SSE connections per domain
- **Solution**: Single unified subscription for all events
- **Result**: One connection handles everything

### State Updates
- **Optimistic Updates**: UI updates immediately, rolls back on error
- **Batched Renders**: React 18 automatic batching
- **Memoization**: Components use React.memo where appropriate

### Connection Management
- **Auto-reconnect**: Exponential backoff (1s, 2s, 4s, 8s...)
- **Heartbeat**: Keeps connection alive (30s intervals)
- **State Recovery**: Fetches missed events on reconnect

## 🔄 Trade-offs & Performance Considerations

### Current Architecture Benefits
The unified EventContext with reducer pattern provides several advantages:

✅ **Single SSE Connection**: Solves browser connection limits
✅ **Centralized State**: Predictable state updates via reducer pattern
✅ **Type Safety**: Full TypeScript support with discriminated unions
✅ **Batched Updates**: React 18 automatic batching reduces render frequency
✅ **Simplified Debugging**: Single place to monitor all real-time events

### Performance Trade-offs

#### 1. Cross-Domain Re-renders
Every event triggers the entire EventContext provider to re-render, causing all consuming components to re-evaluate:

```typescript
// Problem: Game components receive message events
function GameComponent() {
  const { gameState } = useGameState(gameId); // Re-runs on message events
  // Component re-evaluates even for unrelated message updates
}

// Problem: Chat components receive game events
function ChatComponent() {
  const { messages } = useMessages(); // Re-runs on game move events
  // Component re-evaluates even for unrelated game moves
}
```

#### 2. Context Provider Overhead
The reducer pattern helps but doesn't eliminate the core issue:

```typescript
// Current unified state structure
interface EventState {
  notifications: Notification[];
  messages: Message[];
  gameStates: Record<string, GameState>;
  friendRequests: FriendRequest[];
  connectionState: ConnectionState;
}

// Any change creates new state object → all consumers re-evaluate
const reducer = (state: EventState, action: EventAction) => {
  switch (action.type) {
    case 'MESSAGE_RECEIVED':
      return { ...state, messages: [...state.messages, action.payload] };
      // ^ This triggers re-evaluation in game components too
  }
};
```

#### 3. State Coupling
Components become indirectly coupled through shared context state:

- Game components depend on message state structure
- Chat components depend on notification state structure
- Changes in one domain can affect components in another domain

### Current Mitigation Strategies

#### 1. Specialized Hooks
Individual hooks provide some isolation but still depend on context updates:

```typescript
export function useNotifications() {
  const context = useEventContext();
  return useMemo(() => ({
    notifications: context.notifications,
    unreadCount: context.notifications.filter(n => !n.read).length,
    // Memoization helps but context still updates on every event
  }), [context.notifications]);
}
```

#### 2. React.memo Usage
Components can be memoized but context changes still propagate:

```typescript
const GameComponent = React.memo(({ gameId }) => {
  const { gameState } = useGameState(gameId);
  // Still re-renders when messages update context
});
```

### Scaling Considerations

Performance issues become noticeable with:

1. **High-frequency Events**: Rapid game moves, typing indicators (>10/second)
2. **Many Active Components**: Multiple game tabs, chat windows, notification panels
3. **Large State Objects**: Extensive message history, game state complexity
4. **Complex UI Trees**: Deep component hierarchies consuming context

### Alternative Solutions

#### Option 1: Zustand with Selective Subscriptions

```typescript
// Separate stores for different domains
const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (notification) => set(state => ({
    notifications: [...state.notifications, notification],
    unreadCount: state.unreadCount + 1
  }))
}));

const useMessageStore = create((set) => ({
  messages: [],
  addMessage: (message) => set(state => ({
    messages: [...state.messages, message]
  }))
}));

// Components only subscribe to relevant stores
function NotificationBell() {
  const unreadCount = useNotificationStore(state => state.unreadCount);
  // Only re-renders on notification changes
}

function ChatWindow() {
  const messages = useMessageStore(state => state.messages);
  // Only re-renders on message changes
}
```

#### Option 2: Split Contexts

```typescript
// Domain-specific contexts
const NotificationContext = createContext();
const MessageContext = createContext();
const GameContext = createContext();

// Single SSE connection distributes to multiple contexts
function EventDistributor({ children }) {
  const subscription = useUnifiedEventSubscription();

  useEffect(() => {
    subscription.on('notification', (event) => {
      notificationStore.dispatch(event);
    });
    subscription.on('message', (event) => {
      messageStore.dispatch(event);
    });
  }, [subscription]);

  return (
    <NotificationProvider>
      <MessageProvider>
        <GameProvider>
          {children}
        </GameProvider>
      </MessageProvider>
    </NotificationProvider>
  );
}
```

#### Option 3: Event Filtering

```typescript
// Client-side event filtering
function useSelectiveEvents(eventTypes: EventType[]) {
  const allEvents = useEventContext();

  return useMemo(() => {
    return allEvents.filter(event => eventTypes.includes(event.type));
  }, [allEvents, eventTypes]);
}

// Usage
function GameComponent() {
  const gameEvents = useSelectiveEvents(['GAME_MOVE', 'GAME_ENDED']);
  // Only processes game-related events
}
```

### Migration Strategy

#### Phase 1: Add Performance Monitoring
```typescript
// Add render tracking to identify hotspots
const useRenderCounter = (componentName: string) => {
  const renderCount = useRef(0);
  renderCount.current++;
  console.log(`${componentName} rendered ${renderCount.current} times`);
};
```

#### Phase 2: Gradual Store Migration
```typescript
// Start with high-frequency event types
const useOptimizedMessages = () => {
  // Try Zustand store first, fallback to context
  return useMessageStore() || useMessages();
};
```

#### Phase 3: Event Distribution Layer
```typescript
// Add distribution layer while keeping existing context
function EnhancedEventProvider({ children }) {
  return (
    <EventDistributor>
      <LegacyEventContext> {/* Keep for backward compatibility */}
        {children}
      </LegacyEventContext>
    </EventDistributor>
  );
}
```

### Performance Monitoring

#### Key Metrics to Track
- **Render Frequency**: Components/second per event type
- **Context Update Rate**: Updates/second during peak usage
- **Memory Usage**: Context state size over time
- **User Experience**: Perceived lag during high activity

#### Monitoring Implementation
```typescript
// Add to EventContext reducer
const reducer = (state: EventState, action: EventAction) => {
  // Track performance metrics
  performance.mark(`event-${action.type}-start`);

  const newState = handleAction(state, action);

  performance.mark(`event-${action.type}-end`);
  performance.measure(
    `event-${action.type}`,
    `event-${action.type}-start`,
    `event-${action.type}-end`
  );

  return newState;
};
```

### Recommendations

#### Current System (Good for)
- ✅ Prototyping and initial development
- ✅ Small to medium user bases (<100 concurrent)
- ✅ Low to moderate event frequency (<5 events/second)
- ✅ Simple UI hierarchies

#### Consider Migration When
- ❌ High render frequency impact on UX
- ❌ Memory usage growth from large state
- ❌ Complex component trees with deep nesting
- ❌ Real-time performance requirements

The reducer pattern provides a solid foundation, but architectural evolution may be needed as the platform scales. The key is measuring actual performance impact before premature optimization.

## 🔒 Security

### Authentication
- All subscriptions require authenticated session
- User can only receive their own events
- Channel access validated server-side

### Event Validation
- Zod schemas validate all payloads
- Type guards ensure type safety
- Sanitization of user-generated content

## 🧪 Testing

### Manual Testing
Use the NotificationDemo component:

```tsx
// Add to any page for testing
import { NotificationDemo } from "~/components/notifications/notification-demo";

<NotificationDemo />
```

### Triggering Test Events

```typescript
// Server-side event emission for testing
import { eventEmitter } from "~/server/event-emitter";
import { createEvent, SSEEventType } from "~/types/sse-events";

// Send test notification
const event = createEvent(SSEEventType.NOTIFICATION_CREATED, {
  id: "test-123",
  title: "Test Notification",
  message: "This is a test",
  type: "SYSTEM",
});
eventEmitter.emitToUser(userId, event);
```

## 🚀 Adding New Event Types

### 1. Define the Event Type

```typescript
// In src/types/sse-events.ts
export enum SSEEventType {
  // ... existing types
  MY_NEW_EVENT = "MY_NEW_EVENT",
}

export interface MyNewEventPayload {
  id: string;
  data: any;
}
```

### 2. Handle in EventContext

```typescript
// In src/contexts/event-context.tsx reducer
case SSEEventType.MY_NEW_EVENT: {
  const payload = event.payload as MyNewEventPayload;
  return {
    ...state,
    myNewData: payload.data,
  };
}
```

### 3. Emit from Server

```typescript
// In your tRPC router
const event = createEvent(SSEEventType.MY_NEW_EVENT, {
  id: "123",
  data: { /* your data */ }
});
eventEmitter.emitToUser(userId, event);
```

### 4. Create Hook (Optional)

```typescript
// In src/hooks/useMyFeature.ts
export function useMyFeature() {
  const context = useEventContext();
  return {
    data: context.myNewData,
    // ... other methods
  };
}
```

## 🐛 Troubleshooting

### Connection Issues
- Check browser console for SSE errors
- Verify authentication status
- Check network tab for 200 status on `/api/trpc/events.onAllEvents`

### Missing Events
- Ensure event is emitted to correct channel
- Verify user has permission for channel
- Check event payload matches type definition

### Performance Issues
- Monitor number of re-renders with React DevTools
- Check for unnecessary state updates
- Verify memoization is working

## 📊 Monitoring

### Key Metrics to Track
- Connection uptime percentage
- Average reconnection time
- Event delivery latency
- Missed event rate
- Concurrent connections

### Logging
```typescript
// Client-side
console.log("[EventContext]", "Connection state:", state);

// Server-side
console.log("[EventEmitter]", "Emitting to channel:", channel);
```

## 🔄 Migration Notes

### From Old SSE System
The system has been migrated from multiple SSE endpoints to a unified subscription:

**Old Architecture:**
- `/api/notifications/stream` - Notification SSE
- `/api/messages/stream` - Message SSE  
- `/api/game/[id]/mp-stream` - Game SSE

**New Architecture:**
- `/api/trpc/events.onAllEvents` - Everything

### Benefits of Migration
1. **Reduced Connections**: 1 instead of 3+
2. **Simplified State**: Single source of truth
3. **Better Types**: Full type safety with tRPC
4. **Easier Debugging**: One place to monitor
5. **Cross-Feature Events**: Events can trigger multiple updates

## 📝 Best Practices

1. **Always use EventContext hooks** instead of direct API calls for real-time data
2. **Implement optimistic updates** for better UX
3. **Handle connection states** in UI (show indicators)
4. **Use proper TypeScript types** for all events
5. **Test reconnection scenarios** during development
6. **Monitor event delivery** in production
7. **Document new event types** when adding features

## 🚧 Known Limitations

1. **Browser SSE Limits**: ~6 connections per domain (solved with unified approach)
2. **No Offline Queue**: Events missed while offline are not replayed
3. **Single Tab**: Multiple tabs compete for connection (by design)
4. **No Compression**: SSE doesn't support compression (HTTP/2 helps)

## 🔮 Future Enhancements

- **WebSocket Upgrade**: For bidirectional communication
- **Event Replay**: Store and replay missed events
- **Offline Support**: Queue events for offline users
- **Push Notifications**: Browser push for critical events
- **Analytics**: Event delivery metrics and monitoring
- **Rate Limiting**: Prevent event spam
- **Event Filtering**: Client-side event subscription preferences
