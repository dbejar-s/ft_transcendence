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

interface JWTPayload {
  id: string;
  username: string;
  email?: string;
  iat?: number;
  exp?: number;
}

export async function jwtMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers['authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ message: 'Missing or invalid Authorization header' });
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    return reply.status(401).send({ message: 'No token provided' });
  }
  
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return reply.status(500).send({ message: 'Server configuration error' });
  }
  
  try {
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return reply.status(401).send({ message: 'Token expired' });
    }
    
    (request as any).user = {
      id: decoded.id,
      email: decoded.email || `${decoded.username}@test.com`,
      username: decoded.username
    };

  } catch (err: any) {
    if (err.name === 'JsonWebTokenError') {
      return reply.status(401).send({ message: 'Invalid token format' });
    } else if (err.name === 'TokenExpiredError') {
      return reply.status(401).send({ message: 'Token expired' });
    } else if (err.name === 'NotBeforeError') {
      return reply.status(401).send({ message: 'Token not active yet' });
    } else {
      return reply.status(401).send({ message: 'Invalid or expired token' });
    }
  }
}
