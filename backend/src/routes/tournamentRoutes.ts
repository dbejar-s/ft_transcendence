import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/database';
import { jwtMiddleware } from '../jwtMiddleware';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

interface TournamentDBResult {
  id: number;
  name: string;
  gameMode: string;
  status: 'registration' | 'ongoing' | 'finished';
  maxPlayers: number;
  startDate?: string;
  endDate?: string;
  winnerId?: string;
}

interface TournamentParticipant {
  userId: string;
  status: string;
}

interface Tournament {
  name: string;
  gameMode: string;
  status?: 'registration' | 'ongoing' | 'finished';
  maxPlayers?: number;
  startDate?: string;
  endDate?: string;
}

interface CountResult {
  count: number;
}

interface Standing {
  userId: string;
  username: string;
  wins: number;
  losses: number;
  points: number;
  totalScore: number;
  rank: number;
}

export async function tournamentRoutes(fastify: FastifyInstance) {

  // Create a tournament
  fastify.post<{ Body: Tournament }>('/', { preHandler: [jwtMiddleware] }, async (request: FastifyRequest<{ Body: Tournament }>, reply: FastifyReply) => {
    const tournament: Tournament = request.body;
    const { name, gameMode, startDate, endDate, maxPlayers, status } = tournament;

    if (!name || !gameMode) {
      return reply.status(400).send({ message: 'Name and gameMode are required' });
    }

    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO tournaments (name, gameMode, startDate, endDate, maxPlayers, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        name,
        gameMode,
        startDate || null,
        endDate || null,
        maxPlayers || 16,
        'ongoing' // Directement en mode 'ongoing' au lieu de 'registration'
      );

      // Automatically register the creator as the first participant with 'registered' status
      const creatorStmt = db.prepare('INSERT INTO tournament_participants (tournamentId, userId, status) VALUES (?, ?, ?)');
      creatorStmt.run(info.lastInsertRowid, request.user.id, 'registered');

      console.log(`Tournament ${info.lastInsertRowid} created by user ${request.user.id} (${request.user.username})`);

      reply.status(201).send({
        message: 'Tournament created',
        tournamentId: info.lastInsertRowid
      });
    } catch (error: any) {
      console.error('Error creating tournament:', error);
      reply.status(500).send({
        message: 'Database error',
        error: error.message
      });
    }
  });

  // Get all tournaments
  fastify.get('/', (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tournaments = db.prepare('SELECT * FROM tournaments ORDER BY startDate DESC').all();
      reply.send(tournaments);
    } catch (error: any) {
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

  // Get tournament participants
  fastify.get('/:id/participants', (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    
    try {
      const participants = db.prepare(`
        SELECT u.id, u.username, u.avatar, tp.status
        FROM tournament_participants tp
        JOIN users u ON tp.userId = u.id
        WHERE tp.tournamentId = ?
        ORDER BY tp.status DESC, u.username ASC
      `).all(id);

      reply.send(participants);
    } catch (error: any) {
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

  // Get tournament details with participants + matches
  fastify.get('/:id', (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id) as TournamentDBResult;
      if (!tournament) {
        return reply.status(404).send({ message: 'Tournament not found' });
      }
      const participants = db.prepare(`
        SELECT u.id, u.username, u.avatar, tp.status
        FROM tournament_participants tp
        JOIN users u ON tp.userId = u.id
        WHERE tp.tournamentId = ?
      `).all(id);
      const matches = db.prepare(`
        SELECT tm.*, u1.username as player1Name, u2.username as player2Name
        FROM tournament_matches tm
        JOIN users u1 ON tm.player1Id = u1.id
        JOIN users u2 ON tm.player2Id = u2.id
        WHERE tm.tournamentId = ?
        ORDER BY tm.round ASC, tm.id ASC
      `).all(id);

      reply.send({ tournament, participants, matches });
    } catch (error: any) {
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

  // Register a user for tournament (UNIQUE - une seule route)
  fastify.post('/:id/register', { preHandler: [jwtMiddleware] }, (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.body as { userId: string };

    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    if (!userId) {
      return reply.status(400).send({ message: 'userId is required' });
    }

    try {
      // Check if tournament exists
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id) as any;
      if (!tournament) {
        return reply.status(404).send({ message: 'Tournament not found' });
      }

      // Allow registration for ongoing tournaments (plus seulement 'registration')
      if (tournament.status === 'finished') {
        return reply.status(400).send({ message: 'Tournament is finished' });
      }

      // Check if user already registered
      const existingParticipant = db.prepare('SELECT * FROM tournament_participants WHERE tournamentId = ? AND userId = ?').get(id, userId);
      if (existingParticipant) {
        return reply.status(409).send({ message: 'User already registered for this tournament' });
      }

      // Check max participants
      const participantCount = db.prepare('SELECT COUNT(*) as count FROM tournament_participants WHERE tournamentId = ?').get(id) as { count: number };
      if (participantCount.count >= tournament.maxPlayers) {
        return reply.status(400).send({ message: 'Tournament is full' });
      }

      // Register user
      const stmt = db.prepare('INSERT INTO tournament_participants (tournamentId, userId, status) VALUES (?, ?, ?)');
      stmt.run(id, userId, 'registered');

      console.log(`User ${userId} registered for tournament ${id}`);

      reply.send({ message: 'User registered successfully' });
    } catch (error: any) {
      console.error('Error registering user:', error);
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

  // Create a match for tournament
  fastify.post('/:id/create-match', { preHandler: [jwtMiddleware] }, (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { player1Id, player2Id, round, phase } = request.body as { 
      player1Id: string; 
      player2Id: string; 
      round: number; 
      phase: string; 
    };

    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    try {
      // Create the match
      const insertMatch = db.prepare(`
        INSERT INTO tournament_matches (tournamentId, player1Id, player2Id, round, phase, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `);
      
      const info = insertMatch.run(id, player1Id, player2Id, round || 1, phase || 'round_1');
      
      console.log(`Match created: ${player1Id} vs ${player2Id} in tournament ${id}`);
      
      reply.send({ 
        message: 'Match created successfully',
        matchId: info.lastInsertRowid
      });
    } catch (error: any) {
      console.error('Error creating match:', error);
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });
  
  // Submit match result with automatic progression
  fastify.post('/:id/matches/:matchId/result', { preHandler: [jwtMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, matchId } = request.params as { id: string; matchId: string };
    const { player1Score, player2Score } = request.body as { player1Score: number; player2Score: number };

    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    if (player1Score === undefined || player2Score === undefined) {
      return reply.status(400).send({ message: 'Both player scores are required' });
    }

    try {
      // Get match details
      const match = db.prepare(`
        SELECT * FROM tournament_matches 
        WHERE id = ? AND tournamentId = ?
      `).get(matchId, id) as any;

      if (!match) {
        return reply.status(404).send({ message: 'Match not found' });
      }

      if (match.status !== 'pending') {
        return reply.status(400).send({ message: 'Match is not pending' });
      }

      const winnerId = player1Score > player2Score ? match.player1Id : 
                      player2Score > player1Score ? match.player2Id : null;

      // Update match result
      const updateMatch = db.prepare(`
        UPDATE tournament_matches
        SET player1Score = ?, player2Score = ?, winnerId = ?, status = 'finished', playedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateMatch.run(player1Score, player2Score, winnerId, matchId);

      // Check if current round is complete
      const pendingMatches = db.prepare(`
        SELECT COUNT(*) as count FROM tournament_matches 
        WHERE tournamentId = ? AND round = ? AND status = 'pending'
      `).get(id, match.round) as CountResult;

      let nextRoundCreated = false;
      let tournamentFinished = false;

      if (pendingMatches.count === 0) {
        // Current round is complete, check if we should create next round
        const result = await createNextRound(id, match.round);
        nextRoundCreated = result.created;
        tournamentFinished = result.finished;
      }

      reply.send({ 
        message: 'Match result submitted successfully',
        matchId: matchId,
        winnerId: winnerId,
        nextRoundCreated: nextRoundCreated,
        tournamentFinished: tournamentFinished
      });
    } catch (error: any) {
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

  // Get tournament bracket with current standings
  fastify.get('/:id/bracket', (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id) as TournamentDBResult | undefined;
      if (!tournament) {
        return reply.status(404).send({ message: 'Tournament not found' });
      }

      // Get current round matches
      const currentRound = getCurrentRound(id);
      const currentMatches = db.prepare(`
        SELECT tm.*, 
               u1.username as player1Name, 
               u2.username as player2Name
        FROM tournament_matches tm
        JOIN users u1 ON tm.player1Id = u1.id
        JOIN users u2 ON tm.player2Id = u2.id
        WHERE tm.tournamentId = ? AND tm.round = ?
        ORDER BY tm.id ASC
      `).all(id, currentRound);

      console.log(`Bracket for tournament ${id}: found ${currentMatches.length} matches for round ${currentRound}`);

      const participants = db.prepare(`
        SELECT u.id, u.username, u.avatar, tp.status
        FROM tournament_participants tp
        JOIN users u ON tp.userId = u.id
        WHERE tp.tournamentId = ?
        ORDER BY tp.status DESC, u.username ASC
      `).all(id);

      // Calculate current standings
      const standings = calculateStandings(id, participants);

      reply.send({ 
        tournament, 
        participants,
        standings,
        currentRound,
        currentMatches,
        totalRounds: getTotalRounds(id)
      });
    } catch (error: any) {
      console.error('Error getting bracket:', error);
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

  // Get my matches for a player
  fastify.get('/:id/my-matches', { preHandler: [jwtMiddleware] }, (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    try {
      const matches = db.prepare(`
        SELECT tm.*, 
               u1.username as player1Name, 
               u2.username as player2Name,
               t.name as tournamentName,
               t.status as tournamentStatus
        FROM tournament_matches tm
        JOIN users u1 ON tm.player1Id = u1.id
        JOIN users u2 ON tm.player2Id = u2.id
        JOIN tournaments t ON tm.tournamentId = t.id
        WHERE tm.tournamentId = ? 
        AND (tm.player1Id = ? OR tm.player2Id = ?)
        AND tm.status = 'pending'
        ORDER BY tm.round ASC, tm.id ASC
      `).all(id, request.user.id, request.user.id);

      reply.send(matches);
    } catch (error: any) {
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

  // Delete tournament
  fastify.delete('/:id', { preHandler: [jwtMiddleware] }, (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id) as TournamentDBResult | undefined;
      if (!tournament) {
        return reply.status(404).send({ message: 'Tournament not found' });
      }

      // Delete all related data in correct order (due to foreign key constraints)
      db.prepare('DELETE FROM tournament_matches WHERE tournamentId = ?').run(id);
      db.prepare('DELETE FROM tournament_participants WHERE tournamentId = ?').run(id);
      db.prepare('DELETE FROM tournaments WHERE id = ?').run(id);

      reply.send({ message: 'Tournament deleted successfully' });
    } catch (error: any) {
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

  // temporary DEBUG
  fastify.post('/debug/generate-token', (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, username } = request.body as { userId: string; username: string };
    
    if (!userId || !username) {
      return reply.status(400).send({ message: 'userId and username required' });
    }
    
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return reply.status(500).send({ message: 'JWT_SECRET not configured' });
    }
    
    const payload = {
      id: userId,
      username: username,
      email: `${username}@test.com`
    };
    
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '24h' });
    
    reply.send({
      message: 'Token generated',
      token: token,
      payload: payload,
      expiresIn: '24h'
    });
  });

  // DEBUG
  fastify.get('/debug/token', { preHandler: [jwtMiddleware] }, (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ 
      message: 'Token valid', 
      user: request.user,
      timestamp: new Date().toISOString()
    });
  });
}

// Helper functions
function getCurrentRound(tournamentId: string): number {
  const currentRound = db.prepare(`
    SELECT MAX(round) as maxRound FROM tournament_matches 
    WHERE tournamentId = ?
  `).get(tournamentId) as { maxRound: number };
  
  return currentRound.maxRound || 1;
}

function getTotalRounds(tournamentId: string): number {
  const totalRounds = db.prepare(`
    SELECT MAX(round) as maxRound FROM tournament_matches 
    WHERE tournamentId = ?
  `).get(tournamentId) as { maxRound: number };
  
  return totalRounds.maxRound || 1;
}

async function createNextRound(tournamentId: string, currentRound: number): Promise<{created: boolean, finished: boolean}> {
  try {
    // Get current standings
    const participants = db.prepare(`
      SELECT u.id, u.username FROM tournament_participants tp
      JOIN users u ON tp.userId = u.id
      WHERE tp.tournamentId = ?
    `).all(tournamentId);

    const standings = calculateStandings(tournamentId, participants);
    
    // Check if we should finish the tournament (after several rounds)
    if (currentRound >= 3 || standings.length <= 2) {
      // Finish tournament - winner is top of standings
      const winner = standings[0];
      const updateTournament = db.prepare(`
        UPDATE tournaments 
        SET status = 'finished', winnerId = ?, endDate = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      updateTournament.run(winner.userId, tournamentId);
      
      console.log(`Tournament ${tournamentId} finished! Winner: ${winner.username}`);
      return { created: false, finished: true };
    }

    // Create next round based on current standings
    const nextRound = currentRound + 1;
    const half = Math.ceil(standings.length / 2);
    
    // Dividing players into winners and losers brackets
    const winners = standings.slice(0, half);
    const losers = standings.slice(half);

    console.log(`Creating Round ${nextRound}:`);
    console.log(`Winners (${winners.length}):`, winners.map(w => w.username));
    console.log(`Losers (${losers.length}):`, losers.map(l => l.username));

    const insertMatch = db.prepare(`
      INSERT INTO tournament_matches (tournamentId, player1Id, player2Id, round, phase, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `);

    let matchCount = 0;

    // 1. WINNERS BRACKET 
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        insertMatch.run(
          tournamentId, 
          winners[i].userId, 
          winners[i + 1].userId, 
          nextRound, 
          'winners_bracket'
        );
        matchCount++;
        console.log(`Winners match: ${winners[i].username} vs ${winners[i + 1].username}`);
      }
    }

    // 2. LOSERS BRACKET 
    for (let i = 0; i < losers.length; i += 2) {
      if (i + 1 < losers.length) {
        insertMatch.run(
          tournamentId, 
          losers[i].userId, 
          losers[i + 1].userId, 
          nextRound, 
          'losers_bracket'
        );
        matchCount++;
        console.log(`Losers match: ${losers[i].username} vs ${losers[i + 1].username}`);
      }
    }

    // 3. CROSSOVER MATCH if odd number of winners
    if (winners.length % 2 === 1 && losers.length > 0) {
      const lastWinner = winners[winners.length - 1];
      const bestLoser = losers[0]; // Le meilleur des losers
      
      insertMatch.run(
        tournamentId, 
        lastWinner.userId, 
        bestLoser.userId, 
        nextRound, 
        'crossover_match'
      );
      matchCount++;
      console.log(`Crossover match: ${lastWinner.username} (winner) vs ${bestLoser.username} (best loser)`);
    }
    
    // 4. Automatic advancement if odd number of losers
    if (losers.length % 2 === 1 && winners.length % 2 === 0) {
      console.log(`${losers[losers.length - 1].username} advances automatically (odd number of losers)`);
    }

    console.log(`Round ${nextRound} created with ${matchCount} matches`);
    return { created: matchCount > 0, finished: false };
  } catch (error) {
    console.error('Error creating next round:', error);
    return { created: false, finished: false };
  }
}

function calculateStandings(tournamentId: string, participants?: any[]): Standing[] {
  // Get all participants if not provided
  if (!participants) {
    participants = db.prepare(`
      SELECT u.id, u.username FROM tournament_participants tp
      JOIN users u ON tp.userId = u.id
      WHERE tp.tournamentId = ?
    `).all(tournamentId);
  }

  // Calculate wins, losses, and points for each participant
  const standings = participants.map(participant => {
    const wins = db.prepare(`
      SELECT COUNT(*) as count FROM tournament_matches 
      WHERE tournamentId = ? AND winnerId = ?
    `).get(tournamentId, participant.id) as { count: number };

    const losses = db.prepare(`
      SELECT COUNT(*) as count FROM tournament_matches 
      WHERE tournamentId = ? AND (player1Id = ? OR player2Id = ?) AND winnerId != ? AND winnerId IS NOT NULL
    `).get(tournamentId, participant.id, participant.id, participant.id) as { count: number };

    const totalScore = db.prepare(`
      SELECT 
        SUM(CASE WHEN player1Id = ? THEN player1Score ELSE player2Score END) as score
      FROM tournament_matches 
      WHERE tournamentId = ? AND (player1Id = ? OR player2Id = ?) AND status = 'finished'
    `).get(tournamentId, participant.id, participant.id, participant.id) as { score: number };

    return {
      userId: participant.id,
      username: participant.username,
      wins: wins.count,
      losses: losses.count,
      points: wins.count * 3, // 3 points per win
      totalScore: totalScore.score || 0,
      rank: 0 // Will be set after sorting
    };
  });

  // Sort by points, then by total score
  const sortedStandings = standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.totalScore - a.totalScore;
  });

  // Add rank
  sortedStandings.forEach((standing, index) => {
    standing.rank = index + 1;
  });

  return sortedStandings;
}