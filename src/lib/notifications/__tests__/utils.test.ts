import { describe, it, expect, vi } from "vitest";
import {
  getNotificationIcon,
  getNotificationPriority,
  sortNotifications,
  formatNotificationMetadata,
  getRelativeTime,
  truncateMessage,
  getNotificationSound,
  shouldShowToast,
  getConnectionStatusMessage,
  calculateReconnectDelay,
} from "../utils";
import type { NotificationState } from "../types";

describe("notification utils", () => {
  describe("getNotificationIcon", () => {
    it("should return correct icons for notification types", () => {
      expect(getNotificationIcon("FRIEND_REQUEST")).toBe("👋");
      expect(getNotificationIcon("FRIEND_REQUEST_ACCEPTED")).toBe("✅");
      expect(getNotificationIcon("FRIEND_REQUEST_DECLINED")).toBe("❌");
    });
  });

  describe("getNotificationPriority", () => {
    it("should return correct priority values", () => {
      expect(getNotificationPriority("FRIEND_REQUEST")).toBe(3);
      expect(getNotificationPriority("FRIEND_REQUEST_ACCEPTED")).toBe(2);
      expect(getNotificationPriority("FRIEND_REQUEST_DECLINED")).toBe(1);
    });

    it("should return 0 for unknown types", () => {
      // @ts-expect-error - testing unknown type
      expect(getNotificationPriority("UNKNOWN")).toBe(0);
    });
  });

  describe("sortNotifications", () => {
    const createNotification = (
      id: string,
      type: NotificationState["type"],
      read: boolean,
      createdAt: string
    ): NotificationState => ({
      id,
      type,
      title: `Notification ${id}`,
      message: "Test message",
      read,
      createdAt,
    });

    it("should sort unread notifications first", () => {
      const notifications = [
        createNotification("1", "FRIEND_REQUEST", true, "2023-01-01T00:00:00Z"),
        createNotification("2", "FRIEND_REQUEST", false, "2023-01-01T00:00:00Z"),
      ];

      const sorted = sortNotifications(notifications);
      expect(sorted[0]?.read).toBe(false);
      expect(sorted[1]?.read).toBe(true);
    });

    it("should sort by priority within read status", () => {
      const notifications = [
        createNotification("1", "FRIEND_REQUEST_DECLINED", false, "2023-01-01T00:00:00Z"),
        createNotification("2", "FRIEND_REQUEST", false, "2023-01-01T00:00:00Z"),
        createNotification("3", "FRIEND_REQUEST_ACCEPTED", false, "2023-01-01T00:00:00Z"),
      ];

      const sorted = sortNotifications(notifications);
      expect(sorted[0]?.type).toBe("FRIEND_REQUEST");
      expect(sorted[1]?.type).toBe("FRIEND_REQUEST_ACCEPTED");
      expect(sorted[2]?.type).toBe("FRIEND_REQUEST_DECLINED");
    });

    it("should sort by creation date when priority is equal", () => {
      const notifications = [
        createNotification("1", "FRIEND_REQUEST", false, "2023-01-01T00:00:00Z"),
        createNotification("2", "FRIEND_REQUEST", false, "2023-01-02T00:00:00Z"),
      ];

      const sorted = sortNotifications(notifications);
      expect(sorted[0]?.id).toBe("2"); // newer first
      expect(sorted[1]?.id).toBe("1");
    });
  });

  describe("formatNotificationMetadata", () => {
    it("should format metadata correctly", () => {
      const metadata = {
        string: "test",
        number: 42,
        boolean: true,
        object: { nested: "value" },
        null: null,
        undefined: undefined,
      };

      const formatted = formatNotificationMetadata(metadata);
      expect(formatted.string).toBe("test");
      expect(formatted.number).toBe("42");
      expect(formatted.boolean).toBe("Yes");
      expect(formatted.object).toBe('{"nested":"value"}');
      expect(formatted.null).toBeUndefined();
      expect(formatted.undefined).toBeUndefined();
    });

    it("should return empty object for undefined metadata", () => {
      const result = formatNotificationMetadata(undefined);
      expect(result).toEqual({});
    });

    it("should handle boolean false", () => {
      const formatted = formatNotificationMetadata({ active: false });
      expect(formatted.active).toBe("No");
    });
  });

  describe("getRelativeTime", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return 'Just now' for very recent times", () => {
      const now = new Date("2023-01-01T12:00:00Z");
      vi.setSystemTime(now);
      
      const recent = new Date(now.getTime() - 30000).toISOString(); // 30 seconds ago
      expect(getRelativeTime(recent)).toBe("Just now");
    });

    it("should return minutes for recent times", () => {
      const now = new Date("2023-01-01T12:00:00Z");
      vi.setSystemTime(now);
      
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
      expect(getRelativeTime(fiveMinutesAgo)).toBe("5 minutes ago");
      
      const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000).toISOString();
      expect(getRelativeTime(oneMinuteAgo)).toBe("1 minute ago");
    });

    it("should return hours for times within 24 hours", () => {
      const now = new Date("2023-01-01T12:00:00Z");
      vi.setSystemTime(now);
      
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
      expect(getRelativeTime(twoHoursAgo)).toBe("2 hours ago");
      
      const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();
      expect(getRelativeTime(oneHourAgo)).toBe("1 hour ago");
    });

    it("should return days for times within a week", () => {
      const now = new Date("2023-01-01T12:00:00Z");
      vi.setSystemTime(now);
      
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(getRelativeTime(threeDaysAgo)).toBe("3 days ago");
    });

    it("should return date string for times over a week", () => {
      const now = new Date("2023-01-15T12:00:00Z");
      vi.setSystemTime(now);
      
      const tenDaysAgo = new Date("2023-01-05T12:00:00Z").toISOString();
      const result = getRelativeTime(tenDaysAgo);
      // Different environments may format dates differently
      expect(result).toMatch(/2023|1\/5\/2023|05|5/);
    });
  });

  describe("truncateMessage", () => {
    it("should not truncate short messages", () => {
      const message = "Short message";
      expect(truncateMessage(message, 100)).toBe(message);
    });

    it("should truncate long messages", () => {
      const longMessage = "a".repeat(150);
      const truncated = truncateMessage(longMessage, 100);
      expect(truncated).toBe("a".repeat(97) + "...");
      expect(truncated.length).toBe(100);
    });

    it("should use default length of 100", () => {
      const longMessage = "a".repeat(150);
      const truncated = truncateMessage(longMessage);
      expect(truncated.length).toBe(100);
    });

    it("should handle empty strings", () => {
      expect(truncateMessage("")).toBe("");
    });
  });

  describe("getNotificationSound", () => {
    it("should return correct sound identifiers", () => {
      expect(getNotificationSound("FRIEND_REQUEST")).toBe("notification-friend-request");
      expect(getNotificationSound("FRIEND_REQUEST_ACCEPTED")).toBe("notification-success");
      expect(getNotificationSound("FRIEND_REQUEST_DECLINED")).toBe("notification-info");
    });
  });

  describe("shouldShowToast", () => {
    it("should return true for friend request notifications", () => {
      expect(shouldShowToast("FRIEND_REQUEST")).toBe(true);
      expect(shouldShowToast("FRIEND_REQUEST_ACCEPTED")).toBe(true);
      expect(shouldShowToast("FRIEND_REQUEST_DECLINED")).toBe(true);
    });
  });

  describe("getConnectionStatusMessage", () => {
    it("should return correct status messages", () => {
      expect(getConnectionStatusMessage(true, false)).toBe("Connected");
      expect(getConnectionStatusMessage(false, true)).toBe("Reconnecting...");
      expect(getConnectionStatusMessage(false, false)).toBe("Disconnected");
      expect(getConnectionStatusMessage(false, false, "Network error")).toBe("Connection error: Network error");
    });
  });

  describe("calculateReconnectDelay", () => {
    it("should calculate exponential backoff correctly", () => {
      expect(calculateReconnectDelay(0)).toBe(1000); // base delay
      expect(calculateReconnectDelay(1)).toBe(2000); // 2^1 * 1000
      expect(calculateReconnectDelay(2)).toBe(4000); // 2^2 * 1000
      expect(calculateReconnectDelay(3)).toBe(8000); // 2^3 * 1000
    });

    it("should respect max delay", () => {
      expect(calculateReconnectDelay(10, 1000, 30000)).toBe(30000);
    });

    it("should use custom base and max delays", () => {
      expect(calculateReconnectDelay(1, 2000, 10000)).toBe(4000);
      expect(calculateReconnectDelay(5, 2000, 10000)).toBe(10000);
    });
  });
});