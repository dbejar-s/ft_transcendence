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
		// Check if username already exists
		const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
		if (existingUser) {
			return reply.status(409).send({ message: 'Username already exists' });
		}

		// Create user (default to regular user unless explicitly temporary)
		const stmt = db.prepare(`
			INSERT INTO users (id, username, email, isTemporary) 
			VALUES (?, ?, ?, ?)
		`);
		
		const userId = crypto.randomUUID();
		const email = `${username}@tournament.com`;
		
		stmt.run(userId, username, email, isTemporary ? 1 : 0);
		
		console.log(`Created ${isTemporary ? 'temporary' : 'regular'} user:`, username, 'ID:', userId);
		
		reply.status(201).send({
			message: 'User created successfully',
			id: userId,
			username: username,
			isTemporary: isTemporary || false
		});
		} catch (error: any) {
		console.error('Error creating user:', error);
		reply.status(500).send({ message: 'Database error', error: error.message });
		}
	});

	fastify.get('/by-username/:username', (request: FastifyRequest, reply: FastifyReply) => {
		const { username } = request.params as { username: string };
		
		if (!username) {
		return reply.status(400).send({ message: 'Username is required' });
		}

		try {
		const user = db.prepare('SELECT id, username, email, avatar, status, language FROM users WHERE username = ?').get(username);
		
		if (user) {
			reply.send(user);
		} else {
			reply.status(404).send({ message: 'User not found' });
		}
		} catch (error: any) {
		console.error('Error finding user by username:', error);
		reply.status(500).send({ message: 'Database error', error: error.message });
		}
    });

    fastify.get('/current', { preHandler: [jwtMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    	reply.header('Cache-Control', 'no-store');
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

    // Get user profile with recent matches
    fastify.get('/:id/profile', (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as any;
        
        try {
            // Get user basic info with games count
            const userStmt = db.prepare(`
                SELECT u.id, u.username, u.email, u.avatar, u.status, u.language,
                       COUNT(m.id) as gamesPlayed
                FROM users u
                LEFT JOIN matches m ON (m.player1Id = u.id OR m.player2Id = u.id)
                WHERE u.id = ?
                GROUP BY u.id, u.username, u.email, u.avatar, u.status, u.language
            `);
            const user = userStmt.get(id) as any;

            if (!user) {
                return reply.status(404).send({ message: 'User not found' });
            }

            // Get recent matches
            const matchesStmt = db.prepare(`
                SELECT m.*, 
                       u1.username as player1Name, u1.avatar as player1Avatar,
                       u2.username as player2Name, u2.avatar as player2Avatar
                FROM matches m
                LEFT JOIN users u1 ON m.player1Id = u1.id
                LEFT JOIN users u2 ON m.player2Id = u2.id
                WHERE m.player1Id = ? OR m.player2Id = ?
                ORDER BY m.playedAt DESC
                LIMIT 10
            `);
            const rawMatches = matchesStmt.all(id, id) as any[];

            // Transform matches to include proper opponent info and estimated duration
            const recentMatches = rawMatches.map((match) => {
                const isPlayer1 = match.player1Id === id;
                const opponent = isPlayer1 ? match.player2Name || 'Guest' : match.player1Name;
                const opponentAvatar = isPlayer1 ? match.player2Avatar || '/default-avatar.png' : match.player1Avatar;
                const result = match.winnerId === id ? 'win' : 'loss';
                const score = `${match.player1Score}-${match.player2Score}`;
                
                // Generate consistent estimated duration based on match ID (2-4 minutes)
                const estimatedMinutes = (match.id % 3) + 2;
                const duration = `${estimatedMinutes}min`;

                return {
                    id: match.id,
                    opponent,
                    opponentAvatar,
                    result,
                    score,
                    gameMode: match.gameMode,
                    duration,
                    date: match.playedAt
                };
            });

            reply.send({ ...user, recentMatches });
        } catch (error: any) {
            console.error('Error getting user profile:', error);
            reply.status(500).send({ message: 'Database error', error: error.message });
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

    fastify.post('/complete-profile', { preHandler: [jwtMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            console.log('=== COMPLETE PROFILE REQUEST ===');
            
            if (!request.user) {
                return reply.status(401).send({ message: 'Unauthorized' });
            }
            
            const targetUserId = request.user.id;
            console.log('User ID from token:', targetUserId);
            
            const parts = request.parts();
            const fields: { [key: string]: any } = {};
            let uploadedAvatarUrl: string | undefined;

            for await (const part of parts) {
                if (part.type === 'file') {
                    console.log('Processing file upload:', part.filename);
                    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
                    await fsp.mkdir(uploadsDir, { recursive: true });
                    const filename = `${Date.now()}-${part.filename}`;
                    const avatarPath = path.join(uploadsDir, filename);

                    await pump(part.file, fs.createWriteStream(avatarPath));

                    uploadedAvatarUrl = `/uploads/${filename}`;
                    console.log('File uploaded to:', uploadedAvatarUrl);
                } else {
                    fields[part.fieldname] = part.value;
                    console.log('Field received:', part.fieldname, '=', part.value);
                }
            }

            const { username, language, avatarUrl } = fields;
            console.log('Extracted fields:', { username, language, avatarUrl });

            // Use uploaded avatar or predefined avatar URL
            const finalAvatarUrl = uploadedAvatarUrl || avatarUrl || '/uploads/default-avatar.png';
            console.log('Final avatar URL:', finalAvatarUrl);

            console.log('Completing profile for user:', targetUserId);
            console.log('Username:', username, 'Language:', language, 'Avatar:', finalAvatarUrl);

            // Update the user
            const updateStmt = db.prepare(`
                UPDATE users 
                SET username = ?, avatar = ?, language = ? 
                WHERE id = ?
            `);
            
            try {
                updateStmt.run(username, finalAvatarUrl, language || 'en', targetUserId);
            } catch (error: any) {
                if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' && error.message.includes('users.username')) {
                    return reply.status(409).send({ message: 'This username is already in use. Please, pick another one' });
                }
                throw error;
            }

            const updatedUserStmt = db.prepare('SELECT id, username, email, avatar, status, language FROM users WHERE id = ?');
            const updatedUser = updatedUserStmt.get(targetUserId);

            console.log('Profile completed successfully for user:', updatedUser);
            reply.send({ message: 'Profile completed successfully', user: updatedUser });
        } catch (error: any) {
            console.error('Complete profile error:', error);
            reply.status(500).send({ message: 'An unexpected error occurred' });
        }
    });
}

// function updateUserStats(userId: string, tournamentId: string, isWinner: boolean, score: number) {
//   try {
//     // Update stats for ALL users (no more checking for temporary users)
//     const statsUpdate = db.prepare(`
//       INSERT OR REPLACE INTO user_stats (userId, tournaments_played, tournaments_won, total_score)
//       VALUES (
//         ?, 
//         COALESCE((SELECT tournaments_played FROM user_stats WHERE userId = ?), 0) + 1,
//         COALESCE((SELECT tournaments_won FROM user_stats WHERE userId = ?), 0) + ?,
//         COALESCE((SELECT total_score FROM user_stats WHERE userId = ?), 0) + ?
//       )
//     `);
//     statsUpdate.run(userId, userId, userId, isWinner ? 1 : 0, userId, score);
    
//     console.log(`Updated stats for user ${userId}: winner=${isWinner}, score=${score}`);
//   } catch (error) {
//     console.error('Error updating user stats:', error);
//   }
// }
