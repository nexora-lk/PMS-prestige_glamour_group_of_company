import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthPayload } from '../models';

const JWT_SECRET = process.env.JWT_SECRET || 'payroll-system-secret-key-2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'payroll-refresh-secret-key-2026';

const ACCESS_TOKEN_EXPIRY = '1d';
const REFRESH_TOKEN_EXPIRY = '7d';

// ── Token generation ────────────────────────────────────────

export function generateAccessToken(payload: Omit<AuthPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(payload: Omit<AuthPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyRefreshToken(token: string): AuthPayload {
  return jwt.verify(token, REFRESH_SECRET) as AuthPayload;
}

// ── Refresh token hash store (single-admin system) ──────────

let storedRefreshHash: string | null = null;

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function storeRefreshHash(token: string): void {
  storedRefreshHash = hashToken(token);
}

export function isRefreshTokenValid(token: string): boolean {
  if (!storedRefreshHash) return false;
  return hashToken(token) === storedRefreshHash;
}

export function revokeRefreshToken(): void {
  storedRefreshHash = null;
}

// ── Auth middleware ──────────────────────────────────────────

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Access denied. No token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;

    // Strict Role Enforcement
    if (decoded.role !== 'super_admin') {
      res.status(403).json({ error: 'Forbidden. This application is strictly restricted to Super Admin access only.' });
      return;
    }

    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
