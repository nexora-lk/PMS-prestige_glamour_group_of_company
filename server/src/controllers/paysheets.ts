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

function validatePaysheetFields(body: Record<string, unknown>, isCreate: boolean): string | null {
  const { codeNo, payMonth, role, monthsOfService, achieve, allowance, nopay,
    lateHours, lateMinutes, welfare, otherOffer,
    customEarningName, customEarningAmount, customDeductionName, customDeductionAmount } = body;

  // Required fields (create only)
  if (isCreate) {
    if (!codeNo || typeof codeNo !== 'string' || !codeNo.trim()) return 'codeNo is required';
    if (!payMonth || typeof payMonth !== 'string' || !payMonth.trim()) return 'payMonth is required';
    if (!role || typeof role !== 'string' || !role.trim()) return 'role is required';
    if (monthsOfService === undefined || monthsOfService === null || monthsOfService === '') return 'monthsOfService is required';
    const mos = Number(monthsOfService);
    if (isNaN(mos)) return 'monthsOfService must be a number';
  }

  // payMonth format
  if (payMonth !== undefined && (typeof payMonth !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(payMonth))) {
    return 'payMonth must be in YYYY-MM format';
  }

  // monthsOfService: integer >= 0
  if (monthsOfService !== undefined) {
    const mos = Number(monthsOfService);
    if (isNaN(mos) || mos < 0) return 'monthsOfService must be 0 or greater';
    if (mos % 1 !== 0) return 'monthsOfService must be a whole number';
  }

  // nopay: >= 0, <= 31
  if (nopay !== undefined) {
    const n = Number(nopay);
    if (isNaN(n) || n < 0) return 'nopay must be 0 or greater';
    if (n > 31) return 'nopay cannot exceed 31 days';
  }

  // lateHours: integer >= 0
  if (lateHours !== undefined) {
    const lh = Number(lateHours);
    if (isNaN(lh) || lh < 0) return 'lateHours must be 0 or greater';
    if (lh % 1 !== 0) return 'lateHours must be a whole number';
  }

  // lateMinutes: integer 0-59
  if (lateMinutes !== undefined) {
    const lm = Number(lateMinutes);
    if (isNaN(lm) || lm < 0 || lm > 59) return 'lateMinutes must be between 0 and 59';
    if (lm % 1 !== 0) return 'lateMinutes must be a whole number';
  }

  // Amount fields: must be >= 0 if provided
  const amountFields = { achieve, allowance, welfare, otherOffer, customEarningAmount, customDeductionAmount };
  for (const [key, val] of Object.entries(amountFields)) {
    if (val !== undefined && val !== null) {
      const num = Number(val);
      if (isNaN(num) || num < 0) return `${key} must be 0 or a positive number`;
    }
  }

  // Custom earning: name required if amount > 0
  if (Number(customEarningAmount) > 0 && (!customEarningName || typeof customEarningName !== 'string' || !customEarningName.trim())) {
    return 'customEarningName is required when customEarningAmount is set';
  }

  // Custom deduction: name required if amount > 0
  if (Number(customDeductionAmount) > 0 && (!customDeductionName || typeof customDeductionName !== 'string' || !customDeductionName.trim())) {
    return 'customDeductionName is required when customDeductionAmount is set';
  }

  return null;
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

    // Validate fields
    const calcValidation = validatePaysheetFields({ ...req.body, codeNo: '_calc', payMonth: '2000-01' }, true);
    if (calcValidation) {
      res.status(400).json({ error: calcValidation });
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
      monthsOfService: Number(monthsOfService),
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

// POST /api/paysheets/bulk-create — Auto-create basic paysheets for employees missing them
router.post('/bulk-create', (req: Request, res: Response): void => {
  try {
    const { codeNos, payMonth } = req.body;
    if (!Array.isArray(codeNos) || !payMonth) {
      res.status(400).json({ error: 'codeNos (array) and payMonth are required.' });
      return;
    }

    const users = readJSON<User>('users.json');
    const paysheets = readJSON<MonthlyPaysheetDTO>(PAYSHEETS_FILE);
    const existingKeys = new Set(paysheets.filter(p => p.payMonth === payMonth).map(p => p.codeNo));

    // Role name → code mapping (reverse of SALES_BASED_ROLES + NON_TARGET_ROLES)
    const { SALES_BASED_ROLES, NON_TARGET_ROLES } = require('../engine/salary-calculator');
    const nameToCode: Record<string, string> = {};
    for (const [code, name] of Object.entries(SALES_BASED_ROLES)) {
      nameToCode[name as string] = code;
    }
    for (const [code, name] of Object.entries(NON_TARGET_ROLES)) {
      nameToCode[name as string] = code;
    }

    const created: MonthlyPaysheetDTO[] = [];
    const errors: string[] = [];

    for (const codeNo of codeNos) {
      if (existingKeys.has(codeNo)) continue; // already has paysheet

      const user = users.find(u => u.codeNo === codeNo);
      if (!user) { errors.push(`User not found: ${codeNo}`); continue; }

      // Resolve role code from user's role name or designation
      const roleName = user.role || user.designation || '';
      const roleCode = nameToCode[roleName] || roleName;
      const roleConfig = getRoleConfig(roleCode);
      if (!roleConfig) { errors.push(`Unknown role for ${codeNo}: ${roleName}`); continue; }

      const input = buildPaysheetInput(roleCode, roleConfig, {
        monthsOfService: 1,
        achieve: 0,
        allowance: 0,
        nopay: 0,
        lateHours: 0,
        lateMinutes: 0,
        welfare: 0,
        otherOffer: 0,
        epfAvailability: true,
        customEarningAmount: 0,
        customDeductionAmount: 0,
      });

      const calculated: PaysheetResult = calculatePaysheet(input);
      const now = new Date().toISOString();
      const newPaysheet: MonthlyPaysheetDTO = {
        id: uuidv4(),
        codeNo,
        payMonth,
        role: roleCode,
        monthsOfService: 1,
        achieve: 0,
        allowance: 0,
        nopay: 0,
        late: 0,
        lateHours: 0,
        lateMinutes: 0,
        epfAvailability: true,
        etfAvailability: true,
        customEarningName: '',
        customEarningAmount: 0,
        customDeductionName: '',
        customDeductionAmount: 0,
        ...calculated,
        welfare: 0,
        otherOffer: 0,
        createdAt: now,
        updatedAt: now,
      };

      paysheets.push(newPaysheet);
      created.push(newPaysheet);
    }

    if (created.length > 0) {
      writeJSON(PAYSHEETS_FILE, paysheets);
    }

    res.json({
      message: `Created ${created.length} paysheet(s)`,
      created: created.length,
      errors,
    });
  } catch (error) {
    console.error('Error in bulk-create:', error);
    res.status(500).json({ error: 'Failed to bulk-create paysheets' });
  }
});

// GET /api/paysheets/month/:payMonth — Paysheets for a specific month (paginated)
router.get('/month/:payMonth', (req: Request, res: Response): void => {
  try {
    let paysheets = readJSON<MonthlyPaysheetDTO>(PAYSHEETS_FILE)
      .filter((p) => p.payMonth === req.params.payMonth);

    const { search } = req.query;
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      paysheets = paysheets.filter(
        (p) => p.codeNo.toLowerCase().includes(q) || p.role.toLowerCase().includes(q)
      );
    }

    paysheets.sort((a, b) => a.codeNo.localeCompare(b.codeNo));
    const total = paysheets.length;

    const { page, limit } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 15;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedPaysheets = paysheets.slice(startIndex, startIndex + limitNum);

    res.json({
      paysheets: paginatedPaysheets,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      month: req.params.payMonth,
    });
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

    // Validate all fields
    const validationError = validatePaysheetFields(req.body, true);
    if (validationError) {
      res.status(400).json({ error: validationError });
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
      monthsOfService: Number(monthsOfService),
      achieve,
      allowance,
      nopay,
      lateHours: Number(lateHours) || 0,
      lateMinutes: Number(lateMinutes) || 0,
      welfare,
      otherOffer,
      epfAvailability: epf,
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

// GET /api/paysheets — List all paysheets (paginated)
router.get('/', (req: Request, res: Response): void => {
  try {
    let paysheets = readJSON<MonthlyPaysheetDTO>(PAYSHEETS_FILE);
    const { codeNo, payMonth, role, search, page, limit } = req.query;

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

    const total = paysheets.length;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 15;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedPaysheets = paysheets.slice(startIndex, startIndex + limitNum);

    res.json({
      paysheets: paginatedPaysheets,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
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

    // Validate updated fields
    const validationError = validatePaysheetFields(req.body, false);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

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
    const monthsOfService = Number(req.body.monthsOfService ?? existing.monthsOfService);
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
