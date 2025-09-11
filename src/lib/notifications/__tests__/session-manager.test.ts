import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NotificationSessionManager } from "../session-manager";
import type { NotificationEvent } from "../types";

describe("NotificationSessionManager", () => {
  let sessionManager: NotificationSessionManager;
  let mockController: {
    enqueue: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    
    mockController = {
      enqueue: vi.fn(),
      close: vi.fn(),
    };
    
    sessionManager = new NotificationSessionManager();
  });

  afterEach(() => {
    sessionManager.destroy();
    vi.useRealTimers();
  });

  describe("tab management", () => {
    it("should add a new tab and set it as active", () => {
      sessionManager.addTab("user1", "tab1", mockController as any);

      const userSession = sessionManager.getUserSession("user1");
      expect(userSession).toBeDefined();
      expect(userSession?.activeTabId).toBe("tab1");
      expect(userSession?.tabs.size).toBe(1);
    });

    it("should enforce single-tab policy by closing existing tabs", () => {
      const mockController2 = {
        enqueue: vi.fn(),
        close: vi.fn(),
      };

      // Add first tab
      sessionManager.addTab("user1", "tab1", mockController as any);
      
      // Add second tab (should close first)
      sessionManager.addTab("user1", "tab2", mockController2 as any);

      const userSession = sessionManager.getUserSession("user1");
      expect(userSession?.activeTabId).toBe("tab2");
      expect(userSession?.tabs.size).toBe(1);
      
      // First tab should have been closed
      expect(mockController.enqueue).toHaveBeenCalledWith(
        expect.any(Uint8Array)
      );
      expect(mockController.close).toHaveBeenCalled();
    });

    it("should remove tab correctly", () => {
      sessionManager.addTab("user1", "tab1", mockController as any);
      sessionManager.removeTab("user1", "tab1");

      const userSession = sessionManager.getUserSession("user1");
      expect(userSession).toBeUndefined();
    });

    it("should update tab heartbeat", () => {
      sessionManager.addTab("user1", "tab1", mockController as any);
      
      const beforeHeartbeat = Date.now();
      vi.advanceTimersByTime(1000);
      
      sessionManager.updateTabHeartbeat("user1", "tab1");
      
      const userSession = sessionManager.getUserSession("user1");
      const tab = userSession?.tabs.get("tab1");
      
      expect(tab?.lastSeen.getTime()).toBeGreaterThan(beforeHeartbeat);
    });

    it("should identify active tab correctly", () => {
      sessionManager.addTab("user1", "tab1", mockController as any);
      
      expect(sessionManager.isActiveTab("user1", "tab1")).toBe(true);
      expect(sessionManager.isActiveTab("user1", "tab2")).toBe(false);
      expect(sessionManager.isActiveTab("user2", "tab1")).toBe(false);
    });
  });

  describe("message broadcasting", () => {
    const testEvent: NotificationEvent = {
      type: "NOTIFICATION_CREATED",
      payload: {
        id: "notif-1",
        type: "FRIEND_REQUEST",
        title: "Test Notification",
        message: "Test message",
        createdAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      userId: "user1",
    };

    it("should broadcast message to user", () => {
      sessionManager.addTab("user1", "tab1", mockController as any);
      sessionManager.broadcastToUser("user1", testEvent);

      const expectedData = `data: ${JSON.stringify(testEvent)}\n\n`;
      const expectedEncoded = new TextEncoder().encode(expectedData);
      
      expect(mockController.enqueue).toHaveBeenCalledWith(expectedEncoded);
    });

    it("should send message to specific tab", () => {
      sessionManager.addTab("user1", "tab1", mockController as any);
      sessionManager.sendToTab("user1", "tab1", testEvent);

      const expectedData = `data: ${JSON.stringify(testEvent)}\n\n`;
      const expectedEncoded = new TextEncoder().encode(expectedData);
      
      expect(mockController.enqueue).toHaveBeenCalledWith(expectedEncoded);
    });

    it("should handle controller errors gracefully", () => {
      mockController.enqueue.mockImplementation(() => {
        throw new Error("Controller error");
      });

      sessionManager.addTab("user1", "tab1", mockController as any);
      sessionManager.broadcastToUser("user1", testEvent);

      // Tab should be removed after error
      const userSession = sessionManager.getUserSession("user1");
      expect(userSession).toBeUndefined();
    });

    it("should not broadcast to non-existent user", () => {
      sessionManager.broadcastToUser("nonexistent", testEvent);
      
      // Should not throw or crash
      expect(mockController.enqueue).not.toHaveBeenCalled();
    });
  });

  describe("heartbeat mechanism", () => {
    it("should send heartbeat to all connected tabs", () => {
      sessionManager.addTab("user1", "tab1", mockController as any);
      
      // Clear the initial connection status call
      mockController.enqueue.mockClear();
      
      // Advance timer to trigger heartbeat
      vi.advanceTimersByTime(30000); // 30 seconds
      
      expect(mockController.enqueue).toHaveBeenCalledWith(
        expect.any(Uint8Array)
      );
      
      // Verify it's a heartbeat message
      const call = mockController.enqueue.mock.calls[0];
      const data = new TextDecoder().decode(call?.[0] as Uint8Array);
      expect(data).toContain('"type":"HEARTBEAT"');
    });

    it("should update lastSeen when sending heartbeat", () => {
      sessionManager.addTab("user1", "tab1", mockController as any);
      
      const initialLastSeen = sessionManager.getUserSession("user1")?.tabs.get("tab1")?.lastSeen.getTime();
      
      vi.advanceTimersByTime(30000);
      
      const newLastSeen = sessionManager.getUserSession("user1")?.tabs.get("tab1")?.lastSeen.getTime();
      expect(newLastSeen).toBeGreaterThan(initialLastSeen!);
    });
  });

  describe("cleanup mechanism", () => {
    it("should cleanup inactive tabs", () => {
      const startTime = new Date('2023-01-01T00:00:00.000Z');
      vi.setSystemTime(startTime);
      
      sessionManager.addTab("user1", "tab1", mockController as any);
      
      // Advance time past the tab timeout (60 seconds) plus cleanup interval (30 seconds)
      const cleanupTime = new Date('2023-01-01T00:01:31.000Z'); // 91 seconds later
      vi.setSystemTime(cleanupTime);
      vi.advanceTimersByTime(30000); // Trigger cleanup interval
      
      const userSession = sessionManager.getUserSession("user1");
      expect(userSession).toBeUndefined();
    });

    it("should not cleanup active tabs", () => {
      sessionManager.addTab("user1", "tab1", mockController as any);
      
      // Update heartbeat before timeout
      vi.advanceTimersByTime(50000);
      sessionManager.updateTabHeartbeat("user1", "tab1");
      
      // Advance more time but still within timeout from last heartbeat
      vi.advanceTimersByTime(50000);
      
      const userSession = sessionManager.getUserSession("user1");
      expect(userSession?.tabs.size).toBe(1);
    });
  });

  describe("connection status", () => {
    it("should send initial connection status on tab add", () => {
      sessionManager.addTab("user1", "tab1", mockController as any);
      
      expect(mockController.enqueue).toHaveBeenCalledWith(
        expect.any(Uint8Array)
      );
      
      const call = mockController.enqueue.mock.calls[0];
      const data = new TextDecoder().decode(call?.[0] as Uint8Array);
      const parsed = JSON.parse(data.replace("data: ", "").trim());
      
      expect(parsed.type).toBe("CONNECTION_STATUS");
      expect(parsed.payload.connected).toBe(true);
    });
  });

  describe("statistics", () => {
    it("should return correct statistics", () => {
      sessionManager.addTab("user1", "tab1", mockController as any);
      sessionManager.addTab("user2", "tab2", mockController as any);
      
      const stats = sessionManager.getStats();
      
      expect(stats.totalSessions).toBe(2);
      expect(stats.totalTabs).toBe(2);
      expect(stats.sessionsDetails).toHaveLength(2);
      
      const user1Session = stats.sessionsDetails.find(s => s.userId === "user1");
      expect(user1Session?.tabCount).toBe(1);
      expect(user1Session?.activeTabId).toBe("tab1");
    });

    it("should return empty stats when no sessions", () => {
      const stats = sessionManager.getStats();
      
      expect(stats.totalSessions).toBe(0);
      expect(stats.totalTabs).toBe(0);
      expect(stats.sessionsDetails).toHaveLength(0);
    });
  });

  describe("destruction", () => {
    it("should clear all sessions on destroy", () => {
      sessionManager.addTab("user1", "tab1", mockController as any);
      sessionManager.addTab("user2", "tab2", mockController as any);
      
      expect(sessionManager.getStats().totalSessions).toBe(2);
      
      sessionManager.destroy();
      
      expect(sessionManager.getStats().totalSessions).toBe(0);
    });
  });

  describe("error handling", () => {
    it("should handle invalid tab operations gracefully", () => {
      // Try to remove non-existent tab
      sessionManager.removeTab("user1", "tab1");
      
      // Try to update heartbeat for non-existent tab
      sessionManager.updateTabHeartbeat("user1", "tab1");
      
      // Try to send message to non-existent tab
      const testEvent: NotificationEvent = {
        type: "HEARTBEAT",
        payload: {},
        timestamp: new Date().toISOString(),
        userId: "user1",
      };
      
      sessionManager.sendToTab("user1", "tab1", testEvent);
      
      // Should not throw or crash
      expect(true).toBe(true);
    });

    it("should handle controller errors during message sending", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      mockController.enqueue.mockImplementation(() => {
        throw new Error("Network error");
      });
      
      sessionManager.addTab("user1", "tab1", mockController as any);
      
      const testEvent: NotificationEvent = {
        type: "HEARTBEAT",
        payload: {},
        timestamp: new Date().toISOString(),
        userId: "user1",
      };
      
      sessionManager.broadcastToUser("user1", testEvent);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to send event to user"),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe("multiple users", () => {
    it("should handle multiple users independently", () => {
      const mockController2 = {
        enqueue: vi.fn(),
        close: vi.fn(),
      };
      
      sessionManager.addTab("user1", "tab1", mockController as any);
      sessionManager.addTab("user2", "tab2", mockController2 as any);
      
      // Clear mocks after adding tabs (connection status events are sent during add)
      mockController.enqueue.mockClear();
      mockController2.enqueue.mockClear();
      
      const testEvent: NotificationEvent = {
        type: "NOTIFICATION_CREATED",
        payload: {
          id: "notif-1",
          type: "FRIEND_REQUEST",
          title: "Test",
          message: "Test message",
          createdAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        userId: "user1",
      };
      
      sessionManager.broadcastToUser("user1", testEvent);
      
      expect(mockController.enqueue).toHaveBeenCalled();
      expect(mockController2.enqueue).not.toHaveBeenCalled();
    });
  });
});