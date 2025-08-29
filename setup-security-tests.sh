#!/bin/bash

echo "🔧 Setting up Security Testing Environment"
echo "=========================================="

# Navigate to backend directory
cd /goingfree/mmm/ft_transcendence/backend

echo "📦 Installing test dependencies..."
npm install vitest @vitest/coverage-v8 supertest @types/supertest --save-dev

echo "✅ Security testing environment ready!"
echo ""
echo "🚀 You can now run security tests with:"
echo "   npm run test:security"
echo "   or"
echo "   ./test-security.sh"
echo ""
echo "📋 Available security test commands:"
echo "   npm test                    # Run all tests"
echo "   npm run test:security       # Run only security tests"  
echo "   npm run test:coverage       # Run tests with coverage"
echo "   npx vitest run test/security/password.test.ts  # Run specific test"
