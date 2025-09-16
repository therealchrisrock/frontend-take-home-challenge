/**
 * E2E Tests for Real-Time Events System
 * 
 * Tests the unified tRPC SSE subscription system end-to-end
 */

import { test, expect, type Page } from '@playwright/test';

// Helper to wait for SSE connection
async function waitForSSEConnection(page: Page) {
  await page.waitForFunction(
    () => {
      // Check for EventSource in network
      const entries = performance.getEntriesByType('resource');
      return entries.some(entry => 
        entry.name.includes('/api/trpc/events.onAllEvents') &&
        entry.name.includes('text/event-stream')
      );
    },
    { timeout: 10000 }
  );
}

// Helper to login
async function login(page: Page, username: string) {
  await page.goto('/auth/signin');
  await page.fill('[name="username"]', username);
  await page.fill('[name="password"]', 'testpassword');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

test.describe('Real-Time Events System', () => {
  test.describe('SSE Connection', () => {
    test('should establish single SSE connection on login', async ({ page }) => {
      // Login
      await login(page, 'testuser1');
      
      // Wait for SSE connection
      await waitForSSEConnection(page);
      
      // Check network tab for SSE connection
      const sseConnections = await page.evaluate(() => {
        const entries = performance.getEntriesByType('resource');
        return entries.filter(entry => 
          entry.name.includes('events.onAllEvents')
        ).length;
      });
      
      // Should have exactly one SSE connection
      expect(sseConnections).toBe(1);
    });

    test('should receive heartbeat events', async ({ page }) => {
      await login(page, 'testuser1');
      
      // Inject event listener
      const heartbeats = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let count = 0;
          const checkHeartbeat = setInterval(() => {
            // Check if heartbeat was received (would update lastConnected)
            const eventContext = (window as any).__eventContext;
            if (eventContext?.lastConnected) {
              count++;
              if (count >= 2) {
                clearInterval(checkHeartbeat);
                resolve(count);
              }
            }
          }, 1000);
          
          // Timeout after 65 seconds (2 heartbeats should occur)
          setTimeout(() => {
            clearInterval(checkHeartbeat);
            resolve(count);
          }, 65000);
        });
      });
      
      // Should receive at least 2 heartbeats in 65 seconds
      expect(heartbeats).toBeGreaterThanOrEqual(2);
    }).timeout(70000);

    test('should reconnect after network disruption', async ({ page, context }) => {
      await login(page, 'testuser1');
      await waitForSSEConnection(page);
      
      // Simulate network offline
      await context.setOffline(true);
      
      // Check connection state
      const offlineState = await page.evaluate(() => {
        return (window as any).__eventContext?.connectionState;
      });
      expect(offlineState).toBe('disconnected');
      
      // Restore network
      await context.setOffline(false);
      
      // Wait for reconnection
      await page.waitForFunction(
        () => (window as any).__eventContext?.connectionState === 'connected',
        { timeout: 10000 }
      );
      
      const reconnectedState = await page.evaluate(() => {
        return (window as any).__eventContext?.connectionState;
      });
      expect(reconnectedState).toBe('connected');
    });
  });

  test.describe('Notifications', () => {
    test('should receive real-time notifications', async ({ page, context }) => {
      // Open two browser tabs
      const page1 = page;
      const page2 = await context.newPage();
      
      // Login as different users
      await login(page1, 'testuser1');
      await login(page2, 'testuser2');
      
      // User 2 sends friend request to User 1
      await page2.goto('/friends');
      await page2.click('button:has-text("Add Friend")');
      await page2.fill('[placeholder="Search users..."]', 'testuser1');
      await page2.click('button:has-text("Send Request")');
      
      // User 1 should receive notification
      await page1.waitForSelector('.notification-badge', { timeout: 5000 });
      
      // Check notification count
      const notificationCount = await page1.textContent('.notification-badge');
      expect(Number(notificationCount)).toBeGreaterThan(0);
      
      // Open notification dropdown
      await page1.click('.notification-bell');
      
      // Should see friend request notification
      await expect(page1.locator('text=Friend Request')).toBeVisible();
    });

    test('should mark notifications as read', async ({ page }) => {
      await login(page, 'testuser1');
      
      // Assuming there are unread notifications
      await page.click('.notification-bell');
      
      // Click mark all as read
      await page.click('button:has-text("Mark All Read")');
      
      // Badge should disappear
      await expect(page.locator('.notification-badge')).toBeHidden();
      
      // Verify in state
      const unreadCount = await page.evaluate(() => {
        return (window as any).__eventContext?.unreadNotificationCount;
      });
      expect(unreadCount).toBe(0);
    });
  });

  test.describe('Messages', () => {
    test('should receive messages in real-time', async ({ page, context }) => {
      const page1 = page;
      const page2 = await context.newPage();
      
      await login(page1, 'testuser1');
      await login(page2, 'testuser2');
      
      // Both users go to messages
      await page1.goto('/messages');
      await page2.goto('/messages');
      
      // User 2 sends message to User 1
      await page2.click('button:has-text("New Message")');
      await page2.fill('[placeholder="Search users..."]', 'testuser1');
      await page2.click('.user-result:first-child');
      await page2.fill('[placeholder="Type a message..."]', 'Hello from user 2!');
      await page2.press('[placeholder="Type a message..."]', 'Enter');
      
      // User 1 should receive message instantly
      await page1.waitForSelector('text=Hello from user 2!', { timeout: 3000 });
      
      // Verify message appears
      const message = await page1.textContent('.message-content');
      expect(message).toContain('Hello from user 2!');
    });

    test('should show typing indicators', async ({ page, context }) => {
      const page1 = page;
      const page2 = await context.newPage();
      
      await login(page1, 'testuser1');
      await login(page2, 'testuser2');
      
      // Open same chat
      await page1.goto('/messages/chat-123');
      await page2.goto('/messages/chat-123');
      
      // User 2 starts typing
      await page2.fill('[placeholder="Type a message..."]', 'Typing...');
      
      // User 1 should see typing indicator
      await page1.waitForSelector('.typing-indicator', { timeout: 2000 });
      await expect(page1.locator('text=is typing...')).toBeVisible();
      
      // User 2 stops typing (clear input)
      await page2.fill('[placeholder="Type a message..."]', '');
      
      // Typing indicator should disappear
      await expect(page1.locator('.typing-indicator')).toBeHidden();
    });
  });

  test.describe('Game Updates', () => {
    test('should sync game moves in real-time', async ({ page, context }) => {
      const page1 = page;
      const page2 = await context.newPage();
      
      await login(page1, 'testuser1');
      await login(page2, 'testuser2');
      
      // Create a game
      await page1.goto('/play');
      await page1.click('button:has-text("Create Game")');
      const gameUrl = page1.url();
      const gameId = gameUrl.split('/').pop();
      
      // User 2 joins the game
      await page2.goto(gameUrl);
      
      // User 1 makes a move
      await page1.click('.game-piece[data-position="20"]');
      await page1.click('.valid-move[data-position="16"]');
      
      // User 2 should see the move instantly
      await page2.waitForFunction(
        (pos) => {
          const piece = document.querySelector(`[data-position="${pos}"]`);
          return piece && piece.classList.contains('occupied');
        },
        16,
        { timeout: 3000 }
      );
      
      // Verify board state is synchronized
      const user2BoardState = await page2.evaluate(() => {
        return (window as any).__gameState?.board;
      });
      
      const user1BoardState = await page1.evaluate(() => {
        return (window as any).__gameState?.board;
      });
      
      expect(user2BoardState).toEqual(user1BoardState);
    });

    test('should receive game invitations', async ({ page, context }) => {
      const page1 = page;
      const page2 = await context.newPage();
      
      await login(page1, 'testuser1');
      await login(page2, 'testuser2');
      
      // User 2 creates a game and invites User 1
      await page2.goto('/play');
      await page2.click('button:has-text("Create Game")');
      await page2.click('button:has-text("Invite Friend")');
      await page2.fill('[placeholder="Search friends..."]', 'testuser1');
      await page2.click('button:has-text("Send Invite")');
      
      // User 1 should receive game invitation
      await page1.waitForSelector('.game-invite-notification', { timeout: 5000 });
      
      // Accept invitation
      await page1.click('.game-invite-notification');
      await page1.click('button:has-text("Accept")');
      
      // Should be redirected to game
      await page1.waitForURL(/\/game\//);
      
      // Both players should be in the same game
      const game1Url = page1.url();
      const game2Url = page2.url();
      expect(game1Url).toBe(game2Url);
    });
  });

  test.describe('Presence Updates', () => {
    test('should show online/offline status', async ({ page, context }) => {
      const page1 = page;
      const page2 = await context.newPage();
      
      await login(page1, 'testuser1');
      await login(page2, 'testuser2');
      
      // Users are friends
      await page1.goto('/friends');
      
      // User 2 should show as online
      await page1.waitForSelector('.friend-card:has-text("testuser2") .status-online');
      
      // User 2 logs out
      await page2.goto('/auth/signout');
      await page2.click('button:has-text("Sign Out")');
      
      // User 1 should see User 2 go offline
      await page1.waitForSelector(
        '.friend-card:has-text("testuser2") .status-offline',
        { timeout: 5000 }
      );
      
      const status = await page1.getAttribute(
        '.friend-card:has-text("testuser2") .status-indicator',
        'data-status'
      );
      expect(status).toBe('offline');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle server errors gracefully', async ({ page }) => {
      await login(page, 'testuser1');
      
      // Simulate server error by intercepting request
      await page.route('**/api/trpc/events.onAllEvents', route => {
        route.abort('failed');
      });
      
      // Should show error state
      await page.waitForSelector('.connection-error', { timeout: 5000 });
      await expect(page.locator('text=Connection Error')).toBeVisible();
      
      // Remove route interception
      await page.unroute('**/api/trpc/events.onAllEvents');
      
      // Should attempt reconnection
      await page.waitForSelector('.connection-status:has-text("Reconnecting")', {
        timeout: 10000
      });
    });

    test('should handle malformed events', async ({ page }) => {
      await login(page, 'testuser1');
      
      // Inject malformed event
      await page.evaluate(() => {
        const event = new MessageEvent('message', {
          data: 'invalid json',
        });
        window.dispatchEvent(event);
      });
      
      // App should not crash
      await expect(page).toHaveURL('/');
      
      // Check console for error handling
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Should log error but continue functioning
      expect(consoleErrors.some(e => e.includes('parsing'))).toBeTruthy();
    });
  });

  test.describe('Performance', () => {
    test('should handle high frequency events', async ({ page }) => {
      await login(page, 'testuser1');
      
      // Simulate rapid events
      const eventCount = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let count = 0;
          const interval = setInterval(() => {
            // Simulate incoming event
            const event = {
              type: 'TEST_EVENT',
              payload: { index: count },
              timestamp: Date.now(),
            };
            
            // Dispatch to event context
            (window as any).__eventContext?.handleEvent(event);
            count++;
            
            if (count >= 100) {
              clearInterval(interval);
              resolve(count);
            }
          }, 10); // 100 events per second
        });
      });
      
      expect(eventCount).toBe(100);
      
      // Check if app is still responsive
      await page.click('.notification-bell');
      await expect(page.locator('.notification-dropdown')).toBeVisible();
    });

    test('should not leak memory on long sessions', async ({ page }) => {
      await login(page, 'testuser1');
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Simulate long session with events
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          let count = 0;
          const interval = setInterval(() => {
            // Create and dispatch events
            const event = {
              type: 'NOTIFICATION_CREATED',
              payload: {
                id: `notif-${count}`,
                title: `Notification ${count}`,
                message: `Message ${count}`,
              },
              timestamp: Date.now(),
            };
            
            (window as any).__eventContext?.handleEvent(event);
            count++;
            
            if (count >= 1000) {
              clearInterval(interval);
              resolve();
            }
          }, 100);
        });
      });
      
      // Force garbage collection (if available)
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      // Check memory after events
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Memory increase should be reasonable (< 50MB)
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }).timeout(120000);
  });
});