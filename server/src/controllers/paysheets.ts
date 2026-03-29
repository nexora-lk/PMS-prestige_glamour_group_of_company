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
} from '../engine/salary-calculator';

const router = Router();
const PAYSHEETS_FILE = 'monthly-paysheets.json';

// POST /api/paysheets — Create a new monthly paysheet
router.post('/', (req: Request, res: Response): void => {
  try {
    const {
      employeeId,
      codeNo,
      payMonth,
      role,
      achieve,
      allowance,
      nopay,
      late,
      epfAvailability,
      etfAvailability,
      monthsOfService,
      welfare,
      otherOfficers,
    } = req.body;

    // Validation
    if (!employeeId || !codeNo || !payMonth || !role || typeof monthsOfService !== 'number') {
      res.status(400).json({
        error: 'Missing required fields: employeeId, codeNo, payMonth, role, monthsOfService',
      });
      return;
    }

    if (
      typeof nopay !== 'number' ||
      typeof late !== 'number'
    ) {
      res.status(400).json({
        error: 'Invalid numeric values for nopay, late',
      });
      return;
    }

    // Get role configuration
    const roleConfig = getRoleConfig(role);
    if (!roleConfig) {
      res.status(400).json({ error: `Invalid role code: ${role}` });
      return;
    }

    // Get user to verify employee exists
    const users = readJSON<User>('users.json');
    const user = users.find((u) => u.id === employeeId);
    if (!user) {
      res.status(400).json({ error: `User not found: ${employeeId}` });
      return;
    }

    const paysheets = readJSON<MonthlyPaysheetDTO>(PAYSHEETS_FILE);

    // Check if paysheet already exists for this employee and month
    const existing = paysheets.find(
      (p) => p.employeeId === employeeId && p.payMonth === payMonth
    );

    if (existing) {
      res.status(400).json({
        error: `Paysheet already exists for ${codeNo} in ${payMonth}`,
      });
      return;
    }

    // Parse late field (could be hours or hours.minutes)
    let lateHours: number;
    let lateMinutes: number;
    lateHours = Math.floor(late);
    lateMinutes = Math.round((late - lateHours) * 60);

    // Prepare input based on role category
    let paysheetInput: PaysheetInput;

    if (isSalesRole(role)) {
      // Sales role - requires achieve and allowance
      if (typeof achieve !== 'number' || typeof allowance !== 'number') {
        res.status(400).json({
          error: 'Sales roles require numeric values for achieve and allowance',
        });
        return;
      }
      paysheetInput = {
        role: roleConfig,
        monthsOfService,
        achievementAmount: achieve,
        generalAllowance: allowance,
        nopayDays: nopay,
        lateHours,
        lateMinutes,
        others: welfare || 0,
        epfAvailability: epfAvailability === true || epfAvailability === 1,
      };
    } else {
      // Non-target role
      paysheetInput = {
        role: roleConfig,
        monthsOfService,
        otherOffer: otherOfficers || 0,
        nopayDays: nopay,
        lateHours,
        lateMinutes,
        others: welfare || 0,
        epfAvailability: epfAvailability === true || epfAvailability === 1,
      };
    }

    // Calculate paysheet using salary calculator
    const calculatedResult: PaysheetResult = calculatePaysheet(paysheetInput);

    const newPaysheet: MonthlyPaysheetDTO = {
      id: uuidv4(),
      employeeId,
      codeNo,
      payMonth,
      role,
      monthsOfService,
      achieve: achieve || 0,
      allowance: allowance || 0,
      nopay,
      late,
      epfAvailability: epfAvailability === true || epfAvailability === 1,
      etfAvailability: etfAvailability === true || etfAvailability === 1,
      otherOfficers: otherOfficers || 0,
      // Store calculated results
      ...calculatedResult,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store welfare as a top-level input field (separate from calculated welfare)
    newPaysheet.welfare = welfare || 0;

    paysheets.push(newPaysheet);
    writeJSON(PAYSHEETS_FILE, paysheets);

    res.status(201).json({
      message: 'Monthly paysheet created successfully',
      paysheet: newPaysheet,
    });
  } catch (error) {
    console.error('Error creating paysheet:', error);
    res.status(500).json({ error: 'Failed to create monthly paysheet' });
  }
});

// GET /api/paysheets — List all monthly paysheets with filters
router.get('/', (req: Request, res: Response): void => {
  try {
    let paysheets = readJSON<MonthlyPaysheetDTO>(PAYSHEETS_FILE);
    const { employeeId, payMonth, role, search } = req.query;

    if (employeeId && typeof employeeId === 'string') {
      paysheets = paysheets.filter((p) => p.employeeId === employeeId);
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
        (p) =>
          p.codeNo.toLowerCase().includes(q) ||
          p.role.toLowerCase().includes(q)
      );
    }

    // Sort by payMonth desc, then by codeNo
    paysheets.sort((a, b) => {
      const monthDiff = b.payMonth.localeCompare(a.payMonth);
      return monthDiff !== 0 ? monthDiff : a.codeNo.localeCompare(b.codeNo);
    });

    res.json({
      paysheets,
      total: paysheets.length,
    });
  } catch (error) {
    console.error('Error fetching paysheets:', error);
    res.status(500).json({ error: 'Failed to fetch monthly paysheets' });
  }
});

