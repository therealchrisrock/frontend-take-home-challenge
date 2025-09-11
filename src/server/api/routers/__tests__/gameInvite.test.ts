/**
 * Unit tests for Game Invitation tRPC Router
 * Tests all procedures for game invitation system
 */

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { TRPCError } from "@trpc/server";
import { gameInviteRouter } from "../gameInvite";
import { createTRPCMsw } from "msw-trpc";
import type { AppRouter } from "~/server/api/root";

// Mock database client
const mockDb = {
  friendship: {
    findFirst: vi.fn(),
  },
  gameInvite: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  notification: {
    create: vi.fn(),
  },
  game: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
};

// Mock context
const createMockContext = (session?: any) => ({
  db: mockDb,
  session,
});

// Mock caller factory
const createCaller = (ctx: any) => {
  return gameInviteRouter.createCaller(ctx);
};

describe("gameInviteRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variable
    process.env.NEXTAUTH_URL = "http://localhost:3000";
  });

  describe("createInvitation", () => {
    const mockUser = {
      id: "user1",
      username: "testuser",
    };

    const mockSession = {
      user: mockUser,
    };

    it("should create invitation with valid friend selection", async () => {
      const ctx = createMockContext(mockSession);
      const caller = createCaller(ctx);

      // Mock friendship exists
      mockDb.friendship.findFirst.mockResolvedValueOnce({
        senderId: "user1",
        receiverId: "friend1",
      });

      // Mock no existing invitation
      mockDb.gameInvite.findFirst.mockResolvedValueOnce(null);

      // Mock invitation creation
      const mockInvitation = {
        id: "invite1",
        inviteToken: "abc123def456",
        status: "PENDING",
        gameMode: "online",
        variant: null,
        expiresAt: new Date("2024-01-02T12:00:00Z"),
      };
      mockDb.gameInvite.create.mockResolvedValueOnce(mockInvitation);

      // Mock notification creation
      mockDb.notification.create.mockResolvedValueOnce({
        id: "notif1",
      });

      const input = {
        friendId: "friend1",
        gameConfig: { timeLimit: 300, variant: "standard" },
        message: "Let's play!",
        expiresIn: 24,
      };

      const result = await caller.createInvitation(input);

      expect(result).toMatchObject({
        inviteId: "invite1",
        inviteToken: "abc123def456",
        inviteUrl: expect.stringContaining("/game/invite/abc123def456"),
        expiresAt: expect.any(Date),
        gameMode: "online",
        variant: null,
      });

      expect(mockDb.friendship.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { senderId: "user1", receiverId: "friend1" },
            { senderId: "friend1", receiverId: "user1" },
          ],
        },
      });

      expect(mockDb.gameInvite.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inviterId: "user1",
          inviteeId: "friend1",
          inviteToken: expect.any(String),
          status: "PENDING",
          message: "Let's play!",
          gameMode: "online",
          variant: "standard",
          expiresAt: expect.any(Date),
        }),
      });

      expect(mockDb.notification.create).toHaveBeenCalledWith({
        data: {
          userId: "friend1",
          type: "GAME_INVITE",
          title: "Game Invitation",
          message: "testuser invited you to play checkers",
          metadata: expect.any(String),
          relatedEntityId: "invite1",
        },
      });
    });

    it("should handle invalid friend ID gracefully", async () => {
      const ctx = createMockContext(mockSession);
      const caller = createCaller(ctx);

      // Mock friendship not found
      mockDb.friendship.findFirst.mockResolvedValueOnce(null);

      const input = {
        friendId: "invalid-friend",
        gameConfig: { timeLimit: 300 },
      };

      await expect(caller.createInvitation(input)).rejects.toThrow(
        new TRPCError({
          code: "NOT_FOUND",
          message: "Friend not found",
        })
      );
    });

    it("should prevent duplicate active invitations", async () => {
      const ctx = createMockContext(mockSession);
      const caller = createCaller(ctx);

      // Mock friendship exists
      mockDb.friendship.findFirst.mockResolvedValueOnce({
        senderId: "user1",
        receiverId: "friend1",
      });

      // Mock existing invitation
      mockDb.gameInvite.findFirst.mockResolvedValueOnce({
        id: "existing-invite",
        status: "PENDING",
      });

      const input = {
        friendId: "friend1",
        gameConfig: {},
      };

      await expect(caller.createInvitation(input)).rejects.toThrow(
        new TRPCError({
          code: "CONFLICT",
          message: "Active invitation already exists",
        })
      );
    });

    it("should create shareable link invitation without friendId", async () => {
      const ctx = createMockContext(mockSession);
      const caller = createCaller(ctx);

      const mockInvitation = {
        id: "invite1",
        inviteToken: "shareable123",
        status: "PENDING",
        gameMode: "online",
        variant: null,
        expiresAt: new Date("2024-01-02T12:00:00Z"),
      };
      mockDb.gameInvite.create.mockResolvedValueOnce(mockInvitation);

      const input = {
        gameConfig: { variant: "american" },
        expiresIn: 48,
      };

      const result = await caller.createInvitation(input);

      expect(result.inviteToken).toBe("shareable123");
      expect(mockDb.friendship.findFirst).not.toHaveBeenCalled();
      expect(mockDb.notification.create).not.toHaveBeenCalled();
    });
  });

  describe("redeemInvitation", () => {
    const mockInvitation = {
      id: "invite1",
      inviteToken: "abc123",
      status: "PENDING",
      inviterId: "host1",
      inviteeId: null,
      expiresAt: new Date("2030-01-01T12:00:00Z"), // Far future
      variant: "american",
      inviter: {
        id: "host1",
        username: "hostuser",
      },
      invitee: null,
    };

    it("should allow valid invitation redemption by guest", async () => {
      const ctx = createMockContext(null); // Guest user (no session)
      const caller = createCaller(ctx);

      mockDb.gameInvite.findUnique.mockResolvedValueOnce(mockInvitation);

      const mockGame = {
        id: "game1",
        board: JSON.stringify([]),
        currentPlayer: "red",
        gameMode: "online",
        moveCount: 0,
        version: 1,
        player1Id: "host1",
        player2Id: null,
      };
      mockDb.game.create.mockResolvedValueOnce(mockGame);

      mockDb.gameInvite.update.mockResolvedValueOnce({
        ...mockInvitation,
        status: "ACCEPTED",
        gameId: "game1",
      });

      mockDb.notification.create.mockResolvedValueOnce({ id: "notif1" });

      const input = {
        inviteToken: "abc123",
        guestInfo: {
          displayName: "Guest Player",
        },
      };

      const result = await caller.redeemInvitation(input);

      expect(result).toEqual({
        gameId: "game1",
        playerRole: "PLAYER_2",
        isGuest: true,
        inviteId: "invite1",
      });

      expect(mockDb.game.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          board: expect.any(String),
          currentPlayer: "red",
          gameMode: "online",
          player1Id: "host1",
          player2Id: null, // Guest doesn't get user ID
          gameConfig: expect.stringContaining("Guest Player"),
        }),
      });
    });

    it("should reject expired invitations", async () => {
      const ctx = createMockContext(null);
      const caller = createCaller(ctx);

      const expiredInvitation = {
        ...mockInvitation,
        expiresAt: new Date("2020-01-01T12:00:00Z"), // Past date
      };

      mockDb.gameInvite.findUnique.mockResolvedValueOnce(expiredInvitation);
      mockDb.gameInvite.update.mockResolvedValueOnce({
        ...expiredInvitation,
        status: "EXPIRED",
      });

      const input = {
        inviteToken: "abc123",
      };

      await expect(caller.redeemInvitation(input)).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation expired",
        })
      );

      expect(mockDb.gameInvite.update).toHaveBeenCalledWith({
        where: { id: "invite1" },
        data: { status: "EXPIRED" },
      });
    });

    it("should prevent inviter from redeeming their own invitation", async () => {
      const ctx = createMockContext({
        user: { id: "host1", username: "hostuser" },
      });
      const caller = createCaller(ctx);

      mockDb.gameInvite.findUnique.mockResolvedValueOnce(mockInvitation);

      const input = {
        inviteToken: "abc123",
      };

      await expect(caller.redeemInvitation(input)).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot redeem your own invitation",
        })
      );
    });

    it("should handle invitation not found", async () => {
      const ctx = createMockContext(null);
      const caller = createCaller(ctx);

      mockDb.gameInvite.findUnique.mockResolvedValueOnce(null);

      const input = {
        inviteToken: "invalid-token",
      };

      await expect(caller.redeemInvitation(input)).rejects.toThrow(
        new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        })
      );
    });

    it("should reject non-pending invitations", async () => {
      const ctx = createMockContext(null);
      const caller = createCaller(ctx);

      const acceptedInvitation = {
        ...mockInvitation,
        status: "ACCEPTED",
      };

      mockDb.gameInvite.findUnique.mockResolvedValueOnce(acceptedInvitation);

      const input = {
        inviteToken: "abc123",
      };

      await expect(caller.redeemInvitation(input)).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation is no longer valid",
        })
      );
    });
  });

  describe("getActiveInvitations", () => {
    const mockUser = {
      id: "user1",
      username: "testuser",
    };

    const mockSession = {
      user: mockUser,
    };

    it("should return active invitations for user", async () => {
      const ctx = createMockContext(mockSession);
      const caller = createCaller(ctx);

      const mockInvitations = [
        {
          id: "invite1",
          inviteToken: "token1",
          message: "Let's play!",
          gameMode: "online",
          variant: "american",
          expiresAt: new Date("2030-01-01T12:00:00Z"),
          createdAt: new Date("2024-01-01T12:00:00Z"),
          invitee: {
            id: "friend1",
            username: "friend",
            name: "Friend User",
            image: null,
          },
        },
        {
          id: "invite2",
          inviteToken: "token2",
          message: null,
          gameMode: "online",
          variant: null,
          expiresAt: null,
          createdAt: new Date("2024-01-01T10:00:00Z"),
          invitee: null, // Shareable link
        },
      ];

      mockDb.gameInvite.findMany.mockResolvedValueOnce(mockInvitations);

      const result = await caller.getActiveInvitations({ limit: 10 });

      expect(result.invitations).toHaveLength(2);
      expect(result.invitations[0]).toMatchObject({
        id: "invite1",
        inviteToken: "token1",
        inviteUrl: expect.stringContaining("/game/invite/token1"),
        invitee: expect.objectContaining({
          username: "friend",
        }),
      });
      expect(result.nextCursor).toBeUndefined();

      expect(mockDb.gameInvite.findMany).toHaveBeenCalledWith({
        where: {
          inviterId: "user1",
          status: "PENDING",
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } },
          ],
        },
        include: {
          invitee: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 11, // limit + 1 for pagination
        cursor: undefined,
      });
    });

    it("should handle pagination with cursor", async () => {
      const ctx = createMockContext(mockSession);
      const caller = createCaller(ctx);

      const mockInvitations = Array.from({ length: 6 }, (_, i) => ({
        id: `invite${i}`,
        inviteToken: `token${i}`,
        message: null,
        gameMode: "online",
        variant: null,
        expiresAt: null,
        createdAt: new Date(`2024-01-0${i + 1}T12:00:00Z`),
        invitee: null,
      }));

      mockDb.gameInvite.findMany.mockResolvedValueOnce(mockInvitations);

      const result = await caller.getActiveInvitations({
        limit: 5,
        cursor: "cursor123",
      });

      expect(result.invitations).toHaveLength(5);
      expect(result.nextCursor).toBe("invite4"); // Last item ID becomes next cursor

      expect(mockDb.gameInvite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 6, // limit + 1
          cursor: { id: "cursor123" },
        })
      );
    });
  });

  describe("cancelInvitation", () => {
    const mockUser = {
      id: "user1",
      username: "testuser",
    };

    const mockSession = {
      user: mockUser,
    };

    it("should successfully cancel pending invitation", async () => {
      const ctx = createMockContext(mockSession);
      const caller = createCaller(ctx);

      const mockInvitation = {
        id: "invite1",
        inviterId: "user1",
        inviteeId: "friend1",
        status: "PENDING",
      };

      mockDb.gameInvite.findFirst.mockResolvedValueOnce(mockInvitation);
      mockDb.gameInvite.update.mockResolvedValueOnce({
        ...mockInvitation,
        status: "CANCELLED",
      });
      mockDb.notification.create.mockResolvedValueOnce({ id: "notif1" });

      const input = { invitationId: "invite1" };
      const result = await caller.cancelInvitation(input);

      expect(result).toEqual({ success: true });

      expect(mockDb.gameInvite.update).toHaveBeenCalledWith({
        where: { id: "invite1" },
        data: { status: "CANCELLED" },
      });

      expect(mockDb.notification.create).toHaveBeenCalledWith({
        data: {
          userId: "friend1",
          type: "GAME_INVITE",
          title: "Invitation Cancelled",
          message: "testuser cancelled their game invitation",
          metadata: expect.any(String),
          relatedEntityId: "invite1",
        },
      });
    });

    it("should handle invitation not found", async () => {
      const ctx = createMockContext(mockSession);
      const caller = createCaller(ctx);

      mockDb.gameInvite.findFirst.mockResolvedValueOnce(null);

      const input = { invitationId: "nonexistent" };

      await expect(caller.cancelInvitation(input)).rejects.toThrow(
        new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found or cannot be cancelled",
        })
      );
    });

    it("should not create notification for shareable link cancellation", async () => {
      const ctx = createMockContext(mockSession);
      const caller = createCaller(ctx);

      const mockInvitation = {
        id: "invite1",
        inviterId: "user1",
        inviteeId: null, // Shareable link invitation
        status: "PENDING",
      };

      mockDb.gameInvite.findFirst.mockResolvedValueOnce(mockInvitation);
      mockDb.gameInvite.update.mockResolvedValueOnce({
        ...mockInvitation,
        status: "CANCELLED",
      });

      const input = { invitationId: "invite1" };
      const result = await caller.cancelInvitation(input);

      expect(result).toEqual({ success: true });
      expect(mockDb.notification.create).not.toHaveBeenCalled();
    });
  });

  describe("getInvitationByToken", () => {
    it("should return invitation details for valid token", async () => {
      const ctx = createMockContext(null); // Public procedure
      const caller = createCaller(ctx);

      const mockInvitation = {
        id: "invite1",
        status: "PENDING",
        inviter: {
          id: "host1",
          username: "hostuser",
          name: "Host User",
          image: null,
        },
        invitee: {
          id: "friend1",
          username: "friend",
          name: "Friend User",
          image: null,
        },
        message: "Let's play!",
        gameMode: "online",
        variant: "american",
        expiresAt: new Date("2030-01-01T12:00:00Z"),
        createdAt: new Date("2024-01-01T12:00:00Z"),
        game: null,
      };

      mockDb.gameInvite.findUnique.mockResolvedValueOnce(mockInvitation);

      const result = await caller.getInvitationByToken({
        inviteToken: "valid-token",
      });

      expect(result).toMatchObject({
        id: "invite1",
        status: "PENDING",
        inviter: expect.objectContaining({
          username: "hostuser",
        }),
        invitee: expect.objectContaining({
          username: "friend",
        }),
        message: "Let's play!",
        gameMode: "online",
        variant: "american",
      });
    });

    it("should handle invitation not found", async () => {
      const ctx = createMockContext(null);
      const caller = createCaller(ctx);

      mockDb.gameInvite.findUnique.mockResolvedValueOnce(null);

      await expect(
        caller.getInvitationByToken({ inviteToken: "invalid-token" })
      ).rejects.toThrow(
        new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        })
      );
    });

    it("should auto-expire invitation if past expiry date", async () => {
      const ctx = createMockContext(null);
      const caller = createCaller(ctx);

      const expiredInvitation = {
        id: "invite1",
        status: "PENDING",
        expiresAt: new Date("2020-01-01T12:00:00Z"), // Past date
        inviter: { id: "host1", username: "host", name: null, image: null },
        invitee: null,
        message: null,
        gameMode: "online",
        variant: null,
        createdAt: new Date("2020-01-01T10:00:00Z"),
        game: null,
      };

      mockDb.gameInvite.findUnique.mockResolvedValueOnce(expiredInvitation);
      mockDb.gameInvite.update.mockResolvedValueOnce({
        ...expiredInvitation,
        status: "EXPIRED",
      });

      const result = await caller.getInvitationByToken({
        inviteToken: "expired-token",
      });

      expect(result.status).toBe("EXPIRED");
      expect(mockDb.gameInvite.update).toHaveBeenCalledWith({
        where: { id: "invite1" },
        data: { status: "EXPIRED" },
      });
    });
  });
});