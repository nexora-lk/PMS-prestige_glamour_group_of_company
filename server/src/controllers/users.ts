import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJSON, writeJSON } from '../services/jsonStore';
import { User } from '../models';

const router = Router();
const USERS_FILE = 'users.json';

// GET /api/users — List all users with search, filter, sort, pagination
router.get('/', (req: Request, res: Response): void => {
  try {
    let users = readJSON<User>(USERS_FILE);
    const { search, branch, role, status, sortBy, sortOrder, page, limit } = req.query;

    // Search filter
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.branch.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          u.designation.toLowerCase().includes(q)
      );
    }

    // Branch filter
    if (branch && typeof branch === 'string' && branch !== 'all') {
      users = users.filter((u) => u.branch.toLowerCase() === branch.toLowerCase());
    }

    // Role filter
    if (role && typeof role === 'string' && role !== 'all') {
      users = users.filter((u) => u.role.toLowerCase() === role.toLowerCase());
    }

    // Status filter
    if (status && typeof status === 'string' && status !== 'all') {
      users = users.filter((u) => u.status === status);
    }

    const total = users.length;

    // Sort
    const sortField = (sortBy as string) || 'createdAt';
    const order = (sortOrder as string) || 'desc';
    users.sort((a: any, b: any) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string') {
        return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedUsers = users.slice(startIndex, startIndex + limitNum);

    // Get unique branches and roles for filter options
    const allUsers = readJSON<User>(USERS_FILE);
    const branches = [...new Set(allUsers.map((u) => u.branch).filter(Boolean))];
    const roles = [...new Set(allUsers.map((u) => u.role).filter(Boolean))];

    res.json({
      users: paginatedUsers,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      branches,
      roles,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// GET /api/users/stats — Dashboard stats
router.get('/stats', (_req: Request, res: Response): void => {
  try {
    const users = readJSON<User>(USERS_FILE);
    const active = users.filter((u) => u.status === 'active').length;
    const deleted = users.filter((u) => u.status === 'delete').length;
    const branches = [...new Set(users.map((u) => u.branch).filter(Boolean))];
    const totalSalary = users
      .filter((u) => u.status === 'active')
      .reduce((sum, u) => sum + u.basicSalary + u.allowances - u.deductions, 0);

    res.json({
      totalUsers: users.length,
      activeUsers: active,
      deletedUsers: deleted,
      totalBranches: branches.length,
      branches,
      totalMonthlySalary: totalSalary,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// GET /api/users/:id — Get single user
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const users = readJSON<User>(USERS_FILE);
    const user = users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// POST /api/users — Create user
router.post('/', (req: Request, res: Response): void => {
  try {
    const users = readJSON<User>(USERS_FILE);
    const {
      firstName, lastName, email, phone, branch,
      role, designation, joinDate, basicSalary, allowances, deductions, status,
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email) {
      res.status(400).json({ error: 'First name, last name, and email are required.' });
      return;
    }

    // Check duplicate email
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      res.status(409).json({ error: 'A user with this email already exists.' });
      return;
    }

    const now = new Date().toISOString();
    const newUser: User = {
      id: uuidv4(),
      firstName: firstName || '',
      lastName: lastName || '',
      email: email || '',
      phone: phone || '',
      branch: branch || '',
      role: role || '',
      designation: designation || '',
      joinDate: joinDate || now.split('T')[0],
      basicSalary: Number(basicSalary) || 0,
      allowances: Number(allowances) || 0,
      deductions: Number(deductions) || 0,
      status: status || 'active',
      createdAt: now,
      updatedAt: now,
    };

    users.push(newUser);
    writeJSON(USERS_FILE, users);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// PUT /api/users/:id — Update user
router.put('/:id', (req: Request, res: Response): void => {
  try {
    const users = readJSON<User>(USERS_FILE);
    const index = users.findIndex((u) => u.id === req.params.id);

    if (index === -1) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    // Check duplicate email (exclude self)
    if (req.body.email) {
      const duplicate = users.find(
        (u) => u.email.toLowerCase() === req.body.email.toLowerCase() && u.id !== req.params.id
      );
      if (duplicate) {
        res.status(409).json({ error: 'A user with this email already exists.' });
        return;
      }
    }

    const updatedUser: User = {
      ...users[index],
      ...req.body,
      id: users[index].id, // prevent id change
      createdAt: users[index].createdAt,
      updatedAt: new Date().toISOString(),
      basicSalary: Number(req.body.basicSalary ?? users[index].basicSalary),
      allowances: Number(req.body.allowances ?? users[index].allowances),
      deductions: Number(req.body.deductions ?? users[index].deductions),
    };

    users[index] = updatedUser;
    writeJSON(USERS_FILE, users);
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// DELETE /api/users/:id — Delete user
router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const users = readJSON<User>(USERS_FILE);
    const index = users.findIndex((u) => u.id === req.params.id);

    if (index === -1) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const deleted = users.splice(index, 1)[0];
    writeJSON(USERS_FILE, users);
    res.json({ message: 'User deleted successfully.', user: deleted });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

export default router;
