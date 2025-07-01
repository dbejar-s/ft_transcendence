import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import path from 'path';
import { authRoutes } from './routes/authRoutes';
import { userRoutes } from './routes/userRoutes';
import { friendRoutes } from './routes/friendRoutes';
import { matchRoutes } from './routes/matchRoutes';
import { db } from './db/database';

// Initialize Fastify server
const fastify = Fastify({
  logger: true, // Enables logging for development
});

// Register CORS plugin to allow requests from our frontend
fastify.register(cors, {
  origin: '*', // In production, you should restrict this to your frontend's domain
});

// Register multipart plugin to handle file uploads (for avatars)
fastify.register(multipart);

// Serve static files (like avatars) from the 'uploads' directory
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '..', 'uploads'),
  prefix: '/uploads/',
});


// Register our API routes
fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(userRoutes, { prefix: '/api/users' });
fastify.register(friendRoutes, { prefix: '/api/users/:userId/friends' });
fastify.register(matchRoutes, { prefix: '/api/users/:userId/matches' });

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

// Listen for shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    fastify.log.info(`Server listening on port 3001`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();