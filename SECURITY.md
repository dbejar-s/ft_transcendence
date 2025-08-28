# Security Implementation for ft_transcendence

## Overview
This document outlines the security measures implemented to comply with the project requirements.

## Security Requirements Compliance

### ✅ TLS/HTTPS Support
- **Implementation**: Added HTTPS support to the backend server using self-signed certificates for development
- **Location**: `/backend/certs/` (SSL certificates)
- **Details**: 
  - Fastify server configured with HTTPS options
  - WebSocket upgraded to WSS (secure websockets)
  - Updated docker-compose to use `https://localhost:3001`

### ✅ Password Hashing
- **Implementation**: Using bcrypt with salt rounds of 10
- **Location**: `backend/src/routes/authRoutes.ts`
- **Details**: All passwords are hashed before storing in database, never stored in plaintext

### ✅ Server-side Input Validation & Sanitization
- **Implementation**: Comprehensive validation utility with sanitization
- **Location**: `backend/src/utils/validation.ts`
- **Features**:
  - Email validation and normalization
  - Username validation (3-30 chars, alphanumeric + underscore/dash)
  - Password strength validation (8+ chars, letters + numbers)
  - UUID validation for user IDs
  - 2FA code format validation
  - Input sanitization using validator.js
  - SQL injection prevention through parameterized queries

### ✅ Environment Variables
- **Implementation**: All sensitive credentials stored in `.env` file
- **Location**: `.env` (gitignored)
- **Protected**: JWT secrets, email credentials, Firebase config

### ✅ Security Headers
- **Implementation**: Using @fastify/helmet for security headers
- **Features**:
  - Content Security Policy (CSP)
  - X-Frame-Options
  - X-Content-Type-Options
  - Strict-Transport-Security (when using HTTPS)

### ✅ CORS Protection
- **Implementation**: Restricted CORS to allowed origins only
- **Configuration**: Only allows specific localhost ports
- **Security**: Prevents cross-origin attacks from unauthorized domains

### ✅ Rate Limiting
- **Implementation**: Using @fastify/rate-limit
- **Configuration**: 100 requests per minute per IP
- **Purpose**: Prevents brute force attacks and DoS

### ✅ JWT Authentication
- **Implementation**: Properly protected routes with JWT middleware
- **Location**: `backend/src/jwtMiddleware.ts`
- **Security**: Strong secret, proper expiration, validation

### ✅ 2FA Implementation
- **Implementation**: Email-based 2FA with time-limited codes
- **Features**:
  - 6-digit codes with 10-minute expiration
  - Secure code generation
  - One-time use codes

## Security Best Practices Applied

1. **Input Validation**: All user inputs validated and sanitized
2. **SQL Injection Prevention**: Using parameterized queries with better-sqlite3
3. **XSS Prevention**: Input sanitization and CSP headers
4. **Error Handling**: Generic error messages to prevent information disclosure
5. **Secure Communication**: HTTPS/WSS for all connections
6. **Session Management**: Secure JWT tokens with proper expiration
7. **Password Security**: Strong hashing with bcrypt
8. **Rate Limiting**: Protection against brute force attacks

## Production Considerations

For production deployment, consider:

1. **SSL Certificates**: Replace self-signed certificates with proper CA-signed certificates
2. **Environment Variables**: Use secure secret management (e.g., HashiCorp Vault)
3. **Database Security**: Add database encryption and regular backups
4. **Monitoring**: Implement security logging and monitoring
5. **Network Security**: Use firewalls and network segmentation
6. **Regular Updates**: Keep dependencies updated for security patches

## Testing Security

To test the security implementation:

1. **HTTPS**: Access the API via `https://localhost:3001` (accept self-signed cert warning)
2. **Input Validation**: Try invalid inputs on registration/login endpoints
3. **Rate Limiting**: Make multiple rapid requests to test rate limiting
4. **Authentication**: Try accessing protected routes without valid JWT
5. **2FA**: Test the complete 2FA flow

## Security Headers Verification

Use tools like:
- `curl -I https://localhost:3001/api/health` to check security headers
- Browser developer tools to inspect security policies
- Online security scanners for comprehensive testing

## Files Modified/Created

- `backend/src/server.ts` - HTTPS, security headers, CORS, rate limiting
- `backend/src/routes/authRoutes.ts` - Input validation and sanitization
- `backend/src/utils/validation.ts` - Validation utilities (new file)
- `backend/certs/` - SSL certificates (new directory)
- `docker-compose.yml` - Updated API URL to HTTPS
- `.gitignore` - Added SSL certificate exclusions

This implementation ensures the website meets all security requirements specified in the project subject.
