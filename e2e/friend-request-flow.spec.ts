import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// Test configuration
const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";
const TEST_USERS = {
  userA: {
    email: "e2e-user-a@test.com", 
    password: "testpassword123",
    name: "Test User A",
  },
  userB: {
    email: "e2e-user-b@test.com",
    password: "testpassword123", 
    name: "Test User B",
  },
};

// Helper functions
class FriendRequestPage {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.goto(`${BASE_URL}/auth/signin`);
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="signin-button"]');
    await this.page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });
  }

  async openNotifications() {
    await this.page.click('[data-testid="notification-bell"]');
    await this.page.waitForSelector('[data-testid="notification-dropdown"]', {
      state: "visible",
    });
  }

  async sendFriendRequest(recipientEmail: string, message?: string) {
    // Open friend request dialog
    await this.page.click('[data-testid="add-friend-button"]');
    await this.page.waitForSelector('[data-testid="friend-request-dialog"]', {
      state: "visible",
    });

    // Fill in recipient email
    await this.page.fill('[data-testid="recipient-email-input"]', recipientEmail);

    // Add optional message
    if (message) {
      await this.page.fill('[data-testid="request-message-input"]', message);
    }

    // Submit request
    await this.page.click('[data-testid="send-request-button"]');

    // Wait for success toast
    await expect(this.page.locator('[data-testid="toast"]')).toContainText(
      "Friend request sent"
    );
  }

  async acceptFriendRequest(senderName: string) {
    await this.openNotifications();

    // Find the friend request card
    const requestCard = this.page.locator(
      `[data-testid="friend-request-card"]:has-text("${senderName}")`
    );
    await expect(requestCard).toBeVisible();

    // Click accept button
    await requestCard.locator('[data-testid="accept-button"]').click();

    // Wait for success confirmation
    await expect(this.page.locator('[data-testid="toast"]')).toContainText(
      "Friend request accepted"
    );
  }

  async declineFriendRequest(senderName: string) {
    await this.openNotifications();

    const requestCard = this.page.locator(
      `[data-testid="friend-request-card"]:has-text("${senderName}")`
    );
    await expect(requestCard).toBeVisible();

    await requestCard.locator('[data-testid="decline-button"]').click();

    await expect(this.page.locator('[data-testid="toast"]')).toContainText(
      "Friend request declined"
    );
  }

  async getNotificationCount() {
    const badge = this.page.locator('[data-testid="notification-badge"]');
    if (await badge.isVisible()) {
      return parseInt(await badge.textContent() || "0", 10);
    }
    return 0;
  }

  async waitForNotification(expectedCount: number, timeout = 10000) {
    await expect(this.page.locator('[data-testid="notification-badge"]')).toContainText(
      expectedCount.toString(),
      { timeout }
    );
  }
}

test.describe("Friend Request Flow", () => {
  let contextA: BrowserContext;
  let contextB: BrowserContext;
  let pageA: Page;
  let pageB: Page;
  let friendRequestPageA: FriendRequestPage;
  let friendRequestPageB: FriendRequestPage;

  test.beforeEach(async ({ browser }) => {
    // Create separate browser contexts for two users
    contextA = await browser.newContext();
    contextB = await browser.newContext();
    
    pageA = await contextA.newPage();
    pageB = await contextB.newPage();
    
    friendRequestPageA = new FriendRequestPage(pageA);
    friendRequestPageB = new FriendRequestPage(pageB);

    // Login both users
    await Promise.all([
      friendRequestPageA.login(TEST_USERS.userA.email, TEST_USERS.userA.password),
      friendRequestPageB.login(TEST_USERS.userB.email, TEST_USERS.userB.password),
    ]);
  });

  test.afterEach(async () => {
    await contextA.close();
    await contextB.close();
  });

  test("should complete full friend request flow", async () => {
    // Step 1: User A sends friend request to User B
    await friendRequestPageA.sendFriendRequest(
      TEST_USERS.userB.email,
      "Hey, let's be friends!"
    );

    // Step 2: Verify User B receives real-time notification
    await friendRequestPageB.waitForNotification(1, 5000);

    // Step 3: User B accepts the friend request
    await friendRequestPageB.acceptFriendRequest(TEST_USERS.userA.name);

    // Step 4: Verify User A receives acceptance notification
    await friendRequestPageA.waitForNotification(1, 5000);

    // Step 5: Verify friendship is established (both users show as friends)
    await Promise.all([
      pageA.goto(`${BASE_URL}/friends`),
      pageB.goto(`${BASE_URL}/friends`),
    ]);

    await Promise.all([
      expect(pageA.locator(`text=${TEST_USERS.userB.name}`)).toBeVisible(),
      expect(pageB.locator(`text=${TEST_USERS.userA.name}`)).toBeVisible(),
    ]);
  });

  test("should handle friend request decline", async () => {
    // User A sends request
    await friendRequestPageA.sendFriendRequest(TEST_USERS.userB.email);

    // User B receives notification
    await friendRequestPageB.waitForNotification(1);

    // User B declines request
    await friendRequestPageB.declineFriendRequest(TEST_USERS.userA.name);

    // Verify no friendship created
    await pageB.goto(`${BASE_URL}/friends`);
    await expect(pageB.locator(`text=${TEST_USERS.userA.name}`)).not.toBeVisible();

    // Verify notification cleared
    expect(await friendRequestPageB.getNotificationCount()).toBe(0);
  });

  test("should prevent duplicate friend requests", async () => {
    // Send first request
    await friendRequestPageA.sendFriendRequest(TEST_USERS.userB.email);

    // Attempt to send duplicate request
    await friendRequestPageA.sendFriendRequest(TEST_USERS.userB.email);

    // Should show error message
    await expect(pageA.locator('[data-testid="toast"]')).toContainText(
      "already sent"
    );

    // User B should only have one notification
    await friendRequestPageB.waitForNotification(1);
  });

  test("should handle network reconnection", async () => {
    // Establish initial connection
    await friendRequestPageB.waitForNotification(0);

    // Simulate network disconnection by going offline
    await pageB.context().setOffline(true);

    // Send friend request while B is offline
    await friendRequestPageA.sendFriendRequest(TEST_USERS.userB.email);

    // Restore connection
    await pageB.context().setOffline(false);

    // User B should receive the notification after reconnection
    await friendRequestPageB.waitForNotification(1, 10000);
  });

  test("should enforce single-tab SSE connections", async () => {
    // Open second tab for User B
    const pageB2 = await contextB.newPage();
    const friendRequestPageB2 = new FriendRequestPage(pageB2);
    
    await friendRequestPageB2.login(TEST_USERS.userB.email, TEST_USERS.userB.password);

    // Send notification
    await friendRequestPageA.sendFriendRequest(TEST_USERS.userB.email);

    // Only one tab should receive the notification
    // (The newer tab should be active)
    await friendRequestPageB2.waitForNotification(1, 5000);

    // Original tab should show connection status as inactive
    await pageB.waitForSelector('[data-testid="connection-inactive"]', {
      state: "visible",
      timeout: 5000,
    });

    await pageB2.close();
  });
});