// GET /api/paysheets/:id — Get a single monthly paysheet
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

// PUT /api/paysheets/:id — Update a monthly paysheet
router.put('/:id', (req: Request, res: Response): void => {
  try {
    const paysheets = readJSON<MonthlyPaysheetDTO>(PAYSHEETS_FILE);
    const index = paysheets.findIndex((p) => p.id === req.params.id);

    if (index === -1) {
      res.status(404).json({ error: 'Paysheet not found' });
      return;
    }

    const paysheet = paysheets[index];

    // Get role configuration
    const roleConfig = getRoleConfig(paysheet.role);
    if (!roleConfig) {
      res.status(400).json({ error: `Invalid role code: ${paysheet.role}` });
      return;
    }

    // Get user to verify employee exists
    const users = readJSON<User>('users.json');
    const user = users.find((u) => u.id === paysheet.employeeId);
    if (!user) {
      res.status(400).json({ error: `User not found: ${paysheet.employeeId}` });
      return;
    }

    // Update fields with new values
    const achieve = req.body.achieve !== undefined ? req.body.achieve : paysheet.achieve;
    const allowance = req.body.allowance !== undefined ? req.body.allowance : paysheet.allowance;
    const nopay = req.body.nopay !== undefined ? req.body.nopay : paysheet.nopay;
    const late = req.body.late !== undefined ? req.body.late : paysheet.late;
    const epfAvailability =
      req.body.epfAvailability !== undefined
        ? req.body.epfAvailability === true || req.body.epfAvailability === 1
        : paysheet.epfAvailability;
    const monthsOfService =
      req.body.monthsOfService !== undefined ? req.body.monthsOfService : paysheet.monthsOfService;
    const welfare = req.body.welfare !== undefined ? req.body.welfare : paysheet.welfare;
    const etfAvailability =
      req.body.etfAvailability !== undefined
        ? req.body.etfAvailability === true || req.body.etfAvailability === 1
        : paysheet.etfAvailability;
    const otherOfficers =
      req.body.otherOfficers !== undefined ? req.body.otherOfficers : paysheet.otherOfficers;

    // Parse late field
    let lateHours: number;
    let lateMinutes: number;
    lateHours = Math.floor(late);
    lateMinutes = Math.round((late - lateHours) * 60);

    // Prepare input based on role category
    let paysheetInput: PaysheetInput;

    if (isSalesRole(paysheet.role)) {
      paysheetInput = {
        role: roleConfig,
        monthsOfService,
        achievementAmount: achieve,
        generalAllowance: allowance,
        nopayDays: nopay,
        lateHours,
        lateMinutes,
        others: welfare || 0,
        epfAvailability,
      };
    } else {
      paysheetInput = {
        role: roleConfig,
        monthsOfService,
        otherOffer: otherOfficers || 0,
        nopayDays: nopay,
        lateHours,
        lateMinutes,
        others: welfare || 0,
        epfAvailability,
      };
    }

    // Recalculate paysheet
    const calculatedResult: PaysheetResult = calculatePaysheet(paysheetInput);

    const updated: MonthlyPaysheetDTO = {
      ...paysheet,
      achieve,
      allowance,
      nopay,
      late,
      epfAvailability,
      etfAvailability,
      monthsOfService,
      otherOfficers,
      // Store updated calculated results
      ...calculatedResult,
      updatedAt: new Date().toISOString(),
    };

    paysheets[index] = updated;
    writeJSON(PAYSHEETS_FILE, paysheets);

    res.json({
      message: 'Paysheet updated successfully',
      paysheet: updated,
    });
  } catch (error) {
    console.error('Error updating paysheet:', error);
    res.status(500).json({ error: 'Failed to update paysheet' });
  }
});

