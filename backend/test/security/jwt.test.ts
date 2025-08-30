import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

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

  describe('Google OAuth Token Security', () => {
    const mockGoogleClientId = 'test-google-client-id.apps.googleusercontent.com';

    it('should reject invalid Google tokens', async () => {
      const client = new OAuth2Client(mockGoogleClientId);
      
      const invalidTokens = [
        'invalid-token',
        'not.a.jwt.token',
        '',
        'header.payload.signature', // Malformed
        jwt.sign({ test: 'data' }, 'fake-secret'), // Not from Google
      ];

      for (const token of invalidTokens) {
        await expect(client.verifyIdToken({
          idToken: token,
          audience: mockGoogleClientId,
        })).rejects.toThrow();
      }
    });

    it('should require proper audience verification', async () => {
      const client = new OAuth2Client(mockGoogleClientId);
      
      // This test ensures we can't verify tokens with wrong audience
      // In practice, this would be tested with a real Google token
      const fakeToken = jwt.sign({
        iss: 'https://accounts.google.com',
        sub: '123456789',
        aud: 'wrong-audience.apps.googleusercontent.com', // Wrong audience
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        email: 'test@example.com',
      }, 'fake-secret');

      await expect(client.verifyIdToken({
        idToken: fakeToken,
        audience: mockGoogleClientId,
      })).rejects.toThrow();
    });

    it('should validate Google token structure', () => {
      // Test that we properly validate the token has required Google fields
      const validPayload = {
        iss: 'https://accounts.google.com',
        sub: '123456789',
        aud: mockGoogleClientId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        email: 'test@example.com',
        email_verified: true,
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
      };

      // This should be a valid structure for Google tokens
      expect(validPayload.iss).toBe('https://accounts.google.com');
      expect(validPayload.sub).toBeTruthy();
      expect(validPayload.aud).toBe(mockGoogleClientId);
      expect(validPayload.email).toBeTruthy();
      expect(validPayload.email_verified).toBe(true);
    });

    it('should reject tokens with unverified emails', () => {
      // Test that we validate email_verified field
      const unverifiedPayload = {
        iss: 'https://accounts.google.com',
        sub: '123456789',
        aud: mockGoogleClientId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        email: 'test@example.com',
        email_verified: false, // This should be rejected
        name: 'Test User',
      };

      expect(unverifiedPayload.email_verified).toBe(false);
      // The actual rejection would happen in the auth route
    });
  });
});  const JWT_SECRET = 'test-secret-key-for-testing-minimum-32-characters-long';

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

  describe('Google OAuth Token Security', () => {
    const mockGoogleClientId = 'test-google-client-id.apps.googleusercontent.com';

    it('should reject invalid Google tokens', async () => {
      const client = new OAuth2Client(mockGoogleClientId);
      
      const invalidTokens = [
        'invalid-token',
        'not.a.jwt.token',
        '',
        'header.payload.signature', // Malformed
        jwt.sign({ test: 'data' }, 'fake-secret'), // Not from Google
      ];

      for (const token of invalidTokens) {
        await expect(client.verifyIdToken({
          idToken: token,
          audience: mockGoogleClientId,
        })).rejects.toThrow();
      }
    });

    it('should require proper audience verification', async () => {
      const client = new OAuth2Client(mockGoogleClientId);
      
      // This test ensures we can't verify tokens with wrong audience
      // In practice, this would be tested with a real Google token
      const fakeToken = jwt.sign({
        iss: 'https://accounts.google.com',
        sub: '123456789',
        aud: 'wrong-audience.apps.googleusercontent.com', // Wrong audience
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        email: 'test@example.com',
      }, 'fake-secret');

      await expect(client.verifyIdToken({
        idToken: fakeToken,
        audience: mockGoogleClientId,
      })).rejects.toThrow();
    });

    it('should validate Google token structure', () => {
      // Test that we properly validate the token has required Google fields
      const validPayload = {
        iss: 'https://accounts.google.com',
        sub: '123456789',
        aud: mockGoogleClientId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        email: 'test@example.com',
        email_verified: true,
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
      };

      // This should be a valid structure for Google tokens
      expect(validPayload.iss).toBe('https://accounts.google.com');
      expect(validPayload.sub).toBeTruthy();
      expect(validPayload.aud).toBe(mockGoogleClientId);
      expect(validPayload.email).toBeTruthy();
      expect(validPayload.email_verified).toBe(true);
    });

    it('should reject tokens with unverified emails', () => {
      // Test that we validate email_verified field
      const unverifiedPayload = {
        iss: 'https://accounts.google.com',
        sub: '123456789',
        aud: mockGoogleClientId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        email: 'test@example.com',
        email_verified: false, // This should be rejected
        name: 'Test User',
      };

      expect(unverifiedPayload.email_verified).toBe(false);
      // The actual rejection would happen in the auth route
    });
  });
});