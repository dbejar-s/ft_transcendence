import { FastifyInstance } from 'fastify';
import { authRoutes } from './authRoutes';
import { userRoutes } from './userRoutes';
import friendRoutes from './friendRoutes';
import { matchRoutes } from './matchRoutes';
import { tournamentRoutes } from './tournamentRoutes';
import { statsRoutes } from './statsRoutes';
import { db } from '../db/database';
import { jwtMiddleware } from '../jwtMiddleware';
import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

export async function apiRoutes(fastify: FastifyInstance) {
  // Health check endpoint (no auth required)
  fastify.get('/health', async (request, reply) => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'ft_transcendence_backend',
      ssl: 'enabled'
    };
  });

  // Match routes (direct access)
  fastify.get('/matches', { preHandler: [jwtMiddleware] }, async (request, reply) => {
    const user = (request as any).user;
    if (!user) return reply.status(401).send({ message: 'Unauthorized' });

    try {
      // Get regular matches
      const regularMatchesStmt = db.prepare(`
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
          END as result,
          'regular' as matchType
        FROM matches m
        JOIN users u1 ON m.player1Id = u1.id
        LEFT JOIN users u2 ON m.player2Id = u2.id
        WHERE m.player1Id = ? OR (m.player2Id = ? AND m.player2Id IS NOT NULL)
      `);
      
      const regularMatches = regularMatchesStmt.all(user.id, user.id, user.id, user.id, user.id);
      
      // Get tournament matches (exclude manually scored matches)
      const tournamentMatchesStmt = db.prepare(`
        SELECT 
          tm.id,
          tm.player1Score,
          tm.player2Score,
          tm.winnerId,
          'Tournament' as gameMode,
          tm.playedAt,
          u1.username as player1Name,
          u2.username as player2Name,
          u1.avatar as player1Avatar,
          u2.avatar as player2Avatar,
          CASE
            WHEN tm.player1Id = ? THEN u2.username
            ELSE u1.username
          END as opponent,
          CASE 
            WHEN tm.player1Id = ? THEN u2.avatar
            ELSE u1.avatar
          END as opponentAvatar,
          CASE 
            WHEN tm.winnerId = ? THEN 'win'
            ELSE 'loss'
          END as result,
          'tournament' as matchType
        FROM tournament_matches tm
        JOIN users u1 ON tm.player1Id = u1.id
        JOIN users u2 ON tm.player2Id = u2.id
        WHERE (tm.player1Id = ? OR tm.player2Id = ?) 
          AND tm.status = 'finished' 
          AND (tm.source IS NULL OR tm.source = 'played')
      `);
      
      const tournamentMatches = tournamentMatchesStmt.all(user.id, user.id, user.id, user.id, user.id);
      
      // Combine and sort by playedAt
      const allMatches = [...regularMatches, ...tournamentMatches]
        .sort((a: any, b: any) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
      
      reply.send(allMatches);
    } catch (error: any) {
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

  fastify.post('/matches', async (request: any, reply: any) => {
    // Try to get user from JWT if token is provided, but don't require it for tournament matches
    let user = null;
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const jwtSecret = process.env.JWT_SECRET;
      if (token && jwtSecret) {
        try {
          const decoded = jwt.verify(token, jwtSecret) as any;
          user = {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email || `${decoded.username}@test.com`
          };
        } catch (err) {
          console.log('[MATCH] Invalid token provided, proceeding without auth');
        }
      }
    }

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

    console.log('[MATCH] Received match data:', {
      player1Id,
      player1Name,
      player2Name,
      player1Score,
      player2Score,
      winnerId,
      gameMode,
      tournamentId
    });

    try {
      // Find or get player1 ID
      let actualPlayer1Id = player1Id;
      if (player1Name && (!actualPlayer1Id || actualPlayer1Id === null || actualPlayer1Id === undefined)) {
        // Try to find existing user by name
        const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(player1Name) as any;
        if (existingUser) {
          actualPlayer1Id = existingUser.id;
          console.log(`[MATCH] Found player1 ID: ${actualPlayer1Id} for username: ${player1Name}`);
        } else {
          // Create a guest user for player1 if it doesn't exist
          const guestId = crypto.randomUUID();
          const createUser = db.prepare('INSERT INTO users (id, username, isTemporary) VALUES (?, ?, 1)');
          createUser.run(guestId, player1Name);
          actualPlayer1Id = guestId;
          console.log(`[MATCH] Created guest player1: ${player1Name} with ID: ${actualPlayer1Id}`);
        }
      }

      // Find or get player2 ID
      let actualPlayer2Id = null;
      if (player2Name && player2Name !== player1Name) {
        // Try to find existing user by name
        const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(player2Name) as any;
        if (existingUser) {
          actualPlayer2Id = existingUser.id;
          console.log(`[MATCH] Found player2 ID: ${actualPlayer2Id} for username: ${player2Name}`);
        } else {
          // Create a guest user for player2 if it doesn't exist
          const guestId = crypto.randomUUID();
          const createUser = db.prepare('INSERT INTO users (id, username, isTemporary) VALUES (?, ?, 1)');
          createUser.run(guestId, player2Name);
          actualPlayer2Id = guestId;
          console.log(`[MATCH] Created guest player2: ${player2Name} with ID: ${actualPlayer2Id}`);
        }
      } else if (player2Name === player1Name) {
        console.log(`[MATCH] Warning: player2Name "${player2Name}" is the same as player1Name "${player1Name}". Skipping player2.`);
      }

      console.log(`[MATCH] Debugging match data received:`);
      console.log(`[MATCH] - player1Name: "${player1Name}" -> actualPlayer1Id: ${actualPlayer1Id}`);
      console.log(`[MATCH] - player2Name: "${player2Name}" -> actualPlayer2Id: ${actualPlayer2Id}`);
      console.log(`[MATCH] - player1Score: ${player1Score} (score for ${player1Name})`);
      console.log(`[MATCH] - player2Score: ${player2Score} (score for ${player2Name})`);
      console.log(`[MATCH] - winnerId received: ${winnerId}`);
      console.log(`[MATCH] - gameMode: ${gameMode}`);
      console.log(`[MATCH] - tournamentId: ${tournamentId}`);

      console.log(`[MATCH] Final player IDs: player1=${actualPlayer1Id}, player2=${actualPlayer2Id}`);
      
      // Safety check: player1Id cannot be NULL in the database
      if (!actualPlayer1Id || actualPlayer1Id === null || actualPlayer1Id === undefined) {
        console.error('[MATCH] Error: actualPlayer1Id is null/undefined. Cannot save match without valid player1Id.');
        return reply.status(400).send({ message: 'Missing player1 information' });
      }
      
      // Determine final winner ID - first check scores, then fallback to winnerId
      let finalWinnerId = null;
      
      // Primary method: determine winner from scores
      if (player1Score !== undefined && player2Score !== undefined) {
        // Note: Due to frontend score inversion logic, we need to invert the winner determination
        // The frontend sends scores correctly but the logic needs to be inverted
        if (player2Score > player1Score) {
          finalWinnerId = actualPlayer1Id;
          console.log(`[MATCH] Winner determination: actualPlayer1 won by score (p2Score=${player2Score} > p1Score=${player1Score}), using actualPlayer1Id=${actualPlayer1Id}`);
        } else if (player1Score > player2Score) {
          finalWinnerId = actualPlayer2Id;
          console.log(`[MATCH] Winner determination: actualPlayer2 won by score (p1Score=${player1Score} > p2Score=${player2Score}), using actualPlayer2Id=${actualPlayer2Id}`);
        } else {
          // Tie - no winner
          finalWinnerId = null;
          console.log(`[MATCH] Winner determination: tie (${player1Score} = ${player2Score}), no winner`);
        }
      } 
      // Fallback method: use provided winnerId if scores don't determine winner
      else if (winnerId) {
        if (typeof winnerId === 'string' && winnerId.length > 10) {
          // Winner ID is provided as UUID (tournament matches), use it directly
          finalWinnerId = winnerId;
          console.log(`[MATCH] Winner determination: winnerId from tournament=${winnerId}`);
        } else if (winnerId === 1 || winnerId === '1') {
          // Player1 won (casual games)
          finalWinnerId = actualPlayer1Id;
          console.log(`[MATCH] Winner determination: player1 won, using actualPlayer1Id=${actualPlayer1Id}`);
        } else if (winnerId === 2 || winnerId === '2') {
          // Player2 won (casual games)
          finalWinnerId = actualPlayer2Id;
          console.log(`[MATCH] Winner determination: player2 won, using actualPlayer2Id=${actualPlayer2Id}`);
        }
      }
      console.log(`[MATCH] Final winnerId: ${finalWinnerId}`);

      // Always save to matches table for stats and match history
      const stmt = db.prepare(`
        INSERT INTO matches (
          player1Id, player2Id, player1Score, player2Score, 
          winnerId, gameMode, playedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        actualPlayer1Id,
        actualPlayer2Id,
        player1Score,
        player2Score,
        finalWinnerId,
        gameMode || 'Casual',
        playedAt || new Date().toISOString()
      );

      const matchId = result.lastInsertRowid;
      console.log(`[MATCH] Match saved with ID: ${matchId}`);

      if (tournamentId && gameMode === 'Tournament') {
        console.log(`[TOURNAMENT] Tournament match result saved to matches table for stats/history, but NOT to tournament_matches`);
      }

      reply.status(201).send({ 
        message: 'Match saved successfully', 
        matchId: matchId 
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
