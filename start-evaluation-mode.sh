#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🎓 ft_transcendence Evaluation Mode"
echo "=================================="
echo "This script sets up the application for evaluation without manual browser interaction"
echo ""

# Step 1: Clean shutdown
echo "🧹 Cleaning up existing containers..."
docker-compose down --volumes --remove-orphans

# Step 2: Check if we should use HTTP for evaluation
echo "🔍 Evaluation Setup Options:"
echo "1. HTTPS (requires certificate acceptance)"
echo "2. HTTP (no certificate issues, evaluation-friendly)"
echo ""

read -p "Choose option for evaluation (1 for HTTPS, 2 for HTTP): " EVAL_MODE

if [ "$EVAL_MODE" = "2" ]; then
    echo "🌐 Setting up HTTP mode for evaluation..."
    
    # Backup original files
    cp backend/src/server.ts backend/src/server.ts.backup
    cp frontend/src/services/api.ts frontend/src/services/api.ts.backup
    cp docker-compose.yml docker-compose.yml.backup
    
    # Modify backend to use HTTP
    sed -i 's/const httpsOptions = {/\/\* const httpsOptions = {/g' backend/src/server.ts
    sed -i 's/cert: fs.readFileSync/cert: fs.readFileSync/g' backend/src/server.ts
    sed -i 's/const fastify = Fastify({ logger: true, https: httpsOptions });/const fastify = Fastify({ logger: true });/g' backend/src/server.ts
    sed -i 's/};/}; \*\//g' backend/src/server.ts
    
    # Modify frontend API to use HTTP
    sed -i "s|https://localhost:3001|http://localhost:3001|g" frontend/src/services/api.ts
    
    # Modify docker-compose to expose HTTP ports
    sed -i 's/VITE_API_BASE_URL=https:\/\/localhost:3001/VITE_API_BASE_URL=http:\/\/localhost:3001/g' docker-compose.yml
    
    echo "✅ Configured for HTTP mode"
    
    # Build and start
    echo "🔨 Building and starting services in HTTP mode..."
    docker-compose up --build -d
    
    # Wait for services
    echo "⏳ Waiting for services to be ready..."
    sleep 15
    
    # Test HTTP connectivity
    echo "🧪 Testing HTTP connectivity..."
    for i in {1..30}; do
        if curl -s --connect-timeout 2 "http://localhost:3001" > /dev/null 2>&1; then
            echo "✅ Backend (HTTP) is ready!"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ Backend failed to start"
            exit 1
        fi
        sleep 2
    done
    
    for i in {1..30}; do
        if curl -s --connect-timeout 2 "http://localhost:5173" > /dev/null 2>&1; then
            echo "✅ Frontend (HTTP) is ready!"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ Frontend failed to start"
            exit 1
        fi
        sleep 2
    done
    
    echo ""
    echo "🎉 EVALUATION MODE READY!"
    echo "========================"
    echo "🎮 Frontend: http://localhost:5173"
    echo "🔧 Backend: http://localhost:3001"
    echo "📊 Pong Server: ws://localhost:4000"
    echo ""
    echo "✅ No SSL certificates required!"
    echo "✅ Ready for evaluation without browser interaction!"
    echo ""
    echo "🔄 To restore HTTPS mode later:"
    echo "   ./restore-https-mode.sh"
    
else
    echo "🔐 Setting up HTTPS mode with automated certificate acceptance..."
    
    # Generate certificates first
    if [ ! -f "backend/certs/cert.pem" ]; then
        echo "📋 Generating SSL certificates..."
        ./generate-certs.sh
    fi
    
    # Build and start
    echo "🔨 Building and starting services..."
    docker-compose up --build -d
    
    # Wait for services
    echo "⏳ Waiting for services to be ready..."
    sleep 15
    
    # Test HTTPS connectivity
    for i in {1..30}; do
        if curl -k -s --connect-timeout 2 "https://localhost:3001" > /dev/null 2>&1; then
            echo "✅ Backend (HTTPS) is ready!"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ Backend failed to start"
            exit 1
        fi
        sleep 2
    done
    
    for i in {1..30}; do
        if curl -k -s --connect-timeout 2 "https://localhost:5173" > /dev/null 2>&1; then
            echo "✅ Frontend (HTTPS) is ready!"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ Frontend failed to start"
            exit 1
        fi
        sleep 2
    done
    
    echo ""
    echo "🎯 HTTPS MODE READY!"
    echo "==================="
    echo "🎮 Frontend: https://localhost:5173"
    echo "🔧 Backend: https://localhost:3001"
    echo ""
    echo "⚠️  NOTE: For browser access, you'll need to accept SSL certificates"
    echo "   Run: ./setup-certificates.sh"
fi

echo ""
echo "🛠️  Available Commands:"
echo "   docker-compose logs          # View logs"
echo "   docker-compose down          # Stop services"
echo "   ./quick-security-check.sh    # Security validation"
