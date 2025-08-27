import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/database';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import util from 'util';
import { pipeline } from 'stream';
import bcrypt from 'bcrypt'; // Import bcrypt
import { jwtMiddleware } from '../jwtMiddleware'; // Import the middleware
import crypto from 'crypto';

const pump = util.promisify(pipeline);

export async function userRoutes(fastify: FastifyInstance) {

    // Create a temporary user (for tournament participants)
    fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
        const { username, isTemporary } = request.body as { username: string; isTemporary?: boolean };

        if (!username) {
            return reply.status(400).send({ message: 'Username is required' });
        }

        try {
            // For temporary users, check if username already exists
            const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
            if (existingUser) {
                // If user exists and it's temporary, return it
                if (existingUser.status === 'temporary' || existingUser.isTemporary) {
                    return reply.send({ id: existingUser.id, username: existingUser.username, isTemporary: true });
                } else {
                    // If it's a real user, don't allow creating a temporary with same name
                    return reply.status(409).send({ message: 'Username already exists' });
                }
            }

            // Create temporary user
            const id = crypto.randomUUID();
            const defaultAvatar = '/uploads/default-avatar.png';
            
            const stmt = db.prepare(`
                INSERT INTO users (id, username, avatar, status, isTemporary) 
                VALUES (?, ?, ?, ?, ?)
            `);
            stmt.run(id, username, defaultAvatar, 'temporary', isTemporary ? 1 : 0);
            
            console.log(`Created ${isTemporary ? 'temporary' : 'regular'} user:`, { id, username });
            
            reply.status(201).send({ id, username, isTemporary: isTemporary || false });
        } catch (error: any) {
            console.error('Error creating user:', error);
            reply.status(500).send({ message: 'Database error', error: error.message });
        }
    });

    fastify.get('/current', { preHandler: [jwtMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user) {
        return reply.status(401).send({ message: 'Unauthorized' })
        }

        const userId = request.user.id
        const user = db.prepare(`
        SELECT id, username, email, avatar, language
        FROM users WHERE id = ?
        `).get(userId)

        if (!user) {
        return reply.status(404).send({ message: 'User not found' })
        }

        reply.send(user)
    })

    fastify.get('/:id', (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as any;
        const stmt = db.prepare('SELECT id, username, email, avatar, status, language, googleId FROM users WHERE id = ?');
        const user = stmt.get(id);

        if (user) {
            reply.send(user);
        } else {
            reply.status(404).send({ message: 'User not found' });
        }
    });

    fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as any;

        const parts = request.parts();
        const fields: { [key: string]: any } = {};
        let uploadedAvatarUrl: string | undefined;

        for await (const part of parts) {
            if (part.type === 'file') {
                const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
                await fsp.mkdir(uploadsDir, { recursive: true });
                const filename = `${id}-${Date.now()}-${part.filename}`;
                const avatarPath = path.join(uploadsDir, filename);

                await pump(part.file, fs.createWriteStream(avatarPath));

                uploadedAvatarUrl = `/uploads/${filename}`;
            } else {
                fields[part.fieldname] = part.value;
            }
        }

        const { username, language, predefinedAvatar, password } = fields;

        const setClauses: string[] = [];
        const params: (string | undefined)[] = [];

        console.log('Received username:', username);
        if (username) {
           setClauses.push('username = ?');
           params.push(username);
        }

        console.log('Received language:', language);
        if (language) {
           setClauses.push('language = ?');
           params.push(language);
        }
        // FIXED: Hash the password if it's being updated
        console.log('Received password:', password);
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            setClauses.push('password = ?');
            params.push(hashedPassword);
        }

        console.log('Received Avatar:', predefinedAvatar, uploadedAvatarUrl);
        if (uploadedAvatarUrl) {
            setClauses.push('avatar = ?');
            params.push(uploadedAvatarUrl);
        } else if (predefinedAvatar) {
            setClauses.push('avatar = ?');
            params.push(predefinedAvatar);
        }

        if (setClauses.length > 0) {
            try {
                const stmt = db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`);
                stmt.run(...params, id);
            } catch (error: any) {
                // FIXED: Check for a unique constraint violation on the username
                if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' && error.message.includes('users.username')) {
                    return reply.status(409).send({ message: 'This username is already in use. Please, pick another one' });
                }
                fastify.log.error(error);
                return reply.status(500).send({ message: 'An unexpected error occurred on the server.' });
            }
        }

        const updatedUserStmt = db.prepare('SELECT id, username, email, avatar, status, language, googleId FROM users WHERE id = ?');
        const updatedUser = updatedUserStmt.get(id);

        reply.send({ message: 'Profile updated successfully', user: updatedUser });
    });
}

function updateUserStats(userId: string, tournamentId: string, isWinner: boolean, score: number) {
  try {
    // Check if the user is a temporary user
    const user = db.prepare('SELECT isTemporary FROM users WHERE id = ?').get(userId) as { isTemporary: number };
    
    if (user && !user.isTemporary) {
      // Only for real users, update the stats
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
      
      console.log(`Updated stats for real user ${userId}: winner=${isWinner}, score=${score}`);
    } else {
      console.log(`Skipping stats update for temporary user ${userId}`);
    }
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
}