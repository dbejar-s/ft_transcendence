# Use a slim Node.js image as a base
FROM node:20-slim

# Install OpenSSL for certificate generation
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Generate SSL certificates if they don't exist
RUN mkdir -p certs && \
    if [ ! -f certs/key.pem ]; then \
        openssl genrsa -out certs/key.pem 2048; \
        openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"; \
        echo "Generated SSL certificates"; \
    fi

# Build the TypeScript code into JavaScript
RUN npm run build

# Expose the port the app runs on
EXPOSE 3001

# Define the command to run the application
CMD [ "node", "dist/server.js" ]
