import { FastifyInstance } from 'fastify';
import { authRoutes } from './authRoutes';
import { userRoutes } from './userRoutes';
import friendRoutes from './friendRoutes';
import { matchRoutes } from './matchRoutes';
import { tournamentRoutes } from './tournamentRoutes';
import { statsRoutes } from './statsRoutes';

export async function apiRoutes(fastify: FastifyInstance) {
  fastify.register(authRoutes, { prefix: '/auth' });
  fastify.register(userRoutes, { prefix: '/users' });
  fastify.register(friendRoutes, { prefix: '/users/:userId/friends' });
  fastify.register(matchRoutes, { prefix: '/users/:userId/matches' });
  fastify.register(tournamentRoutes, { prefix: '/tournaments' });
  fastify.register(statsRoutes, { prefix: '/api/users/:userId/stats' });
}
