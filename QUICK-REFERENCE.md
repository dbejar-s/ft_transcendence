# 🚀 Quick Testing Reference

## ⚡ 30-Second Setup

```bash
git checkout security-implementation && git pull
docker-compose up -d
```

## 🔒 SSL Certificate Acceptance (EXACT ORDER)

| Step | URL | Action | Expected Result |
|------|-----|--------|-----------------|
| 1 | `https://localhost:3001` | Accept certificate | 404 error (✅ normal) |
| 2 | `https://localhost:5173` | Accept certificate | App loads |

## 🧪 Quick Test

1. Open `ssl-test.html` in browser
2. All buttons should show ✅ green
3. Go to `https://localhost:5173` and test login

## 🆘 Quick Fixes

| Problem | Solution |
|---------|----------|
| `ERR_CERT_AUTHORITY_INVALID` | Accept both certificates in order |
| CORS errors | `docker-compose restart` |
| 404 on frontend | Check `docker-compose ps` |
| Services won't start | `docker-compose down && docker-compose up -d` |

## 🔍 Debug Commands

```bash
docker-compose ps                    # Check service status
docker-compose logs backend          # Backend logs
curl -k https://localhost:3001/api/health  # Test backend
```

---
**📖 Full guide:** [TESTING-GUIDE.md](./TESTING-GUIDE.md)
