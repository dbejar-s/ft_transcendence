import { FastifyInstance } from 'fastify';
import { authRoutes } from './authRoutes';
import { userRoutes } from './userRoutes';
import friendRoutes from './friendRoutes';
import { matchRoutes } from './matchRoutes';
import { tournamentRoutes } from './tournamentRoutes';
import { statsRoutes } from './statsRoutes';
import { db } from '../db/database';
import { jwtMiddleware } from '../jwtMiddleware';

export async function apiRoutes(fastify: FastifyInstance) {
  // Match routes (direct access)
  fastify.get('/matches', { preHandler: [jwtMiddleware] }, async (request, reply) => {
    const user = (request as any).user;
    if (!user) return reply.status(401).send({ message: 'Unauthorized' });

    try {
      const stmt = db.prepare(`
        SELECT 
          m.id,
          m.player1Score,
          m.player2Score,
          m.winnerId,
          m.gameMode,
          m.playedAt,
          u1.username as player1Name,
          COALESCE(u2.username, 'Guest') as player2Name,
          u1.avatar as player1Avatar,
          COALESCE(u2.avatar, '/default-avatar.svg') as player2Avatar,
          CASE
            WHEN m.player1Id = ? THEN COALESCE(u2.username, 'Guest')
            ELSE u1.username
          END as opponent,
          CASE 
            WHEN m.player1Id = ? THEN COALESCE(u2.avatar, '/default-avatar.svg')
            ELSE u1.avatar
          END as opponentAvatar,
          CASE 
            WHEN m.winnerId = ? THEN 'win'
            ELSE 'loss'
          END as result
        FROM matches m
        JOIN users u1 ON m.player1Id = u1.id
        LEFT JOIN users u2 ON m.player2Id = u2.id
        WHERE m.player1Id = ? OR (m.player2Id = ? AND m.player2Id IS NOT NULL)
        ORDER BY m.playedAt DESC
      `);
      
      const matches = stmt.all(user.id, user.id, user.id, user.id, user.id);
      reply.send(matches);
    } catch (error: any) {
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

  fastify.post('/matches', { preHandler: [jwtMiddleware] }, async (request, reply) => {
    const user = (request as any).user;
    if (!user) return reply.status(401).send({ message: 'Unauthorized' });

    const {
      player1Id,
      player1Name,
      player2Name,
      player1Score,
      player2Score,
      winnerId,
      gameMode,
      tournamentId,
      playedAt
    } = request.body as any;

    try {
      // For casual games, check if player2Name is a real user, otherwise keep player2Id as null
      let player2Id = null;
      if (player2Name && player2Name !== player1Name) {
        // Try to find existing user by name
        const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(player2Name) as any;
        if (existingUser) {
          player2Id = existingUser.id;
        }
        // If no user found, keep player2Id as null (for guests)
      }

      const stmt = db.prepare(`
        INSERT INTO matches (
          player1Id, player2Id, player1Score, player2Score, 
          winnerId, gameMode, playedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        player1Id,
        player2Id,
        player1Score,
        player2Score,
        winnerId,
        gameMode || 'Casual',
        playedAt || new Date().toISOString()
      );

      reply.status(201).send({ 
        message: 'Match saved successfully', 
        matchId: result.lastInsertRowid 
      });
    } catch (error: any) {
      console.error('Error saving match:', error);
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

  fastify.register(authRoutes, { prefix: '/auth' });
  fastify.register(userRoutes, { prefix: '/users' });
  fastify.register(friendRoutes, { prefix: '/users/:userId/friends' });
  fastify.register(matchRoutes, { prefix: '/users/:userId/matches' });
  fastify.register(tournamentRoutes, { prefix: '/tournaments' });
  fastify.register(statsRoutes, { prefix: '/stats' });
}
