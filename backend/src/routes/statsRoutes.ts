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
      const totalGamesStmt = db.prepare(`
        SELECT COUNT(*) as total FROM matches
        WHERE player1Id = ? OR player2Id = ?
      `);
      const totalGamesRow = totalGamesStmt.get(userId, userId) as { total: number };
      console.log(`[STATS] totalGamesRow result:`, totalGamesRow);

      const totalGames = totalGamesRow?.total ?? 0

      console.log(`[STATS] Executing wins query for userId: ${userId}`);
      const winsStmt = db.prepare(`
        SELECT COUNT(*) as wins FROM matches
        WHERE winnerId = ?
      `);
      const winsRow = winsStmt.get(userId) as { wins: number };
      console.log(`[STATS] winsRow result:`, winsRow);

      const wins = winsRow?.wins ?? 0

      // Estimate play time based on number of games (assuming ~3 minutes per game)
      const estimatedPlayTimeMinutes = totalGames * 3
      const playTime = estimatedPlayTimeMinutes * 60 // Convert to seconds for consistency

      console.log(`[STATS] Executing lastMatches query for userId: ${userId}`);
      const lastMatchesStmt = db.prepare(`
        SELECT winnerId FROM matches
        WHERE player1Id = ? OR player2Id = ?
        ORDER BY playedAt DESC
      `);
      const lastMatches = lastMatchesStmt.all(userId, userId) as { winnerId: string | null }[];
      console.log(`[STATS] lastMatches result:`, lastMatches);

      let currentStreak = 0
      for (const match of lastMatches) {
        if (match.winnerId === userId) currentStreak++
        else break
      }

      // --- Stats par mode de jeu ---
      type ModeStat = { mode: string; games: number; wins: number }
      const modes: ModeStat[] = []

      console.log(`[STATS] Executing modes query for userId: ${userId}`);
      const modeStmt = db.prepare(`
        SELECT gameMode,
               CASE 
                 WHEN winnerId = ? THEN 'win'
                 ELSE 'loss'
               END as result
        FROM matches
        WHERE player1Id = ? OR player2Id = ?
      `);
      const modeRows = modeStmt.all(userId, userId, userId) as { gameMode: string; result: 'win' | 'loss'}[];
      console.log(`[STATS] modeRows result:`, modeRows);

      const modeMap = new Map<string, { games: number; wins: number }>()
      for (const row of modeRows) {
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

