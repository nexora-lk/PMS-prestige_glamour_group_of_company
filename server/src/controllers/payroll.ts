import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJSON, writeJSON } from '../services/jsonStore';
import { generatePaySheet } from '../services/payrollCalc';
import { User, PayrollRecord } from '../models';

const router = Router();
const PAYROLL_FILE = 'payroll.json';
const USERS_FILE = 'users.json';

// POST /api/payroll/generate — Generate paysheet for user(s)
router.post('/generate', (req: Request, res: Response): void => {
  try {
    const { userIds, period } = req.body;

    if (!period) {
      res.status(400).json({ error: 'Period (YYYY-MM) is required.' });
      return;
    }

    const users = readJSON<User>(USERS_FILE);
    const payrollRecords = readJSON<PayrollRecord>(PAYROLL_FILE);
    const generatedRecords: PayrollRecord[] = [];

    // If no userIds, generate for all active users
    const targetIds: string[] = userIds && userIds.length > 0
      ? userIds
      : users.filter((u) => u.status === 'active').map((u) => u.id);

    for (const userId of targetIds) {
      const user = users.find((u) => u.id === userId);
      if (!user) continue;

      // Check if payroll already exists for this user/period
      const existing = payrollRecords.find(
        (r) => r.userId === userId && r.period === period
      );
      if (existing) {
        generatedRecords.push(existing);
        continue;
      }

      const payData = generatePaySheet(user, period);
      const record: PayrollRecord = {
        ...payData,
        id: uuidv4(),
        generatedAt: new Date().toISOString(),
      };

      payrollRecords.push(record);
      generatedRecords.push(record);
    }

    writeJSON(PAYROLL_FILE, payrollRecords);
    res.json({
      message: `Generated ${generatedRecords.length} payroll record(s).`,
      records: generatedRecords,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate payroll.' });
  }
});

// GET /api/payroll/history — List payroll records
router.get('/history', (req: Request, res: Response): void => {
  try {
    let records = readJSON<PayrollRecord>(PAYROLL_FILE);
    const { userId, period, search } = req.query;

    if (userId && typeof userId === 'string') {
      records = records.filter((r) => r.userId === userId);
    }

    if (period && typeof period === 'string') {
      records = records.filter((r) => r.period === period);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      records = records.filter(
        (r) =>
          r.userName.toLowerCase().includes(q) ||
          r.branch.toLowerCase().includes(q)
      );
    }

    // Sort by generatedAt desc
    records.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

    res.json({ records, total: records.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payroll history.' });
  }
});

// GET /api/payroll/:id — Get single payroll record
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const records = readJSON<PayrollRecord>(PAYROLL_FILE);
    const record = records.find((r) => r.id === req.params.id);
    if (!record) {
      res.status(404).json({ error: 'Payroll record not found.' });
      return;
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payroll record.' });
  }
});

// DELETE /api/payroll/:id — Delete payroll record
router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const records = readJSON<PayrollRecord>(PAYROLL_FILE);
    const index = records.findIndex((r) => r.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Payroll record not found.' });
      return;
    }
    records.splice(index, 1);
    writeJSON(PAYROLL_FILE, records);
    res.json({ message: 'Payroll record deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete payroll record.' });
  }
});

export default router;