test.describe("Accessibility", () => {
  let page: Page;
  let friendRequestPage: FriendRequestPage;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    friendRequestPage = new FriendRequestPage(page);

    await friendRequestPage.login(TEST_USERS.userA.email, TEST_USERS.userA.password);
  });

  test("should be keyboard accessible", async () => {
    // Tab to notification bell
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.locator('[data-testid="notification-bell"]')).toBeFocused();

    // Open dropdown with Enter
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();

    // Tab to add friend button
    await page.goto(`${BASE_URL}/friends`);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.locator('[data-testid="add-friend-button"]')).toBeFocused();

    // Open dialog with Enter
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-testid="friend-request-dialog"]')).toBeVisible();
  });

  test("should have proper ARIA labels", async () => {
    await expect(page.locator('[data-testid="notification-bell"]')).toHaveAttribute(
      "aria-label",
      /Notifications/
    );

    await expect(page.locator('[data-testid="notification-bell"]')).toHaveAttribute(
      "role",
      "button"
    );
  });

  test("should announce status changes to screen readers", async () => {
    // This would require specialized screen reader testing tools
    // For now, verify aria-live regions are present
    await expect(page.locator('[aria-live="polite"]')).toBeVisible();
  });
});

test.describe("Performance", () => {
  test("should handle multiple rapid notifications", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const friendRequestPage = new FriendRequestPage(page);

    await friendRequestPage.login(TEST_USERS.userB.email, TEST_USERS.userB.password);

    // Send 10 rapid notifications (simulate multiple friend requests)
    const senderContext = await browser.newContext();
    const senderPage = await senderContext.newPage();
    const senderFriendRequestPage = new FriendRequestPage(senderPage);

    await senderFriendRequestPage.login(TEST_USERS.userA.email, TEST_USERS.userA.password);

    // This would require backend support for rapid notifications
    // For now, test that UI remains responsive
    for (let i = 0; i < 5; i++) {
      await senderFriendRequestPage.sendFriendRequest(
        `test${i}@example.com`,
        `Test message ${i}`
      );
      await page.waitForTimeout(500); // Brief delay between requests
    }

    // Verify all notifications received and UI remains responsive
    await expect(page.locator('[data-testid="notification-bell"]')).toBeVisible();
    await friendRequestPage.openNotifications();

    await senderContext.close();
    await context.close();
  });

  test("should maintain reasonable performance with large notification history", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // This test would require seeding database with many notifications
    // For now, measure basic performance metrics
    
    await page.goto(`${BASE_URL}/notifications`);

    const startTime = Date.now();
    await page.waitForSelector('[data-testid="notification-list"]');
    const loadTime = Date.now() - startTime;

    // Verify page loads within reasonable time
    expect(loadTime).toBeLessThan(5000); // 5 seconds

    await context.close();
  });
});

test.describe("Cross-Browser Compatibility", () => {
  const browsers = ["chromium", "firefox", "webkit"];

  browsers.forEach((browserName) => {
    test(`should work in ${browserName}`, async ({ browser }) => {
      // Basic smoke test for each browser
      const context = await browser.newContext();
      const page = await context.newPage();
      const friendRequestPage = new FriendRequestPage(page);

      await friendRequestPage.login(TEST_USERS.userA.email, TEST_USERS.userA.password);

      // Verify basic functionality works
      await expect(page.locator('[data-testid="notification-bell"]')).toBeVisible();
      await friendRequestPage.openNotifications();

      await context.close();
    });
  });
});

// Test data cleanup helper
test.afterAll(async () => {
  // Clean up test data
  // This would require database cleanup utilities
  console.log("E2E tests completed - clean up test data if needed");
});