/**
 * JWT Validation Middleware for Fastify
 *
 * This middleware checks for a Bearer token in the Authorization header,
 * verifies it using the JWT_SECRET, and attaches the decoded user info to the request.
 *
 * Usage:
 * import { jwtMiddleware } from '../jwtMiddleware';
 * fastify.addHook('preHandler', jwtMiddleware);
 *
 * Environment Variables:
 *   - JWT_SECRET: Secret key for signing/verifying JWTs
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

export async function jwtMiddleware(request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        // Attach user info to request for downstream handlers
        (request as any).user = decoded;
    } catch (err) {
        return reply.status(401).send({ message: 'Invalid or expired token' });
    }
} 