import dotenv from 'dotenv';
dotenv.config();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import path from 'path';
import fs from 'fs';
import { apiRoutes } from './routes/api';
import { db } from './db/database';
import { jwtMiddleware } from './jwtMiddleware';
import { WebSocketServer } from "ws";
import type WS from "ws";

// HTTPS configuration - only use in production
const isProduction = process.env.NODE_ENV === 'production';
let fastify: any;

if (isProduction) {
  const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, '..', 'certs', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '..', 'certs', 'cert.pem'))
  };
  fastify = Fastify({ 
    logger: true,
    https: httpsOptions
  });
} else {
  fastify = Fastify({ 
    logger: true
    // No https option = HTTP mode
  });
}

// Security headers
fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com", "https://apis.google.com"],
      imgSrc: ["'self'", "data:", "https:", "https://accounts.google.com"],
      connectSrc: ["'self'", "ws:", "wss:", "https://accounts.google.com", "https://apis.google.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["https://accounts.google.com", "https://apis.google.com"],
    },
  },
});

// Rate limiting - increased for development
fastify.register(rateLimit, {
  max: 500, // requests (increased from 100)
  timeWindow: '1 minute'
});

// CORS with restricted origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://localhost:5173',
  'http://localhost:3000',
  'https://localhost:3000'
];

fastify.register(cors, {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, file:// protocol, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost origins (for development)
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  // Allow all headers for preflight requests
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control', 'Pragma']
});

fastify.register(multipart);

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '..', 'uploads'),
  prefix: '/uploads/',
});

// Routes
fastify.register(apiRoutes, { prefix: '/api' });

// Protected example route
fastify.route({
  method: 'GET',
  url: '/api/protected',
  preHandler: jwtMiddleware,
  handler: async (request: any, reply: any) => {
    reply.send({ message: 'Protected', user: (request as any).user });
  },
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully.`);
  fastify.close(() => {
    console.log('Server closed.');
    db.close();
    console.log('Database connection closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

const clients: Record<string, WS[]> = {};

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: "0.0.0.0" });
    fastify.log.info("HTTPS server listening on port 3001");

    // --- WebSocket server with WSS support ---
    const wss = new WebSocketServer({ server: fastify.server, path: "/ws" });

    wss.on("connection", (ws: WS, req) => {
      const url = new URL(req.url!, `https://${req.headers.host}`);
      const userId = url.searchParams.get("userId");
      console.log("WebSocket connection attempt for userId:", userId);
      if (!userId) {
        console.log("No userId provided, closing connection");
        ws.close();
        return;
      }

      if (!clients[userId]) clients[userId] = [];
      clients[userId].push(ws);
      console.log("WebSocket connected for user:", userId, "Total connections:", clients[userId].length);

      ws.on("close", () => {
        clients[userId] = clients[userId].filter(s => s !== ws);
        console.log("WebSocket disconnected for user:", userId);
        broadcastStatus(userId, "offline");
      });

      broadcastStatus(userId, "online");
    });

    function broadcastStatus(userId: string, status: "online" | "offline" | "busy") {
      console.log("Broadcasting status update:", userId, status);
      db.prepare(`UPDATE users SET status = ? WHERE id = ?`).run(status, userId);

      const friends = db.prepare(
        `SELECT userId FROM friends WHERE friendId = ? AND status = 'accepted'`
      ).all(userId) as { userId: string }[];
      console.log("Found friends to notify:", friends.length);
      for (const f of friends) {
        const sockets = clients[f.userId] || [];
        console.log("Notifying friend:", f.userId, "with", sockets.length, "connections");
        sockets.forEach(ws =>
          ws.send(JSON.stringify({ type: "statusUpdate", userId, status }))
        );
      }
    }
    // --- fin WebSocket server ---
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();