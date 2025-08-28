# ft_transcendence
Pong_on_steroids

## 🚀 Quick Setup

### Prerequisites
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dbejar-s/ft_transcendence.git
   cd ft_transcendence
   ```

2. **Generate SSL certificates (optional - auto-generated during build)**
   ```bash
   ./generate-certs.sh
   ```

3. **Build and start the application**
   ```bash
   docker-compose up --build
   ```

4. **Accept SSL certificates (IMPORTANT!)**
   - Visit https://localhost:3001 and accept the certificate warning
   - Visit https://localhost:5173 and accept the certificate warning
   - See [SSL-SETUP.md](SSL-SETUP.md) for detailed instructions

5. **Access the application**
   - Frontend: https://localhost:5173
   - Backend API: https://localhost:3001

## 🔒 Security Features

This application includes comprehensive security compliance:
- **HTTPS mandatory** for all communications
- **Password hashing** with bcrypt
- **Input validation** and sanitization
- **CORS protection** with credential support
- **Rate limiting** (100 requests/minute)
- **Security headers** (CSP, HSTS, XSS protection)
- **JWT authentication** with 2FA support

See [SECURITY.md](SECURITY.md) for detailed security documentation.
See [SSL-SETUP.md](SSL-SETUP.md) for SSL certificate information.

## 🎮 Features

- Real-time Pong game with WebSocket communication
- User authentication (local and Google OAuth)
- Friend management system
- Match history and statistics
- Tournament system
- Responsive design with multiple language support

## 🐛 Troubleshooting

### Certificate Issues (ERR_CERT_AUTHORITY_INVALID)
This is normal for self-signed certificates. You MUST accept the certificates:
1. Visit https://localhost:3001 → Click "Advanced" → "Proceed to localhost (unsafe)"
2. Visit https://localhost:5173 → Click "Advanced" → "Proceed to localhost (unsafe)"
3. Refresh the application page

### Complete Certificate Reset
If you encounter persistent SSL issues:
```bash
rm -rf backend/certs frontend/certs
./generate-certs.sh
docker-compose build --no-cache
```

### CORS Issues
Ensure you're accessing via HTTPS:
- ✅ https://localhost:5173
- ❌ http://localhost:5173
