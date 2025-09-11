import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import bcrypt from "bcryptjs";
import { createMockUser, createMockPrismaClient } from "~/test/auth-utils";

// Create mock DB before mocking modules
const mockDb = createMockPrismaClient();

// Mock modules
vi.mock("~/server/db", () => ({
  db: mockDb,
}));

vi.mock("~/env", () => ({
  env: {
    DISCORD_CLIENT_ID: "test-discord-client-id",
    DISCORD_CLIENT_SECRET: "test-discord-client-secret",
    NEXTAUTH_SECRET: "test-nextauth-secret",
    NEXTAUTH_URL: "http://localhost:3000",
  },
}));

// Import after mocking
import { authOptions } from "./auth";

describe("NextAuth Configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("authOptions", () => {
    it("should have correct providers configured", () => {
      expect(authOptions.providers).toHaveLength(2);
      expect(authOptions.providers[0]?.id).toBe("discord");
      expect(authOptions.providers[1]?.id).toBe("credentials");
    });

    it("should have correct page configurations", () => {
      expect(authOptions.pages).toEqual({
        signIn: "/auth/signin",
        error: "/auth/error",
        newUser: "/auth/new-user",
      });
    });

    it("should use JWT session strategy", () => {
      expect(authOptions.session?.strategy).toBe("jwt");
    });
  });

  describe("Callbacks", () => {
    describe("session callback", () => {
      it("should properly format session with user data from token", () => {
        const mockSession = {
          user: {
            id: "",
            username: "",
            needsUsername: false,
            email: "test@example.com",
            name: "Test User",
            image: null,
          },
          expires: new Date().toISOString(),
        };

        const mockToken = {
          userId: "user-123",
          username: "testuser",
          needsUsername: false,
          email: "test@example.com",
          name: "Test User",
          picture: null,
          sub: "user-123",
        };

        const result = authOptions.callbacks!.session!({
          session: mockSession,
          token: mockToken,
          user: {} as any,
          newSession: undefined,
          trigger: "getSession",
        } as any) as any;

        expect(result.user.id).toBe("user-123");
        expect(result.user.username).toBe("testuser");
        expect(result.user.needsUsername).toBe(false);
      });
    });

    describe("jwt callback", () => {
      it("should set user data on initial sign in", async () => {
        const mockUser = {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          username: "testuser",
          image: null,
        };

        const mockToken = {
          userId: "" as any,
          username: "" as any,
          needsUsername: false as any,
          email: "test@example.com",
          name: "Test User",
          picture: null,
          sub: "user-123",
        } as any;

        const result = await authOptions.callbacks!.jwt!({
          token: mockToken,
          user: mockUser as any,
          account: null,
          profile: undefined,
          trigger: undefined as any,
        } as any);

        expect(result.userId).toBe("user-123");
        expect(result.username).toBe("testuser");
        expect(result.needsUsername).toBe(false);
      });

      it("should set needsUsername to true when username is null", async () => {
        const mockUser = {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          username: null,
          image: null,
        };

        const mockToken = {
          userId: "" as any,
          username: "" as any,
          needsUsername: false as any,
          email: "test@example.com",
          name: "Test User",
          picture: null,
          sub: "user-123",
        } as any;

        const result = await authOptions.callbacks!.jwt!({
          token: mockToken,
          user: mockUser as any,
          account: null,
          profile: undefined,
          trigger: undefined as any,
        } as any);

        expect(result.needsUsername).toBe(true);
      });

      it('should update username when trigger is "update"', async () => {
        const mockToken = {
          userId: "user-123",
          username: "",
          needsUsername: true,
          email: "test@example.com",
          name: "Test User",
          picture: null,
          sub: "user-123",
        };

        const result = await authOptions.callbacks!.jwt!({
          token: mockToken,
          user: undefined as any,
          account: null,
          profile: undefined,
          trigger: "update",
          session: { username: "newusername" },
        });

        expect(result.username).toBe("newusername");
        expect(result.needsUsername).toBe(false);
      });
    });
  });

  describe("Credentials Provider", () => {
    const credentialsProvider = authOptions.providers[1];

    it("should authenticate with valid email and password", async () => {
      const mockUser = createMockUser({
        id: "user-123",
        email: "test@example.com",
        username: "testuser",
        password: await bcrypt.hash("password123", 10),
      });

      // Use mockDb directly
      mockDb.user.findFirst.mockResolvedValue(mockUser);

      const authorize = credentialsProvider?.options?.authorize;
      if (!authorize) throw new Error("Authorize function not found");

      const result = await authorize(
        { emailOrUsername: "test@example.com", password: "password123" },
        {} as any,
      );

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        username: mockUser.username,
        image: mockUser.image,
      });
    });

    it("should authenticate with valid username and password", async () => {
      const mockUser = createMockUser({
        id: "user-123",
        username: "testuser",
        password: await bcrypt.hash("password123", 10),
      });

      // Use mockDb directly
      mockDb.user.findFirst.mockResolvedValue(mockUser);

      const authorize = credentialsProvider?.options?.authorize;
      if (!authorize) throw new Error("Authorize function not found");

      const result = await authorize(
        { emailOrUsername: "testuser", password: "password123" },
        {} as any,
      );

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        username: mockUser.username,
        image: mockUser.image,
      });
    });

    it("should return null for invalid credentials", async () => {
      const mockUser = createMockUser({
        password: await bcrypt.hash("password123", 10),
      });

      // Use mockDb directly
      mockDb.user.findFirst.mockResolvedValue(mockUser);

      const authorize = credentialsProvider?.options?.authorize;
      if (!authorize) throw new Error("Authorize function not found");

      const result = await authorize(
        { emailOrUsername: "test@example.com", password: "wrongpassword" },
        {} as any,
      );

      expect(result).toBeNull();
    });

    it("should return null when user not found", async () => {
      // Use mockDb directly
      mockDb.user.findFirst.mockResolvedValue(null);

      const authorize = credentialsProvider?.options?.authorize;
      if (!authorize) throw new Error("Authorize function not found");

      const result = await authorize(
        { emailOrUsername: "nonexistent@example.com", password: "password123" },
        {} as any,
      );

      expect(result).toBeNull();
    });

    it("should return null when no credentials provided", async () => {
      const authorize = credentialsProvider?.options?.authorize;
      if (!authorize) throw new Error("Authorize function not found");

      const result = await authorize({}, {} as any);

      expect(result).toBeNull();
    });

    it("should return null for OAuth user without password", async () => {
      const mockUser = createMockUser({
        password: null,
      });

      // Use mockDb directly
      mockDb.user.findFirst.mockResolvedValue(mockUser);

      const authorize = credentialsProvider?.options?.authorize;
      if (!authorize) throw new Error("Authorize function not found");

      const result = await authorize(
        { emailOrUsername: "test@example.com", password: "password123" },
        {} as any,
      );

      expect(result).toBeNull();
    });
  });

  describe("Events", () => {
    it("should update user with null username on createUser event", async () => {
      // Use mockDb directly
      const mockUser = createMockUser({ username: undefined });

      await authOptions.events?.createUser?.({ user: mockUser });

      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { username: null },
      });
    });

    it("should not update user if username already exists", async () => {
      // Use mockDb directly
      const mockUser = createMockUser({ username: "existinguser" });

      await authOptions.events?.createUser?.({ user: mockUser });

      expect(mockDb.user.update).not.toHaveBeenCalled();
    });
  });
});
