import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJSON, writeJSON } from '../services/jsonStore';
import { MonthlyPaysheetDTO, User } from '../models';
import {
  calculatePaysheet,
  getRoleConfig,
  isSalesRole,
  type PaysheetInput,
  type PaysheetResult,
  type SalesRoleConfig,
  type NonTargetRoleConfig,
} from '../engine/salary-calculator';

const router = Router();
const PAYSHEETS_FILE = 'monthly-paysheets.json';

// ── Shared helpers ──────────────────────────────────────────

function parseLate(late: number): { lateHours: number; lateMinutes: number } {
  const lateHours = Math.floor(late);
  const lateMinutes = Math.round((late - lateHours) * 60);
  return { lateHours, lateMinutes };
}

function buildPaysheetInput(
  roleCode: string,
  roleConfig: SalesRoleConfig | NonTargetRoleConfig,
  fields: {
    monthsOfService: number;
    achieve?: number;
    allowance?: number;
    otherOffer?: number;
    nopay: number;
    lateHours: number;
    lateMinutes: number;
    welfare?: number;
    epfAvailability: boolean;
    customEarningAmount?: number;
    customDeductionAmount?: number;
  }
): PaysheetInput {
  const epf = fields.epfAvailability === true;

  if (isSalesRole(roleCode)) {
    return {
      role: roleConfig,
      monthsOfService: fields.monthsOfService,
      achievementAmount: fields.achieve || 0,
      generalAllowance: fields.allowance || 0,
      otherOffer: fields.otherOffer || 0,
      nopayDays: fields.nopay,
      lateHours: fields.lateHours,
      lateMinutes: fields.lateMinutes,
      others: fields.welfare || 0,
      epfAvailability: epf,
      customEarningAmount: fields.customEarningAmount || 0,
      customDeductionAmount: fields.customDeductionAmount || 0,
    };
  }

  return {
    role: roleConfig,
    monthsOfService: fields.monthsOfService,
    otherOffer: fields.otherOffer || 0,
    nopayDays: fields.nopay,
    lateHours: fields.lateHours,
    lateMinutes: fields.lateMinutes,
    others: fields.welfare || 0,
    epfAvailability: epf,
    customEarningAmount: fields.customEarningAmount || 0,
    customDeductionAmount: fields.customDeductionAmount || 0,
  };
}

function coerceBool(val: unknown): boolean {
  return val === true || val === 1;
}

// ── Static routes FIRST (before parameterised /:id) ─────────

// POST /api/paysheets/calculate — Preview calculation without saving
router.post('/calculate', (req: Request, res: Response): void => {
  try {
    const {
      role, achieve, allowance, nopay, lateHours, lateMinutes,
      epfAvailability, monthsOfService, welfare, otherOffer,
      customEarningAmount, customDeductionAmount,
    } = req.body;

    if (!role || typeof monthsOfService !== 'number') {
      res.status(400).json({ error: 'Missing required fields: role, monthsOfService' });
      return;
    }
    if (typeof nopay !== 'number') {
      res.status(400).json({ error: 'Invalid numeric value for nopay' });
      return;
    }

    const roleConfig = getRoleConfig(role);
    if (!roleConfig) {
      res.status(400).json({ error: `Invalid role code: ${role}` });
      return;
    }

    if (isSalesRole(role) && (typeof achieve !== 'number' || typeof allowance !== 'number')) {
      res.status(400).json({ error: 'Sales roles require numeric values for achieve and allowance' });
      return;
    }

    const input = buildPaysheetInput(role, roleConfig, {
      monthsOfService,
      achieve,
      allowance,
      nopay,
      lateHours: Number(lateHours) || 0,
      lateMinutes: Number(lateMinutes) || 0,
      welfare,
      otherOffer,
      epfAvailability: coerceBool(epfAvailability),
      customEarningAmount: Number(customEarningAmount) || 0,
      customDeductionAmount: Number(customDeductionAmount) || 0,
    });

    const result: PaysheetResult = calculatePaysheet(input);
    res.json({ message: 'Paysheet calculation completed', calculation: result });
  } catch (error) {
    console.error('Error calculating paysheet:', error);
    res.status(500).json({ error: 'Failed to calculate paysheet' });
  }
});

// GET /api/paysheets/month/:payMonth — All paysheets for a specific month
router.get('/month/:payMonth', (req: Request, res: Response): void => {
  try {
    const paysheets = readJSON<MonthlyPaysheetDTO>(PAYSHEETS_FILE)
      .filter((p) => p.payMonth === req.params.payMonth)
      .sort((a, b) => a.codeNo.localeCompare(b.codeNo));

    res.json({ paysheets, total: paysheets.length, month: req.params.payMonth });
  } catch (error) {
    console.error('Error fetching paysheets for month:', error);
    res.status(500).json({ error: 'Failed to fetch paysheets for month' });
  }
});

