import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { createTRPCMsw } from "msw-trpc";
import superjson from "superjson";
import bcrypt from "bcryptjs";
import type { AppRouter } from "~/server/api/root";
import { createMockUser, createMockSession } from "~/test/auth-utils";

// Create tRPC MSW instance
export const trpcMsw = createTRPCMsw<AppRouter>({
  transformer: superjson as any,
});

// Store for mock data
export const mockAuthStore = {
  users: new Map<string, any>(),
  sessions: new Map<string, any>(),
  passwordResetTokens: new Map<string, any>(),
  currentUser: null as any,
};

// Helper to reset mock store
export const resetMockAuthStore = () => {
  mockAuthStore.users.clear();
  mockAuthStore.sessions.clear();
  mockAuthStore.passwordResetTokens.clear();
  mockAuthStore.currentUser = null;
};

// Helper to seed mock users
export const seedMockUser = (user: any) => {
  mockAuthStore.users.set(user.email, user);
  if (user.username) {
    mockAuthStore.users.set(user.username, user);
  }
  return user;
};

// NextAuth API handlers
export const nextAuthHandlers = [
  // Sign in endpoint
  http.post("/api/auth/signin/credentials", async ({ request }) => {
    const body = await request.formData();
    const emailOrUsername = body.get("emailOrUsername") as string;
    const password = body.get("password") as string;
    const csrfToken = body.get("csrfToken") as string;

    const user = mockAuthStore.users.get(emailOrUsername);

    if (!user?.password) {
      return HttpResponse.json({ error: "CredentialsSignin" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return HttpResponse.json({ error: "CredentialsSignin" }, { status: 401 });
    }

    // Create session
    const session = createMockSession({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        needsUsername: !user.username,
        image: user.image,
      },
    });

    mockAuthStore.currentUser = user;
    mockAuthStore.sessions.set(session.user.id, session);

    return HttpResponse.json({
      ok: true,
      status: 200,
      url: "/dashboard",
    });
  }),

  // Session endpoint
  http.get("/api/auth/session", () => {
    if (mockAuthStore.currentUser) {
      const session = mockAuthStore.sessions.get(mockAuthStore.currentUser.id);
      return HttpResponse.json(session);
    }
    return HttpResponse.json(null);
  }),

  // Sign out endpoint
  http.post("/api/auth/signout", () => {
    mockAuthStore.currentUser = null;
    return HttpResponse.json({ ok: true });
  }),

  // CSRF token endpoint
  http.get("/api/auth/csrf", () => {
    return HttpResponse.json({ csrfToken: "mock-csrf-token" });
  }),

  // Providers endpoint
  http.get("/api/auth/providers", () => {
    return HttpResponse.json({
      discord: {
        id: "discord",
        name: "Discord",
        type: "oauth",
        signinUrl: "/api/auth/signin/discord",
        callbackUrl: "/api/auth/callback/discord",
      },
      credentials: {
        id: "credentials",
        name: "Credentials",
        type: "credentials",
        signinUrl: "/api/auth/signin/credentials",
        callbackUrl: "/api/auth/callback/credentials",
      },
    });
  }),

  // OAuth callback (Discord)
  http.get("/api/auth/callback/discord", ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return HttpResponse.json({ error: "NoAuthCode" }, { status: 400 });
    }

    // Mock OAuth user creation
    const oauthUser = createMockUser({
      email: "oauth@example.com",
      name: "OAuth User",
      username: undefined,
      password: undefined,
      image: "https://cdn.discordapp.com/avatar.png",
    });

    seedMockUser(oauthUser);
    mockAuthStore.currentUser = oauthUser;

    const session = createMockSession({
      user: {
        id: oauthUser.id,
        email: oauthUser.email,
        name: oauthUser.name,
        username: oauthUser.username,
        needsUsername: true,
        image: oauthUser.image,
      },
    });

    mockAuthStore.sessions.set(session.user.id, session);

    return HttpResponse.redirect("/auth/new-user", 302);
  }),
];

