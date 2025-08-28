#!/bin/bash

# Generate SSL certificates for local development
echo "Generating SSL certificates for local development..."

# Create backend certs directory
mkdir -p backend/certs

# Create frontend certs directory  
mkdir -p frontend/certs

# Create certificate configuration file
cat > backend/certs/cert.conf <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=US
ST=State
L=City
O=Organization
CN=localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# Generate private key
openssl genrsa -out backend/certs/key.pem 2048

# Generate certificate with SAN
openssl req -new -x509 -key backend/certs/key.pem -out backend/certs/cert.pem -days 365 -config backend/certs/cert.conf -extensions v3_req

# Copy certificates to frontend
cp backend/certs/key.pem frontend/certs/
cp backend/certs/cert.pem frontend/certs/

echo "SSL certificates generated successfully!"
echo "Backend certificates: backend/certs/"
echo "Frontend certificates: frontend/certs/"
echo ""
echo "⚠️  IMPORTANT: You need to accept these self-signed certificates in your browser:"
echo "1. Visit https://localhost:3001 and click 'Advanced' -> 'Proceed to localhost (unsafe)'"
echo "2. Visit https://localhost:5173 and click 'Advanced' -> 'Proceed to localhost (unsafe)'"
echo "3. You may need to do this after each browser restart"