// ── Standard CRUD routes ────────────────────────────────────

// POST /api/paysheets — Create a new monthly paysheet
router.post('/', (req: Request, res: Response): void => {
  try {
    const {
      codeNo, payMonth, role,
      achieve, allowance, nopay, lateHours, lateMinutes,
      epfAvailability, etfAvailability,
      monthsOfService, welfare, otherOffer,
      customEarningName, customEarningAmount,
      customDeductionName, customDeductionAmount,
    } = req.body;

    console.log('[Paysheet POST] otherOffer received from client:', otherOffer, 'type:', typeof otherOffer);

    if (!codeNo || !payMonth || !role || typeof monthsOfService !== 'number') {
      res.status(400).json({ error: 'Missing required fields: codeNo, payMonth, role, monthsOfService' });
      return;
    }
    if (typeof nopay !== 'number') {
      res.status(400).json({ error: 'Invalid numeric value for nopay' });
      return;
    }

    const roleConfig = getRoleConfig(role);
    if (!roleConfig) {
      res.status(400).json({ error: `Invalid role code: ${role}` });
      return;
    }

    if (isSalesRole(role) && (typeof achieve !== 'number' || typeof allowance !== 'number')) {
      res.status(400).json({ error: 'Sales roles require numeric values for achieve and allowance' });
      return;
    }

    const users = readJSON<User>('users.json');
    if (!users.find((u) => u.codeNo === codeNo)) {
      res.status(400).json({ error: `User not found: ${codeNo}` });
      return;
    }

    const paysheets = readJSON<MonthlyPaysheetDTO>(PAYSHEETS_FILE);
    if (paysheets.find((p) => p.codeNo === codeNo && p.payMonth === payMonth)) {
      res.status(400).json({ error: `Paysheet already exists for ${codeNo} in ${payMonth}` });
      return;
    }

    const epf = coerceBool(epfAvailability);
    const input = buildPaysheetInput(role, roleConfig, {
      monthsOfService, achieve, allowance, nopay,
      lateHours: Number(lateHours) || 0,
      lateMinutes: Number(lateMinutes) || 0,
      welfare, otherOffer, epfAvailability: epf,
      customEarningAmount: Number(customEarningAmount) || 0,
      customDeductionAmount: Number(customDeductionAmount) || 0,
    });
    const calculated: PaysheetResult = calculatePaysheet(input);
    const now = new Date().toISOString();

    const newPaysheet: MonthlyPaysheetDTO = {
      id: uuidv4(),
      codeNo,
      payMonth,
      role,
      monthsOfService,
      achieve: achieve || 0,
      allowance: allowance || 0,
      nopay,
      late: 0,
      lateHours: Number(lateHours) || 0,
      lateMinutes: Number(lateMinutes) || 0,
      epfAvailability: epf,
      etfAvailability: coerceBool(etfAvailability),
      customEarningName: customEarningName || '',
      customEarningAmount: Number(customEarningAmount) || 0,
      customDeductionName: customDeductionName || '',
      customDeductionAmount: Number(customDeductionAmount) || 0,
      ...calculated,
      welfare: welfare || 0,
      otherOffer: Number(otherOffer) || 0,
      createdAt: now,
      updatedAt: now,
    };

    paysheets.push(newPaysheet);
    writeJSON(PAYSHEETS_FILE, paysheets);
    res.status(201).json({ message: 'Monthly paysheet created successfully', paysheet: newPaysheet });
  } catch (error) {
    console.error('Error creating paysheet:', error);
    res.status(500).json({ error: 'Failed to create monthly paysheet' });
  }
});

// GET /api/paysheets — List all paysheets
router.get('/', (req: Request, res: Response): void => {
  try {
    let paysheets = readJSON<MonthlyPaysheetDTO>(PAYSHEETS_FILE);
    const { codeNo, payMonth, role, search } = req.query;

    if (codeNo && typeof codeNo === 'string') {
      paysheets = paysheets.filter((p) => p.codeNo === codeNo);
    }
    if (payMonth && typeof payMonth === 'string') {
      paysheets = paysheets.filter((p) => p.payMonth === payMonth);
    }
    if (role && typeof role === 'string') {
      paysheets = paysheets.filter((p) => p.role === role);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      paysheets = paysheets.filter(
        (p) => p.codeNo.toLowerCase().includes(q) || p.role.toLowerCase().includes(q)
      );
    }

    paysheets.sort((a, b) => {
      const monthDiff = b.payMonth.localeCompare(a.payMonth);
      return monthDiff !== 0 ? monthDiff : a.codeNo.localeCompare(b.codeNo);
    });

    res.json({ paysheets, total: paysheets.length });
  } catch (error) {
    console.error('Error fetching paysheets:', error);
    res.status(500).json({ error: 'Failed to fetch monthly paysheets' });
  }
});

