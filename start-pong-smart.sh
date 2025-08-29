#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🚀 ft_transcendence Smart Startup with Auto SSL"
echo "==============================================="

# Step 1: Clean shutdown
echo "🧹 Cleaning up existing containers..."
docker-compose down --volumes --remove-orphans

# Step 2: Generate SSL certificates BEFORE building
echo "🔐 Generating SSL certificates..."
if [ ! -f "backend/certs/cert.pem" ] || [ ! -f "backend/certs/key.pem" ]; then
    echo "📋 Creating SSL certificates..."
    ./generate-certs.sh
else
    echo "✅ SSL certificates already exist"
fi

# Step 3: Build and start
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Step 4: Wait for services to be ready
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
        docker-compose logs backend
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
        docker-compose logs frontend
        exit 1
    fi
    sleep 2
done

# Step 5: Smart SSL certificate handling
echo "🔒 Smart SSL Certificate Setup"
echo "============================="

# Test SSL connectivity
BACKEND_TEST=$(curl -k -s -w "%{http_code}" -o /dev/null "https://localhost:3001" 2>/dev/null || echo "ERROR")
FRONTEND_TEST=$(curl -k -s -w "%{http_code}" -o /dev/null "https://localhost:5173" 2>/dev/null || echo "ERROR")

echo "📊 SSL Status Check:"
if [ "$BACKEND_TEST" = "404" ] || [ "$BACKEND_TEST" = "200" ]; then
    echo "✅ Backend SSL (port 3001): Working"
    BACKEND_SSL_OK=true
else
    echo "❌ Backend SSL (port 3001): Failed ($BACKEND_TEST)"
    BACKEND_SSL_OK=false
fi

if [ "$FRONTEND_TEST" = "200" ]; then
    echo "✅ Frontend SSL (port 5173): Working"
    FRONTEND_SSL_OK=true
else
    echo "❌ Frontend SSL (port 5173): Failed ($FRONTEND_TEST)"
    FRONTEND_SSL_OK=false
fi

# Step 6: Browser-specific certificate installation
echo ""
echo "🌐 Browser Certificate Setup"
echo "============================"

# Create certificate directory
mkdir -p ~/.ft_transcendence_ssl

# Extract actual certificates from running containers
if [ "$BACKEND_SSL_OK" = true ]; then
    echo | openssl s_client -connect localhost:3001 -servername localhost 2>/dev/null | \
        openssl x509 -outform PEM > ~/.ft_transcendence_ssl/backend.crt 2>/dev/null || true
fi

if [ "$FRONTEND_SSL_OK" = true ]; then
    echo | openssl s_client -connect localhost:5173 -servername localhost 2>/dev/null | \
        openssl x509 -outform PEM > ~/.ft_transcendence_ssl/frontend.crt 2>/dev/null || true
fi

# Step 7: Automated Browser Opening (if certificates work)
if [ "$BACKEND_SSL_OK" = true ] && [ "$FRONTEND_SSL_OK" = true ]; then
    echo "🎯 SSL certificates are working! Attempting automated browser setup..."
    
    # Try to open browser with certificate acceptance
    if command -v firefox &> /dev/null; then
        echo "🔥 Opening Firefox with certificate acceptance..."
        # Open backend first (this will show certificate warning)
        firefox --new-tab "https://localhost:3001" >/dev/null 2>&1 &
        sleep 3
        # Open frontend (this should work after backend cert is accepted)
        firefox --new-tab "https://localhost:5173" >/dev/null 2>&1 &
        
        echo "📋 Firefox Instructions:"
        echo "   1. Accept the certificate warning for https://localhost:3001"
        echo "   2. Accept the certificate warning for https://localhost:5173"
        echo "   3. Your app should then work normally!"
        
    elif command -v google-chrome &> /dev/null || command -v chromium-browser &> /dev/null; then
        CHROME_CMD=$(command -v google-chrome || command -v chromium-browser)
        echo "🌍 Opening Chrome/Chromium with certificate acceptance..."
        
        # Open with flags to ignore SSL errors for localhost
        $CHROME_CMD --new-window \
            --ignore-certificate-errors-spki-list \
            --ignore-ssl-errors \
            --allow-running-insecure-content \
            --ignore-certificate-errors \
            --allow-insecure-localhost \
            "https://localhost:3001" >/dev/null 2>&1 &
        
        sleep 2
        
        $CHROME_CMD --new-window \
            --ignore-certificate-errors-spki-list \
            --ignore-ssl-errors \
            --allow-running-insecure-content \
            --ignore-certificate-errors \
            --allow-insecure-localhost \
            "https://localhost:5173" >/dev/null 2>&1 &
        
        echo "📋 Chrome launched with SSL bypass flags"
        
    else
        echo "🌐 No supported browser found for automation"
        echo "   Please manually open: https://localhost:3001 and https://localhost:5173"
    fi
    
else
    echo "❌ SSL certificates not working properly"
    echo "   Manual setup required:"
    echo "   1. Open https://localhost:3001 and accept certificate"
    echo "   2. Open https://localhost:5173 and accept certificate"
fi

# Step 8: Final status report
echo ""
echo "🎯 ft_transcendence Startup Complete!"
echo "===================================="
echo "🎮 Frontend: https://localhost:5173"
echo "🔧 Backend: https://localhost:3001"
echo "📊 Pong Server: ws://localhost:4000"
echo ""

if [ "$BACKEND_SSL_OK" = true ] && [ "$FRONTEND_SSL_OK" = true ]; then
    echo "✅ SSL Status: Working"
    echo "🚀 Application should be ready to use!"
else
    echo "⚠️  SSL Status: Requires manual certificate acceptance"
    echo "📋 Steps to complete setup:"
    echo "   1. Visit https://localhost:3001 and accept the certificate"
    echo "   2. Visit https://localhost:5173 and accept the certificate"
    echo "   3. Refresh the frontend page"
fi

echo ""
echo "🛠️  Available Commands:"
echo "   docker-compose logs          # View logs"
echo "   docker-compose down          # Stop services"
echo "   ./quick-security-check.sh    # Security validation"
echo ""
echo "💡 If you have issues, check the certificate acceptance guide:"
echo "   cat CERTIFICATE-ACCEPTANCE-GUIDE.md"
