#!/bin/bash

echo "🔍 Certificate Validation Helper"
echo "================================"
echo ""

echo "📋 Certificate Status Check:"
echo "----------------------------"

# Check if certificates exist
if [ -f "backend/certs/cert.pem" ] && [ -f "backend/certs/key.pem" ]; then
    echo "✅ SSL certificates found"
    
    # Check certificate details
    echo ""
    echo "📜 Certificate Details:"
    openssl x509 -in backend/certs/cert.pem -text -noout | grep -E "(Subject:|Not Before|Not After|DNS:|IP Address)" || echo "⚠️  Could not read certificate details"
else
    echo "❌ SSL certificates missing"
    echo "   Run: ./generate-certs.sh"
fi

echo ""
echo "🌐 Service Connectivity Test:"
echo "-----------------------------"

# Test backend
echo -n "Backend (https://localhost:3001): "
BACKEND_STATUS=$(curl -k -s -w "%{http_code}" -o /dev/null --connect-timeout 5 "https://localhost:3001" 2>/dev/null)
if [ "$BACKEND_STATUS" = "200" ] || [ "$BACKEND_STATUS" = "404" ]; then
    echo "✅ Reachable (HTTP $BACKEND_STATUS)"
else
    echo "❌ Not reachable (HTTP $BACKEND_STATUS)"
fi

# Test frontend
echo -n "Frontend (https://localhost:5173): "
FRONTEND_STATUS=$(curl -k -s -w "%{http_code}" -o /dev/null --connect-timeout 5 "https://localhost:5173" 2>/dev/null)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Reachable (HTTP $FRONTEND_STATUS)"
else
    echo "❌ Not reachable (HTTP $FRONTEND_STATUS)"
fi

# Test pong server
echo -n "Pong Server (ws://localhost:4000): "
if nc -z localhost 4000 2>/dev/null; then
    echo "✅ Port open"
else
    echo "❌ Port closed"
fi

echo ""
echo "🛠️  Quick Fix Commands:"
echo "----------------------"
echo "Start services:     docker-compose up -d"
echo "Generate certs:     ./generate-certs.sh"
echo "View logs:          docker-compose logs"
echo "Auto setup:         ./start-auto-setup.sh"
echo "Evaluation mode:    ./start-evaluation-mode.sh"
