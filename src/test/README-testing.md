# Testing Documentation for Checkers Platform

## Overview

This document provides comprehensive testing coverage for the entire checkers platform, including multiplayer gameplay, social features, notification system, and tournament functionality. Testing covers unit tests, integration tests, component tests, and end-to-end scenarios.

## Test Structure

### 📁 Test File Organization

```text
src/
├── test/
│   ├── test-utils.tsx                    # Test utilities and helpers
│   ├── setup.ts                         # Test environment setup
│   └── README-testing.md                # This documentation
├── lib/notifications/__tests__/
│   ├── utils.test.ts                    # Utility function tests
│   └── session-manager.test.ts         # SSE session manager tests
├── components/notifications/__tests__/
│   └── notification-bell.test.tsx      # NotificationBell component tests
├── components/social/__tests__/
│   └── friend-request-card.test.tsx    # FriendRequestCard component tests
├── hooks/__tests__/
│   └── useNotifications.test.ts         # Hook integration tests
└── e2e/
    ├── friend-request-flow.spec.ts      # Complete E2E flows
    ├── friend-requests.spec.ts          # E2E specifications
    ├── global-setup.ts                  # E2E test setup
    └── global-teardown.ts               # E2E test cleanup
```

## Test Categories

### 1. Unit Tests ✅

**Purpose:** Test individual functions and utilities in isolation

#### Utility Functions (`lib/notifications/__tests__/utils.test.ts`)
- `getNotificationIcon()` - Returns correct icons for notification types
- `getNotificationPriority()` - Returns correct priority values
- `sortNotifications()` - Sorts notifications by read status, priority, and date
- `formatNotificationMetadata()` - Formats metadata for display
- `getRelativeTime()` - Calculates human-readable time differences
- `truncateMessage()` - Truncates long messages with ellipsis
- `shouldShowToast()` - Determines if notification should show toast
- `getConnectionStatusMessage()` - Returns connection status messages
- `calculateReconnectDelay()` - Calculates exponential backoff delays

#### Session Manager (`lib/notifications/__tests__/session-manager.test.ts`)
- Tab management (add, remove, single-tab enforcement)
- Message broadcasting to users and specific tabs
- Heartbeat mechanism
- Cleanup of inactive connections
- Error handling and recovery
- Statistics and monitoring

**Coverage Target:** >90% line coverage for utility functions

### 2. Component Tests ✅

**Purpose:** Test React components with user interactions

#### NotificationBell (`components/notifications/__tests__/notification-bell.test.tsx`)
- Renders bell icon and badge correctly
- Shows/hides unread count based on notifications
- Opens dropdown on click
- Displays notifications in dropdown
- Handles mark all as read functionality
- Shows connection status indicators
- Handles empty states
- Supports keyboard navigation
- Shows appropriate error states

#### FriendRequestCard (`components/social/__tests__/friend-request-card.test.tsx`)
- Renders friend request information correctly
- Shows different variants (received vs sent)
- Displays status badges appropriately
- Handles accept/decline actions
- Shows loading states during mutations
- Handles error cases gracefully
- Supports keyboard navigation
- Displays relative timestamps
- Shows skeleton loading states

**Coverage Target:** >85% component coverage

### 3. Hook/Integration Tests ✅

**Purpose:** Test React hooks and context integration

#### useNotifications Hook (`hooks/__tests__/useNotifications.test.ts`)
- Initializes with server-side notifications
- Establishes SSE connection when authenticated
- Updates connection state correctly
- Handles new notification events
- Processes notification read events
- Handles heartbeat messages
- Manages connection errors and reconnection
- Supports optimistic updates with rollback
- Enforces single-tab connections
- Handles malformed messages gracefully

**Coverage Target:** >80% hook integration coverage

### 4. End-to-End Tests ✅

**Purpose:** Test complete user workflows across the application

#### Complete Friend Request Flow (`e2e/friend-request-flow.spec.ts`)
- Send friend request with real-time delivery
- Accept friend request with bidirectional updates
- Decline friend request handling
- Duplicate request prevention
- Network reconnection recovery
- Single-tab SSE enforcement
- Multi-user coordination
- Cross-browser compatibility
- Accessibility testing
- Performance testing

**Test Scenarios:**
1. **Happy Path**: Complete friend request flow from send to accept
2. **Decline Path**: Friend request decline handling
3. **Error Cases**: Duplicate requests, network issues
4. **Edge Cases**: Session expiration, multi-tab behavior
5. **Performance**: High-frequency notifications, large history
6. **Accessibility**: Keyboard navigation, screen reader support
7. **Cross-Browser**: Chrome, Firefox, Safari, Mobile

## Test Utilities

### TestProviders Component
Wraps components with all necessary providers:
- QueryClientProvider (React Query)
- SessionProvider (NextAuth)
- SettingsProvider
- NotificationProvider

### Mock Data
- `mockSession` - Test user session
- `mockNotifications` - Sample notifications
- `mockFriendRequests` - Sample friend requests

### Helper Functions
- `renderWithProviders()` - Custom render with providers
- `MockEventSource` - Mock SSE implementation
- `waitForAsyncUpdate()` - Wait for state updates
- `generateTestId()` - Generate unique test IDs
- `mockNetworkDelay()` - Simulate network delays

## Running Tests

### Unit and Component Tests
```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test --coverage

# Run in watch mode
pnpm test --watch

# Run specific test file
pnpm test notification-bell.test.tsx

# Run tests matching pattern
pnpm test --testNamePattern="should handle"
```

