/**
 * Auth service — token generation, verification, and refresh-token management.
 * Extracted from middleware/auth.ts so route handlers have a clean import target.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthPayload } from '../../models';
import { ENV } from '../../config/env';
import { getDb } from '../../services/db';

// ── Fastify request augmentation ─────────────────────────────
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthPayload;
  }
}

// ── Token generation ─────────────────────────────────────────

export function generateAccessToken(payload: Omit<AuthPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: ENV.ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(payload: Omit<AuthPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, ENV.REFRESH_SECRET, { expiresIn: ENV.REFRESH_TOKEN_EXPIRY });
}

export function verifyRefreshToken(token: string): AuthPayload {
  return jwt.verify(token, ENV.REFRESH_SECRET) as AuthPayload;
}

// ── Refresh token hash store (database-backed) ──────────

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Calculate token expiration time based on REFRESH_TOKEN_EXPIRY
 * Assumes format like "7d", "24h", etc.
 */
function calculateExpiresAt(): Date {
  const expiryStr = ENV.REFRESH_TOKEN_EXPIRY;
  const now = new Date();

  const match = expiryStr.match(/^(\d+)([dhms])$/);
  if (!match) {
    // Fallback to 7 days if format is unexpected
    now.setDate(now.getDate() + 7);
    return now;
  }

  const [, value, unit] = match;
  const num = parseInt(value, 10);

  switch (unit) {
    case 'd':
      now.setDate(now.getDate() + num);
      break;
    case 'h':
      now.setHours(now.getHours() + num);
      break;
    case 'm':
      now.setMinutes(now.getMinutes() + num);
      break;
    case 's':
      now.setSeconds(now.getSeconds() + num);
      break;
  }

  return now;
}

export async function storeRefreshHash(token: string): Promise<void> {
  const db = getDb();
  const hash = hashToken(token);
  const expiresAt = calculateExpiresAt();

  try {
    await db`
      INSERT INTO refresh_tokens (hash, expires_at)
      VALUES (${hash}, ${expiresAt.toISOString()})
    `;
  } catch (error) {
    console.error('Failed to store refresh token hash:', error);
    throw error;
  }
}

export async function isRefreshTokenValid(token: string): Promise<boolean> {
  const db = getDb();
  const hash = hashToken(token);
  const now = new Date();

  try {
    const result = await db`
      SELECT id FROM refresh_tokens
      WHERE hash = ${hash}
      AND expires_at > ${now.toISOString()}
      LIMIT 1
    `;

    return result.length > 0;
  } catch (error) {
    console.error('Failed to verify refresh token:', error);
    return false;
  }
}

export async function revokeRefreshToken(token?: string): Promise<void> {
  const db = getDb();

  try {
    if (token) {
      // Revoke specific token
      const hash = hashToken(token);
      await db`
        DELETE FROM refresh_tokens
        WHERE hash = ${hash}
      `;
    } else {
      // Revoke all tokens (for logout)
      await db`
        DELETE FROM refresh_tokens
        WHERE expires_at <= NOW()
      `;
    }
  } catch (error) {
    console.error('Failed to revoke refresh token:', error);
    throw error;
  }
}

/**
 * Clean up expired refresh tokens (call periodically)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  const db = getDb();

  try {
    await db`
      DELETE FROM refresh_tokens
      WHERE expires_at <= NOW()
    `;
  } catch (error) {
    console.error('Failed to cleanup expired tokens:', error);
  }
}

// ── Fastify preHandler middleware ─────────────────────────────

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthPayload;

    if (decoded.role !== 'super_admin') {
      return reply.code(403).send({ error: 'Forbidden. This application is strictly restricted to Super Admin access only.' });
    }

    request.user = decoded;
  } catch {
    return reply.code(401).send({ error: 'Invalid or expired token.' });
  }
}
