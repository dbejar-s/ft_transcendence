import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/database';

interface FriendRequest {
  userId: number;
  friendId: number;
}

export async function friendRoutes(fastify: FastifyInstance) {

  // Get friend details by friendId for userId
  fastify.get('/:friendId/details', (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, friendId } = request.params as any;

    try {
      const userStmt = db.prepare(`
        SELECT id, username, avatar, status, 
          (SELECT MAX(playedAt) FROM matches WHERE player1Id = ? OR player2Id = ?) as lastSeen,
          (SELECT COUNT(*) FROM matches WHERE player1Id = ? OR player2Id = ?) as gamesPlayed
        FROM users WHERE id = ?
      `);
      const user = userStmt.get(friendId, friendId, friendId, friendId, friendId);

      if (!user) {
        return reply.status(404).send({ message: 'Friend not found' });
      }

      const matchesStmt = db.prepare(`
        SELECT 
          m.id,
          CASE WHEN m.player1Id = ? THEN u2.username ELSE u1.username END as opponent,
          CASE WHEN m.player1Id = ? THEN u2.avatar ELSE u1.avatar END as opponentAvatar,
          CASE WHEN m.winnerId = ? THEN 'win' ELSE 'loss' END as result,
          printf('%d - %d', m.player1Score, m.player2Score) as score,
          m.gameMode,
          '5 min' as duration,
          m.playedAt as date
        FROM matches m
        JOIN users u1 ON m.player1Id = u1.id
        JOIN users u2 ON m.player2Id = u2.id
        WHERE m.player1Id = ? OR m.player2Id = ?
        ORDER BY m.playedAt DESC
        LIMIT 20
      `);
      const recentMatches = matchesStmt.all(friendId, friendId, friendId, friendId, friendId);

      reply.send({ ...user, recentMatches });
    } catch (error: any) {
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

  // Add a friend for userId
  fastify.post('/', (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const { friendId } = request.body as any;

    if (!friendId) {
      return reply.status(400).send({ message: 'Friend ID is required' });
    }

    try {
      const stmt1 = db.prepare("INSERT INTO friends (userId, friendId, status) VALUES (?, ?, 'accepted')");
      stmt1.run(userId, friendId);

      const stmt2 = db.prepare("INSERT INTO friends (userId, friendId, status) VALUES (?, ?, 'accepted')");
      stmt2.run(friendId, userId);

      reply.status(201).send({ message: 'Friend added successfully' });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        return reply.status(409).send({ message: 'Friendship already exists' });
      }
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

  // Remove a friend
  fastify.delete('/:friendId', (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, friendId } = request.params as any;

    try {
      const stmt1 = db.prepare('DELETE FROM friends WHERE userId = ? AND friendId = ?');
      stmt1.run(userId, friendId);

      const stmt2 = db.prepare('DELETE FROM friends WHERE userId = ? AND friendId = ?');
      stmt2.run(friendId, userId);

      reply.send({ message: 'Friend removed successfully' });
    } catch (error: any) {
      reply.status(500).send({ message: 'Database error', error: error.message });
    }
  });

}
