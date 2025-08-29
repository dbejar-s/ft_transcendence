# 🔐 Security Testing for ft_transcendence

This document explains how to run comprehensive security tests for the ft_transcendence project.

## 🚀 Quick Start

### Option 1: Quick Security Check (No Installation Required)
```bash
./quick-security-check.sh
```
This performs basic security validation without installing any additional packages.

### Option 2: Full Security Test Suite
```bash
# Setup (one-time)
./setup-security-tests.sh

# Run tests
cd backend
npm run test:security
```

### Option 3: Manual Setup and Testing
```bash
cd backend
npm install vitest @vitest/coverage-v8 supertest @types/supertest --save-dev
npx vitest run test/security/
```

## 📋 Available Test Commands

| Command | Description |
|---------|-------------|
| `npm run test:security` | Run all security tests |
| `npm run test:coverage` | Run tests with coverage report |
| `./test-security.sh` | Comprehensive security test script |
| `./quick-security-check.sh` | Quick validation (no setup needed) |

## 🧪 Test Categories

### 1. Password Security Tests (`password.test.ts`)
- ✅ bcrypt hashing validation
- ✅ Salt rounds verification (minimum 10)
- ✅ Plain text password detection
- ✅ OAuth user handling
- ✅ Weak password rejection

### 2. SQL Injection Protection (`sql-injection.test.ts`)
- ✅ Parameterized query validation
- ✅ Malicious input sanitization
- ✅ Email format validation
- ✅ Username format validation
- ✅ NoSQL injection prevention

### 3. JWT Security (`jwt.test.ts`)
- ✅ Token creation and verification
- ✅ Secret strength validation
- ✅ Expiration handling
- ✅ Malformed token rejection
- ✅ Token manipulation prevention

### 4. Input Validation & XSS (`validation.test.ts`)
- ✅ HTML sanitization
- ✅ Input length validation
- ✅ Path traversal prevention
- ✅ File upload security
- ✅ User content sanitization

### 5. HTTPS & CORS Security (`https-cors.test.ts`)
- ✅ HTTPS enforcement
- ✅ SSL certificate validation
- ✅ Security headers
- ✅ WebSocket security (WSS)
- ✅ CORS origin validation
- ✅ Rate limiting

### 6. Environment Security (`environment.test.ts`)
- ✅ Environment variable validation
- ✅ Sensitive data exposure prevention
- ✅ .gitignore verification
- ✅ 2FA security
- ✅ Session management

## 📊 Example Test Output

```bash
🔐 Security Test Suite for ft_transcendence
===========================================

🔒 Testing Password Security...
✅ Password security tests passed

🛡️  Testing SQL Injection Protection...
✅ SQL injection protection tests passed

🔑 Testing JWT Security...
✅ JWT security tests passed

🎉 All security tests completed!

📋 Security Test Summary:
========================
✅ Password hashing with bcrypt
✅ SQL injection protection
✅ JWT token security
✅ Input validation & XSS prevention
✅ HTTPS & SSL configuration
✅ CORS security
✅ Environment variable protection
```

## 🔍 Security Requirements Compliance

This testing suite validates compliance with ft_transcendence security requirements:

| Requirement | Test Coverage |
|-------------|---------------|
| **Password Hashing** | ✅ bcrypt with salt rounds ≥10 |
| **HTTPS Mandatory** | ✅ SSL certificate validation |
| **SQL Injection Protection** | ✅ Parameterized queries |
| **XSS Prevention** | ✅ Input sanitization |
| **Environment Variables** | ✅ .env file validation |
| **JWT Security** | ✅ Token validation & secrets |
| **2FA Implementation** | ✅ TOTP validation |
| **Rate Limiting** | ✅ Request limit enforcement |

## 🛠️ Troubleshooting

### Test Dependencies Not Found
```bash
cd backend
npm install
```

### Database Not Found
```bash
# Start the application first to create the database
docker-compose up -d
```

### SSL Certificate Issues
```bash
# Generate certificates
./generate-certs.sh
```

## 📈 Continuous Security Testing

Add to your CI/CD pipeline:

```yaml
# .github/workflows/security.yml
name: Security Tests
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd backend && npm install
      - run: cd backend && npm run test:security
```

## 📚 Related Documentation

- [SECURITY.md](../SECURITY.md) - Security implementation details
- [TESTING-GUIDE.md](../TESTING-GUIDE.md) - Comprehensive testing guide
- [SSL-SETUP.md](../SSL-SETUP.md) - SSL certificate setup

## 🔒 Security Best Practices

1. **Run tests regularly** - Before each deployment
2. **Keep dependencies updated** - `npm audit` and update packages
3. **Monitor for vulnerabilities** - Use tools like Snyk or npm audit
4. **Review environment variables** - Ensure no secrets in code
5. **Validate SSL certificates** - Check expiration and configuration

## 📞 Getting Help

If security tests fail:
1. Check the specific error messages
2. Review the corresponding source code
3. Ensure environment variables are properly set
4. Verify database and SSL certificate setup
5. Consult the security documentation

---

**⚠️ Important:** These tests validate implementation but don't replace professional security audits for production systems.
