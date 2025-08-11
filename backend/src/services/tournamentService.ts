import { db } from '../db/database'
import { TournamentParticipant } from '../types'

export function generateEliminationRound(
  tournamentId: number, 
  round: number, 
  participants: TournamentParticipant[]
) {
  if (participants.length < 2) {
    throw new Error('Not enough participants for elimination round')
  }

  db.prepare('DELETE FROM tournament_matches WHERE tournamentId = ? AND round = ?')
    .run(tournamentId, round)

  for (let i = 0; i < participants.length; i += 2) {
    const p1 = participants[i]
    const p2 = participants[i + 1]
    
    if (!p2) {
      // Joueur reçoit un bye
      db.prepare(`
        INSERT INTO tournament_matches 
        (tournamentId, player1Id, player2Id, player1Score, player2Score, winnerId, round, status, playedAt)
        VALUES (?, ?, NULL, 1, 0, ?, ?, 'finished', ?)
      `).run(tournamentId, p1.userId, p1.userId, round, new Date().toISOString())
    } else {
      db.prepare(`
        INSERT INTO tournament_matches (tournamentId, player1Id, player2Id, round)
        VALUES (?, ?, ?, ?)
      `).run(tournamentId, p1.userId, p2.userId, round)
    }
  }
}