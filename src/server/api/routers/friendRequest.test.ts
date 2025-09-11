import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  createMockUser,
} from "~/test/auth-utils";
import { FriendRequestStatus, NotificationType } from "@prisma/client";

// Mock modules using factory functions
vi.mock("~/server/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    friendRequest: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    friendship: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    notification: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    block: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("~/server/auth", () => ({
  getServerAuthSession: vi.fn(),
}));

// Import after mocking
import { friendRequestRouter } from "./friendRequest";
import { createCallerFactory } from "~/server/api/trpc";
import { db } from "~/server/db";

describe("Friend Request Router", () => {
  const createCaller = createCallerFactory(friendRequestRouter);
  const mockDb = vi.mocked(db);

  const createMockContext = (session?: any) => ({
    db: mockDb as any,
    session,
    headers: new Headers(),
  });

  const mockSession = {
    user: { 
      id: "user-123", 
      email: "sender@example.com", 
      name: "Sender User",
      username: "sender",
      image: null 
    },
    expires: new Date().toISOString(),
  };

  const mockTargetUser = createMockUser({
    id: "target-user-456",
    email: "target@example.com",
    name: "Target User",
    username: "target",
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup transaction mock
    mockDb.$transaction.mockImplementation(async (callback: any) => {
      return await callback(mockDb);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("send", () => {
    const validInput = {
      userId: "target-user-456",
      message: "Let's be friends!",
    };

    it("should successfully send a friend request", async () => {
      // Setup mocks
      mockDb.user.findUnique.mockResolvedValue(mockTargetUser);
      mockDb.block.findFirst.mockResolvedValue(null);
      mockDb.friendRequest.findFirst.mockResolvedValue(null);
      mockDb.friendship.findFirst.mockResolvedValue(null);
      mockDb.friendRequest.create.mockResolvedValue({
        id: "friend-request-123",
        senderId: "user-123",
        receiverId: "target-user-456",
        status: FriendRequestStatus.PENDING,
        message: validInput.message,
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: mockSession.user,
      });
      mockDb.notification.create.mockResolvedValue({
        id: "notification-123",
        userId: "target-user-456",
        type: NotificationType.FRIEND_REQUEST,
        title: "New Friend Request",
        message: "Sender User sent you a friend request",
        read: false,
        metadata: null,
        relatedEntityId: "friend-request-123",
        createdAt: new Date(),
      });

      const caller = createCaller(createMockContext(mockSession));
      const result = await caller.send(validInput);

      expect(result.success).toBe(true);
      expect(result.friendRequest).toBeDefined();
      expect(mockDb.friendRequest.create).toHaveBeenCalledWith({
        data: {
          senderId: "user-123",
          receiverId: "target-user-456",
          status: FriendRequestStatus.PENDING,
          message: validInput.message,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
            },
          },
        },
      });
      expect(mockDb.notification.create).toHaveBeenCalled();
    });

    it("should throw error when sending to self", async () => {
      const selfInput = { userId: "user-123", message: "Self request" };

      const caller = createCaller(createMockContext(mockSession));

      await expect(caller.send(selfInput)).rejects.toThrow(TRPCError);
      await expect(caller.send(selfInput)).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Cannot send friend request to yourself",
      });
    });

    it("should throw error when target user does not exist", async () => {
      mockDb.user.findUnique.mockResolvedValue(null);

      const caller = createCaller(createMockContext(mockSession));

      await expect(caller.send(validInput)).rejects.toThrow(TRPCError);
      await expect(caller.send(validInput)).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "User not found",
      });
    });

    it("should throw error when users are blocked", async () => {
      mockDb.user.findUnique.mockResolvedValue(mockTargetUser);
      mockDb.block.findFirst.mockResolvedValue({
        id: "block-123",
        blockerId: "target-user-456",
        blockedId: "user-123",
        createdAt: new Date(),
      });

      const caller = createCaller(createMockContext(mockSession));

      await expect(caller.send(validInput)).rejects.toThrow(TRPCError);
      await expect(caller.send(validInput)).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Cannot send friend request",
      });
    });

    it("should throw error when friend request already exists", async () => {
      mockDb.user.findUnique.mockResolvedValue(mockTargetUser);
      mockDb.block.findFirst.mockResolvedValue(null);
      mockDb.friendRequest.findFirst.mockResolvedValue({
        id: "existing-request",
        senderId: "user-123",
        receiverId: "target-user-456",
        status: FriendRequestStatus.PENDING,
        message: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const caller = createCaller(createMockContext(mockSession));

      await expect(caller.send(validInput)).rejects.toThrow(TRPCError);
      await expect(caller.send(validInput)).rejects.toMatchObject({
        code: "CONFLICT",
        message: "Friend request already exists",
      });
    });

    it("should throw error when already friends", async () => {
      mockDb.user.findUnique.mockResolvedValue(mockTargetUser);
      mockDb.block.findFirst.mockResolvedValue(null);
      mockDb.friendRequest.findFirst.mockResolvedValue(null);
      mockDb.friendship.findFirst.mockResolvedValue({
        id: "friendship-123",
        senderId: "user-123",
        receiverId: "target-user-456",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const caller = createCaller(createMockContext(mockSession));

      await expect(caller.send(validInput)).rejects.toThrow(TRPCError);
      await expect(caller.send(validInput)).rejects.toMatchObject({
        code: "CONFLICT",
        message: "Already friends with this user",
      });
    });
  });

  describe("getPending", () => {
    it("should return pending requests for current user", async () => {
      const mockPendingRequests = [
        {
          id: "request-1",
          senderId: "other-user-1",
          receiverId: "user-123",
          status: FriendRequestStatus.PENDING,
          message: "Hello!",
          createdAt: new Date(),
          updatedAt: new Date(),
          sender: createMockUser({ id: "other-user-1", username: "other1" }),
        },
      ];

      mockDb.friendRequest.findMany.mockResolvedValue(mockPendingRequests);

      const caller = createCaller(createMockContext(mockSession));
      const result = await caller.getPending();

      expect(result).toEqual(mockPendingRequests);
      expect(mockDb.friendRequest.findMany).toHaveBeenCalledWith({
        where: {
          receiverId: "user-123",
          status: FriendRequestStatus.PENDING,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    });
  });

  describe("getSent", () => {
    it("should return sent requests for current user", async () => {
      const mockSentRequests = [
        {
          id: "request-2",
          senderId: "user-123",
          receiverId: "other-user-2",
          status: FriendRequestStatus.PENDING,
          message: "Hi there!",
          createdAt: new Date(),
          updatedAt: new Date(),
          receiver: createMockUser({ id: "other-user-2", username: "other2" }),
        },
      ];

      mockDb.friendRequest.findMany.mockResolvedValue(mockSentRequests);

      const caller = createCaller(createMockContext(mockSession));
      const result = await caller.getSent();

      expect(result).toEqual(mockSentRequests);
      expect(mockDb.friendRequest.findMany).toHaveBeenCalledWith({
        where: {
          senderId: "user-123",
          status: FriendRequestStatus.PENDING,
        },
        include: {
          receiver: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    });
  });

  describe("accept", () => {
    const mockFriendRequest = {
      id: "friend-request-123",
      senderId: "other-user",
      receiverId: "user-123",
      status: FriendRequestStatus.PENDING,
      message: "Let's be friends!",
      createdAt: new Date(),
      updatedAt: new Date(),
      sender: createMockUser({ id: "other-user", username: "sender" }),
    };

    it("should successfully accept a friend request", async () => {
      mockDb.friendRequest.findUnique.mockResolvedValue(mockFriendRequest);
      mockDb.friendRequest.update.mockResolvedValue({
        ...mockFriendRequest,
        status: FriendRequestStatus.ACCEPTED,
      });

      const caller = createCaller(createMockContext(mockSession));
      const result = await caller.accept({ friendRequestId: "friend-request-123" });

      expect(result.success).toBe(true);
      expect(mockDb.friendRequest.update).toHaveBeenCalledWith({
        where: { id: "friend-request-123" },
        data: { status: FriendRequestStatus.ACCEPTED },
      });
      expect(mockDb.friendship.create).toHaveBeenCalledWith({
        data: {
          senderId: "other-user",
          receiverId: "user-123",
        },
      });
      expect(mockDb.notification.create).toHaveBeenCalled();
    });

    it("should throw error when request not found", async () => {
      mockDb.friendRequest.findUnique.mockResolvedValue(null);

      const caller = createCaller(createMockContext(mockSession));

      await expect(caller.accept({ friendRequestId: "nonexistent" })).rejects.toThrow(TRPCError);
      await expect(caller.accept({ friendRequestId: "nonexistent" })).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Friend request not found",
      });
    });

    it("should throw error when not authorized to accept", async () => {
      const unauthorizedRequest = {
        ...mockFriendRequest,
        receiverId: "different-user",
      };
      mockDb.friendRequest.findUnique.mockResolvedValue(unauthorizedRequest);

      const caller = createCaller(createMockContext(mockSession));

      await expect(caller.accept({ friendRequestId: "friend-request-123" })).rejects.toThrow(TRPCError);
      await expect(caller.accept({ friendRequestId: "friend-request-123" })).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Not authorized to accept this request",
      });
    });

    it("should throw error when request is not pending", async () => {
      const acceptedRequest = {
        ...mockFriendRequest,
        status: FriendRequestStatus.ACCEPTED,
      };
      mockDb.friendRequest.findUnique.mockResolvedValue(acceptedRequest);

      const caller = createCaller(createMockContext(mockSession));

      await expect(caller.accept({ friendRequestId: "friend-request-123" })).rejects.toThrow(TRPCError);
      await expect(caller.accept({ friendRequestId: "friend-request-123" })).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Friend request is no longer pending",
      });
    });
  });

  describe("decline", () => {
    const mockFriendRequest = {
      id: "friend-request-123",
      senderId: "other-user",
      receiverId: "user-123",
      status: FriendRequestStatus.PENDING,
      message: "Let's be friends!",
      createdAt: new Date(),
      updatedAt: new Date(),
      sender: createMockUser({ id: "other-user", username: "sender" }),
    };

    it("should successfully decline a friend request", async () => {
      mockDb.friendRequest.findUnique.mockResolvedValue(mockFriendRequest);
      mockDb.friendRequest.update.mockResolvedValue({
        ...mockFriendRequest,
        status: FriendRequestStatus.DECLINED,
      });

      const caller = createCaller(createMockContext(mockSession));
      const result = await caller.decline({ friendRequestId: "friend-request-123" });

      expect(result.success).toBe(true);
      expect(mockDb.friendRequest.update).toHaveBeenCalledWith({
        where: { id: "friend-request-123" },
        data: { status: FriendRequestStatus.DECLINED },
      });
      expect(mockDb.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "other-user",
          type: NotificationType.FRIEND_REQUEST_DECLINED,
          title: "Friend Request Declined",
        }),
      });
    });
  });

  describe("cancel", () => {
    const mockFriendRequest = {
      id: "friend-request-123",
      senderId: "user-123",
      receiverId: "other-user",
      status: FriendRequestStatus.PENDING,
      message: "Let's be friends!",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should successfully cancel a sent friend request", async () => {
      mockDb.friendRequest.findUnique.mockResolvedValue(mockFriendRequest);
      mockDb.friendRequest.update.mockResolvedValue({
        ...mockFriendRequest,
        status: FriendRequestStatus.CANCELLED,
      });

      const caller = createCaller(createMockContext(mockSession));
      const result = await caller.cancel({ friendRequestId: "friend-request-123" });

      expect(result.success).toBe(true);
      expect(mockDb.friendRequest.update).toHaveBeenCalledWith({
        where: { id: "friend-request-123" },
        data: { status: FriendRequestStatus.CANCELLED },
      });
      expect(mockDb.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          type: NotificationType.FRIEND_REQUEST,
          relatedEntityId: "friend-request-123",
        },
      });
    });

    it("should throw error when not authorized to cancel", async () => {
      const unauthorizedRequest = {
        ...mockFriendRequest,
        senderId: "different-user",
      };
      mockDb.friendRequest.findUnique.mockResolvedValue(unauthorizedRequest);

      const caller = createCaller(createMockContext(mockSession));

      await expect(caller.cancel({ friendRequestId: "friend-request-123" })).rejects.toThrow(TRPCError);
      await expect(caller.cancel({ friendRequestId: "friend-request-123" })).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Not authorized to cancel this request",
      });
    });
  });

  describe("checkStatus", () => {
    it("should return 'self' when checking own user ID", async () => {
      const caller = createCaller(createMockContext(mockSession));
      const result = await caller.checkStatus({ userId: "user-123" });

      expect(result).toEqual({ status: "self" });
    });

    it("should return 'friends' when friendship exists", async () => {
      mockDb.friendship.findFirst.mockResolvedValue({
        id: "friendship-123",
        senderId: "user-123",
        receiverId: "other-user",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const caller = createCaller(createMockContext(mockSession));
      const result = await caller.checkStatus({ userId: "other-user" });

      expect(result).toEqual({ status: "friends" });
    });

    it("should return 'request_sent' when user has sent a request", async () => {
      mockDb.friendship.findFirst.mockResolvedValue(null);
      mockDb.friendRequest.findFirst.mockResolvedValue({
        id: "request-123",
        senderId: "user-123",
        receiverId: "other-user",
        status: FriendRequestStatus.PENDING,
        message: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const caller = createCaller(createMockContext(mockSession));
      const result = await caller.checkStatus({ userId: "other-user" });

      expect(result).toEqual({ 
        status: "request_sent", 
        friendRequestId: "request-123" 
      });
    });

    it("should return 'request_received' when user has received a request", async () => {
      mockDb.friendship.findFirst.mockResolvedValue(null);
      mockDb.friendRequest.findFirst.mockResolvedValue({
        id: "request-456",
        senderId: "other-user",
        receiverId: "user-123",
        status: FriendRequestStatus.PENDING,
        message: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const caller = createCaller(createMockContext(mockSession));
      const result = await caller.checkStatus({ userId: "other-user" });

      expect(result).toEqual({ 
        status: "request_received", 
        friendRequestId: "request-456" 
      });
    });

    it("should return 'blocked' when users are blocked", async () => {
      mockDb.friendship.findFirst.mockResolvedValue(null);
      mockDb.friendRequest.findFirst.mockResolvedValue(null);
      mockDb.block.findFirst.mockResolvedValue({
        id: "block-123",
        blockerId: "user-123",
        blockedId: "other-user",
        createdAt: new Date(),
      });

      const caller = createCaller(createMockContext(mockSession));
      const result = await caller.checkStatus({ userId: "other-user" });

      expect(result).toEqual({ status: "blocked" });
    });

    it("should return 'none' when no relationship exists", async () => {
      mockDb.friendship.findFirst.mockResolvedValue(null);
      mockDb.friendRequest.findFirst.mockResolvedValue(null);
      mockDb.block.findFirst.mockResolvedValue(null);

      const caller = createCaller(createMockContext(mockSession));
      const result = await caller.checkStatus({ userId: "other-user" });

      expect(result).toEqual({ status: "none" });
    });
  });

  describe("authentication", () => {
    it("should throw error when not authenticated", async () => {
      const caller = createCaller(createMockContext());

      await expect(caller.send({ userId: "any-user" })).rejects.toThrow(TRPCError);
      await expect(caller.send({ userId: "any-user" })).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });
});