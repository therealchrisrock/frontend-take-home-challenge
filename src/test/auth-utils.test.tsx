import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import bcrypt from 'bcryptjs';
import {
  createMockSession,
  createMockUser,
  AuthTestProvider,
  createMockPrismaClient,
  createMockResendClient,
  authErrorScenarios,
  mockAuthApiResponse,
  createAuthHeaders,
  createTestJWT,
} from './auth-utils';

describe('Auth Test Utilities', () => {
  describe('createMockSession', () => {
    it('should create a valid mock session with defaults', () => {
      const session = createMockSession();
      
      expect(session.user).toMatchObject({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        needsUsername: false,
      });
      expect(session.expires).toBeDefined();
    });

    it('should allow overriding session properties', () => {
      const session = createMockSession({
        user: {
          id: 'custom-id',
          email: 'custom@example.com',
          name: 'Custom User',
          username: 'customuser',
          needsUsername: true,
          image: 'https://example.com/image.jpg',
        },
      });
      
      expect(session.user.id).toBe('custom-id');
      expect(session.user.needsUsername).toBe(true);
    });
  });

  describe('createMockUser', () => {
    it('should create a valid mock user with defaults', () => {
      const user = createMockUser();
      
      expect(user).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        emailVerified: null,
      });
      expect(user.id).toBeDefined();
      expect(user.password).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should hash the default password', async () => {
      const user = createMockUser();
      const isValid = await bcrypt.compare('password123', user.password!);
      
      expect(isValid).toBe(true);
    });

    it('should allow overriding user properties', () => {
      const user = createMockUser({
        email: 'custom@example.com',
        username: 'customuser',
        password: null,
      });
      
      expect(user.email).toBe('custom@example.com');
      expect(user.username).toBe('customuser');
      expect(user.password).toBeNull();
    });
  });

  describe('AuthTestProvider', () => {
    it('should render children with session provider', () => {
      const session = createMockSession();
      const { getByText } = render(
        <AuthTestProvider session={session}>
          <div>Test Child</div>
        </AuthTestProvider>
      );
      
      expect(getByText('Test Child')).toBeDefined();
    });

    it('should work with null session', () => {
      const { getByText } = render(
        <AuthTestProvider session={null}>
          <div>Test Child</div>
        </AuthTestProvider>
      );
      
      expect(getByText('Test Child')).toBeDefined();
    });
  });

  describe('createMockPrismaClient', () => {
    it('should create mock Prisma client with all required models', () => {
      const db = createMockPrismaClient();
      
      expect(db.user).toBeDefined();
      expect(db.user.findUnique).toBeDefined();
      expect(db.user.create).toBeDefined();
      expect(db.user.update).toBeDefined();
      expect(db.user.delete).toBeDefined();
      
      expect(db.account).toBeDefined();
      expect(db.session).toBeDefined();
      expect(db.verificationToken).toBeDefined();
      expect(db.passwordResetToken).toBeDefined();
      expect(db.game).toBeDefined();
    });

    it('should have mockable functions', async () => {
      const db = createMockPrismaClient();
      const mockUser = createMockUser();
      
      db.user.findUnique.mockResolvedValue(mockUser);
      
      await expect(db.user.findUnique()).resolves.toBe(mockUser);
    });
  });

  describe('createMockResendClient', () => {
    it('should create mock Resend client with email sending', async () => {
      const resend = createMockResendClient();
      
      const result = await resend.emails.send({
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      
      expect(result).toEqual({ id: 'mock-email-id' });
      expect(resend.emails.send).toHaveBeenCalled();
    });
  });

  describe('authErrorScenarios', () => {
    it('should provide invalid credentials scenario', () => {
      expect(authErrorScenarios.invalidCredentials).toMatchObject({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      });
    });

    it('should provide expired token scenario', () => {
      const scenario = authErrorScenarios.expiredToken;
      
      expect(scenario.token).toBe('expired-token-123');
      expect(scenario.expires.getTime()).toBeLessThan(Date.now());
    });

    it('should provide weak password scenario', () => {
      expect(authErrorScenarios.weakPassword).toMatchObject({
        password: '123',
      });
    });

    it('should provide invalid email scenario', () => {
      expect(authErrorScenarios.invalidEmail).toMatchObject({
        email: 'notanemail',
      });
    });
  });

  describe('mockAuthApiResponse', () => {
    it('should create successful response', async () => {
      const response = mockAuthApiResponse(true, { userId: '123' });
      
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      const json = await response.json();
      expect(json).toEqual({
        success: true,
        data: { userId: '123' },
      });
    });

    it('should create error response', async () => {
      const response = mockAuthApiResponse(false, null, 'Invalid credentials');
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      
      const json = await response.json();
      expect(json).toEqual({
        success: false,
        error: 'Invalid credentials',
      });
    });
  });

  describe('createAuthHeaders', () => {
    it('should create headers with content type', () => {
      const headers = createAuthHeaders();
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers.Authorization).toBeUndefined();
    });

    it('should include authorization header when token provided', () => {
      const headers = createAuthHeaders('test-token-123');
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers.Authorization).toBe('Bearer test-token-123');
    });
  });

  describe('createTestJWT', () => {
    it('should create a JWT-like token with default payload', () => {
      const token = createTestJWT();
      const parts = token.split('.');
      
      expect(parts).toHaveLength(3);
      
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      expect(payload).toMatchObject({
        userId: 'test-user-id',
        email: 'test@example.com',
        username: 'testuser',
        needsUsername: false,
      });
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });

    it('should allow custom payload values', () => {
      const token = createTestJWT({
        userId: 'custom-id',
        email: 'custom@example.com',
        username: 'customuser',
      });
      
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      
      expect(payload.userId).toBe('custom-id');
      expect(payload.email).toBe('custom@example.com');
      expect(payload.username).toBe('customuser');
    });

    it('should have valid JWT structure', () => {
      const token = createTestJWT();
      const parts = token.split('.');
      
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      expect(header).toEqual({
        alg: 'HS256',
        typ: 'JWT',
      });
      
      expect(parts[2]).toBe('test-signature');
    });
  });
});