#!/bin/bash

echo "🔐 Security Test Suite for ft_transcendence"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Please run this script from the backend directory${NC}"
    exit 1
fi

echo "📦 Installing test dependencies..."
if ! npm install --silent; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo "🧪 Running Security Tests..."
echo "============================"

# Run different security test suites
echo ""
echo -e "${BLUE}🔒 Testing Password Security...${NC}"
if npx vitest run test/security/password.test.ts --reporter=verbose 2>/dev/null; then
    echo -e "${GREEN}✅ Password security tests passed${NC}"
else
    echo -e "${RED}❌ Password security tests failed${NC}"
fi

echo ""
echo -e "${BLUE}🛡️  Testing SQL Injection Protection...${NC}"
if npx vitest run test/security/sql-injection.test.ts --reporter=verbose 2>/dev/null; then
    echo -e "${GREEN}✅ SQL injection protection tests passed${NC}"
else
    echo -e "${RED}❌ SQL injection protection tests failed${NC}"
fi

echo ""
echo -e "${BLUE}🔑 Testing JWT Security...${NC}"
if npx vitest run test/security/jwt.test.ts --reporter=verbose 2>/dev/null; then
    echo -e "${GREEN}✅ JWT security tests passed${NC}"
else
    echo -e "${RED}❌ JWT security tests failed${NC}"
fi

echo ""
echo -e "${BLUE}✨ Testing Input Validation...${NC}"
if npx vitest run test/security/validation.test.ts --reporter=verbose 2>/dev/null; then
    echo -e "${GREEN}✅ Input validation tests passed${NC}"
else
    echo -e "${RED}❌ Input validation tests failed${NC}"
fi

echo ""
echo -e "${BLUE}🌐 Testing HTTPS & CORS Security...${NC}"
if npx vitest run test/security/https-cors.test.ts --reporter=verbose 2>/dev/null; then
    echo -e "${GREEN}✅ HTTPS & CORS security tests passed${NC}"
else
    echo -e "${RED}❌ HTTPS & CORS security tests failed${NC}"
fi

echo ""
echo -e "${BLUE}🔐 Testing Environment Security...${NC}"
if npx vitest run test/security/environment.test.ts --reporter=verbose 2>/dev/null; then
    echo -e "${GREEN}✅ Environment security tests passed${NC}"
else
    echo -e "${RED}❌ Environment security tests failed${NC}"
fi

echo ""
echo "📊 Running All Security Tests with Coverage..."
echo "==============================================="

if npx vitest run test/security/ --coverage --reporter=verbose; then
    echo ""
    echo -e "${GREEN}🎉 All security tests completed!${NC}"
    echo ""
    echo "📋 Security Test Summary:"
    echo "========================"
    echo "✅ Password hashing with bcrypt"
    echo "✅ SQL injection protection"
    echo "✅ JWT token security"
    echo "✅ Input validation & XSS prevention"
    echo "✅ HTTPS & SSL configuration"
    echo "✅ CORS security"
    echo "✅ Environment variable protection"
    echo "✅ 2FA security"
    echo "✅ Session management"
    echo ""
    echo -e "${BLUE}📄 Coverage report generated in coverage/ directory${NC}"
else
    echo ""
    echo -e "${RED}❌ Some security tests failed. Please review the output above.${NC}"
    exit 1
fi

echo ""
echo "🔍 Additional Security Checks:"
echo "=============================="

# Check for .env in .gitignore
if grep -q "\.env" ../.gitignore 2>/dev/null; then
    echo -e "${GREEN}✅ .env files are properly gitignored${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: .env files might not be gitignored${NC}"
fi

# Check for hardcoded secrets
echo "🔍 Scanning for hardcoded secrets..."
if grep -r -i "password\|secret\|key" src/ --include="*.ts" --exclude-dir=test | grep -v "process.env" | head -5; then
    echo -e "${YELLOW}⚠️  Found potential hardcoded secrets (review above)${NC}"
else
    echo -e "${GREEN}✅ No obvious hardcoded secrets found${NC}"
fi

# Check SSL certificate configuration
if [ -d "certs" ]; then
    echo -e "${GREEN}✅ SSL certificates directory exists${NC}"
else
    echo -e "${YELLOW}⚠️  SSL certificates directory not found${NC}"
fi

echo ""
echo -e "${GREEN}🔐 Security testing complete!${NC}"
echo ""
echo "💡 Next steps:"
echo "• Review any warnings above"
echo "• Ensure all environment variables are properly set"
echo "• Regularly run these tests before deployment"
echo "• Keep dependencies updated for security patches"
