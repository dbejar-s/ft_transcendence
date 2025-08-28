# SSL Certificate Setup

This project requires SSL certificates for HTTPS operation. Certificates are automatically generated during Docker build, but you can also generate them manually.

## 🚨 Important: Accepting Self-Signed Certificates

Since we use self-signed certificates for development, browsers will show security warnings. You **MUST** accept these certificates manually:

### Step-by-Step Certificate Acceptance:

1. **Start the application**:
   ```bash
   docker-compose up --build
   ```

2. **Accept Backend Certificate**:
   - Open: https://localhost:3001
   - **Chrome/Edge**: Click "Advanced" → "Proceed to localhost (unsafe)"
   - **Firefox**: Click "Advanced" → "Accept the Risk and Continue"  
   - **Safari**: Click "Show Details" → "visit this website" → "Visit Website"
   - You should see a JSON error like `{"message":"Route GET:/ not found","error":"Not Found","statusCode":404}` - **THIS IS NORMAL**

3. **Accept Frontend Certificate**:
   - Open: https://localhost:5173
   - **Chrome/Edge**: Click "Advanced" → "Proceed to localhost (unsafe)"
   - **Firefox**: Click "Advanced" → "Accept the Risk and Continue"
   - **Safari**: Click "Show Details" → "visit this website" → "Visit Website"
   - The application should now load properly

4. **Clear browser cache** (if still having issues):
   - **Chrome**: Settings → Privacy and security → Clear browsing data → Cached images and files
   - **Firefox**: Settings → Privacy & Security → Clear Data → Cached Web Content
   - **Safari**: Develop → Empty Caches

5. **Test Login**:
   - Try registering a new account or logging in
   - Check browser developer console (F12) for any remaining errors

### 🚨 Critical Notes:

- **You MUST accept certificates for BOTH URLs** (backend and frontend)
- **The browser may "forget" certificates** after restart - repeat steps if needed
- **This is normal behavior** for self-signed certificates
- **Each browser tab/window** may need to accept certificates separately

### Browser-Specific Instructions:

**Chrome/Edge:**
- Click "Advanced" → "Proceed to localhost (unsafe)"

**Firefox:**
- Click "Advanced" → "Accept the Risk and Continue"

**Safari:**
- Click "Show Details" → "visit this website" → "Visit Website"

## Automatic Certificate Generation

Certificates are automatically generated when building the Docker containers with improved Subject Alternative Names (SAN) support.

## Manual Certificate Generation

If you need to generate certificates manually (for development outside Docker):

```bash
# Run the certificate generation script
./generate-certs.sh
```

This will create:
- `backend/certs/key.pem` - Private key
- `backend/certs/cert.pem` - Certificate with SAN  
- `frontend/certs/key.pem` - Private key (copy)
- `frontend/certs/cert.pem` - Certificate (copy)

## Certificate Details

- **Type**: Self-signed certificates for development
- **Validity**: 365 days
- **Subject**: CN=localhost
- **SAN**: localhost, *.localhost, 127.0.0.1, ::1
- **Key Size**: 2048-bit RSA
- **Extensions**: Subject Alternative Names for browser compatibility

## Production Deployment

⚠️ **Warning**: These are self-signed certificates for development only. 

For production deployment:
1. Replace with proper CA-signed certificates
2. Update certificate paths in configuration
3. Ensure proper certificate chain validation

## Troubleshooting

### "ERR_CERT_AUTHORITY_INVALID" Error
This means you haven't accepted the self-signed certificates yet:
1. Visit https://localhost:3001 and accept the certificate
2. Visit https://localhost:5173 and accept the certificate
3. Refresh the application

### Certificate Not Working After Restart
Browsers may "forget" accepted certificates:
1. Re-accept certificates by visiting both URLs
2. Or add certificates to your system's trusted store (advanced)

### Complete Certificate Reset
If you have persistent issues:
```bash
# Stop containers
docker-compose down

# Remove old certificates
rm -rf backend/certs frontend/certs

# Generate new certificates
./generate-certs.sh

# Rebuild and restart
docker-compose build --no-cache
docker-compose up
```

### Adding Certificates to System Trust Store (Optional)

**macOS:**
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain backend/certs/cert.pem
```

**Linux (Ubuntu/Debian):**
```bash
sudo cp backend/certs/cert.pem /usr/local/share/ca-certificates/localhost.crt
sudo update-ca-certificates
```

**Windows:**
```powershell
# Run as Administrator
Import-Certificate -FilePath "backend\certs\cert.pem" -CertStoreLocation "Cert:\LocalMachine\Root"
```
