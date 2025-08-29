# 🧪 Manual Cross-Browser Testing Checklist

## Pre-Testing Setup
✅ All Docker services are running
✅ SSL certificates are accessible
✅ WebSocket ports are open

## 🔥 Firefox Testing

### 1. SSL Certificate Acceptance
- [ ] Open Firefox
- [ ] Navigate to: `https://localhost:3001`
- [ ] Click "Advanced..." → "Accept the Risk and Continue"
- [ ] Should see: `{"message":"Route GET:/ not found","error":"Not Found","statusCode":404}` ✅
- [ ] Navigate to: `https://localhost:5173`
- [ ] Click "Advanced..." → "Accept the Risk and Continue"
- [ ] Application should load ✅

### 2. Core Functionality Testing
- [ ] **Registration**: Create new account works
- [ ] **Login**: Username/password login works
- [ ] **Google OAuth**: Sign in with Google works
- [ ] **Game Loading**: Game page loads without errors
- [ ] **Keyboard Controls**: W/S for Player 1, Arrow keys for Player 2
- [ ] **WebSocket Connection**: Real-time game updates work
- [ ] **Tournament**: Can create and join tournaments
- [ ] **Profile**: Can view/edit profile and statistics

### 3. Firefox-Specific Checks
- [ ] **Developer Console**: No JavaScript errors (F12)
- [ ] **Network Tab**: WebSocket connections show as "101 Switching Protocols"
- [ ] **Security Tab**: SSL certificate warnings handled properly

---

## 🌍 Chrome/Chromium Testing

### 1. SSL Certificate Acceptance
- [ ] Open Chrome/Chromium
- [ ] Navigate to: `https://localhost:3001`
- [ ] Click "Advanced" → "Proceed to localhost (unsafe)"
- [ ] Should see: `{"message":"Route GET:/ not found","error":"Not Found","statusCode":404}` ✅
- [ ] Navigate to: `https://localhost:5173`
- [ ] Click "Advanced" → "Proceed to localhost (unsafe)"
- [ ] Application should load ✅

### 2. Core Functionality Testing
- [ ] **Registration**: Create new account works
- [ ] **Login**: Username/password login works
- [ ] **Google OAuth**: Sign in with Google works
- [ ] **Game Loading**: Game page loads without errors
- [ ] **Keyboard Controls**: W/S for Player 1, Arrow keys for Player 2
- [ ] **WebSocket Connection**: Real-time game updates work
- [ ] **Tournament**: Can create and join tournaments
- [ ] **Profile**: Can view/edit profile and statistics

### 3. Chrome-Specific Checks
- [ ] **Developer Tools**: No JavaScript errors (F12)
- [ ] **Network Tab**: WebSocket connections stable
- [ ] **Security Tab**: Certificate issues properly handled

---

## 🍎 Safari Testing (macOS only)

### 1. SSL Certificate Acceptance
- [ ] Open Safari
- [ ] Enable Develop menu: Safari → Preferences → Advanced → Show Develop menu
- [ ] Navigate to: `https://localhost:3001`
- [ ] Click "Show Details" → "visit this website" → "Visit Website"
- [ ] Should see: `{"message":"Route GET:/ not found","error":"Not Found","statusCode":404}` ✅
- [ ] Navigate to: `https://localhost:5173`
- [ ] Repeat certificate acceptance process
- [ ] Application should load ✅

### 2. Core Functionality Testing
- [ ] **Registration**: Create new account works
- [ ] **Login**: Username/password login works
- [ ] **Google OAuth**: Sign in with Google works (may need pop-up settings)
- [ ] **Game Loading**: Game page loads without errors
- [ ] **Keyboard Controls**: W/S for Player 1, Arrow keys for Player 2
- [ ] **WebSocket Connection**: Real-time game updates work
- [ ] **Tournament**: Can create and join tournaments
- [ ] **Profile**: Can view/edit profile and statistics

### 3. Safari-Specific Checks
- [ ] **Web Inspector**: No JavaScript errors (Cmd+Opt+I)
- [ ] **Network Tab**: WebSocket connections work
- [ ] **Pop-up Blocker**: Allow pop-ups for Google OAuth

---

## 🔍 Common Issues and Solutions

### SSL Certificate Issues
**Problem**: Browser shows "Your connection is not private"
**Solution**: Follow exact browser-specific acceptance steps above

### WebSocket Connection Issues
**Problem**: Game doesn't update in real-time
**Solution**: 
1. Check Network tab in developer tools
2. Verify WebSocket connection shows "101 Switching Protocols"
3. Restart Docker services if needed

### Google OAuth Issues
**Problem**: "Pop-up blocked" or OAuth fails
**Solution**:
1. Allow pop-ups for localhost
2. Clear browser cache and cookies
3. Check if third-party cookies are enabled

### Performance Issues
**Problem**: Game feels laggy or unresponsive
**Solution**:
1. Close other browser tabs
2. Check CPU usage in browser task manager
3. Verify Docker containers have enough resources

---

## 🎯 Success Criteria

All browsers should achieve:
- ✅ SSL certificates accepted without ongoing warnings
- ✅ Application loads completely
- ✅ User authentication works (local and Google)
- ✅ Game is playable with responsive controls
- ✅ Real-time features work (WebSocket connections)
- ✅ All major features accessible (tournaments, profiles, etc.)
- ✅ No critical JavaScript errors in console
- ✅ Consistent visual appearance across browsers

---

## 📞 Troubleshooting Commands

```bash
# Restart services if issues occur
docker-compose restart

# Check service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs pong-server

# Test SSL accessibility
curl -k https://localhost:3001
curl -k https://localhost:5173

# Test WebSocket port
nc -z localhost 4000
```
