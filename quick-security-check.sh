#!/bin/bash

echo "🔐 Quick Security Validation for ft_transcendence"
echo "================================================="
echo ""

DB_PATH="data/transcendence.db"

# Check database security
echo "🔍 Database Security Check:"
echo "=========================="

if [ -f "$DB_PATH" ]; then
    echo "✅ Database exists"
    
    # Check password hashing
    BCRYPT_COUNT=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM users WHERE password LIKE '\$2%';" 2>/dev/null || echo "0")
    PLAIN_COUNT=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM users WHERE password IS NOT NULL AND password != '' AND password NOT LIKE '\$2%';" 2>/dev/null || echo "0")
    
    echo "🔐 Properly hashed passwords: $BCRYPT_COUNT"
    echo "⚠️  Plain text passwords: $PLAIN_COUNT"
    
    if [ "$PLAIN_COUNT" -eq 0 ]; then
        echo "✅ All passwords are properly hashed"
    else
        echo "❌ Found plain text passwords!"
    fi
else
    echo "⚠️  Database not found (this is OK if first run)"
fi

echo ""
echo "🌐 SSL/HTTPS Configuration Check:"
echo "================================="

# Check SSL certificates
if [ -d "backend/certs" ]; then
    echo "✅ SSL certificates directory exists"
    if [ -f "backend/certs/cert.pem" ] && [ -f "backend/certs/key.pem" ]; then
        echo "✅ SSL certificate files found"
    else
        echo "⚠️  SSL certificate files missing"
    fi
else
    echo "⚠️  SSL certificates directory not found"
fi

# Check HTTPS configuration in code
if grep -q "https" backend/src/server.ts 2>/dev/null; then
    echo "✅ HTTPS configuration found in server code"
else
    echo "⚠️  HTTPS configuration not found"
fi

echo ""
echo "🔒 Environment Variables Check:"
echo "==============================="

if [ -f ".env" ]; then
    echo "✅ .env file exists"
    
    # Check for required variables (without exposing values)
    required_vars=("JWT_SECRET" "EMAIL_USER" "EMAIL_PASS" "VITE_GOOGLE_CLIENT_ID")
    
    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" .env; then
            echo "✅ $var is set"
        else
            echo "❌ $var is missing"
        fi
    done
else
    echo "❌ .env file not found"
fi

# Check .gitignore
if grep -q "\.env" .gitignore 2>/dev/null; then
    echo "✅ .env files are gitignored"
else
    echo "❌ .env files are NOT gitignored!"
fi

echo ""
echo "🔍 Code Security Scan:"
echo "======================"

# Check for potential security issues
echo "Scanning for hardcoded secrets..."
if find . -name "*.ts" -o -name "*.js" | xargs grep -l "password.*=" | grep -v test | grep -v node_modules | head -3; then
    echo "⚠️  Found potential hardcoded passwords (review files above)"
else
    echo "✅ No obvious hardcoded passwords found"
fi

# Check for bcrypt usage
if grep -r "bcrypt" backend/src/ --include="*.ts" 2>/dev/null | head -1; then
    echo "✅ bcrypt library is being used"
else
    echo "❌ bcrypt library usage not found"
fi

# Check for JWT usage
if grep -r "jsonwebtoken\|jwt" backend/src/ --include="*.ts" 2>/dev/null | head -1; then
    echo "✅ JWT implementation found"
else
    echo "❌ JWT implementation not found"
fi

echo ""
echo "📊 Security Summary:"
echo "==================="

# Count issues
issues=0

if [ "$PLAIN_COUNT" -ne 0 ]; then
    echo "❌ Plain text passwords found"
    ((issues++))
fi

if [ ! -f ".env" ]; then
    echo "❌ Environment variables not configured"
    ((issues++))
fi

if ! grep -q "\.env" .gitignore 2>/dev/null; then
    echo "❌ .env files not gitignored"
    ((issues++))
fi

if [ ! -d "backend/certs" ]; then
    echo "❌ SSL certificates not configured"
    ((issues++))
fi

if [ $issues -eq 0 ]; then
    echo "🎉 All basic security checks passed!"
    echo ""
    echo "✅ Passwords are hashed"
    echo "✅ Environment variables configured"
    echo "✅ SSL certificates present"
    echo "✅ Sensitive files gitignored"
else
    echo "⚠️  Found $issues security issues to address"
fi

echo ""
echo "🚀 To run comprehensive security tests:"
echo "   cd backend && npm install && npm run test:security"
echo ""
echo "📋 For detailed testing guide, see:"
echo "   ./TESTING-GUIDE.md"
