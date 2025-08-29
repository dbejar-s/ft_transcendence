import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../db/database'
import { jwtMiddleware } from '../jwtMiddleware'

export async function statsRoutes(fastify: FastifyInstance) {
  fastify.get('/:userId', { preHandler: [jwtMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as { userId: string }
    
    console.log(`[STATS] Getting stats for userId: ${userId} (length: ${userId.length})`);

    try {
      // --- Stats globales ---
      console.log(`[STATS] Executing totalGames query for userId: ${userId}`);
      
      // Count regular matches
      const totalRegularGamesStmt = db.prepare(`
        SELECT COUNT(*) as total FROM matches
        WHERE player1Id = ? OR player2Id = ?
      `);
      const totalRegularGamesRow = totalRegularGamesStmt.get(userId, userId) as { total: number };
      
      // Count tournament matches
      const totalTournamentGamesStmt = db.prepare(`
        SELECT COUNT(*) as total FROM tournament_matches
        WHERE (player1Id = ? OR player2Id = ?) AND status = 'finished'
      `);
      const totalTournamentGamesRow = totalTournamentGamesStmt.get(userId, userId) as { total: number };
      
      const totalGames = (totalRegularGamesRow?.total ?? 0) + (totalTournamentGamesRow?.total ?? 0);
      console.log(`[STATS] totalGames result: ${totalGames} (regular: ${totalRegularGamesRow?.total}, tournament: ${totalTournamentGamesRow?.total})`);

      console.log(`[STATS] Executing wins query for userId: ${userId}`);
      
      // Count regular wins
      const regularWinsStmt = db.prepare(`
        SELECT COUNT(*) as wins FROM matches
        WHERE winnerId = ?
      `);
      const regularWinsRow = regularWinsStmt.get(userId) as { wins: number };
      
      // Count tournament wins
      const tournamentWinsStmt = db.prepare(`
        SELECT COUNT(*) as wins FROM tournament_matches
        WHERE winnerId = ? AND status = 'finished'
      `);
      const tournamentWinsRow = tournamentWinsStmt.get(userId) as { wins: number };
      
      const wins = (regularWinsRow?.wins ?? 0) + (tournamentWinsRow?.wins ?? 0);
      console.log(`[STATS] wins result: ${wins} (regular: ${regularWinsRow?.wins}, tournament: ${tournamentWinsRow?.wins})`);

      // Estimate play time based on number of games (assuming ~3 minutes per game)
      const estimatedPlayTimeMinutes = totalGames * 3
      const playTime = estimatedPlayTimeMinutes * 60 // Convert to seconds for consistency

      console.log(`[STATS] Executing lastMatches query for userId: ${userId}`);
      
      // Get last matches from both regular and tournament matches
      const lastRegularMatchesStmt = db.prepare(`
        SELECT winnerId, playedAt, 'regular' as matchType FROM matches
        WHERE player1Id = ? OR player2Id = ?
      `);
      const lastRegularMatches = lastRegularMatchesStmt.all(userId, userId) as { winnerId: string | null, playedAt: string, matchType: string }[];
      
      const lastTournamentMatchesStmt = db.prepare(`
        SELECT winnerId, playedAt, 'tournament' as matchType FROM tournament_matches
        WHERE (player1Id = ? OR player2Id = ?) AND status = 'finished'
      `);
      const lastTournamentMatches = lastTournamentMatchesStmt.all(userId, userId) as { winnerId: string | null, playedAt: string, matchType: string }[];
      
      // Combine and sort by playedAt
      const allMatches = [...lastRegularMatches, ...lastTournamentMatches]
        .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
      
      console.log(`[STATS] lastMatches result: ${allMatches.length} total matches (${lastRegularMatches.length} regular, ${lastTournamentMatches.length} tournament)`);

      let currentStreak = 0
      for (const match of allMatches) {
        if (match.winnerId === userId) currentStreak++
        else break
      }

      // --- Stats par mode de jeu ---
      type ModeStat = { mode: string; games: number; wins: number }
      const modes: ModeStat[] = []

      console.log(`[STATS] Executing modes query for userId: ${userId}`);
      
      // Get mode stats from regular matches
      const regularModeStmt = db.prepare(`
        SELECT gameMode,
               CASE 
                 WHEN winnerId = ? THEN 'win'
                 ELSE 'loss'
               END as result
        FROM matches
        WHERE player1Id = ? OR player2Id = ?
      `);
      const regularModeRows = regularModeStmt.all(userId, userId, userId) as { gameMode: string; result: 'win' | 'loss'}[];
      
      // Get tournament matches and treat them as "Tournament" mode
      const tournamentModeStmt = db.prepare(`
        SELECT 'Tournament' as gameMode,
               CASE 
                 WHEN winnerId = ? THEN 'win'
                 ELSE 'loss'
               END as result
        FROM tournament_matches
        WHERE (player1Id = ? OR player2Id = ?) AND status = 'finished'
      `);
      const tournamentModeRows = tournamentModeStmt.all(userId, userId, userId) as { gameMode: string; result: 'win' | 'loss'}[];
      
      // Combine all mode data
      const allModeRows = [...regularModeRows, ...tournamentModeRows];
      console.log(`[STATS] modeRows result: ${allModeRows.length} total (${regularModeRows.length} regular, ${tournamentModeRows.length} tournament)`);

      const modeMap = new Map<string, { games: number; wins: number }>()
      for (const row of allModeRows) {
        const stats = modeMap.get(row.gameMode) ?? { games: 0, wins: 0 }
        stats.games++
        if (row.result === 'win') stats.wins++
        modeMap.set(row.gameMode, stats)
      }

      for (const [mode, data] of modeMap) {
        modes.push({ mode, games: data.games, wins: data.wins })
      }

      console.log(`[STATS] Final stats result:`, { totalGames, wins, playTime, currentStreak, modes });

      reply.send({ totalGames, wins, playTime, currentStreak, modes })
    } catch (error: any) {
      console.error(`[STATS] Error in stats route:`, error);
      reply.status(500).send({ message: 'Database error', error: error.message })
    }
  })
}

