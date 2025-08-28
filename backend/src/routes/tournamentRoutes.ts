import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/database';
import { jwtMiddleware } from '../jwtMiddleware';
import jwt from 'jsonwebtoken';

interface TournamentDBResult {
  id: number;
  name: string;
  gameMode: string;
  status: 'registration' | 'ongoing' | 'finished';
  maxPlayers: number;
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
}

interface Match {
  id: number;
  tournamentId: string;
  player1Id: string;
  player2Id: string;
  player1Score?: number;
  player2Score?: number;
  winnerId?: string;
  round: number;
  phase: string;
  status: 'pending' | 'finished';
  playedAt?: string;
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

interface Participant {
  id: string;
  username: string;
}

export async function tournamentRoutes(fastify: FastifyInstance) {

  // Create a tournament
  fastify.post<{ Body: Tournament }>('/', { preHandler: [jwtMiddleware] }, async (request: FastifyRequest<{ Body: Tournament }>, reply: FastifyReply) => {
    const tournament: Tournament = request.body;
    const { name, gameMode, maxPlayers, status } = tournament;

    if (!name || !gameMode) {
      return reply.status(400).send({ message: 'Name and gameMode are required' });
    }

    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO tournaments (name, gameMode, maxPlayers, status)
        VALUES (?, ?, ?, ?)
      `);
      const info = stmt.run(
        name,
        gameMode,
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
      const tournaments = db.prepare('SELECT * FROM tournaments ORDER BY id DESC').all();
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
        SELECT u.id, u.username, u.avatar, 
               COALESCE(u.isTemporary, 0) as isTemporary, 
               tp.status
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
        LEFT JOIN users u1 ON tm.player1Id = u1.id
        LEFT JOIN users u2 ON tm.player2Id = u2.id
        WHERE tm.tournamentId = ? AND tm.round = ?
        ORDER BY tm.id ASC
      `).all(id, currentRound);

      console.log(`Bracket for tournament ${id}: found ${currentMatches.length} matches for round ${currentRound}`);

      // For finished tournaments, get participants from matches
      let participants: Participant[];

      if (tournament.status === 'finished') {
        // Get unique participants from all matches
        const participantSet = new Set();
        const allTournamentMatches = db.prepare(`
          SELECT tm.*, u1.username as player1Name, u2.username as player2Name
          FROM tournament_matches tm
          LEFT JOIN users u1 ON tm.player1Id = u1.id
          LEFT JOIN users u2 ON tm.player2Id = u2.id
          WHERE tm.tournamentId = ?
        `).all(id);

        participants = [];
        allTournamentMatches.forEach((match: any) => {
          if (!participantSet.has(match.player1Id)) {
            participantSet.add(match.player1Id);
            participants.push({
              id: match.player1Id,
              username: match.player1Name || `Player ${match.player1Id}`
            });
          }
          if (!participantSet.has(match.player2Id)) {
            participantSet.add(match.player2Id);
            participants.push({
              id: match.player2Id,
              username: match.player2Name || `Player ${match.player2Id}`
            });
          }
        });
      } else {
        // Pour les tournois en cours, récupérer depuis tournament_participants
        participants = db.prepare(`
          SELECT u.id, u.username
          FROM tournament_participants tp
          LEFT JOIN users u ON tp.userId = u.id
          WHERE tp.tournamentId = ?
          ORDER BY u.username ASC
        `).all(id) as Participant[];
      }

      // Calculate current standings
      const standings = calculateStandings(id, participants);

      reply.send({ 
        tournament, 
        participants, // Make sure participants are included
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
    `).all(tournamentId) as Participant[];

    const standings = calculateStandings(tournamentId, participants);
    console.log(`Round ${currentRound} completed. Current standings:`, standings.map(s => `${s.username} (${s.points} pts, ${s.totalScore} score)`));
    
    // For 3 players tournament
    if (participants.length === 3) {
      if (currentRound === 1) {
        // Round 2: Top 2 players face each other in final
        const top2 = standings.slice(0, 2);
        console.log(`3-player tournament - creating final between top 2:`, top2.map(p => `${p.username} (${p.points} pts)`));
        
        if (top2.length >= 2) {
          const insertMatch = db.prepare(`
            INSERT INTO tournament_matches (tournamentId, player1Id, player2Id, round, phase, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
          `);
          
          insertMatch.run(tournamentId, top2[0].userId, top2[1].userId, 2, 'final');
          console.log(`✅ Final created: ${top2[0].username} vs ${top2[1].username}`);
          return { created: true, finished: false };
        }
      } else {
        // Tournament finished after round 2
        const winner = standings[0];
        const updateTournament = db.prepare(`
          UPDATE tournaments 
          SET status = 'finished', winnerId = ?
          WHERE id = ?
        `);
        updateTournament.run(winner.userId, tournamentId);
        
        console.log(`✅ 3-player tournament finished! Winner: ${winner.username}`);
        return { created: false, finished: true };
      }
    }
    
    // For 4 players tournament
    if (participants.length === 4) {
      if (currentRound === 1) {
        // Round 2: Create 2 matches based on standings
        const [first, second, third, fourth] = standings;
        console.log(`4-player tournament Round 1 results:`, standings.map(p => `${p.username}: ${p.points} pts`));
        
        const insertMatch = db.prepare(`
          INSERT INTO tournament_matches (tournamentId, player1Id, player2Id, round, phase, status)
          VALUES (?, ?, ?, ?, ?, 'pending')
        `);
        
        let matchesCreated = 0;
        
        // Winners Bracket
        insertMatch.run(tournamentId, first.userId, second.userId, 2, 'winners_bracket');
        console.log(`✅ Winners bracket created: ${first.username} (1st) vs ${second.username} (2nd)`);
        matchesCreated++;
        
        // Losers Bracket
        insertMatch.run(tournamentId, third.userId, fourth.userId, 2, 'losers_bracket');
        console.log(`✅ Losers bracket created: ${third.username} (3rd) vs ${fourth.username} (4th)`);
        matchesCreated++;
        
        return { created: matchesCreated > 0, finished: false };
        
      } else if (currentRound === 2) {
        // Round 3: Loser of Winners vs Winner of Losers

        const round2Matches = db.prepare(`
          SELECT * FROM tournament_matches 
          WHERE tournamentId = ? AND round = 2 AND status = 'finished'
        `).all(tournamentId) as any[];
        
        if (round2Matches.length !== 2) {
          console.error('Round 2 not complete or missing matches');
          return { created: false, finished: false };
        }
        
		// Identify winners and losers from round 2
        const winnersMatch = round2Matches.find(m => m.phase === 'winners_bracket');
        const losersMatch = round2Matches.find(m => m.phase === 'losers_bracket');
        
        if (!winnersMatch || !losersMatch) {
          console.error('Could not find winners or losers bracket matches');
          return { created: false, finished: false };
        }
        
        const winnersWinner = winnersMatch.winnerId;
        const winnersLoser = winnersMatch.player1Id === winnersMatch.winnerId ? winnersMatch.player2Id : winnersMatch.player1Id;
        const losersWinner = losersMatch.winnerId;
        
        // Round 3: Loser of Winners vs Winner of Losers
        const insertMatch = db.prepare(`
          INSERT INTO tournament_matches (tournamentId, player1Id, player2Id, round, phase, status)
          VALUES (?, ?, ?, ?, ?, 'pending')
        `);
        
        insertMatch.run(tournamentId, winnersLoser, losersWinner, 3, 'semifinal');
        console.log(`✅ Round 3 (Semifinal) created: Loser of Winners vs Winner of Losers`);
        
        return { created: true, finished: false };
        
      } else if (currentRound === 3) {
        // Round 4: Final: Winner of Winners vs Winner of Round 3
        
        const winnersMatch = db.prepare(`
          SELECT * FROM tournament_matches 
          WHERE tournamentId = ? AND round = 2 AND phase = 'winners_bracket' AND status = 'finished'
        `).get(tournamentId) as any;
        
        // Match from round 3 (semifinal)
        const semifinalMatch = db.prepare(`
          SELECT * FROM tournament_matches 
          WHERE tournamentId = ? AND round = 3 AND status = 'finished'
        `).get(tournamentId) as any;
        
        if (!winnersMatch || !semifinalMatch) {
          console.error('Cannot create final: missing previous round results');
          return { created: false, finished: false };
        }
        
        const winnersChampion = winnersMatch.winnerId;
        const semifinalWinner = semifinalMatch.winnerId;
        
        // Round 4: Final
        const insertMatch = db.prepare(`
          INSERT INTO tournament_matches (tournamentId, player1Id, player2Id, round, phase, status)
          VALUES (?, ?, ?, ?, ?, 'pending')
        `);
        
        insertMatch.run(tournamentId, winnersChampion, semifinalWinner, 4, 'final');
        console.log(`✅ Round 4 (Final) created: Winners Champion vs Semifinal Winner`);
        
        return { created: true, finished: false };
        
      } else {
        // Tournament finished after round 4
        const winner = standings[0];
        const updateTournament = db.prepare(`
          UPDATE tournaments 
          SET status = 'finished', winnerId = ?
          WHERE id = ?
        `);
        updateTournament.run(winner.userId, tournamentId);
        
        console.log(`✅ 4-player tournament finished after round 4! Winner: ${winner.username}`);
        return { created: false, finished: true };
      }
    }
    
   // For 5+ players - NEW POINTS-BASED SYSTEM
    if (participants.length >= 5) {
      // Check if all players have different points
      const uniquePoints = new Set(standings.map(s => s.points));
      
      if (uniquePoints.size === standings.length) {
        // All players have unique points - declare winner
        const winner = standings[0];
        const updateTournament = db.prepare(`
          UPDATE tournaments 
          SET status = 'finished', winnerId = ?
          WHERE id = ?
        `);
        updateTournament.run(winner.userId, tournamentId);
        
        console.log(`✅ Tournament finished! All players have different points. Winner: ${winner.username} with ${winner.points} points`);
        return { created: false, finished: true };
      }
      
      // Group players by points
      const pointGroups: { [points: number]: Standing[] } = {};
      standings.forEach(standing => {
        if (!pointGroups[standing.points]) {
          pointGroups[standing.points] = [];
        }
        pointGroups[standing.points].push(standing);
      });
      
      console.log('Point groups:', Object.entries(pointGroups).map(([points, players]) => 
        `${points} points: ${players.map(p => p.username).join(', ')}`
      ));
      
      // Create matches for players with same points
      const insertMatch = db.prepare(`
        INSERT INTO tournament_matches (tournamentId, player1Id, player2Id, round, phase, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `);
      
      let matchCount = 0;
      const nextRound = currentRound + 1;
      
      Object.entries(pointGroups).forEach(([points, players]) => {
        if (players.length >= 2) {
          // If odd number of players, last player gets a bye
          const pairsToCreate = Math.floor(players.length / 2);
          
          for (let i = 0; i < pairsToCreate; i++) {
            const player1 = players[i * 2];
            const player2 = players[i * 2 + 1];
            
            insertMatch.run(
              tournamentId, 
              player1.userId, 
              player2.userId, 
              nextRound, 
              `points_${points}_bracket`
            );
            
            console.log(`✅ Match created: ${player1.username} vs ${player2.username} (both have ${points} points)`);
            matchCount++;
          }

          // If odd number of players, last player gets a bye
          if (players.length % 2 === 1) {
            const byePlayer = players[players.length - 1];
            console.log(`🎯 ${byePlayer.username} gets a bye (odd number of players with ${points} points)`);
          }
        }
      });
      
      if (matchCount === 0) {
        // No matches created - all players have unique points now
        const winner = standings[0];
        const updateTournament = db.prepare(`
          UPDATE tournaments 
          SET status = 'finished', winnerId = ?
          WHERE id = ?
        `);
        updateTournament.run(winner.userId, tournamentId);
        
        console.log(`✅ Tournament finished! No more matches needed. Winner: ${winner.username}`);
        return { created: false, finished: true };
      }
      
      console.log(`Round ${nextRound} created with ${matchCount} matches (point-based system)`);
      return { created: matchCount > 0, finished: false };
    }
    
    // Fallback
    console.log(`Unexpected case: ${participants.length} participants`);
    return { created: false, finished: false };
    
  } catch (error) {
    console.error('Error creating next round:', error);
    return { created: false, finished: false };
  }
}


function calculateStandings(tournamentId: string, participants?: Participant[]): Standing[] {
  // Get all participants if not provided - avec typage explicite
  if (!participants) {
    participants = db.prepare(`
      SELECT u.id, u.username FROM tournament_participants tp
      JOIN users u ON tp.userId = u.id
      WHERE tp.tournamentId = ?
    `).all(tournamentId) as Participant[];
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

function updateUserStats(userId: string, tournamentId: string, isWinner: boolean, score: number) {
  try {
    // First, ensure user_stats table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_stats (
        userId TEXT PRIMARY KEY,
        tournaments_played INTEGER DEFAULT 0,
        tournaments_won INTEGER DEFAULT 0,
        total_score INTEGER DEFAULT 0,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // Update stats for all users
    const statsUpdate = db.prepare(`
      INSERT OR REPLACE INTO user_stats (userId, tournaments_played, tournaments_won, total_score)
      VALUES (
        ?, 
        COALESCE((SELECT tournaments_played FROM user_stats WHERE userId = ?), 0) + 1,
        COALESCE((SELECT tournaments_won FROM user_stats WHERE userId = ?), 0) + ?,
        COALESCE((SELECT total_score FROM user_stats WHERE userId = ?), 0) + ?
      )
    `);
    statsUpdate.run(userId, userId, userId, isWinner ? 1 : 0, userId, score);
    
    console.log(`Updated stats for user ${userId}: winner=${isWinner}, score=${score}`);
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
}
}
