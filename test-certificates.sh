#!/bin/bash

echo "🔍 SSL Certificate Diagnostics Script"
echo "====================================="
echo ""

# Function to test URL accessibility
test_url() {
    local url=$1
    local name=$2
    
    echo "Testing $name ($url)..."
    
    # Test with curl
    if curl -k -s --connect-timeout 5 "$url" > /dev/null 2>&1; then
        echo "✅ $name is accessible via curl"
    else
        echo "❌ $name is NOT accessible via curl"
        return 1
    fi
    
    # Test certificate details
    echo "📋 Certificate details for $name:"
    openssl s_client -connect localhost:${url##*:} -servername localhost < /dev/null 2>/dev/null | openssl x509 -noout -dates -subject -issuer 2>/dev/null || echo "   Could not retrieve certificate"
    echo ""
}

# Check if services are running
echo "🐳 Checking Docker services..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ Docker services are running"
else
    echo "❌ Docker services are not running properly"
    echo "   Run: docker-compose up -d"
    exit 1
fi
echo ""

# Test backend
test_url "https://localhost:3001" "Backend"

# Test frontend
test_url "https://localhost:5173" "Frontend"

echo "🌐 Browser Certificate Acceptance Instructions:"
echo "============================================="
echo ""
echo "1. Open Firefox/Chrome/Safari"
echo "2. Visit: https://localhost:3001"
echo "3. Click 'Advanced' or 'Show Details'"
echo "4. Click 'Proceed to localhost (unsafe)' or 'Accept Risk and Continue'"
echo "5. You should see a 404 error (this is normal)"
echo ""
echo "6. Visit: https://localhost:5173"
echo "7. Click 'Advanced' or 'Show Details'"
echo "8. Click 'Proceed to localhost (unsafe)' or 'Accept Risk and Continue'"
echo "9. The application should now load"
echo ""
echo "🔒 Security Note:"
echo "================"
echo "These warnings are NORMAL for self-signed certificates in development."
echo "You must manually accept them in your browser for the application to work."
echo ""

# Test API endpoints
echo "🧪 Testing API endpoints..."
echo "========================="

# Test registration endpoint
echo "Testing registration endpoint..."
if curl -k -s -X POST "https://localhost:3001/api/auth/register" \
    -H "Content-Type: application/json" \
    -H "Origin: https://localhost:5173" \
    -d '{"username":"testuser","email":"test@example.com","password":"testpass123"}' | grep -q "User registered\|email already exists"; then
    echo "✅ Registration endpoint is working"
else
    echo "❌ Registration endpoint failed"
fi

echo ""
echo "🎯 Final Steps:"
echo "=============="
echo "1. Make sure you've accepted certificates in your browser"
echo "2. Clear browser cache and cookies for localhost"
echo "3. Try logging in again"
echo "4. If still failing, check browser developer console (F12) for specific errors"
echo ""
