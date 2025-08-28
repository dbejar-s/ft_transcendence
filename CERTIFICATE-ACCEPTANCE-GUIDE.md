# 🔒 SSL Certificate Acceptance Guide

## ⚠️ CRITICAL: You MUST accept certificates in this EXACT order

### Step 1: Accept Backend Certificate (REQUIRED)
1. Open a **new browser tab**
2. Go to: **https://localhost:3001**
3. You'll see a security warning
4. Click **"Advanced"** (Chrome/Edge) or **"Advanced..."** (Firefox)
5. Click **"Proceed to localhost (unsafe)"** or **"Accept the Risk and Continue"**
6. You should see a **404 error** - this is NORMAL and means the backend is working

### Step 2: Accept Frontend Certificate (REQUIRED)
1. Open another **new browser tab**
2. Go to: **https://localhost:5173**
3. Again, click **"Advanced"** and then **"Proceed to localhost (unsafe)"**
4. Your application should now load

### Step 3: Clear Browser Data
1. Press **F12** to open Developer Tools
2. Right-click the **refresh button** and select **"Empty Cache and Hard Reload"**
3. Or go to Settings → Privacy → Clear browsing data → Select "Cached images and files" → Clear

### Step 4: Test the Login
1. Try logging in with Google OAuth
2. If you still get errors, check the Console tab in Developer Tools (F12)

---

## 🔍 Troubleshooting Specific Errors

### ERR_CERT_AUTHORITY_INVALID
- **Cause**: You haven't accepted the backend certificate
- **Solution**: Follow Step 1 above EXACTLY

### Cross-Origin-Opener-Policy errors
- **Cause**: HTTPS security policies blocking communication
- **Solution**: Make sure BOTH certificates are accepted (Steps 1 & 2)

### Failed to fetch
- **Cause**: Browser blocking HTTPS requests to unaccepted certificates
- **Solution**: Accept backend certificate (Step 1) and clear cache (Step 3)

---

## 🌐 Browser-Specific Instructions

### Firefox
1. When you see "Warning: Potential Security Risk Ahead"
2. Click **"Advanced..."**
3. Click **"Accept the Risk and Continue"**

### Chrome/Edge
1. When you see "Your connection is not private"
2. Click **"Advanced"**
3. Click **"Proceed to localhost (unsafe)"**

### Safari
1. When you see "This Connection Is Not Private"
2. Click **"Show Details"**
3. Click **"visit this website"**
4. Click **"Visit Website"** in the popup

---

## ✅ How to Verify Success

After accepting both certificates, you should be able to:
1. Visit https://localhost:5173 without warnings
2. See the login page load properly
3. Click "Sign in with Google" without console errors
4. See API calls in Network tab (F12) returning 200/201 status codes

---

## 🚨 If You're Still Having Issues

1. **Close ALL browser tabs** with localhost
2. **Restart your browser completely**
3. **Repeat Steps 1-4** in the exact order
4. **Check that Docker services are running**: `docker-compose ps`
5. **Run the diagnostic script**: `./test-certificates.sh`
