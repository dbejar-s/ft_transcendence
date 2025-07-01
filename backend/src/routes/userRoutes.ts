import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/database';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import util from 'util';
import { pipeline } from 'stream';
import bcrypt from 'bcrypt'; // Import bcrypt

const pump = util.promisify(pipeline);

export async function userRoutes(fastify: FastifyInstance) {

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

        if (username) {
           setClauses.push('username = ?');
           params.push(username);
        }
        if (language) {
           setClauses.push('language = ?');
           params.push(language);
        }
        // FIXED: Hash the password if it's being updated
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            setClauses.push('password = ?');
            params.push(hashedPassword);
        }

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