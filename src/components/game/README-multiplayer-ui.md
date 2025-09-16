# Multiplayer Game UI Components - Working Group 3

## Overview

This document describes the frontend UI components implemented by Working Group 3 for the multiplayer checkers invitation system. These components are ready for integration with the backend APIs being developed by Working Group 1.

## Components Created

### 1. GameInviteScreen

**File**: `src/app/(checkers)/_components/game/GameInviteScreen.tsx`

Main invitation workflow component that replaces the traditional "Create Game" flow.

**Features:**

- Multi-step invitation process (select player → configure game → waiting/ready)
- URL query parameter handling for friend pre-selection
- Game variant selection (American, International, Brazilian, Canadian)
- Time control configuration (currently using ComingSoon wrapper)
- Mock API implementations ready for backend integration

**Props:**

- `preselectedFriendId?: string` - Pre-select a friend by ID
- `preselectedUsername?: string` - Pre-select a friend by username

### 2. PlayerSelectionCard

**File**: `src/app/(checkers)/_components/game/PlayerSelectionCard.tsx`

Friend selection interface with search and filtering capabilities.

**Features:**

- Toggle between "Specific Friend" and "Anyone" (shareable link) modes
- Friend search with real-time filtering
- Visual friend selector with avatars and user info
- Integration with existing friends API
- Selection summary with status badges

**Props:**

- `selectedFriend: string | null` - Currently selected friend ID
- `onFriendChange: (friendId: string | null) => void` - Selection callback
- `showInviteButton?: boolean` - Whether to show invite button

### 3. InviteStatusPanel

**File**: `src/app/(checkers)/_components/game/InviteStatusPanel.tsx`

Real-time invitation status tracking and management.

**Features:**

- Live invitation status updates (Pending/Accepted/Declined/Expired)
- Countdown timer with progress bar
- Friend information display
- Cancel invitation functionality
- Responsive status indicators with appropriate colors and icons
- Mock implementation ready for real-time polling

**Props:**

- `inviteId: string` - Invitation identifier
- `selectedFriendId: string | null` - Friend who was invited
- `onGameReady: (gameId: string) => void` - Game start callback
- `onInviteExpired?: () => void` - Expiration callback

### 4. ShareableInviteDialog

**File**: `src/components/game/ShareableInviteDialog.tsx`

Dialog for sharing invitation links with QR codes and social media integration.

**Features:**

- Copy-to-clipboard functionality with visual feedback
- QR code generation using QR-Server API
- Social media sharing buttons (WhatsApp, Email, SMS)
- Native Web Share API support when available
- Tabbed interface for link sharing vs QR code
- Privacy notice about link expiration

**Props:**

- `open: boolean` - Dialog visibility state
- `onOpenChange: (open: boolean) => void` - Dialog state callback
- `inviteId: string` - Invitation identifier for URL generation

## URL Patterns & Routing

### Friend Game Page

**Route**: `/game/online`
**Query Parameters:**

- `friendId` - Pre-select friend by user ID
- `username` - Pre-select friend by username

**Example URLs:**

- `/game/online?friendId=user123` - Pre-select specific friend
- `/game/online?username=john_doe` - Pre-select friend by username

### Invitation Redemption (for Guest Flow - Working Group 6)

**Expected Route**: `/game/invite/[inviteId]`
**Purpose**: Allow guests to redeem invitations without accounts

## API Integration Requirements

The following API endpoints need to be implemented by Working Group 1:

### Game Invitation Router (`api.gameInvite`)

#### `createInvitation`

```typescript
input: {
  inviteeId: string | null; // null for shareable links
  gameConfig: {
    boardVariant: "american" | "brazilian" | "international" | "canadian";
    timeControl: TimeControl | null;
    playerColor: "red" | "black";
  }
}
output: {
  inviteId: string;
  expiresAt: Date;
}
```

#### `getInviteStatus`

```typescript
input: { inviteId: string }
output: {
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  expiresAt: Date;
  gameId: string | null; // Present when accepted
  host: UserInfo;
  invitee?: UserInfo; // For direct invitations
}
```

#### `cancelInvitation`

```typescript
input: {
  inviteId: string;
}
output: {
  success: boolean;
}
```

### Real-time Updates

The components expect real-time updates via Server-Sent Events (SSE) for:

- Invitation status changes
- Game readiness notifications
- Connection status updates

## Dependencies on Other Working Groups

### Working Group 1 (Backend Infrastructure)

