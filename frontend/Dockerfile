# Stage 1: Build the React application
FROM node:20-slim as build

WORKDIR /app

ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID


COPY package*.json ./
RUN npm install

COPY . .
# Now, when this command runs, Vite will have access to all the VITE_ variables
RUN npm run build

FROM node:20-slim

# Install OpenSSL for certificate generation
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/dist /app/dist
COPY --from=build /app/package.json /app/package.json
COPY server.js /app/

# Generate SSL certificates if they don't exist
RUN mkdir -p certs && \
    if [ ! -f certs/key.pem ]; then \
        openssl genrsa -out certs/key.pem 2048; \
        openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"; \
        echo "Generated SSL certificates for frontend"; \
    fi

RUN npm install express@^4.18.0

EXPOSE 5173

# Start the HTTPS server
CMD ["node", "server.js"]