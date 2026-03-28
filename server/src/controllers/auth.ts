import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { readSingleJSON, writeSingleJSON } from '../services/jsonStore';
import { generateToken } from '../middleware/auth';
import { AdminCredentials } from '../models';

const router = Router();

// Initialize default admin if not exists
function ensureAdmin(): void {
  const admin = readSingleJSON<AdminCredentials>('admin.json');
  if (!admin) {
    const hashed = bcrypt.hashSync('admin123', 10);
    writeSingleJSON<AdminCredentials>('admin.json', {
      username: 'admin',
      password: hashed,
      name: 'Super Admin',
      role: 'super_admin',
    });
  }
}

ensureAdmin();

// POST /api/auth/login
router.post('/login', (req: Request, res: Response): void => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const admin = readSingleJSON<AdminCredentials>('admin.json');
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

    const token = generateToken({ username: admin.username, role: admin.role });
    res.json({
      token,
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

// GET /api/auth/me
router.get('/me', (req: Request, res: Response): void => {
  const admin = readSingleJSON<AdminCredentials>('admin.json');
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
