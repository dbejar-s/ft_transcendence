#!/bin/bash

echo "🔐 SSL Certificate Setup Assistant"
echo "=================================="
echo ""

# Check if services are running
if ! curl -k -s --connect-timeout 2 "https://localhost:3001" > /dev/null 2>&1; then
    echo "❌ Backend not running. Please start the application first:"
    echo "   ./start-pong.sh"
    exit 1
fi

if ! curl -k -s --connect-timeout 2 "https://localhost:5173" > /dev/null 2>&1; then
    echo "❌ Frontend not running. Please start the application first:"
    echo "   ./start-pong.sh"
    exit 1
fi

echo "✅ Services are running!"
echo ""

# Try to detect and open browser
if command -v firefox &> /dev/null; then
    echo "🔥 Opening Firefox for certificate setup..."
    echo ""
    echo "📋 INSTRUCTIONS:"
    echo "   1. Firefox will open two tabs"
    echo "   2. For EACH tab, click 'Advanced' then 'Accept the Risk and Continue'"
    echo "   3. After accepting both certificates, your app will work!"
    echo ""
    read -p "Press Enter to open Firefox..."
    
    firefox --new-tab "https://localhost:3001" >/dev/null 2>&1 &
    sleep 2
    firefox --new-tab "https://localhost:5173" >/dev/null 2>&1 &
    
    echo "✅ Firefox opened! Please accept the certificates in both tabs."
    
elif command -v google-chrome &> /dev/null; then
    echo "🌍 Opening Google Chrome for certificate setup..."
    echo ""
    echo "📋 INSTRUCTIONS:"
    echo "   1. Chrome will open two tabs"
    echo "   2. For EACH tab, click 'Advanced' then 'Proceed to localhost (unsafe)'"
    echo "   3. After accepting both certificates, your app will work!"
    echo ""
    read -p "Press Enter to open Chrome..."
    
    google-chrome --new-window "https://localhost:3001" >/dev/null 2>&1 &
    sleep 2
    google-chrome --new-window "https://localhost:5173" >/dev/null 2>&1 &
    
    echo "✅ Chrome opened! Please accept the certificates in both tabs."
    
elif command -v chromium-browser &> /dev/null; then
    echo "🌍 Opening Chromium for certificate setup..."
    echo ""
    echo "📋 INSTRUCTIONS:"
    echo "   1. Chromium will open two tabs"
    echo "   2. For EACH tab, click 'Advanced' then 'Proceed to localhost (unsafe)'"
    echo "   3. After accepting both certificates, your app will work!"
    echo ""
    read -p "Press Enter to open Chromium..."
    
    chromium-browser --new-window "https://localhost:3001" >/dev/null 2>&1 &
    sleep 2
    chromium-browser --new-window "https://localhost:5173" >/dev/null 2>&1 &
    
    echo "✅ Chromium opened! Please accept the certificates in both tabs."
    
else
    echo "🌐 No supported browser found for automation"
    echo ""
    echo "📋 MANUAL SETUP REQUIRED:"
    echo "   1. Open your browser"
    echo "   2. Go to: https://localhost:3001"
    echo "   3. Accept the certificate warning"
    echo "   4. Go to: https://localhost:5173"
    echo "   5. Accept the certificate warning"
    echo "   6. Your app will then work!"
fi

echo ""
echo "⏰ Waiting 10 seconds for you to accept certificates..."
sleep 10

# Test if certificates were accepted
echo "🧪 Testing certificate acceptance..."

BACKEND_OK=false
FRONTEND_OK=false

# Test backend
if curl -k -s --connect-timeout 3 "https://localhost:3001" > /dev/null 2>&1; then
    echo "✅ Backend certificate: Working"
    BACKEND_OK=true
else
    echo "❌ Backend certificate: Still needs acceptance"
fi

# Test frontend
if curl -k -s --connect-timeout 3 "https://localhost:5173" > /dev/null 2>&1; then
    echo "✅ Frontend certificate: Working"
    FRONTEND_OK=true
else
    echo "❌ Frontend certificate: Still needs acceptance"
fi

echo ""
if [ "$BACKEND_OK" = true ] && [ "$FRONTEND_OK" = true ]; then
    echo "🎉 SUCCESS! All certificates accepted!"
    echo "🚀 Your ft_transcendence app is ready to use!"
    echo ""
    echo "🎮 Open: https://localhost:5173"
else
    echo "⚠️  Some certificates still need acceptance."
    echo "   Please make sure you've accepted certificates for BOTH URLs:"
    echo "   • https://localhost:3001"
    echo "   • https://localhost:5173"
    echo ""
    echo "   You can run this script again: ./setup-certificates.sh"
fi
