# SSL Certificate Setup

This project requires SSL certificates for HTTPS operation. Certificates are automatically generated during Docker build, but you can also generate them manually.

## Automatic Certificate Generation

Certificates are automatically generated when building the Docker containers. No manual intervention required.

## Manual Certificate Generation

If you need to generate certificates manually (for development outside Docker):

```bash
# Run the certificate generation script
./generate-certs.sh
```

This will create:
- `backend/certs/key.pem` - Private key
- `backend/certs/cert.pem` - Certificate  
- `frontend/certs/key.pem` - Private key (copy)
- `frontend/certs/cert.pem` - Certificate (copy)

## Certificate Details

- **Type**: Self-signed certificates for development
- **Validity**: 365 days
- **Subject**: CN=localhost (for local development)
- **Key Size**: 2048-bit RSA

## Production Deployment

⚠️ **Warning**: These are self-signed certificates for development only. 

For production deployment:
1. Replace with proper CA-signed certificates
2. Update certificate paths in configuration
3. Ensure proper certificate chain validation

## Troubleshooting

If you get certificate errors:
1. Delete existing cert directories: `rm -rf backend/certs frontend/certs`
2. Run: `./generate-certs.sh`
3. Rebuild containers: `docker-compose build`