// GET /api/paysheets/:id — Single paysheet
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const paysheets = readJSON<MonthlyPaysheetDTO>(PAYSHEETS_FILE);
    const paysheet = paysheets.find((p) => p.id === req.params.id);
    if (!paysheet) {
      res.status(404).json({ error: 'Paysheet not found' });
      return;
    }
    res.json({ paysheet });
  } catch (error) {
    console.error('Error fetching paysheet:', error);
    res.status(500).json({ error: 'Failed to fetch paysheet' });
  }
});

// PUT /api/paysheets/:id — Update paysheet
router.put('/:id', (req: Request, res: Response): void => {
  try {
    const paysheets = readJSON<MonthlyPaysheetDTO>(PAYSHEETS_FILE);
    const index = paysheets.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Paysheet not found' });
      return;
    }

    const existing = paysheets[index];

    const roleConfig = getRoleConfig(existing.role);
    if (!roleConfig) {
      res.status(400).json({ error: `Invalid role code: ${existing.role}` });
      return;
    }

    const users = readJSON<User>('users.json');
    if (!users.find((u) => u.codeNo === existing.codeNo)) {
      res.status(400).json({ error: `User not found: ${existing.codeNo}` });
      return;
    }

    // Merge updated fields with existing values
    const achieve = req.body.achieve ?? existing.achieve;
    const allowance = req.body.allowance ?? existing.allowance;
    const nopay = req.body.nopay ?? existing.nopay;
    const lateHours = Number(req.body.lateHours ?? existing.lateHours) || 0;
    const lateMinutes = Number(req.body.lateMinutes ?? existing.lateMinutes) || 0;
    const monthsOfService = req.body.monthsOfService ?? existing.monthsOfService;
    const welfare = req.body.welfare ?? existing.welfare;
    const otherOffer = req.body.otherOffer ?? existing.otherOffer;
    const epfAvailability = req.body.epfAvailability !== undefined
      ? coerceBool(req.body.epfAvailability)
      : existing.epfAvailability;
    const etfAvailability = req.body.etfAvailability !== undefined
      ? coerceBool(req.body.etfAvailability)
      : existing.etfAvailability;
    const customEarningName = req.body.customEarningName ?? existing.customEarningName ?? '';
    const customEarningAmount = Number(req.body.customEarningAmount ?? existing.customEarningAmount) || 0;
    const customDeductionName = req.body.customDeductionName ?? existing.customDeductionName ?? '';
    const customDeductionAmount = Number(req.body.customDeductionAmount ?? existing.customDeductionAmount) || 0;

    const input = buildPaysheetInput(existing.role, roleConfig, {
      monthsOfService, achieve, allowance, nopay,
      lateHours, lateMinutes,
      welfare, otherOffer, epfAvailability,
      customEarningAmount, customDeductionAmount,
    });
    const calculated: PaysheetResult = calculatePaysheet(input);

    const updated: MonthlyPaysheetDTO = {
      ...existing,
      achieve,
      allowance,
      nopay,
      late: 0,
      lateHours,
      lateMinutes,
      epfAvailability,
      etfAvailability,
      monthsOfService,
      customEarningName,
      customEarningAmount,
      customDeductionName,
      customDeductionAmount,
      ...calculated,
      welfare,
      otherOffer: Number(otherOffer) || 0,
      updatedAt: new Date().toISOString(),
    };

    paysheets[index] = updated;
    writeJSON(PAYSHEETS_FILE, paysheets);
    res.json({ message: 'Paysheet updated successfully', paysheet: updated });
  } catch (error) {
    console.error('Error updating paysheet:', error);
    res.status(500).json({ error: 'Failed to update paysheet' });
  }
});

// DELETE /api/paysheets/:id
router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const paysheets = readJSON<MonthlyPaysheetDTO>(PAYSHEETS_FILE);
    const index = paysheets.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Paysheet not found' });
      return;
    }

    const deleted = paysheets.splice(index, 1)[0];
    writeJSON(PAYSHEETS_FILE, paysheets);
    res.json({ message: 'Paysheet deleted successfully', paysheet: deleted });
  } catch (error) {
    console.error('Error deleting paysheet:', error);
    res.status(500).json({ error: 'Failed to delete paysheet' });
  }
});

export default router;