### E2E Tests
```bash
# Install Playwright browsers (if not already installed)
npx playwright install

# Run all E2E tests
pnpm test:e2e

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific test suite
npx playwright test multiplayer-game-flow

# Run in debug mode
npx playwright test --debug

# Generate test report
npx playwright show-report
```

## Test Data Management

### Database Testing
- Use separate test database
- Reset state between tests
- Use database transactions for isolation
- Mock external API calls

### Mock Strategy
- Mock external dependencies (APIs, services)
- Use real implementations for internal logic
- Mock time-sensitive functions with fake timers
- Mock browser APIs (EventSource, LocalStorage)

## Continuous Integration

### GitHub Actions Configuration
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: checkers_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm db:push
      - run: pnpm test --coverage
      - run: npx playwright install
      - run: pnpm test:e2e
```

### Coverage Requirements
- **Unit Tests:** >90% line coverage
- **Component Tests:** >85% component coverage  
- **Integration Tests:** >80% hook coverage
- **E2E Tests:** Critical user journeys covered

## Test Best Practices

### Writing Tests
1. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should mark notification as read', async () => {
     // Arrange
     const notification = mockNotifications[0];
     
     // Act
     await markAsRead(notification.id);
     
     // Assert
     expect(notification.read).toBe(true);
   });
   ```

2. **Descriptive Test Names**
   - Use "should" statements
   - Describe expected behavior
   - Include context when needed

3. **Test Data Management**
   - Use factories for test data
   - Keep tests independent
   - Clean up after tests

4. **Async Testing**
   - Use proper async/await
   - Wait for state changes
   - Handle timing issues

### Component Testing
1. **User-Centric Testing**
   - Test what users see and do
   - Use screen queries (`getByRole`, `getByText`)
   - Avoid implementation details

2. **Interaction Testing**
   - Test user interactions (clicks, typing)
   - Verify visual feedback
   - Test keyboard navigation

3. **State Testing**
   - Test loading states
   - Test error states
   - Test empty states

### E2E Testing
1. **Page Object Pattern**
   - Encapsulate page interactions
   - Reuse common actions
   - Maintain selectors in one place

2. **Test Isolation**
   - Each test should be independent
   - Use unique test data
   - Clean up after tests

3. **Stability**
   - Wait for elements properly
   - Use stable selectors
   - Handle timing issues

## Debugging Tests

### Unit/Component Tests
```bash
# Run specific test with debug info
pnpm test --testNamePattern="should send request" --verbose

# Debug with Node inspector
node --inspect-brk node_modules/.bin/vitest run

# Use console.log in tests (temporarily)
console.log('Debug value:', result);
```

### E2E Tests
```bash
# Debug mode with browser open
pnpm playwright test --debug

# Step through test
pnpm playwright test --debug --headed

# Record test actions
pnpm playwright codegen localhost:3000

# View test traces
pnpm playwright show-trace trace.zip
```

## Common Issues & Solutions

### Issue: SSE Connection Tests Flaky
**Solution:** Use proper mocking and timing controls
```typescript
// Use fake timers
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
vi.useRealTimers();
```

### Issue: Component Tests Not Finding Elements
**Solution:** Use better selectors and wait strategies
```typescript
// Wait for element
await waitFor(() => {
  expect(screen.getByRole('button')).toBeInTheDocument();
});

// Use test IDs for complex elements
<button data-testid="submit-button">Submit</button>
screen.getByTestId('submit-button')
```

### Issue: E2E Tests Timing Out
**Solution:** Increase timeouts and add explicit waits
```typescript
// Increase timeout
await expect(page.locator('selector')).toBeVisible({ timeout: 10000 });

// Wait for network
await page.waitForLoadState('networkidle');
```

## Performance Testing

### Load Testing Scenarios
1. **High Notification Volume**
   - 100+ notifications delivered rapidly
   - UI remains responsive
   - Memory usage stable

2. **Long-Running Sessions**
   - SSE connection active for hours
   - No memory leaks
   - Connection recovery works

3. **Large Data Sets**
   - 1000+ notifications in history
   - Pagination performs well
   - Search remains fast

### Monitoring Metrics
- Page load times
- Notification delivery latency
- Memory usage over time
- Connection uptime
- Error rates

## Security Testing

### Authentication Tests
- Ensure unauthenticated users can't access notifications
- Verify SSE connections require authentication
- Test session expiration handling

### Authorization Tests
- Users only see their own notifications
- Friend requests respect privacy settings
- Cross-user data access prevented

### Input Validation Tests
- Friend request message length limits
- Email validation for recipient
- XSS prevention in notification content

## Maintenance

### Updating Tests
1. **When Adding Features**
   - Add corresponding test cases
   - Update mock data if needed
   - Extend E2E scenarios

2. **When Fixing Bugs**
   - Add regression tests
   - Update existing tests if needed
   - Verify fix doesn't break other tests

3. **When Refactoring**
   - Keep tests passing
   - Update implementation details in tests
   - Maintain test coverage

### Test Review Checklist
- [ ] Tests cover happy path and error cases
- [ ] Test names are descriptive
- [ ] No implementation details in tests
- [ ] Proper async handling
- [ ] Good test data setup
- [ ] Cleanup after tests
- [ ] Coverage requirements met

## Resources

### Documentation
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

### Tools
- **Vitest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **Playwright**: E2E testing framework
- **MSW**: API mocking for tests
- **Happy DOM**: Lightweight DOM implementation

### Best Practices References
- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
