import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/database';
import { generateEliminationRound } from '../services/tournamentService';
import { Tournament, TournamentParticipant } from '../types';
import { jwtMiddleware } from '../jwtMiddleware';

interface TournamentDBResult extends Tournament {
  id: number;
  name: string;
  gameMode: string;
  status: 'registration' | 'group' | 'elimination' | 'finished';
  maxPlayers: number;
  startDate?: string;
  endDate?: string;
  winnerId?: string;
}

interface CountResult {
  count: number;
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
		status || 'registration'
		);

		// Automatically register the creator as the first participant
		const creatorStmt = db.prepare('INSERT INTO tournament_participants (tournamentId, userId) VALUES (?, ?)');
		creatorStmt.run(info.lastInsertRowid, request.user.id);

		reply.status(201).send({
		message: 'Tournament created',
		tournamentId: info.lastInsertRowid
		});
	} catch (error: any) {
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

  // Get tournament details with participants + matches
  fastify.get('/:id', (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id) as Tournament;
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

  // Register a user for tournament
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

      if (tournament.status !== 'registration') {
        return reply.status(400).send({ message: 'Tournament is not open for registration' });
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

      reply.send({ message: 'User registered successfully' });
    } catch (error: any) {
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

  // Unregister a user from tournament
  fastify.delete('/:id/register/:userId', { preHandler: [jwtMiddleware] }, (request: FastifyRequest, reply: FastifyReply) => {
    const { id, userId } = request.params as { id: string; userId: string };

    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    try {
      // Check if tournament exists
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id) as any;
      if (!tournament) {
        return reply.status(404).send({ message: 'Tournament not found' });
      }

      if (tournament.status !== 'registration') {
        return reply.status(400).send({ message: 'Cannot unregister from tournament that is not in registration phase' });
      }

      // Check if user is registered
      const participant = db.prepare('SELECT * FROM tournament_participants WHERE tournamentId = ? AND userId = ?').get(id, userId);
      if (!participant) {
        return reply.status(404).send({ message: 'User not registered for this tournament' });
      }

      // Only allow users to unregister themselves (unless admin)
      if (request.user.id !== userId) {
        return reply.status(403).send({ message: 'You can only unregister yourself' });
      }

      // Unregister user
      const stmt = db.prepare('DELETE FROM tournament_participants WHERE tournamentId = ? AND userId = ?');
      stmt.run(id, userId);

      reply.send({ message: 'User unregistered successfully' });
    } catch (error: any) {
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });


    // Add or update a match result (admin action)
  fastify.post('/:id/matches', (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const { matchId, player1Id, player2Id, player1Score, player2Score, round, status } = request.body as any;

    if (!player1Id || !player2Id || player1Score === undefined || player2Score === undefined || !round) {
      return reply.status(400).send({ message: 'Missing match data' });
    }

    const winnerId = player1Score > player2Score ? player1Id : player2Score > player1Score ? player2Id : null;
    const playedAt = new Date().toISOString();

    try {
      if (matchId) {
        // Update existing match
        const stmt = db.prepare(`
          UPDATE tournament_matches
          SET player1Score = ?, player2Score = ?, winnerId = ?, round = ?, status = ?, playedAt = ?
          WHERE id = ? AND tournamentId = ?
        `);
        stmt.run(player1Score, player2Score, winnerId, round, status || 'finished', playedAt, matchId, id);
        reply.send({ message: 'Match updated' });
      } else {
        // Insert new match
        const stmt = db.prepare(`
          INSERT INTO tournament_matches (tournamentId, player1Id, player2Id, player1Score, player2Score, winnerId, round, status, playedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(id, player1Id, player2Id, player1Score, player2Score, winnerId, round, status || 'finished', playedAt);
        reply.status(201).send({ message: 'Match created', matchId: info.lastInsertRowid });
      }
    } catch (error: any) {
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

  // Delete a match (admin)
  fastify.delete('/:id/matches/:matchId', (request: FastifyRequest, reply: FastifyReply) => {
    const { id, matchId } = request.params as any;
    try {
      const stmt = db.prepare('DELETE FROM tournament_matches WHERE id = ? AND tournamentId = ?');
      const info = stmt.run(matchId, id);
      if (info.changes === 0) return reply.status(404).send({ message: 'Match not found' });
      reply.send({ message: 'Match deleted' });
    } catch (error: any) {
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });


  // Update tournament phase or winner
  fastify.put('/:id', (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const { status, phase, winnerId, endDate } = request.body as any;

    const setClauses = [];
    const params = [];

    if (status) {
      setClauses.push('status = ?');
      params.push(status);
    }
    if (phase) {
      setClauses.push('phase = ?');
      params.push(phase);
    }
    if (winnerId) {
      setClauses.push('winnerId = ?');
      params.push(winnerId);
    }
    if (endDate) {
      setClauses.push('endDate = ?');
      params.push(endDate);
    }

    if (setClauses.length === 0) {
      return reply.status(400).send({ message: 'Nothing to update' });
    }

    try {
      const stmt = db.prepare(`UPDATE tournaments SET ${setClauses.join(', ')} WHERE id = ?`);
      stmt.run(...params, id);
      reply.send({ message: 'Tournament updated' });
    } catch (error: any) {
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

  // Generate elimination round matches
  fastify.post('/:id/generate-round', (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { round } = request.body as { round: number };

    if (typeof round !== 'number') {
      return reply.status(400).send({ message: 'Round number is required and must be a number' });
    }

    try {
      const participants = db.prepare(`
        SELECT userId FROM tournament_participants 
        WHERE tournamentId = ? AND status = 'registered'
      `).all(id) as TournamentParticipant[];

      generateEliminationRound(Number(id), round, participants);
      reply.send({ message: `Round ${round} generated for tournament ${id}` });
    } catch (error: any) {
      reply.status(400).send({ message: error.message });
    }
  });

  // Initiate tournament (start the bracket generation and matchmaking)
  fastify.post('/:id/initiate', { preHandler: [jwtMiddleware] }, (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id) as TournamentDBResult | undefined;
      if (!tournament) {
        return reply.status(404).send({ message: 'Tournament not found' });
      }

      // Check if user is the creator
      const creatorCheck = db.prepare(`
        SELECT userId FROM tournament_participants 
        WHERE tournamentId = ? 
        ORDER BY rowid ASC 
        LIMIT 1
      `).get(id) as { userId: string } | undefined;

      if (!creatorCheck || creatorCheck.userId !== request.user.id) {
        return reply.status(403).send({ message: 'Only tournament creator can initiate the tournament' });
      }

      if (tournament.status !== 'registration') {
        return reply.status(400).send({ message: 'Tournament must be in registration status to initiate' });
      }

      // Check minimum participants
      const participantCount = db.prepare('SELECT COUNT(*) as count FROM tournament_participants WHERE tournamentId = ?').get(id) as CountResult;
      if (participantCount.count < 2) {
        return reply.status(400).send({ message: 'At least 2 participants required to initiate tournament' });
      }

      // Generate initial bracket/matches
      const participants = db.prepare(`
        SELECT userId FROM tournament_participants 
        WHERE tournamentId = ? AND status = 'registered'
        ORDER BY rowid ASC
      `).all(id) as TournamentParticipant[];

      // Create first round matches
      const insertMatch = db.prepare(`
        INSERT INTO tournament_matches (tournamentId, player1Id, player2Id, round, status)
        VALUES (?, ?, ?, ?, 'pending')
      `);

      let matchCount = 0;
      for (let i = 0; i < participants.length; i += 2) {
        if (i + 1 < participants.length) {
          insertMatch.run(id, participants[i].userId, participants[i + 1].userId, 1);
          matchCount++;
        } else {
          // Odd number of participants - this player gets a bye to next round
          const updateParticipant = db.prepare(`
            UPDATE tournament_participants 
            SET status = 'advanced' 
            WHERE tournamentId = ? AND userId = ?
          `);
          updateParticipant.run(id, participants[i].userId);
        }
      }

      // Update tournament status
      const updateTournament = db.prepare(`
        UPDATE tournaments 
        SET status = 'ongoing', startDate = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      updateTournament.run(id);

      reply.send({ 
        message: 'Tournament initiated successfully',
        tournamentId: id,
        matchesCreated: matchCount,
        totalParticipants: participants.length
      });
    } catch (error: any) {
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

  // Get available matches for a player (matchmaking)
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

  // Submit match result
  fastify.post('/:id/matches/:matchId/result', { preHandler: [jwtMiddleware] }, (request: FastifyRequest, reply: FastifyReply) => {
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

      // Verify the user is one of the players in this match
      if (match.player1Id !== request.user.id && match.player2Id !== request.user.id) {
        return reply.status(403).send({ message: 'You are not a participant in this match' });
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

      // Check if this was the last match of the round
      const pendingMatches = db.prepare(`
        SELECT COUNT(*) as count FROM tournament_matches 
        WHERE tournamentId = ? AND round = ? AND status = 'pending'
      `).get(id, match.round) as CountResult;

      let nextRoundCreated = false;
      if (pendingMatches.count === 0) {
        // All matches in this round are complete, create next round
        const winners = db.prepare(`
          SELECT winnerId FROM tournament_matches 
          WHERE tournamentId = ? AND round = ? AND winnerId IS NOT NULL
        `).all(id, match.round) as Array<{ winnerId: string }>;

        // Add players who got a bye
        const byePlayers = db.prepare(`
          SELECT userId FROM tournament_participants 
          WHERE tournamentId = ? AND status = 'advanced'
        `).all(id) as Array<{ userId: string }>;

        const nextRoundPlayers = [...winners.map(w => w.winnerId), ...byePlayers.map(p => p.userId)];

        if (nextRoundPlayers.length > 1) {
          // Create next round matches
          const insertNextMatch = db.prepare(`
            INSERT INTO tournament_matches (tournamentId, player1Id, player2Id, round, status)
            VALUES (?, ?, ?, ?, 'pending')
          `);

          // Reset advanced status
          db.prepare(`
            UPDATE tournament_participants 
            SET status = 'registered' 
            WHERE tournamentId = ? AND status = 'advanced'
          `).run(id);

          for (let i = 0; i < nextRoundPlayers.length; i += 2) {
            if (i + 1 < nextRoundPlayers.length) {
              insertNextMatch.run(id, nextRoundPlayers[i], nextRoundPlayers[i + 1], match.round + 1);
            } else {
              // Bye to next round
              db.prepare(`
                UPDATE tournament_participants 
                SET status = 'advanced' 
                WHERE tournamentId = ? AND userId = ?
              `).run(id, nextRoundPlayers[i]);
            }
          }
          nextRoundCreated = true;
        } else if (nextRoundPlayers.length === 1) {
          // Tournament finished, we have a winner
          const updateTournament = db.prepare(`
            UPDATE tournaments 
            SET status = 'finished', winnerId = ?, endDate = CURRENT_TIMESTAMP 
            WHERE id = ?
          `);
          updateTournament.run(nextRoundPlayers[0], id);

          // Update winner status
          db.prepare(`
            UPDATE tournament_participants 
            SET status = 'winner' 
            WHERE tournamentId = ? AND userId = ?
          `).run(id, nextRoundPlayers[0]);
        }
      }

      reply.send({ 
        message: 'Match result submitted successfully',
        matchId: matchId,
        winnerId: winnerId,
        nextRoundCreated: nextRoundCreated
      });
    } catch (error: any) {
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

  // Get tournament bracket/standings
  fastify.get('/:id/bracket', (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id) as TournamentDBResult | undefined;
      if (!tournament) {
        return reply.status(404).send({ message: 'Tournament not found' });
      }

      const matches = db.prepare(`
        SELECT tm.*, 
               u1.username as player1Name, 
               u2.username as player2Name
        FROM tournament_matches tm
        JOIN users u1 ON tm.player1Id = u1.id
        JOIN users u2 ON tm.player2Id = u2.id
        WHERE tm.tournamentId = ?
        ORDER BY tm.round ASC, tm.id ASC
      `).all(id);

      const participants = db.prepare(`
        SELECT u.id, u.username, u.avatar, tp.status
        FROM tournament_participants tp
        JOIN users u ON tp.userId = u.id
        WHERE tp.tournamentId = ?
        ORDER BY tp.status DESC, u.username ASC
      `).all(id);

      reply.send({ 
        tournament, 
        matches, 
        participants,
        bracket: organizeBracket(matches)
      });
    } catch (error: any) {
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

  // Finalize tournament and save results
  fastify.post('/:id/finalize', { preHandler: [jwtMiddleware] }, (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { winnerId, results } = request.body as { winnerId: string; results: Array<{ userId: string; score: number; rank: number }> };

    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    if (!winnerId) {
      return reply.status(400).send({ message: 'winnerId is required' });
    }

    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id) as TournamentDBResult | undefined;
      if (!tournament) {
        return reply.status(404).send({ message: 'Tournament not found' });
      }

      // Check if user is the creator (first participant) or admin
      const creatorCheck = db.prepare(`
        SELECT userId FROM tournament_participants 
        WHERE tournamentId = ? 
        ORDER BY rowid ASC 
        LIMIT 1
      `).get(id) as { userId: string } | undefined;

      if (!creatorCheck || creatorCheck.userId !== request.user.id) {
        return reply.status(403).send({ message: 'Only tournament creator can finalize the tournament' });
      }

      // Update tournament status and set winner
      const updateTournament = db.prepare(`
        UPDATE tournaments 
        SET status = 'finished', winnerId = ?, endDate = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      updateTournament.run(winnerId, id);

      // Update participant statuses based on results
      if (results && results.length > 0) {
        const updateParticipant = db.prepare(`
          UPDATE tournament_participants 
          SET status = ? 
          WHERE tournamentId = ? AND userId = ?
        `);

        for (const result of results) {
          const status = result.userId === winnerId ? 'winner' : 'eliminated';
          updateParticipant.run(status, id, result.userId);
        }

        // Save final match records to regular matches table for statistics
        const insertMatch = db.prepare(`
          INSERT INTO matches (player1Id, player2Id, player1Score, player2Score, winnerId, gameMode, playedAt)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

        // Create a final summary match for each participant vs tournament
        for (const result of results) {
          insertMatch.run(
            result.userId, 
            winnerId, 
            result.score, 
            results.find(r => r.userId === winnerId)?.score || 0,
            winnerId,
            tournament.gameMode
          );
        }
      }

      reply.send({ 
        message: 'Tournament finalized successfully',
        tournamentId: id,
        winnerId: winnerId
      });
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

      // Check if user is the creator (first participant) or admin
      const creatorCheck = db.prepare(`
        SELECT userId FROM tournament_participants 
        WHERE tournamentId = ? 
        ORDER BY rowid ASC 
        LIMIT 1
      `).get(id) as { userId: string } | undefined;

      if (!creatorCheck || creatorCheck.userId !== request.user.id) {
        return reply.status(403).send({ message: 'Only tournament creator can delete the tournament' });
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
}

// Helper function to organize matches into bracket format
function organizeBracket(matches: any[]): any {
  const rounds: { [key: number]: any[] } = {};
  
  matches.forEach(match => {
    if (!rounds[match.round]) {
      rounds[match.round] = [];
    }
    rounds[match.round].push(match);
  });

  return rounds;
}
