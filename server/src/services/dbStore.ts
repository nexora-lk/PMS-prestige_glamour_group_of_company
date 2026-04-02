import { getDb } from './db';
import { User, PayrollRecord, MonthlyPaysheetDTO, AdminCredentials } from '../models';

// ── Helper: convert snake_case DB row to camelCase model ──────

function rowToUser(r: Record<string, unknown>): User {
  return {
    codeNo: r.code_no as string,
    firstName: r.first_name as string,
    lastName: r.last_name as string,
    email: r.email as string,
    phone: (r.phone as string) || '',
    branch: (r.branch as string) || '',
    role: (r.role as string) || '',
    designation: (r.designation as string) || '',
    joinDate: (r.join_date as string) || '',
    bankAccount: (r.bank_account as string) || '',
    bankName: (r.bank_name as string) || '',
    basicSalary: Number(r.basic_salary) || 0,
    allowances: Number(r.allowances) || 0,
    deductions: Number(r.deductions) || 0,
    status: (r.status as 'active' | 'delete') || 'active',
    createdAt: r.created_at ? new Date(r.created_at as string).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at as string).toISOString() : new Date().toISOString(),
  };
}

function rowToPayroll(r: Record<string, unknown>): PayrollRecord {
  return {
    id: r.id as string,
    codeNo: r.code_no as string,
    userName: r.user_name as string,
    period: r.period as string,
    basicSalary: Number(r.basic_salary) || 0,
    allowances: Number(r.allowances) || 0,
    deductions: Number(r.deductions) || 0,
    tax: Number(r.tax) || 0,
    grossSalary: Number(r.gross_salary) || 0,
    netSalary: Number(r.net_salary) || 0,
    branch: (r.branch as string) || '',
    designation: (r.designation as string) || '',
    generatedAt: r.generated_at ? new Date(r.generated_at as string).toISOString() : new Date().toISOString(),
  };
}

function rowToPaysheet(r: Record<string, unknown>): MonthlyPaysheetDTO {
  return {
    id: r.id as string,
    codeNo: r.code_no as string,
    payMonth: r.pay_month as string,
    role: r.role as string,
    monthsOfService: Number(r.months_of_service) || 0,
    achieve: Number(r.achieve) || 0,
    allowance: Number(r.allowance) || 0,
    nopay: Number(r.nopay) || 0,
    late: Number(r.late) || 0,
    lateHours: Number(r.late_hours) || 0,
    lateMinutes: Number(r.late_minutes) || 0,
    epfAvailability: r.epf_availability as boolean,
    etfAvailability: r.etf_availability as boolean,
    welfare: Number(r.welfare) || 0,
    otherOffer: Number(r.other_offer) || 0,
    customEarningName: (r.custom_earning_name as string) || '',
    customEarningAmount: Number(r.custom_earning_amount) || 0,
    customDeductionName: (r.custom_deduction_name as string) || '',
    customDeductionAmount: Number(r.custom_deduction_amount) || 0,
    basicSalary: Number(r.basic_salary) || 0,
    achievedSalary: Number(r.achieved_salary) || 0,
    assignedTarget: Number(r.assigned_target) || 0,
    achievementPct: Number(r.achievement_pct) || 0,
    grossSalary: Number(r.gross_salary) || 0,
    vehicleAllowance: Number(r.vehicle_allowance) || 0,
    fuelAllowance: Number(r.fuel_allowance) || 0,
    generalAllowance: Number(r.general_allowance) || 0,
    orc: Number(r.orc) || 0,
    subTotal: Number(r.sub_total) || 0,
    nopayDeduction: Number(r.nopay_deduction) || 0,
    lateDeduction: Number(r.late_deduction) || 0,
    epfEmployee: Number(r.epf_employee) || 0,
    epfEmployer: Number(r.epf_employer) || 0,
    etf: Number(r.etf) || 0,
    netSalary: Number(r.net_salary) || 0,
    status: (r.status as 'active' | 'delete') || 'active',
    createdAt: r.created_at ? new Date(r.created_at as string).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at as string).toISOString() : new Date().toISOString(),
  };
}

// ── Admin ─────────────────────────────────────────────────────

export async function dbGetAdmin(): Promise<AdminCredentials | null> {
  const db = getDb();
  const rows = await db`SELECT * FROM admin LIMIT 1`;
  if (rows.length === 0) return null;
  return rows[0] as unknown as AdminCredentials;
}

