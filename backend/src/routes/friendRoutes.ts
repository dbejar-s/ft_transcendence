import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/database';

export async function friendRoutes(fastify: FastifyInstance) {

    // Get all friends for a user
    fastify.get('/', (request: FastifyRequest, reply: FastifyReply) => {
        const { userId } = request.params as any;

        // This query joins the friends table with the users table to get friend details
        const stmt = db.prepare(`
            SELECT u.id, u.username, u.avatar, u.status 
            FROM friends f
            JOIN users u ON f.friendId = u.id
            WHERE f.userId = ? AND f.status = 'accepted'
        `);

        try {
            const friends = stmt.all(userId);
            reply.send(friends);
        } catch (error: any) {
            reply.status(500).send({ message: 'Database error', error: error.message });
        }
    });

    // Add a new friend (send a friend request)
    fastify.post('/', (request: FastifyRequest, reply: FastifyReply) => {
        const { userId } = request.params as any;
        const { friendId } = request.body as any;

        if (!friendId) {
            return reply.status(400).send({ message: 'Friend ID is required' });
        }

        try {
            // Insert a "pending" request. In a full system, the other user would need to accept.
            // For simplicity, we'll auto-accept for now.
            const stmt1 = db.prepare("INSERT INTO friends (userId, friendId, status) VALUES (?, ?, 'accepted')");
            stmt1.run(userId, friendId);
            
            // Friendships are mutual, so we add the reverse relationship too.
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
            // Remove the relationship in both directions
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