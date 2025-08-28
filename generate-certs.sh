#!/bin/bash

# Generate SSL certificates for local development
echo "Generating SSL certificates for local development..."

# Create backend certs directory
mkdir -p backend/certs

# Create frontend certs directory  
mkdir -p frontend/certs

# Generate private key
openssl genrsa -out backend/certs/key.pem 2048

# Generate certificate
openssl req -new -x509 -key backend/certs/key.pem -out backend/certs/cert.pem -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Copy certificates to frontend
cp backend/certs/key.pem frontend/certs/
cp backend/certs/cert.pem frontend/certs/

echo "SSL certificates generated successfully!"
echo "Backend certificates: backend/certs/"
echo "Frontend certificates: frontend/certs/"
