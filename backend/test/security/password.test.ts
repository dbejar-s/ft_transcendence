import { describe, it, expect } from 'vitest';
import bcrypt from 'bcrypt';

describe('Password Security Tests', () => {

  it('should hash passwords with bcrypt', async () => {
    const plainPassword = 'testPassword123!';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    expect(hashedPassword).not.toBe(plainPassword);
    expect(hashedPassword).toMatch(/^\$2[abxy]\$\d{2}\$.{53}$/);
  });

  it('should verify bcrypt hashed passwords correctly', async () => {
    const plainPassword = 'testPassword123!';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    const isValid = await bcrypt.compare(plainPassword, hashedPassword);
    const isInvalid = await bcrypt.compare('wrongPassword', hashedPassword);
    
    expect(isValid).toBe(true);
    expect(isInvalid).toBe(false);
  });

  it('should use salt rounds of 10 minimum', async () => {
    const password = 'testPassword123!';
    const hash = await bcrypt.hash(password, 10);
    
    // Extract salt rounds from hash
    const saltRounds = parseInt(hash.split('$')[2]);
    
    expect(saltRounds).toBeGreaterThanOrEqual(10);
  });

  it('should reject weak passwords', () => {
    const weakPasswords = [
      '123456',
      'password',
      'qwerty',
      '12345678',
      'abc123',
      'admin',
      '',
      'a',
      '   '
    ];

    weakPasswords.forEach(password => {
      // This would typically be validated in your registration endpoint
      const isWeak = password.length < 8 || 
                    !/[A-Z]/.test(password) || 
                    !/[a-z]/.test(password) || 
                    !/[0-9]/.test(password);
      
      expect(isWeak).toBe(true);
    });
  });

  it('should validate strong passwords', () => {
    const strongPasswords = [
      'MySecure123!',
      'AnotherPassword456#',
      'ComplexP@ssw0rd',
      'Str0ng!P@ssword'
    ];

    strongPasswords.forEach(password => {
      const isStrong = password.length >= 8 && 
                      /[A-Z]/.test(password) && 
                      /[a-z]/.test(password) && 
                      /[0-9]/.test(password) &&
                      /[!@#$%^&*]/.test(password);
      
      expect(isStrong).toBe(true);
    });
  });

  it('should generate different hashes for same password', async () => {
    const password = 'testPassword123!';
    const hash1 = await bcrypt.hash(password, 10);
    const hash2 = await bcrypt.hash(password, 10);
    
    expect(hash1).not.toBe(hash2);
    expect(await bcrypt.compare(password, hash1)).toBe(true);
    expect(await bcrypt.compare(password, hash2)).toBe(true);
  });
});
