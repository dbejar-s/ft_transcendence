import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/database';
import { generateEliminationRound } from '../services/tournamentService';
import { Tournament, TournamentParticipant } from '../types'

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
  fastify.post<{ Body: Tournament }>('/', async (request, reply) => {
    const tournament: Tournament = request.body;
    const { name, gameMode, startDate, endDate, maxPlayers } = tournament;
    
    if (!name || !gameMode) {
      return reply.status(400).send({ message: 'Name and gameMode are required' });
    }
    
    try {
      const stmt = db.prepare(`
        INSERT INTO tournaments (name, gameMode, startDate, endDate, maxPlayers)
        VALUES (?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        name, 
        gameMode, 
        startDate || null, 
        endDate || null, 
        maxPlayers || 16
      );
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

	  // Register a user to tournament
    fastify.post('/:id/register', (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { userId } = request.body as { userId: string };

      if (!userId) return reply.status(400).send({ message: 'userId is required' });

      try {
        const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id) as TournamentDBResult | undefined;
        if (!tournament) {
          return reply.status(404).send({ message: 'Tournament not found' });
        }

        if (tournament.status !== 'registration') {
          return reply.status(403).send({ message: 'Tournament is not accepting registrations' });
        }

        // Vérification du nombre de participants
        const countResult = db.prepare('SELECT COUNT(*) as count FROM ...').get(id) as CountResult;
        if (countResult.count >= tournament.maxPlayers) {
          return reply.status(403).send({ message: 'Tournament is full' });
        }

        // Insertion de l'inscription
        const stmt = db.prepare('INSERT INTO tournament_participants (tournamentId, userId) VALUES (?, ?)');
        stmt.run(id, userId);
        reply.status(201).send({ message: 'User registered' });
      } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
          return reply.status(409).send({ message: 'User already registered' });
        }
        reply.status(500).send({ message: 'Database error', error: error.message });
      }
    });

  // Unregister user
  fastify.delete('/:id/register/:userId', (request: FastifyRequest, reply: FastifyReply) => {
    const { id, userId } = request.params as any;
    try {
      const stmt = db.prepare('DELETE FROM tournament_participants WHERE tournamentId = ? AND userId = ?');
      const info = stmt.run(id, userId);
      if (info.changes === 0) return reply.status(404).send({ message: 'Registration not found' });
      reply.send({ message: 'User unregistered' });
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
}
