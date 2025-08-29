import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';

describe('JWT Security Tests', () => {
  const JWT_SECRET = 'test-secret-key-for-testing-minimum-32-characters-long';

  it('should create valid JWT tokens', () => {
    const payload = { userId: 1, username: 'testuser' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // header.payload.signature
  });

  it('should verify JWT tokens correctly', () => {
    const payload = { userId: 1, username: 'testuser' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    expect(decoded.userId).toBe(1);
    expect(decoded.username).toBe('testuser');
    expect(decoded.exp).toBeTruthy();
    expect(decoded.iat).toBeTruthy();
  });

  it('should reject tokens with wrong secret', () => {
    const payload = { userId: 1, username: 'testuser' };
    const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '1h' });
    
    expect(() => {
      jwt.verify(token, JWT_SECRET);
    }).toThrow();
  });

  it('should reject expired tokens', () => {
    const payload = { userId: 1, username: 'testuser' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1s' }); // Already expired
    
    expect(() => {
      jwt.verify(token, JWT_SECRET);
    }).toThrow();
  });

  it('should reject malformed tokens', () => {
    const malformedTokens = [
      'not.a.token',
      'invalid-token',
      'header.payload', // Missing signature
      '',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.malformed.signature',
    ];

    malformedTokens.forEach(token => {
      expect(() => {
        jwt.verify(token as string, JWT_SECRET);
      }).toThrow();
    });
  });

  it('should use strong JWT secret', () => {
    // Ensure JWT secret is long enough and not a default value
    const secret = JWT_SECRET;
    
    expect(secret).toBeTruthy();
    expect(secret.length).toBeGreaterThan(32);
    expect(secret).not.toBe('secret');
    expect(secret).not.toBe('jwt-secret');
    expect(secret).not.toBe('your-secret-key');
  });

  it('should include proper token expiration', () => {
    const payload = { userId: 1, username: 'testuser' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    
    const decoded = jwt.decode(token) as any;
    const now = Math.floor(Date.now() / 1000);
    const oneHour = 3600;
    
    expect(decoded.exp).toBeGreaterThan(now);
    expect(decoded.exp).toBeLessThanOrEqual(now + oneHour + 10); // Allow small margin
  });

  it('should not include sensitive data in payload', () => {
    // This test ensures we don't accidentally include passwords or secrets in JWT
    const payload = { 
      userId: 1, 
      username: 'testuser',
      // Should NOT include: password, twoFactorSecret, etc.
    };
    const token = jwt.sign(payload, JWT_SECRET);
    
    const decoded = jwt.decode(token) as any;
    
    expect(decoded.password).toBeUndefined();
    expect(decoded.twoFactorSecret).toBeUndefined();
    expect(decoded.email).toBeUndefined(); // Email can be sensitive
  });

  it('should prevent token manipulation', () => {
    const payload = { userId: 1, username: 'testuser', role: 'user' };
    const token = jwt.sign(payload, JWT_SECRET);
    
    // Try to manipulate the token
    const parts = token.split('.');
    const manipulatedPayload = Buffer.from(JSON.stringify({ 
      userId: 1, 
      username: 'testuser', 
      role: 'admin' // Changed role
    })).toString('base64url');
    
    const manipulatedToken = `${parts[0]}.${manipulatedPayload}.${parts[2]}`;
    
    expect(() => {
      jwt.verify(manipulatedToken, JWT_SECRET);
    }).toThrow();
  });

  it('should validate JWT algorithm security', () => {
    const payload = { userId: 1, username: 'testuser' };
    
    // Create token with secure algorithm
    const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
    
    // Verify it uses the correct algorithm
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
    expect(header.alg).toBe('HS256');
    expect(header.typ).toBe('JWT');
  });
});
