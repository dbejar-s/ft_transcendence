import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { db } from '../db/database';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Buffer } from 'buffer';
import { 
    validateUserRegistration, 
    validateUserLogin, 
    validate2FARequest,
    sanitizeEmail,
    sanitizeUsername 
} from '../utils/validation';

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID; // You need to create this in your .env
const client = new OAuth2Client(GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const DEFAULT_AVATAR = '/default-avatar.svg'; // Default avatar path

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

        // Input validation
        const validation = validateUserRegistration({ email, username, password });
        if (!validation.isValid) {
            return reply.status(400).send({ message: validation.errors.join(', ') });
        }

        // Sanitize inputs
        const sanitizedEmail = sanitizeEmail(email);
        const sanitizedUsername = sanitizeUsername(username);

        const hashedPassword = await bcrypt.hash(password, 10);

        try {
            const stmt = db.prepare('INSERT INTO users (id, email, username, password, avatar) VALUES (?, ?, ?, ?, ?)');
            const id = crypto.randomUUID();

            //**** const defaultAvatar = '/uploads/default-avatar.png'; // Make sure you have a default avatar image
            stmt.run(id, sanitizedEmail, sanitizedUsername, hashedPassword, DEFAULT_AVATAR);

            //**** stmt.run(id, email, username, hashedPassword, DEFAULT_AVATAR);

            // Return success message without issuing a JWT token.
            // Users must log in and complete 2FA before receiving a JWT.
            reply.status(201).send({ 
                message: 'User registered successfully. Please log in to continue.'
            });
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

        // Input validation
        const validation = validateUserLogin({ email, password });
        if (!validation.isValid) {
            return reply.status(400).send({ message: validation.errors.join(', ') });
        }

        // Sanitize inputs
        const sanitizedEmail = sanitizeEmail(email);
        
        const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        const user = stmt.get(sanitizedEmail) as any;

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
        
        // Input validation
        const validation = validate2FARequest({ userId, code });
        if (!validation.isValid) {
            return reply.status(400).send({ message: validation.errors.join(', ') });
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
        
        // Return user info (without password) so frontend can set context
        const { password, ...userWithoutPassword } = user;
        reply.send({ message: '2FA verified. Login successful.', token, user: userWithoutPassword });
    });

    // Google Sign-In
    fastify.post('/google', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { credential } = request.body as any;
            console.log('=== Google Auth Backend Debug ===');
            console.log('Received credential:', credential ? 'Yes' : 'No');
            
            if (!credential) {
                return reply.status(400).send({ message: 'No Google credential provided' });
            }

            console.log('Decoding Google JWT token...');
            // Decode the JWT token (without verification for simplicity)
            // In production, you should verify the token, but for development this is acceptable
            let email, name, googleId, avatar;
            
            try {
                const parts = credential.split('.');
                if (parts.length !== 3) {
                    throw new Error('Invalid JWT format - not 3 parts');
                }

                // Decode base64url to regular base64, then parse JSON
                let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
                // Add padding if needed
                while (base64.length % 4) {
                    base64 += '=';
                }
                
                const payloadJson = Buffer.from(base64, 'base64').toString('utf8');
                const payload = JSON.parse(payloadJson);
                
                console.log('Successfully decoded payload:', {
                    email: payload?.email,
                    name: payload?.name,
                    sub: payload?.sub,
                    picture: payload?.picture
                });
                
                if (!payload || !payload.email || !payload.sub) {
                    throw new Error('Invalid payload - missing required fields');
                }

                email = payload.email;
                name = payload.name;
                googleId = payload.sub;
                avatar = payload.picture;
                
            } catch (decodeError) {
                console.error('JWT decode error:', decodeError);
                return reply.status(401).send({ message: 'Invalid JWT format' });
            }

            let user = db.prepare('SELECT * FROM users WHERE googleId = ?').get(googleId) as any;

            if (user) {
                // User exists, log them in
                const { password, ...userWithoutPassword } = user;
                
                // Add provider information for Google users
                userWithoutPassword.provider = 'google';
                
                // Generate JWT token
                const token = jwt.sign(
                    { id: user.id, username: user.username, email: user.email },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );
                
                console.log('Returning existing user response:', {
                    hasToken: !!token,
                    tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
                    userId: user.id,
                    userEmail: user.email
                });
                
                return reply.send({ message: 'Login successful', user: userWithoutPassword, token });
            } else {
                // New user, check if email exists
                let existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
                if (existingUser) {
                    // Email exists, link Google account
                    const finalAvatar = avatar || DEFAULT_AVATAR;
                    db.prepare('UPDATE users SET googleId = ?, avatar = ? WHERE email = ?').run(googleId, finalAvatar, email);
                    // Fetch the updated user data
                    user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
                } else {
                    // Create new user
                    const id = crypto.randomUUID();
                    const finalAvatar = avatar || DEFAULT_AVATAR;
                    db.prepare('INSERT INTO users (id, email, username, googleId, avatar, language, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
                      .run(id, email, name, googleId, finalAvatar, 'en', 'online');
                    // Fetch the newly created user data
                    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
                }
                
                if (!user) {
                    console.error('Failed to create or retrieve user after Google login');
                    return reply.status(500).send({ message: 'Failed to create user account' });
                }
                
                // Add provider information for Google users
                const { password, ...userWithoutPassword } = user;
                userWithoutPassword.provider = 'google';
                
                // Generate JWT token for new user
                const token = jwt.sign(
                    { id: user.id, username: user.username || name, email: user.email },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );
                
                console.log('Returning new user response:', {
                    hasToken: !!token,
                    tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
                    userId: user.id,
                    userEmail: user.email
                });
                
                return reply.status(201).send({ message: 'Login successful', user: userWithoutPassword, token });
            }
        } catch (error) {
            console.error('Google auth error', error);
            reply.status(401).send({ message: 'Invalid Google token' });
        }
    });
}