// tRPC auth router handlers
export const trpcAuthHandlers = [
  trpcMsw.auth.register.mutation(async ({ input }) => {
    const existingUserByEmail = mockAuthStore.users.get(input.email);
    if (existingUserByEmail) {
      throw new Error("Email already in use");
    }

    const existingUserByUsername = mockAuthStore.users.get(input.username);
    if (existingUserByUsername) {
      throw new Error("Username already taken");
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);
    const newUser = createMockUser({
      ...input,
      password: hashedPassword,
    });

    seedMockUser(newUser);

    return { success: true, userId: newUser.id };
  }),

  trpcMsw.auth.checkUsername.query(({ input }) => {
    const user = mockAuthStore.users.get(input.username);
    return { available: !user };
  }),

  trpcMsw.auth.setUsername.mutation(({ input }) => {
    if (!mockAuthStore.currentUser) {
      throw new Error("UNAUTHORIZED");
    }

    const existingUser = mockAuthStore.users.get(input.username);
    if (existingUser) {
      throw new Error("Username already taken");
    }

    // Update user
    mockAuthStore.currentUser.username = input.username;
    seedMockUser(mockAuthStore.currentUser);

    // Update session
    const session = mockAuthStore.sessions.get(mockAuthStore.currentUser.id);
    if (session) {
      session.user.username = input.username;
      session.user.needsUsername = false;
    }

    return { success: true };
  }),

  trpcMsw.auth.requestPasswordReset.mutation(({ input }) => {
    const user = mockAuthStore.users.get(input.email);

    if (user) {
      const token = `reset-token-${Date.now()}`;
      const resetToken = {
        id: `token-${Date.now()}`,
        token,
        userId: user.id,
        expires: new Date(Date.now() + 3600000),
      };

      mockAuthStore.passwordResetTokens.set(token, resetToken);
    }

    return { success: true };
  }),

  trpcMsw.auth.resetPassword.mutation(async ({ input }) => {
    const resetToken = mockAuthStore.passwordResetTokens.get(input.token);

    if (!resetToken) {
      throw new Error("Invalid or expired token");
    }

    if (resetToken.expires < new Date()) {
      mockAuthStore.passwordResetTokens.delete(input.token);
      throw new Error("Token has expired");
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    // Update user password
    for (const [key, user] of mockAuthStore.users.entries()) {
      if (user.id === resetToken.userId) {
        user.password = hashedPassword;
        mockAuthStore.users.set(key, user);
      }
    }

    mockAuthStore.passwordResetTokens.delete(input.token);

    return { success: true };
  }),

  trpcMsw.auth.updateProfile.mutation(({ input }) => {
    if (!mockAuthStore.currentUser) {
      throw new Error("UNAUTHORIZED");
    }

    // Update user profile
    if (input.name !== undefined) {
      mockAuthStore.currentUser.name = input.name;
    }
    if (input.image !== undefined) {
      mockAuthStore.currentUser.image = input.image;
    }

    seedMockUser(mockAuthStore.currentUser);

    // Update session
    const session = mockAuthStore.sessions.get(mockAuthStore.currentUser.id);
    if (session) {
      if (input.name !== undefined) {
        session.user.name = input.name;
      }
      if (input.image !== undefined) {
        session.user.image = input.image;
      }
    }

    return { success: true };
  }),
];

// Combined handlers
export const authHandlers = [...nextAuthHandlers, ...trpcAuthHandlers];

// MSW server instance for tests
export const authMockServer = setupServer(...authHandlers);

// Setup and teardown helpers
export const setupAuthMocks = () => {
  authMockServer.listen({ onUnhandledRequest: "bypass" });
};

export const resetAuthMocks = () => {
  authMockServer.resetHandlers();
  resetMockAuthStore();
};

export const teardownAuthMocks = () => {
  authMockServer.close();
};
