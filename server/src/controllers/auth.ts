import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { dbGetAdmin, dbSaveAdmin } from '../services/dbStore';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  storeRefreshHash,
  isRefreshTokenValid,
  revokeRefreshToken,
  authMiddleware,
} from '../middleware/auth';
import { AdminCredentials } from '../models';

const router = Router();

// Initialize default admin if not exists
async function ensureAdmin(): Promise<void> {
  const admin = await dbGetAdmin();
  if (!admin) {
    const hashed = bcrypt.hashSync('admin123', 10);
    const defaultAdmin: AdminCredentials = {
      username: 'admin',
      password: hashed,
      name: 'Super Admin',
      role: 'super_admin',
    };
    await dbSaveAdmin(defaultAdmin);
  }
}

// Run on module load — will execute after DB init in app.ts
ensureAdmin().catch((err) => console.error('Failed to ensure admin:', err));

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const admin = await dbGetAdmin();
    if (!admin) {
      res.status(500).json({ error: 'Admin configuration not found.' });
      return;
    }

    if (username !== admin.username) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    const isMatch = bcrypt.compareSync(password, admin.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    const tokenPayload = { username: admin.username, role: admin.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store hash of refresh token server-side for validation
    storeRefreshHash(refreshToken);

    res.json({
      accessToken,
      refreshToken,
      user: {
        username: admin.username,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

// POST /api/auth/refresh — exchange refresh token for new access token
router.post('/refresh', (req: Request, res: Response): void => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required.' });
      return;
    }

    // Verify the token hasn't been revoked
    if (!isRefreshTokenValid(refreshToken)) {
      res.status(401).json({ error: 'Refresh token has been revoked.' });
      return;
    }

    // Verify JWT signature and expiry
    const decoded = verifyRefreshToken(refreshToken);

    // Issue new access token
    const accessToken = generateAccessToken({ username: decoded.username, role: decoded.role });

    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});

// POST /api/auth/logout — revoke refresh token
router.post('/logout', (_req: Request, res: Response): void => {
  revokeRefreshToken();
  res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me — Protected: requires valid JWT
router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const admin = await dbGetAdmin();
  if (!admin) {
    res.status(404).json({ error: 'Admin not found.' });
    return;
  }
  res.json({
    username: admin.username,
    name: admin.name,
    role: admin.role,
  });
});

export default router;
