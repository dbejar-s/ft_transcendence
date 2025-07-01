import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/database';

export async function matchRoutes(fastify: FastifyInstance) {

    // Get match history for a user
    fastify.get('/', (request: FastifyRequest, reply: FastifyReply) => {
        const { userId } = request.params as any;

        const stmt = db.prepare(`
            SELECT 
                m.id,
                CASE
                    WHEN m.player1Id = ? THEN p2.username
                    ELSE p1.username
                END as opponent,
                CASE
                    WHEN m.player1Id = ? THEN p2.avatar
                    ELSE p1.avatar
                END as opponentAvatar,
                CASE
                    WHEN m.winnerId = ? THEN 'win'
                    WHEN m.winnerId IS NULL THEN 'draw'
                    ELSE 'loss'
                END as result,
                m.player1Score,
                m.player2Score,
                m.gameMode,
                m.playedAt
            FROM matches m
            JOIN users p1 ON m.player1Id = p1.id
            JOIN users p2 ON m.player2Id = p2.id
            WHERE m.player1Id = ? OR m.player2Id = ?
            ORDER BY m.playedAt DESC
        `);

        try {
            // We bind the userId parameter multiple times as it's used multiple times in the query
            const matches = stmt.all(userId, userId, userId, userId, userId);
            reply.send(matches);
        } catch (error: any) {
            reply.status(500).send({ message: 'Database error', error: error.message });
        }
    });

    // Add a new match
    fastify.post('/', (request: FastifyRequest, reply: FastifyReply) => {
        const { player1Id, player2Id, player1Score, player2Score, gameMode } = request.body as any;

        if (!player1Id || !player2Id || player1Score === undefined || player2Score === undefined || !gameMode) {
            return reply.status(400).send({ message: 'Missing required match data' });
        }

        let winnerId = null;
        if (player1Score > player2Score) {
            winnerId = player1Id;
        } else if (player2Score > player1Score) {
            winnerId = player2Id;
        }

        try {
            const stmt = db.prepare(`
                INSERT INTO matches (player1Id, player2Id, player1Score, player2Score, winnerId, gameMode)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            const info = stmt.run(player1Id, player2Id, player1Score, player2Score, winnerId, gameMode);

            reply.status(201).send({ message: 'Match added successfully', matchId: info.lastInsertRowid });
        } catch (error: any) {
            reply.status(500).send({ message: 'Database error', error: error.message });
        }
    });
}
