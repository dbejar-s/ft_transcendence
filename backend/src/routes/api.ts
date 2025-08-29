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

// Cache for tournament events (for client polling)
const tournamentEvents = new Map<string, {
  lastUpdate: string;
  finished: boolean;
  newRound: boolean;
  message: string;
}>();

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

      console.log(`[MATCH] Final player IDs: player1=${actualPlayer1Id}, player2=${actualPlayer2Id}`);
      
      // Safety check: player1Id cannot be NULL in the database
      if (!actualPlayer1Id || actualPlayer1Id === null || actualPlayer1Id === undefined) {
        console.error('[MATCH] Error: actualPlayer1Id is null/undefined. Cannot save match without valid player1Id.');
        return reply.status(400).send({ message: 'Missing player1 information' });
      }
      
      // Determine final winner ID
      let finalWinnerId = null;
      if (winnerId) {
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

      console.log(`[MATCH] Match saved with ID: ${result.lastInsertRowid}`);

      // For tournament matches, update the tournament match record
      if (tournamentId && gameMode === 'Tournament') {
        console.log(`🏆 [TOURNAMENT] Updating tournament match for tournament ${tournamentId}`);
        console.log(`🏆 [TOURNAMENT] Looking for match between players: ${actualPlayer1Id} and ${actualPlayer2Id}`);
        
        // Find the tournament match that corresponds to this result
        const tournamentMatch = db.prepare(`
            SELECT id, round, phase, player1Id, player2Id FROM tournament_matches 
            WHERE tournamentId = ? 
            AND ((player1Id = ? AND player2Id = ?) OR (player1Id = ? AND player2Id = ?))
            AND status = 'pending'
            ORDER BY round DESC, id DESC
            LIMIT 1
          `).get(tournamentId, actualPlayer1Id, actualPlayer2Id, actualPlayer2Id, actualPlayer1Id) as any;
        
        if (tournamentMatch) {
          console.log(`🏆 [TOURNAMENT] Found tournament match:`, {
            matchId: tournamentMatch.id,
            round: tournamentMatch.round,
            phase: tournamentMatch.phase,
            originalPlayer1: tournamentMatch.player1Id,
            originalPlayer2: tournamentMatch.player2Id
          });
          
          // Determine the correct player1Score and player2Score based on tournament match player order
          let tournamentPlayer1Score, tournamentPlayer2Score;
          if (tournamentMatch.player1Id === actualPlayer1Id) {
            tournamentPlayer1Score = player1Score;
            tournamentPlayer2Score = player2Score;
          } else {
            tournamentPlayer1Score = player2Score;
            tournamentPlayer2Score = player1Score;
          }
          
          console.log(`🏆 [TOURNAMENT] Adjusted scores for tournament table:`, {
            tournamentPlayer1Score,
            tournamentPlayer2Score,
            winnerId: finalWinnerId
          });
          
          // Update the tournament match
          const updateStmt = db.prepare(`
              UPDATE tournament_matches
              SET player1Score = ?, player2Score = ?, winnerId = ?, status = 'finished', playedAt = CURRENT_TIMESTAMP
              WHERE id = ?
            `);
          updateStmt.run(tournamentPlayer1Score, tournamentPlayer2Score, finalWinnerId, tournamentMatch.id);
          
          console.log(`✅ [TOURNAMENT] Tournament match ${tournamentMatch.id} updated successfully!`);
          console.log(`✅ [TOURNAMENT] Final result: ${tournamentPlayer1Score}-${tournamentPlayer2Score}, winner: ${finalWinnerId}`);
          
          // Check if this round is complete and advance if needed
          console.log(`🔍 [TOURNAMENT] Checking if round ${tournamentMatch.round} is complete in tournament ${tournamentId}`);
          const pendingMatches = db.prepare(`
                SELECT COUNT(*) as count FROM tournament_matches 
                WHERE tournamentId = ? AND round = ? AND status = 'pending'
              `).get(tournamentId, tournamentMatch.round) as any;
          
          console.log(`📊 [TOURNAMENT] Pending matches in round ${tournamentMatch.round}: ${pendingMatches.count}`);
          
          if (pendingMatches.count === 0) {
            console.log(`🎯 [TOURNAMENT] Round ${tournamentMatch.round} completed! Triggering automatic progression...`);
            
            // Call advance-round endpoint
            try {
              const advanceResponse = await fetch(`https://localhost:3001/api/tournaments/${tournamentId}/advance-round`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completedRound: tournamentMatch.round })
              });
              
              if (advanceResponse.ok) {
                const advanceResult = await advanceResponse.json();
                console.log(`🚀 [TOURNAMENT] Advance-round successful:`, advanceResult);
                
                // Store tournament events for client polling
                tournamentEvents.set(tournamentId.toString(), {
                  lastUpdate: new Date().toISOString(),
                  finished: advanceResult.finished || false,
                  newRound: advanceResult.created || false,
                  message: advanceResult.message || 'Round completed'
                });
                console.log(`💾 [CACHE] Stored tournament event for polling:`, tournamentEvents.get(tournamentId.toString()));
              } else {
                console.error(`❌ [TOURNAMENT] Advance-round failed with status:`, advanceResponse.status);
              }
            } catch (advanceError) {
              console.error(`❌ [TOURNAMENT] Advance-round call failed:`, advanceError);
            }
          }
        } else {
          console.error(`❌ [TOURNAMENT] No matching tournament match found for players ${actualPlayer1Id} vs ${actualPlayer2Id} in tournament ${tournamentId}`);
        }
      }

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
