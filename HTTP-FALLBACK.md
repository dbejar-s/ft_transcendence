# HTTP Fallback Configuration (for testing only)

This configuration allows you to run the application over HTTP for initial testing, then upgrade to HTTPS once everything is working.

## Quick HTTP Testing Setup

1. **Stop current services**:
   ```bash
   docker-compose down
   ```

2. **Switch backend to HTTP** (temporary):
   Edit `backend/src/server.ts` and comment out HTTPS:
   ```typescript
   // Comment out HTTPS configuration
   // const httpsOptions = {
   //   key: fs.readFileSync(path.join(__dirname, '..', 'certs', 'key.pem')),
   //   cert: fs.readFileSync(path.join(__dirname, '..', 'certs', 'cert.pem'))
   // };

   const fastify = Fastify({ 
     logger: true,
     // Remove https: httpsOptions
   });
   ```

3. **Switch frontend to HTTP**:
   Edit `frontend/src/services/api.ts`:
   ```typescript
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
   ```

4. **Use standard frontend serving**:
   Modify `frontend/Dockerfile` to use `serve` instead of custom HTTPS server:
   ```dockerfile
   CMD ["npx", "serve", "-s", "dist", "-l", "5173"]
   ```

5. **Update Docker Compose ports** (if needed):
   Make sure `docker-compose.yml` exposes HTTP ports.

6. **Test HTTP version**:
   ```bash
   docker-compose up --build
   ```
   
   Access via:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

## After HTTP Testing Works

Once you confirm the application works over HTTP:

1. **Revert changes** to restore HTTPS
2. **Run certificate acceptance** procedure  
3. **Test HTTPS version**

This approach helps isolate whether the issue is:
- Application logic problems (would fail in HTTP too)
- SSL certificate problems (only affects HTTPS)

## For Production

⚠️ **Never use HTTP in production** - this is only for local development debugging.
