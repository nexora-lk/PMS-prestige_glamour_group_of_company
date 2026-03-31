import { Router, Request, Response } from 'express';
import { readJSON, writeJSON } from '../services/jsonStore';
import { User } from '../models';

const router = Router();
const USERS_FILE = 'users.json';

// Helper function to validate codeNo uniqueness
function isCodeNoDuplicate(codeNo: string, existingUsers: User[], excludeCodeNo?: string): boolean {
  return existingUsers.some(u => u.codeNo === codeNo && u.codeNo !== excludeCodeNo);
}

// GET /api/users — List all users with search, filter, sort, pagination
router.get('/', (req: Request, res: Response): void => {
  try {
    const allUsers = readJSON<User>(USERS_FILE);
    let users = [...allUsers];
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

    if (branch && typeof branch === 'string' && branch !== 'all') {
      users = users.filter((u) => u.branch.toLowerCase() === branch.toLowerCase());
    }
    if (role && typeof role === 'string' && role !== 'all') {
      users = users.filter((u) => u.role.toLowerCase() === role.toLowerCase());
    }
    if (status && typeof status === 'string' && status !== 'all') {
      users = users.filter((u) => u.status === status);
    }

    const total = users.length;

    // Sort
    const sortField = (sortBy as string) || 'createdAt';
    const order = (sortOrder as string) || 'desc';
    users.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortField];
      const bVal = (b as unknown as Record<string, unknown>)[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return order === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });

    // Pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedUsers = users.slice(startIndex, startIndex + limitNum);

    // Derive filter options from full dataset (single read)
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

// GET /api/users/:codeNo — Get single user by codeNo
router.get('/:codeNo', (req: Request, res: Response): void => {
  try {
    const users = readJSON<User>(USERS_FILE);
    const user = users.find((u) => u.codeNo === req.params.codeNo);
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
      codeNo, firstName, lastName, email, phone, branch,
      role, designation, joinDate, bankAccount, bankName,
      basicSalary, allowances, deductions, status,
    } = req.body;

    // Validation
    if (!codeNo || !firstName || !lastName || !email) {
      res.status(400).json({ error: 'CodeNo, first name, last name, and email are required.' });
      return;
    }

    // Check duplicate email
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      res.status(409).json({ error: 'A user with this email already exists.' });
      return;
    }

    // Check duplicate codeNo
    if (isCodeNoDuplicate(codeNo, users)) {
      res.status(409).json({ error: 'A user with this CodeNo already exists.' });
      return;
    }

    const now = new Date().toISOString();
    const newUser: User = {
      codeNo: codeNo,
      firstName: firstName || '',
      lastName: lastName || '',
      email: email || '',
      phone: phone || '',
      branch: branch || '',
      role: role || '',
      designation: designation || '',
      joinDate: joinDate || now.split('T')[0],
      bankAccount: bankAccount || '',
      bankName: bankName || '',
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

// PUT /api/users/:codeNo — Update user by codeNo
router.put('/:codeNo', (req: Request, res: Response): void => {
  try {
    const users = readJSON<User>(USERS_FILE);
    const index = users.findIndex((u) => u.codeNo === req.params.codeNo);

    if (index === -1) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    // Check duplicate email (exclude self)
    if (req.body.email) {
      const duplicate = users.find(
        (u) => u.email.toLowerCase() === req.body.email.toLowerCase() && u.codeNo !== req.params.codeNo
      );
      if (duplicate) {
        res.status(409).json({ error: 'A user with this email already exists.' });
        return;
      }
    }

    const updatedUser: User = {
      ...users[index],
      ...req.body,
      codeNo: users[index].codeNo, // prevent codeNo change
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

// DELETE /api/users/:codeNo — Delete user by codeNo
router.delete('/:codeNo', (req: Request, res: Response): void => {
  try {
    const users = readJSON<User>(USERS_FILE);
    const index = users.findIndex((u) => u.codeNo === req.params.codeNo);

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
