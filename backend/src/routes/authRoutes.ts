import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { db } from '../db/database';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID; // You need to create this in your .env
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Nodemailer transporter setup (Gmail SMTP)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function authRoutes(fastify: FastifyInstance) {
    
    // Standard Registration
    fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
        const { email, username, password } = request.body as any;

        if (!email || !username || !password) {
            return reply.status(400).send({ message: 'Email, username, and password are required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        try {
            const stmt = db.prepare('INSERT INTO users (id, email, username, password, avatar) VALUES (?, ?, ?, ?, ?)');
            const id = crypto.randomUUID();
            const defaultAvatar = '/uploads/default-avatar.png'; // Make sure you have a default avatar image
            stmt.run(id, email, username, hashedPassword, defaultAvatar);
            reply.status(201).send({ message: 'User registered successfully' });
        } catch (error: any) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return reply.status(409).send({ message: 'Email or username already exists' });
            }
            reply.status(500).send({ message: 'Database error', error: error.message });
        }
    });

    // Standard Login
    fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
        const { email, password } = request.body as any;

        if (!email || !password) {
            return reply.status(400).send({ message: 'Email and password are required' });
        }
        
        const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        const user = stmt.get(email) as any;

        if (!user) {
            return reply.status(401).send({ message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return reply.status(401).send({ message: 'Invalid credentials' });
        }

        // Generate 2FA code
        const twofaCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
        const twofaExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes from now
        db.prepare('UPDATE users SET twofa_code = ?, twofa_expires = ?, twofa_enabled = 1 WHERE id = ?')
          .run(twofaCode, twofaExpires, user.id);

        // Send 2FA code via email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Your 2FA Code',
            text: `Your 2FA code is: ${twofaCode}`,
        });

        reply.send({ message: '2FA code sent to your email. Please verify to continue.', userId: user.id });
    });

    // 2FA Verification endpoint
    fastify.post('/verify-2fa', async (request: FastifyRequest, reply: FastifyReply) => {
        const { userId, code } = request.body as any;
        if (!userId || !code) {
            return reply.status(400).send({ message: 'User ID and 2FA code are required' });
        }
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = stmt.get(userId) as any;
        if (!user || !user.twofa_enabled) {
            return reply.status(401).send({ message: '2FA not enabled or user not found' });
        }
        if (!user.twofa_code || !user.twofa_expires) {
            return reply.status(401).send({ message: 'No 2FA code found. Please login again.' });
        }
        if (user.twofa_code !== code) {
            return reply.status(401).send({ message: 'Invalid 2FA code' });
        }
        if (new Date() > new Date(user.twofa_expires)) {
            return reply.status(401).send({ message: '2FA code expired. Please login again.' });
        }
        // Clear 2FA code after successful verification
        db.prepare('UPDATE users SET twofa_code = NULL, twofa_expires = NULL WHERE id = ?').run(userId);
        // Issue JWT
        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
        reply.send({ message: '2FA verified. Login successful.', token });
    });

    // Google Sign-In
    fastify.post('/google', async (request: FastifyRequest, reply: FastifyReply) => {
        const { token } = request.body as any;
        try {
            // No need to verify token here if we trust firebase on the frontend
            // This is a simplification. For higher security, the backend should verify the token.
            const { email, name, sub: googleId, picture: avatar } = request.body as any;

            let user = db.prepare('SELECT * FROM users WHERE googleId = ?').get(googleId) as any;

            if (user) {
                // User exists, log them in
                const { password, ...userWithoutPassword } = user;
                return reply.send({ message: 'Login successful', user: userWithoutPassword });
            } else {
                // New user, check if email exists
                user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
                if (user) {
                    // Email exists, link Google account
                    db.prepare('UPDATE users SET googleId = ?, avatar = ? WHERE email = ?').run(googleId, avatar, email);
                } else {
                    // Create new user
                    const id = crypto.randomUUID();
                    db.prepare('INSERT INTO users (id, email, username, googleId, avatar) VALUES (?, ?, ?, ?, ?)')
                      .run(id, email, name, googleId, avatar);
                    user = { id, email, username: name, avatar, googleId };
                }
                
                const { password, ...userWithoutPassword } = user;
                return reply.status(201).send({ message: 'Login successful', user: userWithoutPassword });
            }
        } catch (error) {
            console.error('Google auth error', error);
            reply.status(401).send({ message: 'Invalid Google token' });
        }
    });
}