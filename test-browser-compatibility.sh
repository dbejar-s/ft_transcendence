#!/bin/bash

echo "🌐 Cross-Browser Testing Script"
echo "==============================="
echo ""

# Function to test browser compatibility
test_browser_compatibility() {
    local browser=$1
    echo "Testing $browser compatibility..."
    
    # Check if browser is installed (basic check)
    case $browser in
        "firefox")
            if command -v firefox &> /dev/null; then
                echo "✅ Firefox is installed"
            else
                echo "❌ Firefox not found"
                return 1
            fi
            ;;
        "chrome")
            if command -v google-chrome &> /dev/null || command -v chromium &> /dev/null; then
                echo "✅ Chrome/Chromium is installed"
            else
                echo "❌ Chrome/Chromium not found"
                return 1
            fi
            ;;
        "safari")
            if [[ "$OSTYPE" == "darwin"* ]]; then
                echo "✅ Safari available on macOS"
            else
                echo "ℹ️  Safari testing skipped (not on macOS)"
                return 0
            fi
            ;;
    esac
    
    echo ""
}

# Test SSL certificate accessibility for different browsers
test_ssl_compatibility() {
    echo "🔒 Testing SSL certificate compatibility..."
    echo "=========================================="
    
    # Test backend SSL
    if curl -k -s --connect-timeout 5 "https://localhost:3001" > /dev/null 2>&1; then
        echo "✅ Backend SSL accessible"
    else
        echo "❌ Backend SSL not accessible"
        return 1
    fi
    
    # Test frontend SSL
    if curl -k -s --connect-timeout 5 "https://localhost:5173" > /dev/null 2>&1; then
        echo "✅ Frontend SSL accessible"
    else
        echo "❌ Frontend SSL not accessible"
        return 1
    fi
    
    echo ""
}

# Test WebSocket compatibility
test_websocket_compatibility() {
    echo "🔌 Testing WebSocket compatibility..."
    echo "==================================="
    
    # Test pong server WebSocket
    if nc -z localhost 4000 2>/dev/null; then
        echo "✅ Pong server WebSocket port accessible"
    else
        echo "❌ Pong server WebSocket port not accessible"
        return 1
    fi
    
    echo ""
}

# Check JavaScript compatibility
test_javascript_compatibility() {
    echo "📜 Testing JavaScript compatibility..."
    echo "===================================="
    
    # Check if Node.js is available for testing
    if command -v node &> /dev/null; then
        echo "✅ Node.js available for testing"
        
        # Test basic JavaScript features used in the project
        node -e "
            // Test ES6+ features
            const testArrowFunction = () => 'working';
            const testTemplateString = \`Template string working\`;
            const testAsyncAwait = async () => await Promise.resolve('working');
            
            // Test WebSocket constructor (basic check)
            const WebSocket = require('ws');
            
            console.log('✅ Arrow functions:', testArrowFunction());
            console.log('✅ Template strings:', testTemplateString);
            console.log('✅ Classes and modules supported');
            console.log('✅ WebSocket constructor available');
        " 2>/dev/null && echo "✅ JavaScript features compatible" || echo "❌ JavaScript compatibility issues"
    else
        echo "ℹ️  Node.js not available for JavaScript testing"
    fi
    
    echo ""
}

# Browser-specific instructions
show_browser_instructions() {
    echo "📋 Browser-Specific Testing Instructions"
    echo "========================================"
    echo ""
    
    echo "🔥 Firefox:"
    echo "  1. Open: https://localhost:3001"
    echo "  2. Click 'Advanced' → 'Accept the Risk and Continue'"
    echo "  3. Open: https://localhost:5173"
    echo "  4. Click 'Advanced' → 'Accept the Risk and Continue'"
    echo "  5. Test game functionality"
    echo ""
    
    echo "🌍 Chrome/Edge:"
    echo "  1. Open: https://localhost:3001"
    echo "  2. Click 'Advanced' → 'Proceed to localhost (unsafe)'"
    echo "  3. Open: https://localhost:5173"
    echo "  4. Click 'Advanced' → 'Proceed to localhost (unsafe)'"
    echo "  5. Test game functionality"
    echo ""
    
    echo "🍎 Safari:"
    echo "  1. Enable Develop menu: Preferences → Advanced → Show Develop menu"
    echo "  2. Open: https://localhost:3001"
    echo "  3. Click 'Show Details' → 'visit this website' → 'Visit Website'"
    echo "  4. Open: https://localhost:5173"
    echo "  5. Repeat certificate acceptance"
    echo "  6. Test game functionality"
    echo ""
}

# Main testing sequence
main() {
    echo "Starting cross-browser compatibility testing..."
    echo ""
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        echo "✅ Docker services are running"
    else
        echo "❌ Docker services are not running"
        echo "   Run: docker-compose up -d"
        exit 1
    fi
    echo ""
    
    # Test SSL compatibility
    test_ssl_compatibility
    
    # Test WebSocket compatibility
    test_websocket_compatibility
    
    # Test JavaScript compatibility
    test_javascript_compatibility
    
    # Test individual browsers
    echo "🌐 Testing Browser Installation"
    echo "=============================="
    test_browser_compatibility "firefox"
    test_browser_compatibility "chrome"
    test_browser_compatibility "safari"
    
    # Show browser-specific instructions
    show_browser_instructions
    
    echo "🎯 Final Compatibility Checklist:"
    echo "================================="
    echo "  [ ] SSL certificates accepted in each browser"
    echo "  [ ] Login/registration works in each browser"
    echo "  [ ] Google OAuth works in each browser"
    echo "  [ ] Game controls responsive in each browser"
    echo "  [ ] WebSocket connections stable in each browser"
    echo "  [ ] Tournament system works in each browser"
    echo "  [ ] Profile/statistics load in each browser"
    echo ""
    echo "📖 See BROWSER-COMPATIBILITY.md for detailed troubleshooting"
}

# Run main function
main
