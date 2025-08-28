# 🚀 Testing Guide for ft_transcendence

Welcome to the comprehensive testing guide for the ft_transcendence project! This guide will walk you through setting up and testing the application on any computer, with special attention to SSL certificate handling.

---

## 📋 Table of Contents

- [🎯 Quick Start](#-quick-start)
- [🛠️ Prerequisites](#️-prerequisites)
- [🔧 Initial Setup](#-initial-setup)
- [🔒 SSL Certificate Configuration](#-ssl-certificate-configuration)
- [🧪 Testing with SSL Test Page](#-testing-with-ssl-test-page)
- [🎮 Application Testing](#-application-testing)
- [🔍 Troubleshooting](#-troubleshooting)
- [📞 Getting Help](#-getting-help)

---

## 🎯 Quick Start

> **⚡ TL;DR for experienced developers:**
> 1. `git clone` → `git checkout security-implementation` → `git pull`
> 2. `docker-compose up -d`
> 3. Accept SSL certs: `https://localhost:3001` then `https://localhost:5173`
> 4. Open `ssl-test.html` to verify
> 5. Test the app at `https://localhost:5173`

---

## 🛠️ Prerequisites

Before you begin, ensure you have:

- **Docker** (version 20.10+)
- **Docker Compose** (version 1.29+)
- **Git**
- **Modern web browser** (Chrome, Firefox, Edge, Safari)

### 🔍 Verify Prerequisites

```bash
# Check Docker
docker --version
# Expected: Docker version 20.10.x or higher

# Check Docker Compose
docker-compose --version
# Expected: docker-compose version 1.29.x or higher

# Check Git
git --version
# Expected: git version 2.x.x or higher
```

---

## 🔧 Initial Setup

### Step 1: Clone and Setup Repository

```bash
# Clone the repository (if not already done)
git clone https://github.com/dbejar-s/ft_transcendence.git
cd ft_transcendence

# Switch to the security implementation branch
git checkout security-implementation

# Pull the latest changes
git pull origin security-implementation
```

### Step 2: Start the Services

```bash
# Start all services in detached mode
docker-compose up -d

# Verify all services are running
docker-compose ps
```

**Expected output:**
```
Name                    Command               State                    Ports
---------------------------------------------------------------------------------
ft_transcendence_backend_1    docker-entrypoint.sh node ...   Up      0.0.0.0:3001->3001/tcp
ft_transcendence_frontend_1   docker-entrypoint.sh node ...   Up      0.0.0.0:5173->5173/tcp
ft_transcendence_pong-server_1 ./netpong_server 0.0.0.0 4000  Up      0.0.0.0:4000->4000/tcp
```

> **✅ Success indicator:** All services should show `State: Up`

---

## 🔒 SSL Certificate Configuration

The application uses HTTPS with self-signed certificates for security compliance. You **must** manually accept these certificates in your browser.

### 🚨 **CRITICAL: Follow This Exact Order**

#### Step 1: Accept Backend Certificate

1. **Open your browser**
2. **Navigate to:** `https://localhost:3001`
3. **You'll see a security warning** - this is expected!

   ![Security Warning Example](https://via.placeholder.com/600x300/ff6b6b/ffffff?text=Security+Warning+Expected)

4. **Click the appropriate button:**
   - **Chrome/Edge:** Click `Advanced` → `Proceed to localhost (unsafe)`
   - **Firefox:** Click `Advanced...` → `Accept the Risk and Continue`
   - **Safari:** Click `Show Details` → `visit this website` → `Visit Website`

5. **Expected result:** You should see a **404 error page**
   ```json
   {"message":"Route GET:/ not found","error":"Not Found","statusCode":404}
   ```
   > **✅ This 404 error is NORMAL and means the backend is working correctly!**

#### Step 2: Accept Frontend Certificate

1. **Open a NEW browser tab**
2. **Navigate to:** `https://localhost:5173`
3. **Accept the certificate** using the same process as Step 1
4. **Expected result:** Your application should load with the login page

---

## 🧪 Testing with SSL Test Page

We've provided an interactive SSL test page to verify your setup.

### How to Use the Test Page

1. **Open the test page:**
   ```bash
   # Navigate to your project directory
   # Double-click on ssl-test.html or drag it into your browser
   ```

2. **Follow the interactive guide:**

   ![SSL Test Page](https://via.placeholder.com/800x400/4ecdc4/ffffff?text=SSL+Test+Page+Interface)

   - **Step 1:** Click the backend link and accept the certificate
   - **Step 2:** Click `Test Backend API` - should show ✅ **"Backend certificate accepted and API is working!"**
   - **Step 3:** Click the frontend link and accept the certificate
   - **Step 4:** Click `Test Google OAuth Endpoint` - should show ✅ **"Google OAuth endpoint is reachable"**

### 🎯 Expected Test Results

| Test | Expected Result | What It Means |
|------|----------------|---------------|
| Backend API | ✅ Status 200 | SSL certificate accepted, API working |
| Google OAuth | ✅ Status 400/401 | Endpoint reachable (auth error is expected) |

---

## 🎮 Application Testing

### Step 1: Clear Browser Cache

Before testing, clear your browser data:

1. **Press F12** to open Developer Tools
2. **Right-click the refresh button**
3. **Select "Empty Cache and Hard Reload"**
4. **Close Developer Tools**

### Step 2: Access the Application

1. **Navigate to:** `https://localhost:5173`
2. **Verify:** No SSL warnings should appear
3. **Expected:** Login page loads correctly

### Step 3: Test Google OAuth Login

1. **Click "Sign in with Google"**
2. **Check for errors:**
   - Press **F12** to open Developer Tools
   - Go to the **Console** tab
   - Look for any red error messages

### 🎯 Success Indicators

✅ **Application loads without SSL warnings**
✅ **Google OAuth popup opens**
✅ **No `ERR_CERT_AUTHORITY_INVALID` errors in console**
✅ **API calls return 200/201 status codes in Network tab**

---

## 🔍 Troubleshooting

### Common Issues and Solutions

#### ❌ Issue: `ERR_CERT_AUTHORITY_INVALID`

**Cause:** SSL certificate not accepted
**Solution:**
1. Close all localhost tabs
2. Restart your browser
3. Repeat SSL certificate acceptance in exact order
4. Clear browser cache

#### ❌ Issue: CORS Errors

**Cause:** Services not running or certificate issues
**Solution:**
```bash
# Restart services
docker-compose down
docker-compose up -d

# Test backend connection
curl -k https://localhost:3001/api/health
```

#### ❌ Issue: Services Not Starting

**Solution:**
```bash
# Check service logs
docker-compose logs backend
docker-compose logs frontend

# Rebuild if necessary
docker-compose build
docker-compose up -d
```

#### ❌ Issue: Cross-Origin-Opener-Policy Errors

**Cause:** HTTPS security policies
**Solution:**
1. Ensure both certificates are accepted
2. Clear browser cache completely
3. Try in incognito/private mode

### 🔧 Diagnostic Commands

```bash
# Check service status
docker-compose ps

# View backend logs
docker-compose logs backend

# View frontend logs
docker-compose logs frontend

# Test backend health
curl -k https://localhost:3001/api/health

# Restart specific service
docker-compose restart backend

# Clean restart
docker-compose down && docker-compose up -d
```

### 🌐 Browser-Specific Instructions

<details>
<summary><strong>🔥 Firefox</strong></summary>

1. Warning: "Warning: Potential Security Risk Ahead"
2. Click: **"Advanced..."**
3. Click: **"Accept the Risk and Continue"**
4. Alternative: `about:config` → `security.tls.allow_unsafe_legacy_renegotiation` → `true`
</details>

<details>
<summary><strong>🌍 Chrome/Edge</strong></summary>

1. Warning: "Your connection is not private"
2. Click: **"Advanced"**
3. Click: **"Proceed to localhost (unsafe)"**
4. Alternative: Type `thisisunsafe` while on the warning page
</details>

<details>
<summary><strong>🧭 Safari</strong></summary>

1. Warning: "This Connection Is Not Private"
2. Click: **"Show Details"**
3. Click: **"visit this website"**
4. Click: **"Visit Website"** in the popup
5. Enter your macOS password if prompted
</details>

---

## 📞 Getting Help

### 🔍 Before Asking for Help

1. **Run the SSL test page** and share the results
2. **Check browser console** (F12) for error messages
3. **Verify services are running** with `docker-compose ps`
4. **Try a different browser** to isolate the issue

### 📝 When Reporting Issues

Please include:

```markdown
**Environment:**
- OS: [Windows/macOS/Linux]
- Browser: [Chrome/Firefox/Safari + version]
- Docker version: [run `docker --version`]

**Steps taken:**
1. [List the exact steps you followed]

**Error messages:**
[Copy exact error messages from browser console]

**Service status:**
[Output of `docker-compose ps`]
```

### 🚀 Additional Resources

- **SSL Test Page:** Open `ssl-test.html` in your browser
- **Certificate Guide:** Check `CERTIFICATE-ACCEPTANCE-GUIDE.md`
- **HTTP Fallback:** See `HTTP-FALLBACK.md` for non-SSL testing

---

## 🎉 Success Checklist

- [ ] Repository cloned and on `security-implementation` branch
- [ ] Docker services running (`docker-compose ps` shows all `Up`)
- [ ] Backend SSL certificate accepted (`https://localhost:3001` shows 404)
- [ ] Frontend SSL certificate accepted (`https://localhost:5173` loads app)
- [ ] SSL test page shows all ✅ green checks
- [ ] Google OAuth login opens without console errors
- [ ] No `ERR_CERT_AUTHORITY_INVALID` errors

---

<div align="center">

**🎮 Happy testing! 🎮**

*If you've followed this guide and everything works, you're ready to dive into the ft_transcendence experience!*

---

**Made with ❤️ by the ft_transcendence team**

</div>
