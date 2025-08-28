import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../db/database'

export async function statsRoutes(fastify: FastifyInstance) {
  fastify.get('/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as { userId: string }

    try {
      // --- Stats globales ---
      const totalGamesRow = db.prepare(`
        SELECT COUNT(*) as total FROM matches
        WHERE player1Id = ? OR player2Id = ?
      `).get(userId, userId) as { total: number }

      const totalGames = totalGamesRow?.total ?? 0

      const winsRow = db.prepare(`
        SELECT COUNT(*) as wins FROM matches
        WHERE winnerId = ?
      `).get(userId) as { wins: number }

      const wins = winsRow?.wins ?? 0

      const playTimeRow = db.prepare(`
        SELECT SUM( (strftime('%s', endedAt) - strftime('%s', startedAt)) ) as seconds
        FROM matches
        WHERE (player1Id = ? OR player2Id = ?) AND endedAt IS NOT NULL
      `).get(userId, userId) as { seconds: number | null }

      const playTime = playTimeRow?.seconds ?? 0

      const lastMatches = db.prepare(`
        SELECT winnerId FROM matches
        WHERE player1Id = ? OR player2Id = ?
        ORDER BY playedAt DESC
      `).all(userId, userId) as { winnerId: string | null }[]

      let currentStreak = 0
      for (const match of lastMatches) {
        if (match.winnerId === userId) currentStreak++
        else break
      }

      // --- Stats par mode de jeu ---
      type ModeStat = { mode: string; games: number; wins: number }
      const modes: ModeStat[] = []

      const modeRows = db.prepare(`
        SELECT gameMode,
               CASE 
                 WHEN winnerId = ? THEN 'win'
                 ELSE 'loss'
               END as result
        FROM matches
        WHERE player1Id = ? OR player2Id = ?
      `).all(userId, userId, userId) as { gameMode: string; result: 'win' | 'loss'}[]

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

      reply.send({ totalGames, wins, playTime, currentStreak, modes })
    } catch (error: any) {
      reply.status(500).send({ message: 'Database error', error: error.message })
    }
  })
}