export async function dbSaveAdmin(admin: AdminCredentials): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO admin (username, password, name, role)
    VALUES (${admin.username}, ${admin.password}, ${admin.name}, ${admin.role})
    ON CONFLICT (username) DO UPDATE SET password = ${admin.password}, name = ${admin.name}, role = ${admin.role}
  `;
}

// ── Users ─────────────────────────────────────────────────────

export async function dbGetAllUsers(): Promise<User[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM users ORDER BY created_at DESC`;
  return rows.map((r: Record<string, unknown>) => rowToUser(r));
}

export async function dbGetUser(codeNo: string): Promise<User | null> {
  const db = getDb();
  const rows = await db`SELECT * FROM users WHERE code_no = ${codeNo}`;
  if (rows.length === 0) return null;
  return rowToUser(rows[0] as Record<string, unknown>);
}

export async function dbCreateUser(user: User): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO users (code_no, first_name, last_name, email, phone, branch, role, designation,
      join_date, bank_account, bank_name, basic_salary, allowances, deductions, status, created_at, updated_at)
    VALUES (${user.codeNo}, ${user.firstName}, ${user.lastName}, ${user.email}, ${user.phone}, ${user.branch},
      ${user.role}, ${user.designation}, ${user.joinDate}, ${user.bankAccount}, ${user.bankName},
      ${user.basicSalary}, ${user.allowances}, ${user.deductions}, ${user.status}, ${user.createdAt}, ${user.updatedAt})
  `;
}

export async function dbUpdateUser(codeNo: string, user: User): Promise<void> {
  const db = getDb();
  await db`
    UPDATE users SET first_name=${user.firstName}, last_name=${user.lastName}, email=${user.email},
      phone=${user.phone}, branch=${user.branch}, role=${user.role}, designation=${user.designation},
      join_date=${user.joinDate}, bank_account=${user.bankAccount}, bank_name=${user.bankName},
      basic_salary=${user.basicSalary}, allowances=${user.allowances}, deductions=${user.deductions},
      status=${user.status}, updated_at=${user.updatedAt}
    WHERE code_no=${codeNo}
  `;
}

export async function dbDeleteUser(codeNo: string): Promise<void> {
  const db = getDb();
  await db`DELETE FROM users WHERE code_no = ${codeNo}`;
}

// ── Payroll Records ───────────────────────────────────────────

export async function dbGetAllPayroll(): Promise<PayrollRecord[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM payroll_records ORDER BY generated_at DESC`;
  return rows.map((r: Record<string, unknown>) => rowToPayroll(r));
}

export async function dbGetPayroll(id: string): Promise<PayrollRecord | null> {
  const db = getDb();
  const rows = await db`SELECT * FROM payroll_records WHERE id = ${id}`;
  if (rows.length === 0) return null;
  return rowToPayroll(rows[0] as Record<string, unknown>);
}

export async function dbCreatePayroll(record: PayrollRecord): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO payroll_records (id, code_no, user_name, period, basic_salary, allowances,
      deductions, tax, gross_salary, net_salary, branch, designation, generated_at)
    VALUES (${record.id}, ${record.codeNo}, ${record.userName}, ${record.period}, ${record.basicSalary},
      ${record.allowances}, ${record.deductions}, ${record.tax}, ${record.grossSalary}, ${record.netSalary},
      ${record.branch}, ${record.designation}, ${record.generatedAt})
    ON CONFLICT (code_no, period) DO NOTHING
  `;
}

export async function dbDeletePayroll(id: string): Promise<void> {
  const db = getDb();
  await db`DELETE FROM payroll_records WHERE id = ${id}`;
}

// ── Monthly Paysheets ─────────────────────────────────────────

export async function dbGetAllPaysheets(): Promise<MonthlyPaysheetDTO[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM monthly_paysheets ORDER BY pay_month DESC, code_no ASC`;
  return rows.map((r: Record<string, unknown>) => rowToPaysheet(r));
}

export async function dbGetPaysheet(id: string): Promise<MonthlyPaysheetDTO | null> {
  const db = getDb();
  const rows = await db`SELECT * FROM monthly_paysheets WHERE id = ${id}`;
  if (rows.length === 0) return null;
  return rowToPaysheet(rows[0] as Record<string, unknown>);
}

