import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import {
  createMockUser,
  createMockPrismaClient,
  createMockResendClient,
} from "~/test/auth-utils";

// Create mocks before module mocking
const mockDb = createMockPrismaClient();
const mockResend = createMockResendClient();

// Mock modules
vi.mock("~/server/db", () => ({
  db: mockDb,
}));

vi.mock("~/server/auth", () => ({
  getServerAuthSession: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: vi.fn(() => mockResend),
}));

vi.mock("~/env", () => ({
  env: {
    RESEND_API_KEY: "test-resend-key",
    RESEND_FROM_EMAIL: "noreply@example.com",
    NEXTAUTH_URL: "http://localhost:3000",
  },
}));

// Import after mocking
import { authRouter } from "./auth";
import { createCallerFactory } from "~/server/api/trpc";

describe("Auth Router", () => {
  const createCaller = createCallerFactory(authRouter);

  const createMockContext = (session?: any) => ({
    db: mockDb as any,
    session,
    headers: new Headers(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("register", () => {
    const validInput = {
      email: "newuser@example.com",
      password: "ValidPass123!",
      username: "newuser",
      name: "New User",
    };

    it("should successfully register a new user", async () => {
      mockDb.user.findFirst.mockResolvedValue(null);
      mockDb.user.create.mockResolvedValue(
        createMockUser({
          id: "new-user-id",
          ...validInput,
        }),
      );

      const caller = createCaller(createMockContext());
      const result = await caller.register(validInput);

      expect(result).toEqual({
        success: true,
        userId: "new-user-id",
      });
      expect(mockDb.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: validInput.email,
          username: validInput.username,
          name: validInput.name,
        }),
      });
    });

    it("should hash the password before saving", async () => {
      mockDb.user.findFirst.mockResolvedValue(null);
      mockDb.user.create.mockResolvedValue(createMockUser());

      const caller = createCaller(createMockContext());
      await caller.register(validInput);

      const createCall = mockDb.user.create.mock.calls[0]![0];
      const hashedPassword = createCall.data.password;
      const isValidHash = await bcrypt.compare(
        validInput.password,
        hashedPassword,
      );

      expect(isValidHash).toBe(true);
    });

    it("should throw error when email already exists", async () => {
      mockDb.user.findFirst.mockResolvedValue(
        createMockUser({
          email: validInput.email,
        }),
      );

      const caller = createCaller(createMockContext());

      await expect(caller.register(validInput)).rejects.toThrow(TRPCError);
      await expect(caller.register(validInput)).rejects.toMatchObject({
        code: "CONFLICT",
        message: "Email already in use",
      });
    });

    it("should throw error when username already exists", async () => {
      mockDb.user.findFirst.mockResolvedValue(
        createMockUser({
          username: validInput.username,
          email: "other@example.com",
        }),
      );

      const caller = createCaller(createMockContext());

      await expect(caller.register(validInput)).rejects.toThrow(TRPCError);
      await expect(caller.register(validInput)).rejects.toMatchObject({
        code: "CONFLICT",
        message: "Username already taken",
      });
    });

    it("should validate password length", async () => {
      const invalidInput = { ...validInput, password: "short" };

      const caller = createCaller(createMockContext());
      await expect(caller.register(invalidInput)).rejects.toThrow();
    });

    it("should validate email format", async () => {
      const invalidInput = { ...validInput, email: "notanemail" };

      const caller = createCaller(createMockContext());
      await expect(caller.register(invalidInput)).rejects.toThrow();
    });

    it("should validate username format", async () => {
      const invalidInput = { ...validInput, username: "user@name" };

      const caller = createCaller(createMockContext());
      await expect(caller.register(invalidInput)).rejects.toThrow();
    });
  });

  describe("setUsername", () => {
    const mockSession = {
      user: { id: "user-123", email: "test@example.com", name: "Test User" },
      expires: new Date().toISOString(),
    };

    it("should successfully set username for authenticated user", async () => {
      mockDb.user.findUnique.mockResolvedValue(null);
      mockDb.user.update.mockResolvedValue(createMockUser());

      const caller = createCaller(createMockContext(mockSession));
      const result = await caller.setUsername({ username: "newusername" });

      expect(result).toEqual({ success: true });
      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { username: "newusername" },
      });
    });

    it("should throw error when username is taken", async () => {
      mockDb.user.findUnique.mockResolvedValue(createMockUser());

      const caller = createCaller(createMockContext(mockSession));

      await expect(caller.setUsername({ username: "taken" })).rejects.toThrow(
        TRPCError,
      );
      await expect(
        caller.setUsername({ username: "taken" }),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "Username already taken",
      });
    });

    it("should throw error when not authenticated", async () => {
      const caller = createCaller(createMockContext());

      await expect(
        caller.setUsername({ username: "newusername" }),
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.setUsername({ username: "newusername" }),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });

  describe("checkUsername", () => {
    it("should return available when username does not exist", async () => {
      mockDb.user.findUnique.mockResolvedValue(null);

      const caller = createCaller(createMockContext());
      const result = await caller.checkUsername({ username: "available" });

      expect(result).toEqual({ available: true });
    });

    it("should return unavailable when username exists", async () => {
      mockDb.user.findUnique.mockResolvedValue(createMockUser());

      const caller = createCaller(createMockContext());
      const result = await caller.checkUsername({ username: "taken" });

      expect(result).toEqual({ available: false });
    });
  });

  describe("requestPasswordReset", () => {
    it("should create reset token and send email for existing user", async () => {
      const mockUser = createMockUser({ id: "user-123" });
      mockDb.user.findUnique.mockResolvedValue(mockUser);
      mockDb.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      mockDb.passwordResetToken.create.mockResolvedValue({
        id: "token-123",
        token: "reset-token-123",
        userId: "user-123",
        expires: new Date(),
      });

      const caller = createCaller(createMockContext());
      const result = await caller.requestPasswordReset({
        email: mockUser.email!,
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
      });
      expect(mockDb.passwordResetToken.create).toHaveBeenCalled();
      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: "Password Reset Request",
        }),
      );
    });

    it("should return success even when user does not exist", async () => {
      mockDb.user.findUnique.mockResolvedValue(null);

      const caller = createCaller(createMockContext());
      const result = await caller.requestPasswordReset({
        email: "nonexistent@example.com",
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.passwordResetToken.create).not.toHaveBeenCalled();
      expect(mockResend.emails.send).not.toHaveBeenCalled();
    });

    it("should delete existing tokens before creating new one", async () => {
      const mockUser = createMockUser({ id: "user-123" });
      mockDb.user.findUnique.mockResolvedValue(mockUser);
      mockDb.passwordResetToken.deleteMany.mockResolvedValue({ count: 2 });
      mockDb.passwordResetToken.create.mockResolvedValue({
        id: "token-123",
        token: "reset-token-123",
        userId: "user-123",
        expires: new Date(),
      });

      const caller = createCaller(createMockContext());
      await caller.requestPasswordReset({ email: mockUser.email! });

      expect(mockDb.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
      });
      expect(mockDb.passwordResetToken.deleteMany).toHaveBeenCalledBefore(
        mockDb.passwordResetToken.create as any,
      );
    });
  });

  describe("resetPassword", () => {
    const validToken = "valid-reset-token";
    const newPassword = "NewPassword123!";

    it("should successfully reset password with valid token", async () => {
      const futureDate = new Date(Date.now() + 3600000);
      const mockToken = {
        id: "token-123",
        token: validToken,
        userId: "user-123",
        expires: futureDate,
        user: createMockUser(),
      };

      mockDb.passwordResetToken.findUnique.mockResolvedValue(mockToken);
      mockDb.user.update.mockResolvedValue(createMockUser());
      mockDb.passwordResetToken.delete.mockResolvedValue(mockToken);

      const caller = createCaller(createMockContext());
      const result = await caller.resetPassword({
        token: validToken,
        password: newPassword,
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: expect.objectContaining({
          password: expect.any(String),
        }),
      });
      expect(mockDb.passwordResetToken.delete).toHaveBeenCalledWith({
        where: { id: "token-123" },
      });
    });

    it("should hash the new password", async () => {
      const futureDate = new Date(Date.now() + 3600000);
      const mockToken = {
        id: "token-123",
        token: validToken,
        userId: "user-123",
        expires: futureDate,
        user: createMockUser(),
      };

      mockDb.passwordResetToken.findUnique.mockResolvedValue(mockToken);
      mockDb.user.update.mockResolvedValue(createMockUser());

      const caller = createCaller(createMockContext());
      await caller.resetPassword({ token: validToken, password: newPassword });

      const updateCall = mockDb.user.update.mock.calls[0]![0];
      const hashedPassword = updateCall.data.password;
      const isValidHash = await bcrypt.compare(newPassword, hashedPassword);

      expect(isValidHash).toBe(true);
    });

    it("should throw error for invalid token", async () => {
      mockDb.passwordResetToken.findUnique.mockResolvedValue(null);

      const caller = createCaller(createMockContext());

      await expect(
        caller.resetPassword({ token: "invalid", password: newPassword }),
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.resetPassword({ token: "invalid", password: newPassword }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Invalid or expired token",
      });
    });

    it("should throw error for expired token", async () => {
      const pastDate = new Date(Date.now() - 3600000);
      const mockToken = {
        id: "token-123",
        token: validToken,
        userId: "user-123",
        expires: pastDate,
        user: createMockUser(),
      };

      mockDb.passwordResetToken.findUnique.mockResolvedValue(mockToken);
      mockDb.passwordResetToken.delete.mockResolvedValue(mockToken);

      const caller = createCaller(createMockContext());

      await expect(
        caller.resetPassword({ token: validToken, password: newPassword }),
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.resetPassword({ token: validToken, password: newPassword }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Token has expired",
      });
      expect(mockDb.passwordResetToken.delete).toHaveBeenCalledWith({
        where: { id: "token-123" },
      });
    });
  });

  describe("updateProfile", () => {
    const mockSession = {
      user: { id: "user-123", email: "test@example.com", name: "Test User" },
      expires: new Date().toISOString(),
    };

    it("should successfully update profile for authenticated user", async () => {
      mockDb.user.update.mockResolvedValue(createMockUser());

      const caller = createCaller(createMockContext(mockSession));
      const result = await caller.updateProfile({
        name: "Updated Name",
        image: "https://example.com/image.jpg",
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: {
          name: "Updated Name",
          image: "https://example.com/image.jpg",
        },
      });
    });

    it("should allow partial updates", async () => {
      mockDb.user.update.mockResolvedValue(createMockUser());

      const caller = createCaller(createMockContext(mockSession));
      const result = await caller.updateProfile({ name: "Only Name" });

      expect(result).toEqual({ success: true });
      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { name: "Only Name" },
      });
    });

    it("should throw error when not authenticated", async () => {
      const caller = createCaller(createMockContext());

      await expect(caller.updateProfile({ name: "New Name" })).rejects.toThrow(
        TRPCError,
      );
      await expect(
        caller.updateProfile({ name: "New Name" }),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("should validate image URL format", async () => {
      const caller = createCaller(createMockContext(mockSession));

      await expect(
        caller.updateProfile({ image: "not-a-url" }),
      ).rejects.toThrow();
    });
  });
});
