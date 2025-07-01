# Stage 1: Build the React application
FROM node:20-slim as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve the application with a lightweight server
FROM node:20-slim

WORKDIR /app

# Copy built assets from the build stage
COPY --from=build /app/dist /app/dist
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/index.html /app/index.html


# We need a small server to serve the static files, let's use 'serve'
RUN npm install -g serve

# Expose the port 'serve' will run on
EXPOSE 5173

# Start the server
CMD ["serve", "-s", "dist", "-l", "5173"]
