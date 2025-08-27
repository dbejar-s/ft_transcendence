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
  console.log('=== JWT Middleware Debug ===');
  console.log('Headers:', request.headers);
  
  const authHeader = request.headers['authorization'];
  console.log('Authorization header:', authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Missing or invalid Authorization header');
    return reply.status(401).send({ message: 'Missing or invalid Authorization header' });
  }
  
  const token = authHeader.split(' ')[1];
  console.log('Extracted token:', token ? token.substring(0, 20) + '...' : 'null');
  
  if (!token) {
    console.log('No token found after Bearer');
    return reply.status(401).send({ message: 'No token provided' });
  }
  
  const jwtSecret = process.env.JWT_SECRET;
  console.log('JWT_SECRET available:', !!jwtSecret);
  console.log('JWT_SECRET length:', jwtSecret?.length);
  
  if (!jwtSecret) {
    console.error('JWT_SECRET environment variable not set');
    return reply.status(500).send({ message: 'Server configuration error' });
  }
  
  try {
    console.log('Attempting to verify token...');
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    console.log('Token decoded successfully:', {
      id: decoded.id,
      username: decoded.username,
      exp: decoded.exp ? new Date(decoded.exp * 1000) : 'no expiry',
      iat: decoded.iat ? new Date(decoded.iat * 1000) : 'no issued at'
    });
    
    // Check if token is expired manually
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      console.log('Token is expired');
      return reply.status(401).send({ message: 'Token expired' });
    }
    
    (request as any).user = {
      id: decoded.id,
      email: decoded.email || `${decoded.username}@test.com`,
      username: decoded.username
    };
    console.log('=== JWT Middleware Success ===');
  } catch (err: any) {
    console.error('JWT verification error:', err);
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    
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