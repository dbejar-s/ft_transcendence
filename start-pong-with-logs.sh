#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Step 1: Clean shutdown
echo "🧹 Cleaning up existing containers..."
docker-compose down --volumes --remove-orphans

echo "BUILD and UP with LOGS..."

# Step 2: Build and start in detached mode first
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Step 3: Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

echo "🔧 Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -k -s --connect-timeout 2 "https://localhost:3001" > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend failed to start within 60 seconds"
        exit 1
    fi
    sleep 2
done

echo "🎨 Waiting for frontend to be ready..."
for i in {1..30}; do
    if curl -k -s --connect-timeout 2 "https://localhost:5173" > /dev/null 2>&1; then
        echo "✅ Frontend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Frontend failed to start within 60 seconds"
        exit 1
    fi
    sleep 2
done

# Step 4: SSL certificate handling (same as before)
echo "🔐 Implementing silent SSL certificate handling..."

# Create SSL certificate database for browsers
echo "📋 Creating SSL certificate cache..."
mkdir -p ~/.ft_transcendence_ssl
mkdir -p ~/.mozilla/firefox/ssl_override
mkdir -p ~/.config/google-chrome/ssl_override

# Extract and cache certificates
echo "📥 Extracting SSL certificates..."
echo | openssl s_client -connect localhost:3001 -servername localhost 2>/dev/null | \
    openssl x509 -outform PEM > ~/.ft_transcendence_ssl/backend.crt 2>/dev/null || true

echo | openssl s_client -connect localhost:5173 -servername localhost 2>/dev/null | \
    openssl x509 -outform PEM > ~/.ft_transcendence_ssl/frontend.crt 2>/dev/null || true

# Get certificate fingerprints
if [ -f ~/.ft_transcendence_ssl/backend.crt ]; then
    BACKEND_FINGERPRINT=$(openssl x509 -in ~/.ft_transcendence_ssl/backend.crt -noout -fingerprint -sha256 2>/dev/null | cut -d'=' -f2)
    echo "🔑 Backend cert fingerprint: ${BACKEND_FINGERPRINT:0:20}..."
fi

if [ -f ~/.ft_transcendence_ssl/frontend.crt ]; then
    FRONTEND_FINGERPRINT=$(openssl x509 -in ~/.ft_transcendence_ssl/frontend.crt -noout -fingerprint -sha256 2>/dev/null | cut -d'=' -f2)
    echo "🔑 Frontend cert fingerprint: ${FRONTEND_FINGERPRINT:0:20}..."
fi

# Quick SSL connectivity test
echo "🧪 Testing SSL connectivity..."
BACKEND_TEST=$(curl -k -s -w "%{http_code}" -o /dev/null "https://localhost:3001" 2>/dev/null)
FRONTEND_TEST=$(curl -k -s -w "%{http_code}" -o /dev/null "https://localhost:5173" 2>/dev/null)

echo ""
echo "📊 SSL Connectivity Test Results:"
echo "================================="

if [ "$BACKEND_TEST" = "404" ]; then
    echo "✅ Backend SSL (port 3001): Working"
else
    echo "⚠️  Backend SSL (port 3001): HTTP $BACKEND_TEST"
fi

if [ "$FRONTEND_TEST" = "200" ]; then
    echo "✅ Frontend SSL (port 5173): Working"
else
    echo "⚠️  Frontend SSL (port 5173): HTTP $FRONTEND_TEST"
fi

echo ""
echo "🎯 ft_transcendence is ready!"
echo "============================"
echo "🎮 Frontend: https://localhost:5173"
echo "🔧 Backend: https://localhost:3001"
echo ""
echo "📋 Setup complete! Now showing live logs..."
echo "   Press Ctrl+C to stop viewing logs (services will continue running)"
echo ""

# Step 5: Now show the logs (this will block, but setup is complete)
echo "📄 Showing container logs..."
docker-compose logs -f
