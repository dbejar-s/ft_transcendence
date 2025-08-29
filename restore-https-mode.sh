#!/bin/bash

echo "🔄 Restoring HTTPS Mode"
echo "======================"

# Restore backup files if they exist
if [ -f "backend/src/server.ts.backup" ]; then
    echo "🔧 Restoring backend server configuration..."
    mv backend/src/server.ts.backup backend/src/server.ts
fi

if [ -f "frontend/src/services/api.ts.backup" ]; then
    echo "🎨 Restoring frontend API configuration..."
    mv frontend/src/services/api.ts.backup frontend/src/services/api.ts
fi

if [ -f "docker-compose.yml.backup" ]; then
    echo "🐳 Restoring docker-compose configuration..."
    mv docker-compose.yml.backup docker-compose.yml
fi

echo "✅ HTTPS mode restored!"
echo ""
echo "🚀 To start in HTTPS mode:"
echo "   ./start-pong.sh"
echo ""
echo "🎓 To start in evaluation mode again:"
echo "   ./start-evaluation-mode.sh"