export async function dbGetPaysheetsByMonth(payMonth: string): Promise<MonthlyPaysheetDTO[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM monthly_paysheets WHERE pay_month = ${payMonth} ORDER BY code_no ASC`;
  return rows.map((r: Record<string, unknown>) => rowToPaysheet(r));
}

export async function dbCreatePaysheet(p: MonthlyPaysheetDTO): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO monthly_paysheets (
      id, code_no, pay_month, role, months_of_service,
      achieve, allowance, nopay, late, late_hours, late_minutes,
      epf_availability, etf_availability, welfare, other_offer,
      custom_earning_name, custom_earning_amount, custom_deduction_name, custom_deduction_amount,
      basic_salary, achieved_salary, assigned_target, achievement_pct,
      gross_salary, vehicle_allowance, fuel_allowance, general_allowance, orc,
      sub_total, nopay_deduction, late_deduction,
      epf_employee, epf_employer, etf, net_salary,
      status, created_at, updated_at
    ) VALUES (
      ${p.id}, ${p.codeNo}, ${p.payMonth}, ${p.role}, ${p.monthsOfService},
      ${p.achieve}, ${p.allowance}, ${p.nopay}, ${p.late || 0}, ${p.lateHours}, ${p.lateMinutes},
      ${p.epfAvailability}, ${p.etfAvailability}, ${p.welfare || 0}, ${p.otherOffer || 0},
      ${p.customEarningName || ''}, ${p.customEarningAmount || 0}, ${p.customDeductionName || ''}, ${p.customDeductionAmount || 0},
      ${p.basicSalary || 0}, ${p.achievedSalary || 0}, ${p.assignedTarget || 0}, ${p.achievementPct || 0},
      ${p.grossSalary || 0}, ${p.vehicleAllowance || 0}, ${p.fuelAllowance || 0}, ${p.generalAllowance || 0}, ${p.orc || 0},
      ${p.subTotal || 0}, ${p.nopayDeduction || 0}, ${p.lateDeduction || 0},
      ${p.epfEmployee || 0}, ${p.epfEmployer || 0}, ${p.etf || 0}, ${p.netSalary || 0},
      ${p.status || 'active'}, ${p.createdAt}, ${p.updatedAt}
    ) ON CONFLICT (code_no, pay_month) DO NOTHING
  `;
}

export async function dbUpdatePaysheet(id: string, p: MonthlyPaysheetDTO): Promise<void> {
  const db = getDb();
  await db`
    UPDATE monthly_paysheets SET
      achieve=${p.achieve}, allowance=${p.allowance}, nopay=${p.nopay},
      late=${p.late || 0}, late_hours=${p.lateHours}, late_minutes=${p.lateMinutes},
      epf_availability=${p.epfAvailability}, etf_availability=${p.etfAvailability},
      welfare=${p.welfare || 0}, other_offer=${p.otherOffer || 0},
      custom_earning_name=${p.customEarningName || ''}, custom_earning_amount=${p.customEarningAmount || 0},
      custom_deduction_name=${p.customDeductionName || ''}, custom_deduction_amount=${p.customDeductionAmount || 0},
      basic_salary=${p.basicSalary || 0}, achieved_salary=${p.achievedSalary || 0},
      assigned_target=${p.assignedTarget || 0}, achievement_pct=${p.achievementPct || 0},
      gross_salary=${p.grossSalary || 0}, vehicle_allowance=${p.vehicleAllowance || 0},
      fuel_allowance=${p.fuelAllowance || 0}, general_allowance=${p.generalAllowance || 0}, orc=${p.orc || 0},
      sub_total=${p.subTotal || 0}, nopay_deduction=${p.nopayDeduction || 0}, late_deduction=${p.lateDeduction || 0},
      epf_employee=${p.epfEmployee || 0}, epf_employer=${p.epfEmployer || 0}, etf=${p.etf || 0}, net_salary=${p.netSalary || 0},
      months_of_service=${p.monthsOfService}, status=${p.status || 'active'}, updated_at=${p.updatedAt}
    WHERE id=${id}
  `;
}

export async function dbUpdatePaysheetStatus(id: string, status: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db`UPDATE monthly_paysheets SET status = ${status}, updated_at = ${now} WHERE id = ${id}`;
}

export async function dbDeletePaysheet(id: string): Promise<void> {
  const db = getDb();
  await db`DELETE FROM monthly_paysheets WHERE id = ${id}`;
}
