import dotenv from 'dotenv';
dotenv.config();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import path from 'path';

import { authRoutes } from './routes/authRoutes';
import { userRoutes } from './routes/userRoutes';
import { friendRoutes } from './routes/friendRoutes';
import { matchRoutes } from './routes/matchRoutes';
import { tournamentRoutes } from './routes/tournamentRoutes';
import { db } from './db/database';
import { jwtMiddleware } from './jwtMiddleware';

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
fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(userRoutes, { prefix: '/api/users' });
fastify.register(friendRoutes, { prefix: '/api/users/:userId/friends' });
fastify.register(matchRoutes, { prefix: '/api/users/:userId/matches' });
fastify.register(tournamentRoutes, { prefix: '/api/tournaments' });

fastify.route({
  method: 'GET',
  url: '/api/protected',
  preHandler: jwtMiddleware,
  handler: async (request, reply) => {
    reply.send({ message: 'Protected', user: (request as any).user });
  },
});

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

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    fastify.log.info('HTTP server listening on port 3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