// POST /api/paysheets/calculate — Calculate and preview paysheet without saving
// IMPORTANT: This route must be defined BEFORE /:id to avoid Express matching "calculate" as an ID
router.post('/calculate', (req: Request, res: Response): void => {
  try {
    const { role, achieve, allowance, nopay, late, epfAvailability, monthsOfService, welfare, otherOfficers } = req.body;

    // Validation
    if (!role || typeof monthsOfService !== 'number') {
      res.status(400).json({ error: 'Missing required fields: role, monthsOfService' });
      return;
    }

    if (typeof nopay !== 'number' || typeof late !== 'number') {
      res.status(400).json({ error: 'Invalid numeric values for nopay, late' });
      return;
    }

    // Get role configuration
    const roleConfig = getRoleConfig(role);
    if (!roleConfig) {
      res.status(400).json({ error: `Invalid role code: ${role}` });
      return;
    }

    // Parse late field
    let lateHours: number;
    let lateMinutes: number;
    lateHours = Math.floor(late);
    lateMinutes = Math.round((late - lateHours) * 60);

    // Prepare input based on role category
    let paysheetInput: PaysheetInput;

    if (isSalesRole(role)) {
      if (typeof achieve !== 'number' || typeof allowance !== 'number') {
        res.status(400).json({
          error: 'Sales roles require numeric values for achieve and allowance',
        });
        return;
      }
      paysheetInput = {
        role: roleConfig,
        monthsOfService,
        achievementAmount: achieve,
        generalAllowance: allowance,
        nopayDays: nopay,
        lateHours,
        lateMinutes,
        others: welfare || 0,
        epfAvailability: epfAvailability === true || epfAvailability === 1,
      };
    } else {
      paysheetInput = {
        role: roleConfig,
        monthsOfService,
        otherOffer: otherOfficers || 0,
        nopayDays: nopay,
        lateHours,
        lateMinutes,
        others: welfare || 0,
        epfAvailability: epfAvailability === true || epfAvailability === 1,
      };
    }

    // Calculate paysheet
    const calculatedResult: PaysheetResult = calculatePaysheet(paysheetInput);

    res.json({
      message: 'Paysheet calculation completed',
      calculation: calculatedResult,
    });
  } catch (error) {
    console.error('Error calculating paysheet:', error);
    res.status(500).json({ error: 'Failed to calculate paysheet' });
  }
});

// GET /api/paysheets/month/:payMonth — Get all paysheets for a specific month
// IMPORTANT: This route must be defined BEFORE /:id to avoid Express matching "month" as an ID
router.get('/month/:payMonth', (req: Request, res: Response): void => {
  try {
    let paysheets = readJSON<MonthlyPaysheetDTO>(PAYSHEETS_FILE);
    paysheets = paysheets.filter((p) => p.payMonth === req.params.payMonth);

    paysheets.sort((a, b) => a.codeNo.localeCompare(b.codeNo));

    res.json({
      paysheets,
      total: paysheets.length,
      month: req.params.payMonth,
    });
  } catch (error) {
    console.error('Error fetching paysheets for month:', error);
    res.status(500).json({ error: 'Failed to fetch paysheets for month' });
  }
});

// DELETE /api/paysheets/:id — Delete a monthly paysheet
router.delete('/:id', (req: Request, res: Response): void => {
  try {
    let paysheets = readJSON<MonthlyPaysheetDTO>(PAYSHEETS_FILE);
    const index = paysheets.findIndex((p) => p.id === req.params.id);

    if (index === -1) {
      res.status(404).json({ error: 'Paysheet not found' });
      return;
    }

    const deleted = paysheets.splice(index, 1)[0];
    writeJSON(PAYSHEETS_FILE, paysheets);

    res.json({
      message: 'Paysheet deleted successfully',
      paysheet: deleted,
    });
  } catch (error) {
    console.error('Error deleting paysheet:', error);
    res.status(500).json({ error: 'Failed to delete paysheet' });
  }
});


export default router;


