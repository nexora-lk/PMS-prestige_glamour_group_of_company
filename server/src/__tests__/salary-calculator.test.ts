/**
 * Salary Calculator unit tests — core scenarios
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePaysheet,
  getRoleConfig,
  isSalesRole,
} from '../engine/salary-calculator';

// ── Helpers ───────────────────────────────────────────────────────────────────

function near(a: number, b: number) {
  return Math.abs(a - b) < 0.01;
}

// ── Test 1: BM, 4 months, 2.2M achievement ───────────────────────────────────

describe('BM — 4 months, 2.2M achievement, 2 no-pay, 1h45m late', () => {
  const config = getRoleConfig('BM')!;
  const result = calculatePaysheet({
    role: config,
    monthsOfService: 4,
    achievementAmount: 2_200_000,
    generalAllowance: 10_000,
    otherOffer: 5_000,
    nopayDays: 2,
    lateHours: 1,
    lateMinutes: 45,
    others: 2000,
    epfAvailability: true,
  });

  it('BM is a sales role', () => expect(isSalesRole('BM')).toBe(true));
  it('assignedTarget = 2,275,000', () => expect(near(result.assignedTarget ?? 0, 2_275_000)).toBe(true));
  it('achievementPct ≈ 96%', () => expect(near((result.achievementPct ?? 0) * 100, 96)).toBe(true));
  it('otherOffer = 5,000', () => expect(near(result.otherOffer ?? 0, 5_000)).toBe(true));
  it('vehicleAllowance = 30,000', () => expect(near(result.vehicleAllowance ?? 0, 30_000)).toBe(true));
  it('nopayDeduction = 3,000', () => expect(near(result.nopayDeduction, 3_000)).toBe(true));
  it('lateDeduction ≈ 437.5', () => expect(near(result.lateDeduction, 437.5)).toBe(true));
  it('epfEmployee = 4,000', () => expect(near(result.epfEmployee, 4_000)).toBe(true));
});

// ── Test 2: AGM, 6 months, 251.5M (≈100%) ────────────────────────────────────

describe('AGM — 6 months, 251.5M achievement (≈100%)', () => {
  const config = getRoleConfig('AGM')!;
  const result = calculatePaysheet({
    role: config,
    monthsOfService: 6,
    achievementAmount: 251_500_000,
    generalAllowance: 0,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('assignedTarget = 250,000,000', () => expect(near(result.assignedTarget ?? 0, 250_000_000)).toBe(true));
  it('vehicleAllowance = 120,000', () => expect(near(result.vehicleAllowance ?? 0, 120_000)).toBe(true));
  it('fuelAllowance = 100,000', () => expect(near(result.fuelAllowance ?? 0, 100_000)).toBe(true));
  it('orc = 0 (no ORC at exactly 100%)', () => expect(near(result.orc ?? 0, 0)).toBe(true));
  it('netSalary = 450,000', () => expect(near(result.netSalary, 450_000)).toBe(true));
});

// ── Test 3: SR_EXEC_HR (Cat B), 2 no-pay, 10h late ──────────────────────────

describe('SR_EXEC_HR — 1 month, 10K otherOffer, 2 no-pay days, 10h late', () => {
  const config = getRoleConfig('SR_EXEC_HR')!;
  const result = calculatePaysheet({
    role: config,
    monthsOfService: 1,
    otherOffer: 10_000,
    nopayDays: 2,
    lateHours: 10,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('SR_EXEC_HR is NOT a sales role', () => expect(isSalesRole('SR_EXEC_HR')).toBe(false));
  it('grossSalary = 52,500', () => expect(near(result.grossSalary, 52_500)).toBe(true));
  it('nopayDeduction = 2,550', () => expect(near(result.nopayDeduction, 2_550)).toBe(true));
  it('lateDeduction = 2,125', () => expect(near(result.lateDeduction, 2_125)).toBe(true));
  it('epfEmployee = 4,200', () => expect(near(result.epfEmployee, 4_200)).toBe(true));
  it('netSalary = 43,625', () => expect(near(result.netSalary, 43_625)).toBe(true));
});

// ── Test 4: CCI (Cat B), no deductions ───────────────────────────────────────

describe('CCI — 1 month, 10K otherOffer, no deductions', () => {
  const config = getRoleConfig('CCI')!;
  const result = calculatePaysheet({
    role: config,
    monthsOfService: 1,
    otherOffer: 10_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('grossSalary = 45,000', () => expect(near(result.grossSalary, 45_000)).toBe(true));
  it('netSalary = 41,400', () => expect(near(result.netSalary, 41_400)).toBe(true));
});

// ── Test 5: MANAGER_ADMIN (Cat B), 2 no-pay, 10h late ────────────────────────

describe('MANAGER_ADMIN — 1 month, 0 otherOffer, 2 no-pay, 10h late', () => {
  const config = getRoleConfig('MANAGER_ADMIN')!;
  const result = calculatePaysheet({
    role: config,
    monthsOfService: 1,
    otherOffer: 0,
    nopayDays: 2,
    lateHours: 10,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('grossSalary = 75,000', () => expect(near(result.grossSalary, 75_000)).toBe(true));
  it('netSalary = 60,750', () => expect(near(result.netSalary, 60_750)).toBe(true));
});

// ── Test 6: BM, 5 months, exactly 100% achievement ───────────────────────────

describe('BM — 5 months, exactly 100% achievement', () => {
  const config = getRoleConfig('BM')!;
  const result = calculatePaysheet({
    role: config,
    monthsOfService: 5,
    achievementAmount: 2_625_000,
    generalAllowance: 0,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('assignedTarget = 2,625,000', () => expect(near(result.assignedTarget ?? 0, 2_625_000)).toBe(true));
  it('vehicleAllowance = 30,000', () => expect(near(result.vehicleAllowance ?? 0, 30_000)).toBe(true));
  it('orc = 0 at exactly 100%', () => expect(near(result.orc ?? 0, 0)).toBe(true));
  it('netSalary = 96,000', () => expect(near(result.netSalary, 96_000)).toBe(true));
});

// ── Test 7: MICRO_FIN_EXEC (Cat B), EPF not enrolled ─────────────────────────

describe('MICRO_FIN_EXEC — EPF not enrolled', () => {
  const config = getRoleConfig('MICRO_FIN_EXEC')!;
  const result = calculatePaysheet({
    role: config,
    monthsOfService: 1,
    otherOffer: 50_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: false,
  });

  it('grossSalary = 80,000', () => expect(near(result.grossSalary, 80_000)).toBe(true));
  it('epfEmployee = 0 (not enrolled)', () => expect(near(result.epfEmployee, 0)).toBe(true));
  it('netSalary = 80,000 (no deductions)', () => expect(near(result.netSalary, 80_000)).toBe(true));
});

// ── GM with otherOffer ────────────────────────────────────────────────────────

describe('GM — 2 months, 75M achievement, 10K otherOffer', () => {
  const config = getRoleConfig('GM')!;
  const result = calculatePaysheet({
    role: config,
    monthsOfService: 2,
    achievementAmount: 75_000_000,
    generalAllowance: 0,
    otherOffer: 10_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  it('GM is a sales role', () => expect(isSalesRole('GM')).toBe(true));
  it('assignedTarget = 175,000,000', () => expect(near(result.assignedTarget ?? 0, 175_000_000)).toBe(true));
  it('achievementPct ≈ 42%', () => expect(near((result.achievementPct ?? 0) * 100, 42)).toBe(true));
  it('otherOffer = 10,000', () => expect(near(result.otherOffer ?? 0, 10_000)).toBe(true));
  it('epfEmployee = 18,480', () => expect(near(result.epfEmployee, 18_480)).toBe(true));
  it('grossSalary includes otherOffer', () => expect(result.grossSalary).toBeGreaterThanOrEqual(10_000));
});
