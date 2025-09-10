import React from "react";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { vi } from "vitest";
import bcrypt from "bcryptjs";
import { type User } from "@prisma/client";
import { nanoid } from "nanoid";

// Mock session factory
export const createMockSession = (overrides?: Partial<Session>): Session => ({
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    username: "testuser",
    needsUsername: false,
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

// Mock user factory
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: nanoid(),
  email: "test@example.com",
  emailVerified: null,
  name: "Test User",
  username: "testuser",
  password: bcrypt.hashSync("password123", 10),
  image: null,
  avatarKey: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Provider wrapper for auth tests
export const AuthTestProvider = ({
  children,
  session = null,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) => {
  return <SessionProvider session={session}>{children}</SessionProvider>;
};

// Mock NextAuth module
export const mockNextAuth = {
  getServerSession: vi.fn(),
  getSession: vi.fn(),
  useSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getCsrfToken: vi.fn(),
};

// Mock Prisma client for auth tests
export const createMockPrismaClient = () => ({
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  account: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  session: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  verificationToken: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  passwordResetToken: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  game: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
});

// Mock Resend client
export const createMockResendClient = () => ({
  emails: {
    send: vi.fn().mockResolvedValue({ id: "mock-email-id" }),
  },
});

// Auth error scenarios for testing
export const authErrorScenarios = {
  invalidCredentials: {
    email: "wrong@example.com",
    password: "wrongpassword",
  },
  expiredToken: {
    token: "expired-token-123",
    expires: new Date(Date.now() - 3600000),
  },
  invalidToken: {
    token: "invalid-token-123",
  },
  existingEmail: {
    email: "existing@example.com",
  },
  existingUsername: {
    username: "existinguser",
  },
  weakPassword: {
    password: "123",
  },
  invalidEmail: {
    email: "notanemail",
  },
  invalidUsername: {
    username: "a",
  },
};

// Helper to mock auth API responses
export const mockAuthApiResponse = (
  success: boolean,
  data?: any,
  error?: string,
) => ({
  ok: success,
  status: success ? 200 : 401,
  json: async () => ({
    success,
    ...(data && { data }),
    ...(error && { error }),
  }),
});

// Helper to create auth headers
export const createAuthHeaders = (token?: string) => ({
  "Content-Type": "application/json",
  ...(token && { Authorization: `Bearer ${token}` }),
});

// Test JWT token
export const createTestJWT = (payload?: any) => {
  const header = { alg: "HS256", typ: "JWT" };
  const defaultPayload = {
    userId: "test-user-id",
    email: "test@example.com",
    username: "testuser",
    needsUsername: false,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const finalPayload = { ...defaultPayload, ...payload };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    "base64url",
  );
  const encodedPayload = Buffer.from(JSON.stringify(finalPayload)).toString(
    "base64url",
  );
  const signature = "test-signature";

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};
