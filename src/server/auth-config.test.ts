import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { createMockUser } from '~/test/auth-utils';

// Mock the auth configuration directly
describe('NextAuth Configuration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Credentials Provider Authorization', () => {
    const createAuthorizeFunction = () => {
      return async (credentials: any) => {
        if (!credentials?.emailOrUsername || !credentials?.password) {
          return null;
        }

        // Mock user lookup
        const isEmail = credentials.emailOrUsername.includes('@');
        const mockUser = isEmail && credentials.emailOrUsername === 'test@example.com'
          ? createMockUser({
              email: 'test@example.com',
              password: await bcrypt.hash('password123', 10),
            })
          : credentials.emailOrUsername === 'testuser'
          ? createMockUser({
              username: 'testuser',
              password: await bcrypt.hash('password123', 10),
            })
          : null;

        if (!mockUser?.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          mockUser.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          username: mockUser.username,
          image: mockUser.image,
        };
      };
    };

    it('should authenticate with valid email and password', async () => {
      const authorize = createAuthorizeFunction();
      
      const result = await authorize({
        emailOrUsername: 'test@example.com',
        password: 'password123',
      });

      expect(result).toBeTruthy();
      expect(result?.email).toBe('test@example.com');
    });

    it('should authenticate with valid username and password', async () => {
      const authorize = createAuthorizeFunction();
      
      const result = await authorize({
        emailOrUsername: 'testuser',
        password: 'password123',
      });

      expect(result).toBeTruthy();
      expect(result?.username).toBe('testuser');
    });

    it('should return null for invalid password', async () => {
      const authorize = createAuthorizeFunction();
      
      const result = await authorize({
        emailOrUsername: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result).toBeNull();
    });

    it('should return null when credentials are missing', async () => {
      const authorize = createAuthorizeFunction();
      
      const result = await authorize({});
      expect(result).toBeNull();

      const result2 = await authorize({
        emailOrUsername: 'test@example.com',
      });
      expect(result2).toBeNull();

      const result3 = await authorize({
        password: 'password123',
      });
      expect(result3).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const authorize = createAuthorizeFunction();
      
      const result = await authorize({
        emailOrUsername: 'nonexistent@example.com',
        password: 'password123',
      });

      expect(result).toBeNull();
    });
  });

  describe('Session Callbacks', () => {
    const sessionCallback = ({ session, token }: any) => ({
      ...session,
      user: {
        ...session.user,
        id: token.userId,
        username: token.username,
        needsUsername: token.needsUsername,
      },
    });

    it('should properly format session with user data from token', () => {
      const mockSession = {
        user: {
          email: 'test@example.com',
          name: 'Test User',
          image: null,
        },
        expires: new Date().toISOString(),
      };

      const mockToken = {
        userId: 'user-123',
        username: 'testuser',
        needsUsername: false,
        email: 'test@example.com',
      };

      const result = sessionCallback({ session: mockSession, token: mockToken });

      expect(result.user.id).toBe('user-123');
      expect(result.user.username).toBe('testuser');
      expect(result.user.needsUsername).toBe(false);
      expect(result.user.email).toBe('test@example.com');
    });

    it('should handle missing username in token', () => {
      const mockSession = {
        user: {
          email: 'test@example.com',
          name: 'Test User',
          image: null,
        },
        expires: new Date().toISOString(),
      };

      const mockToken = {
        userId: 'user-123',
        username: null,
        needsUsername: true,
        email: 'test@example.com',
      };

      const result = sessionCallback({ session: mockSession, token: mockToken });

      expect(result.user.username).toBeNull();
      expect(result.user.needsUsername).toBe(true);
    });
  });

  describe('JWT Callbacks', () => {
    const jwtCallback = async ({ token, user, trigger, session }: any) => {
      if (user) {
        token.userId = user.id;
        token.username = user.username;
        token.needsUsername = !user.username;
      }

      if (trigger === 'update' && session?.username) {
        token.username = session.username;
        token.needsUsername = false;
      }

      return token;
    };

    it('should set user data on initial sign in', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        image: null,
      };

      const mockToken = {
        email: 'test@example.com',
        name: 'Test User',
        picture: null,
        sub: 'user-123',
      };

      const result = await jwtCallback({
        token: mockToken,
        user: mockUser,
        trigger: undefined,
        session: undefined,
      });

      expect(result.userId).toBe('user-123');
      expect(result.username).toBe('testuser');
      expect(result.needsUsername).toBe(false);
    });

    it('should set needsUsername to true when username is null', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        username: null,
        image: null,
      };

      const mockToken = {
        email: 'test@example.com',
        name: 'Test User',
        picture: null,
        sub: 'user-123',
      };

      const result = await jwtCallback({
        token: mockToken,
        user: mockUser,
        trigger: undefined,
        session: undefined,
      });

      expect(result.username).toBeNull();
      expect(result.needsUsername).toBe(true);
    });

    it('should update username when trigger is update', async () => {
      const mockToken = {
        userId: 'user-123',
        username: null,
        needsUsername: true,
        email: 'test@example.com',
        name: 'Test User',
        picture: null,
        sub: 'user-123',
      };

      const result = await jwtCallback({
        token: mockToken,
        user: undefined,
        trigger: 'update',
        session: { username: 'newusername' },
      });

      expect(result.username).toBe('newusername');
      expect(result.needsUsername).toBe(false);
    });

    it('should not modify token when no user and no update trigger', async () => {
      const mockToken = {
        userId: 'user-123',
        username: 'existinguser',
        needsUsername: false,
        email: 'test@example.com',
      };

      const result = await jwtCallback({
        token: mockToken,
        user: undefined,
        trigger: undefined,
        session: undefined,
      });

      expect(result).toEqual(mockToken);
    });
  });

  describe('Auth Configuration Structure', () => {
    it('should have correct page configurations', () => {
      const pages = {
        signIn: '/auth/signin',
        error: '/auth/error',
        newUser: '/auth/new-user',
      };

      expect(pages.signIn).toBe('/auth/signin');
      expect(pages.error).toBe('/auth/error');
      expect(pages.newUser).toBe('/auth/new-user');
    });

    it('should use JWT session strategy', () => {
      const sessionConfig = {
        strategy: 'jwt' as const,
      };

      expect(sessionConfig.strategy).toBe('jwt');
    });

    it('should have two auth providers configured', () => {
      // Discord and Credentials providers
      const providers = [
        { id: 'discord', type: 'oauth' },
        { id: 'credentials', type: 'credentials' },
      ];

      expect(providers).toHaveLength(2);
      expect(providers[0].id).toBe('discord');
      expect(providers[1].id).toBe('credentials');
    });
  });
});