- Game invitation tRPC procedures
- Database schema for GameInvite model
- SSE event system for real-time updates

### Working Group 2 (Real-time Infrastructure)

- Connection status hooks (for future integration)
- Real-time synchronization managers (for game client)

### Working Group 6 (Guest Flow & Integration)

- Guest invitation redemption page
- Guest session management
- Post-game account conversion flow

## Current State & Mock Implementation

All components are implemented with mock API calls to enable development and testing without backend dependencies. The mock implementations:

1. **Simulate API delays** with setTimeout
2. **Provide realistic data structures** matching expected API responses
3. **Include error handling patterns** for production readiness
4. **Show loading states** and user feedback appropriately

### Mock Data Examples

**Invitation Status:**

```typescript
const mockInviteData = {
  status: "PENDING" as InviteStatus,
  expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min expiry
  gameId: null, // "mock-game-123" when accepted
};
```

**Friend Selection:**
Uses real `api.user.getFriends` and `api.user.searchUsers` endpoints which already exist.

## Testing & Quality Assurance

### Manual Testing Checklist

- [ ] Friend selection works with search and filtering
- [ ] URL pre-selection works for both friendId and username parameters
- [ ] Game configuration persists through workflow steps
- [ ] Invitation status updates show appropriate UI states
- [ ] Copy-to-clipboard functionality works across browsers
- [ ] QR code generation displays correctly
- [ ] Social sharing buttons open correct applications
- [ ] Mobile responsive design works on various screen sizes
- [ ] Loading states and error handling provide good UX
- [ ] Accessibility (keyboard navigation, screen readers)

### Integration Testing (Post-Backend Integration)

- [ ] Real invitation creation and status polling
- [ ] SSE event handling for status updates
- [ ] Cross-browser clipboard API support
- [ ] Database integration for game configuration persistence
- [ ] Error handling for network failures and timeouts

## Performance Considerations

### Optimizations Implemented

- **Query parameter handling**: Efficient URL parsing without unnecessary re-renders
- **Friend search debouncing**: Built into tRPC query with 2+ character minimum
- **Conditional API calls**: Username search only triggered when needed
- **Component memoization**: Strategic use of React.memo where beneficial
- **Efficient polling**: 2-second intervals only during PENDING status

### Future Optimizations (Post-Integration)

- **WebSocket connections**: Replace polling with real-time WebSocket updates
- **Image lazy loading**: For friend avatars in large lists
- **Virtual scrolling**: If friend lists become very large
- **Service Worker caching**: For offline invitation management

## Known Limitations & Future Enhancements

### Current Limitations

1. **Time Control**: Wrapped in ComingSoon component pending full implementation
2. **Mock APIs**: Need replacement with actual backend integration
3. **Error Boundaries**: Could be enhanced with more specific error handling
4. **Internationalization**: Text strings are hardcoded in English

### Planned Enhancements

1. **Advanced Game Options**: More configuration options for variants
2. **Invitation Templates**: Pre-defined invitation messages
3. **Friend Grouping**: Organize friends into categories
4. **Recent Partners**: Quick access to recently played opponents
5. **Invitation History**: Track and manage past invitations

## Code Quality & Standards

### Followed Conventions

- **TypeScript**: Full type safety with interfaces and generics
- **Shadcn/ui**: Consistent component usage without custom overrides
- **CLAUDE.md Guidelines**: PascalCase components, proper file organization
- **Accessibility**: ARIA labels, keyboard navigation, semantic HTML
- **Error Handling**: Comprehensive toast notifications and loading states

### Code Review Checklist

- [ ] TypeScript types are comprehensive and accurate
- [ ] Components follow single responsibility principle
- [ ] Error handling covers all failure scenarios
- [ ] Loading states provide good user experience
- [ ] Accessibility requirements are met
- [ ] Performance optimizations are appropriate
- [ ] Code is well-documented with clear comments

## Deployment Notes

### Environment Variables

No additional environment variables required for UI components.

### Build Requirements

- Progress component added to shadcn/ui components
- No additional dependencies beyond existing project setup

### Browser Support

- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Clipboard API**: Graceful fallback for unsupported browsers
- **Web Share API**: Progressive enhancement where available
- **QR Code Generation**: External API dependency (api.qrserver.com)

---

This documentation serves as a handoff guide for integration with Working Group 1's backend implementation and coordination with other working groups in the multiplayer checkers feature development.
