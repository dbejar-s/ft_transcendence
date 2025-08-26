import dotenv from 'dotenv';
dotenv.config();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import path from 'path';
import { apiRoutes } from './routes/api';
import { db } from './db/database';
import { jwtMiddleware } from './jwtMiddleware';
import { WebSocketServer } from "ws";
import type WS from "ws";

const fastify = Fastify({ logger: true });

fastify.register(cors, {
  origin: '*',
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
  handler: async (request, reply) => {
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
    fastify.log.info("HTTP server listening on port 3001");

    // --- WebSocket server ---
    const wss = new WebSocketServer({ server: fastify.server, path: "/ws" });

    wss.on("connection", (ws: WS, req) => {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const userId = url.searchParams.get("userId");
      if (!userId) {
        ws.close();
        return;
      }

      if (!clients[userId]) clients[userId] = [];
      clients[userId].push(ws);

      ws.on("close", () => {
        clients[userId] = clients[userId].filter(s => s !== ws);
        broadcastStatus(userId, "offline");
      });

      broadcastStatus(userId, "online");
    });

    function broadcastStatus(userId: string, status: "online" | "offline" | "busy") {
      db.prepare(`UPDATE users SET status = ? WHERE id = ?`).run(status, userId);

      const friends = db.prepare(
        `SELECT userId FROM friends WHERE friendId = ? AND status = 'accepted'`
      ).all(userId) as { userId: string }[];
      for (const f of friends) {
        const sockets = clients[f.userId] || [];
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

// DEBUG ROUTE - Lists all users and their friends
fastify.get('/api/debug/db', async (_request, reply) => {
  try {
    type User = {
      id: string;
      email: string;
      username: string;
      password: string;
      avatar: string | null;
      googleId: string | null;
      status: string;
      language: string;
      twofa_enabled: number;
      twofa_code: string | null;
      twofa_expires: string | null;
    };
    type Friend = {
      userId: string;
      friendId: string;
      status: string;
    };

    const users = db.prepare('SELECT * FROM users').all() as User[];
    const friends = db.prepare('SELECT * FROM friends').all() as Friend[];

    const friendsMap: Record<string, string[]> = {};
    for (const f of friends) {
      if (!friendsMap[f.userId]) friendsMap[f.userId] = [];
      friendsMap[f.userId].push(f.friendId);
    }

    const usersWithFriends = users.map(u => ({
      ...u,
      friends: friendsMap[u.id] || []
    }));

    return reply.send(usersWithFriends);
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Failed to fetch debug info' });
  }
});


fastify.delete('/api/debug/remove-tournament', async (_request, reply) => {
  try {
    const stmt = db.prepare("DELETE FROM tournaments WHERE status = 'ongoing'");
    const result = stmt.run();
    return reply.send({ deleted: result.changes });
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Failed to clean up tournaments table' });
  }
});

fastify.delete('/api/debug/remove-tournois', async (_request, reply) => {
  try {
    const stmt = db.prepare("DELETE FROM tournaments WHERE status = 'finished'");
    const result = stmt.run();
    return reply.send({ deleted: result.changes });
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Failed to clean up tournaments table' });
  }
});

// Additional debug routes for troubleshooting
fastify.get('/api/debug/tournaments', async (_request, reply) => {
  try {
    const tournaments = db.prepare('SELECT * FROM tournaments').all();
    return reply.send(tournaments);
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Failed to fetch tournaments' });
  }
});

fastify.delete('/api/debug/remove-tournament-force', async (_request, reply) => {
  try {
    // First delete related data to avoid foreign key constraints
    db.prepare('DELETE FROM tournament_matches WHERE tournamentId IN (SELECT id FROM tournaments WHERE status = ?)').run('ongoing');
    db.prepare('DELETE FROM tournament_participants WHERE tournamentId IN (SELECT id FROM tournaments WHERE status = ?)').run('ongoing');
    
    // Then delete the tournaments
    const stmt = db.prepare("DELETE FROM tournaments WHERE status = 'ongoing'");
    const result = stmt.run();
    return reply.send({ deleted: result.changes });
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Failed to clean up tournaments table'});
  }
});

fastify.delete('/api/debug/remove-all-tournaments', async (_request, reply) => {
  try {
    // Delete all tournament-related data in correct order
    db.prepare('DELETE FROM tournament_matches').run();
    db.prepare('DELETE FROM tournament_participants').run();
    const stmt = db.prepare('DELETE FROM tournaments');
    const result = stmt.run();
    return reply.send({ deleted: result.changes });
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Failed to clean up all tournaments'});
  }
});

start();