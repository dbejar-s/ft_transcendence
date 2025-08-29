import { describe, it, expect } from 'vitest';

describe('Input Validation & XSS Protection Tests', () => {
  
  it('should sanitize HTML input', () => {
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      '<svg onload="alert(1)">',
      'javascript:alert("xss")',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<body onload="alert(1)">',
      '<div onclick="alert(1)">Click me</div>',
      '<a href="javascript:alert(1)">Link</a>',
    ];

    // Simple HTML sanitization function (this should be in your actual validation utils)
    const sanitizeHtml = (input: string): string => {
      return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    };

    maliciousInputs.forEach(input => {
      const sanitized = sanitizeHtml(input);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('onload=');
      expect(sanitized).not.toContain('onerror=');
      expect(sanitized).not.toContain('onclick=');
    });
  });

  it('should validate user input lengths', () => {
    const validateLength = (input: string, min: number, max: number): boolean => {
      return input && input.trim().length >= min && input.trim().length <= max;
    };

    // Username validation
    expect(validateLength('', 3, 50)).toBe(false);
    expect(validateLength('ab', 3, 50)).toBe(false);
    expect(validateLength('abc', 3, 50)).toBe(true);
    expect(validateLength('x'.repeat(51), 3, 50)).toBe(false);

    // Password validation
    expect(validateLength('short', 8, 100)).toBe(false);
    expect(validateLength('longenoughpassword', 8, 100)).toBe(true);
    expect(validateLength('x'.repeat(101), 8, 100)).toBe(false);
  });

  it('should validate email format', () => {
    const validateEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    const validEmails = [
      'user@example.com',
      'test.email@domain.co.uk',
      'user+tag@example.org',
    ];

    const invalidEmails = [
      'notanemail',
      '@example.com',
      'user@',
      'user..user@example.com',
      'user@example',
      '<script>@example.com',
      'user@<script>alert(1)</script>.com',
    ];

    validEmails.forEach(email => {
      expect(validateEmail(email)).toBe(true);
    });

    invalidEmails.forEach(email => {
      expect(validateEmail(email)).toBe(false);
    });
  });

  it('should prevent path traversal attacks', () => {
    const maliciousPaths = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '/etc/passwd',
      '\\windows\\system32\\config\\sam',
      '..%2f..%2f..%2fetc%2fpasswd',
      '..%5c..%5c..%5cwindows%5csystem32%5cconfig%5csam',
      'file:///etc/passwd',
      '../../../../../../etc/passwd%00.jpg',
    ];

    const sanitizePath = (path: string): string => {
      // Remove dangerous patterns
      return path
        .replace(/\.\./g, '')
        .replace(/[\\\/]/g, '')
        .replace(/%2f/gi, '')
        .replace(/%5c/gi, '')
        .replace(/file:/gi, '')
        .replace(/\0/g, '');
    };

    maliciousPaths.forEach(path => {
      const sanitized = sanitizePath(path);
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
      expect(sanitized).not.toContain('\\');
      expect(sanitized).not.toContain('etc');
      expect(sanitized).not.toContain('passwd');
    });
  });

  it('should validate file upload security', () => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    const maxFileSize = 5 * 1024 * 1024; // 5MB

    const validateFile = (filename: string, mimetype: string, size: number): boolean => {
      const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
      return allowedTypes.includes(mimetype) &&
             allowedExtensions.includes(ext) &&
             size <= maxFileSize;
    };

    // Valid files
    expect(validateFile('photo.jpg', 'image/jpeg', 1024 * 1024)).toBe(true);
    expect(validateFile('image.png', 'image/png', 2 * 1024 * 1024)).toBe(true);

    // Invalid files
    expect(validateFile('script.js', 'application/javascript', 1024)).toBe(false);
    expect(validateFile('malware.exe', 'application/x-executable', 1024)).toBe(false);
    expect(validateFile('huge.jpg', 'image/jpeg', 10 * 1024 * 1024)).toBe(false);
    expect(validateFile('image.jpg', 'text/html', 1024)).toBe(false); // MIME type mismatch
  });

  it('should sanitize user-generated content', () => {
    const sanitizeUserContent = (content: string): string => {
      return content
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim()
        .substring(0, 1000); // Limit length
    };

    const maliciousContent = `
      <script>alert('xss')</script>
      <p onclick="alert('click')">Click me</p>
      <a href="javascript:alert('link')">Link</a>
      Some normal content here.
    `;

    const sanitized = sanitizeUserContent(maliciousContent);
    
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).toContain('Some normal content here');
  });
});
