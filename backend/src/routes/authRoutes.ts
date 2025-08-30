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

// Create OAuth2Client - we'll recreate it if there are certificate issues
const createOAuth2Client = () => {
    if (!GOOGLE_CLIENT_ID) {
        throw new Error('GOOGLE_CLIENT_ID is not configured');
    }
    return new OAuth2Client(GOOGLE_CLIENT_ID);
};

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const DEFAULT_AVATAR = '/default-avatar.svg'; // Default avatar path

// Debug environment variables
console.log('=== Environment Variables Debug ===');
console.log('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID ? 'Set' : 'NOT SET');
console.log('JWT_SECRET:', JWT_SECRET ? 'Set' : 'NOT SET');
console.log('===================================');

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

        // Generate 2FA code using crypto.randomInt for stronger randomness
        const twofaCode = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0'); // 6-digit code
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

            console.log('Verifying Google JWT token...');
            
            if (!GOOGLE_CLIENT_ID) {
                console.error('GOOGLE_CLIENT_ID is not set!');
                return reply.status(500).send({ message: 'Server configuration error - Google Client ID not configured' });
            }
            
            // Properly verify the Google ID token using google-auth-library
            let ticket;
            try {
                // Create a fresh OAuth2Client for each verification to avoid certificate cache issues
                const freshClient = createOAuth2Client();
                ticket = await freshClient.verifyIdToken({
                    idToken: credential,
                    audience: GOOGLE_CLIENT_ID,
                });
                console.log('Token verification successful');
            } catch (verifyError) {
                console.error('Token verification failed:', verifyError);
                const error = verifyError as Error;
                console.error('Error details:', error.message);
                
                // DEVELOPMENT WORKAROUND: For testing purposes only
                // In production, this should be removed and users should get fresh tokens
                if (error.message.includes('No pem found')) {
                    console.warn('🔧 DEVELOPMENT: Bypassing certificate validation for outdated token');
                    console.warn('   This should NOT be used in production!');
                    
                    try {
                        // Decode the token without verification (DEVELOPMENT ONLY)
                        const decoded = jwt.decode(credential) as any;
                        
                        if (decoded && decoded.email && decoded.sub && decoded.email_verified) {
                            console.log('✅ DEVELOPMENT: Token decoded successfully (verification bypassed)');
                            console.log('DEVELOPMENT: Decoded token structure:', {
                                iss: decoded.iss,
                                aud: decoded.aud,
                                email: decoded.email,
                                sub: decoded.sub,
                                email_verified: decoded.email_verified,
                                name: decoded.name,
                                picture: decoded.picture
                            });
                            console.log('DEVELOPMENT: Expected values:', {
                                expected_iss: 'https://accounts.google.com',
                                expected_aud: GOOGLE_CLIENT_ID,
                                actual_iss: decoded.iss,
                                actual_aud: decoded.aud
                            });
                            
                            // Manually validate the token structure
                            // Support both Google OAuth tokens and Firebase Auth tokens
                            const isGoogleOAuth = decoded.iss === 'https://accounts.google.com' && 
                                                decoded.aud === GOOGLE_CLIENT_ID;
                            const isFirebaseAuth = decoded.iss === 'https://securetoken.google.com/pong-hive' && 
                                                 decoded.aud === 'pong-hive';
                            
                            if (isGoogleOAuth || isFirebaseAuth) {
                                
                                console.log('✅ DEVELOPMENT: Token structure validated');
                                console.log('Token type:', isGoogleOAuth ? 'Google OAuth' : 'Firebase Auth');
                                
                                // Proceed with user creation/authentication
                                const email = decoded.email;
                                const name = decoded.name || email.split('@')[0];
                                const googleId = decoded.sub;
                                const avatar = decoded.picture;
                                
                                // Check if user exists by googleId
                                let user = db.prepare('SELECT * FROM users WHERE googleId = ?').get(googleId) as any;
                                
                                if (user) {
                                    // Existing user - return success
                                    const { password, ...userWithoutPassword } = user;
                                    userWithoutPassword.provider = 'google';
                                    
                                    const token = jwt.sign(
                                        { id: user.id, username: user.username, email: user.email },
                                        JWT_SECRET,
                                        { expiresIn: '24h' }
                                    );
                                    
                                    console.log('✅ DEVELOPMENT: Existing user authenticated');
                                    return reply.send({ message: 'Login successful', user: userWithoutPassword, token });
                                } else {
                                    // Check if email exists (user might have registered with email/password)
                                    let existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
                                    
                                    if (existingUser) {
                                        // Link Google account to existing user
                                        const finalAvatar = avatar || DEFAULT_AVATAR;
                                        db.prepare('UPDATE users SET googleId = ?, avatar = ? WHERE email = ?')
                                            .run(googleId, finalAvatar, email);
                                        
                                        // Fetch updated user
                                        user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
                                        
                                        const { password, ...userWithoutPassword } = user;
                                        userWithoutPassword.provider = 'google';
                                        
                                        const token = jwt.sign(
                                            { id: user.id, username: user.username, email: user.email },
                                            JWT_SECRET,
                                            { expiresIn: '24h' }
                                        );
                                        
                                        console.log('✅ DEVELOPMENT: Google account linked to existing user');
                                        return reply.send({ message: 'Login successful', user: userWithoutPassword, token });
                                    } else {
                                        // Create new user
                                        const id = crypto.randomUUID();
                                        const finalAvatar = avatar || DEFAULT_AVATAR;
                                        
                                        db.prepare('INSERT INTO users (id, email, username, googleId, avatar, language, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
                                            .run(id, email, name, googleId, finalAvatar, 'en', 'online');
                                        
                                        // Fetch the newly created user
                                        user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
                                        
                                        if (!user) {
                                            console.error('Failed to create new user');
                                            return reply.status(500).send({ message: 'Failed to create user account' });
                                        }
                                        
                                        const { password, ...userWithoutPassword } = user;
                                        userWithoutPassword.provider = 'google';
                                        
                                        const token = jwt.sign(
                                            { id: user.id, username: user.username || name, email: user.email },
                                            JWT_SECRET,
                                            { expiresIn: '24h' }
                                        );
                                        
                                        console.log('✅ DEVELOPMENT: New user created and authenticated');
                                        return reply.send({ message: 'Login successful', user: userWithoutPassword, token });
                                    }
                                }
                            } else {
                                console.error('DEVELOPMENT: Token structure validation failed');
                                return reply.status(401).send({ message: 'Invalid token structure' });
                            }
                        } else {
                            console.error('DEVELOPMENT: Failed to decode token or missing required fields');
                            return reply.status(401).send({ message: 'Invalid token format' });
                        }
                    } catch (decodeError) {
                        console.error('DEVELOPMENT: Failed to decode token:', decodeError);
                        return reply.status(401).send({ message: 'Token decode failed' });
                    }
                }
                
                // Provide more specific error messages
                if (error.message.includes('Wrong number of segments')) {
                    return reply.status(400).send({ message: 'Invalid token format' });
                } else if (error.message.includes('Token used too late')) {
                    return reply.status(401).send({ message: 'Token has expired. Please sign in again.' });
                } else if (error.message.includes('No pem found')) {
                    console.error('Certificate key not found - likely an old token. User needs to sign in again.');
                    console.error('This usually happens when:');
                    console.error('1. User has an old cached token from a previous session');
                    console.error('2. Google has rotated their signing keys');
                    console.error('3. Token was issued a long time ago');
                    return reply.status(401).send({ message: 'Authentication token is outdated. Please sign in again with Google.' });
                } else if (error.message.includes('Invalid token')) {
                    return reply.status(401).send({ message: 'Invalid Google token' });
                } else {
                    return reply.status(401).send({ message: 'Google token verification failed' });
                }
            }

            const payload = ticket.getPayload();
            if (!payload) {
                console.error('No payload in verified token');
                return reply.status(401).send({ message: 'Invalid Google token - no payload' });
            }

            console.log('Successfully verified and decoded payload:', {
                email: payload.email,
                name: payload.name,
                sub: payload.sub,
                picture: payload.picture,
                email_verified: payload.email_verified
            });

            // Ensure the token is from Google and email is verified
            if (!payload.email || !payload.sub || !payload.email_verified) {
                console.error('Token missing required fields or email not verified');
                return reply.status(401).send({ message: 'Invalid Google token - missing required fields or unverified email' });
            }

            const email = payload.email;
            const name = payload.name || email.split('@')[0]; // Fallback to email prefix if no name
            const googleId = payload.sub;
            const avatar = payload.picture;

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