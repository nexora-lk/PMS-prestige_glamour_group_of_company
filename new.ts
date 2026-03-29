// ============================================================
// Prestige Salary System — Complete Implementation
// ============================================================

// ── Constants ────────────────────────────────────────────────
export const WORKING_DAYS_PER_MONTH   = 25;
export const WORKING_HOURS_PER_DAY    = 8;
export const WORKING_MINUTES_PER_DAY  = 480;
export const TOTAL_MINUTES_PER_MONTH  = 12_000; // 25 × 8 × 60

export const EPF_EMPLOYEE_RATE = 0.08;
export const EPF_EMPLOYER_RATE = 0.12;
export const ETF_RATE          = 0.03;

// ── Role categories ──────────────────────────────────────────
export const JOB_ROLE_CATEGORIES = {
    SALES_BASED: "Sales/Target-Based Roles",
    NON_TARGET:  "Non-Target Roles",
} as const;
export type JobRoleCategory =
    typeof JOB_ROLE_CATEGORIES[keyof typeof JOB_ROLE_CATEGORIES];

// ── Category A roles ─────────────────────────────────────────
export const SALES_BASED_ROLES = {
    GM:  "General Manager",
    AGM: "Assistant General Manager",
    PH:  "Provincial Head",
    DPH: "Deputy Provincial Head",
    SRM: "Senior Regional Manager",
    RM:  "Regional Manager",
    BM:  "Branch Manager",
    BDE: "Business Development Executive",
} as const;
export type SalesRole = keyof typeof SALES_BASED_ROLES;

// ── Category B roles ─────────────────────────────────────────
export const NON_TARGET_ROLES = {
    CCI:               "CCI (Collections/Call Center)",
    HR_FIN_HEAD:       "HR & Finance Head",
    MANAGER_ADMIN:     "Manager Admin",
    SR_EXEC_HR:        "Senior Executive – HR",
    SR_EXEC_FINANCE:   "Senior Executive – Finance",
    ASST_HR_EXEC:      "Assistant HR Executive",
    ASST_FIN_EXEC:     "Assistant Finance Executive",
    MICRO_FIN_MANAGER: "Micro Finance Manager",
    MICRO_FIN_EXEC:    "Micro Finance Executive",
} as const;
export type NonTargetRole = keyof typeof NON_TARGET_ROLES;

export type AnyRole = SalesRole | NonTargetRole;

// ── Category A config (A3, A5, A7, A9, H3) ───────────────────
export interface SalesRoleConfig {
    label:            string;
    basicSalary:      number;   // A3
    baseTarget:       number;   // H3
    vehicleAllowance: number;   // A5
    fuelAllowance:    number;   // A7
    orcValue:         number;   // A9 raw value; actual rate = orcValue/100
}

export const SALES_CONFIG: Record<SalesRole, SalesRoleConfig> = {
    GM:  { label: "General Manager",             basicSalary: 275_000, baseTarget: 500_000_000, vehicleAllowance: 150_000, fuelAllowance: 100_000, orcValue: 0.5 },
    AGM: { label: "Assistant General Manager",   basicSalary: 250_000, baseTarget: 250_000_000, vehicleAllowance: 120_000, fuelAllowance: 100_000, orcValue: 0.5 },
    PH:  { label: "Provincial Head",             basicSalary: 200_000, baseTarget:  50_000_000, vehicleAllowance: 100_000, fuelAllowance:  80_000, orcValue: 0.5 },
    DPH: { label: "Deputy Provincial Head",      basicSalary: 150_000, baseTarget:  30_000_000, vehicleAllowance: 100_000, fuelAllowance:  50_000, orcValue: 0.5 },
    SRM: { label: "Senior Regional Manager",     basicSalary:  85_000, baseTarget:  25_000_000, vehicleAllowance:  85_000, fuelAllowance:  30_000, orcValue: 0.5 },
    RM:  { label: "Regional Manager",            basicSalary:  80_000, baseTarget:   7_000_000, vehicleAllowance:  80_000, fuelAllowance:  80_000, orcValue: 1   },
    BM:  { label: "Branch Manager",              basicSalary:  50_000, baseTarget:   3_500_000, vehicleAllowance:  30_000, fuelAllowance:  20_000, orcValue: 1   },
    BDE: { label: "Business Development Exec.",  basicSalary:  30_000, baseTarget:     200_000, vehicleAllowance:       0, fuelAllowance:       0, orcValue: 0   },
};

// ── Category B config ─────────────────────────────────────────
export interface NonTargetRoleConfig {
    label:             string;
    basicSalary:       number;
    defaultOtherOffer: number;
}

export const NON_TARGET_CONFIG: Record<NonTargetRole, NonTargetRoleConfig> = {
    CCI:               { label: "CCI (Collections/Call Center)", basicSalary:  35_000, defaultOtherOffer:  10_000 },
    HR_FIN_HEAD:       { label: "HR & Finance Head",             basicSalary: 200_000, defaultOtherOffer: 100_000 },
    MANAGER_ADMIN:     { label: "Manager Admin",                 basicSalary:  75_000, defaultOtherOffer:       0 },
    SR_EXEC_HR:        { label: "Senior Executive – HR",         basicSalary:  42_500, defaultOtherOffer:  10_000 },
    SR_EXEC_FINANCE:   { label: "Senior Executive – Finance",    basicSalary:  42_500, defaultOtherOffer:  10_000 },
    ASST_HR_EXEC:      { label: "Assistant HR Executive",        basicSalary:  35_000, defaultOtherOffer:       0 },
    ASST_FIN_EXEC:     { label: "Assistant Finance Executive",   basicSalary:  35_000, defaultOtherOffer:       0 },
    MICRO_FIN_MANAGER: { label: "Micro Finance Manager",         basicSalary:  80_000, defaultOtherOffer:       0 },
    MICRO_FIN_EXEC:    { label: "Micro Finance Executive",       basicSalary:  30_000, defaultOtherOffer:  50_000 },
};

// ── Employee inputs ───────────────────────────────────────────
export interface EmployeeInput {
    codeNo:          string;
    bankAccount:     string;
    bankName:        string;
    name:            string;
    joinDate:        string;
    epfAvailability: 0 | 1;
}

export interface SalesEmployeeInput extends EmployeeInput {
    role:             SalesRole;
    months:           number;
    achieveAmount:    number;
    generalAllowance: number;
    nopayDays:        number;
    lateHours:        number;
    lateMinutes:      number;
    welfare:          number;
}

export interface NonTargetEmployeeInput extends EmployeeInput {
    role:         NonTargetRole;
    otherOffer:   number;
    nopayDays:    number;
    lateHours:    number;
    lateMinutes:  number;
    welfare:      number;
}

// ── Output payslips ───────────────────────────────────────────
export interface SalesPayslip {
    employee:         EmployeeInput;
    config:           SalesRoleConfig;
    months:           number;
    achieveAmount:    number;
    assignedTarget:   number;
    achievementPct:   number;
    grossSalary:      number;
    vehicleAllowance: number;
    fuelAllowance:    number;
    generalAllowance: number;
    orc:              number;
    subTotal:         number;
    nopayDeduction:   number;
    lateDeduction:    number;
    epfEmployee:      number;
    epfEmployer:      number;
    etf:              number;
    welfare:          number;
    netSalary:        number;
}

export interface NonTargetPayslip {
    employee:       EmployeeInput;
    config:         NonTargetRoleConfig;
    otherOffer:     number;
    grossSalary:    number;
    nopayDeduction: number;
    lateDeduction:  number;
    epfEmployee:    number;
    epfEmployer:    number;
    etf:            number;
    welfare:        number;
    netSalary:      number;
}

// ============================================================
// Core calculation functions
// ============================================================

/** Col H — Assigned target based on months of service */
export function calculateAssignedTarget(months: number, baseTarget: number): number {
    if (!Number.isFinite(months) || !Number.isInteger(months) || months < 0)
        throw new Error("months must be a non-negative integer");
    if (!Number.isFinite(baseTarget) || baseTarget <= 0)
        throw new Error("baseTarget must be a positive number");
    if (months > 5) return baseTarget * 1.00;
    if (months > 4) return baseTarget * 0.75;
    if (months > 3) return baseTarget * 0.65;
    if (months > 2) return baseTarget * 0.45;
    if (months > 1) return baseTarget * 0.35;
    return baseTarget * 0.25;
}

/** Col J — Achievement %, floored to 2 decimal places (mirrors ROUNDDOWN) */
export function calculateAchievementPct(achieveAmount: number, assignedTarget: number): number {
    if (!Number.isFinite(achieveAmount) || achieveAmount < 0)
        throw new Error("achieveAmount must be non-negative");
    if (!Number.isFinite(assignedTarget) || assignedTarget <= 0)
        throw new Error("assignedTarget must be positive");
    return Math.floor((achieveAmount / assignedTarget) * 100) / 100;
}

/** Col K — Gross salary Cat A: >=50% → full basic, <50% → basic × ach × 2 */
export function calculateGrossSalary(achPct: number, basicSalary: number): number {
    if (achPct >= 1.00) return basicSalary;
    if (achPct >= 0.50) return basicSalary;
    return basicSalary * achPct * 2;
}

/** Col L — Vehicle allowance (known anomaly: 52–66% pays 100%, 67–81% pays 75%) */
export function calculateVehicleAllowance(achPct: number, vehicleAmount: number): number {
    if (achPct > 0.81) return vehicleAmount;
    if (achPct > 0.66) return vehicleAmount * 0.75;
    if (achPct > 0.51) return vehicleAmount;
    return 0;
}

/** Col M — Fuel allowance (identical tier logic to vehicle) */
export function calculateFuelAllowance(achPct: number, fuelAmount: number): number {
    if (achPct > 0.81) return fuelAmount;
    if (achPct > 0.66) return fuelAmount * 0.75;
    if (achPct > 0.51) return fuelAmount;
    return 0;
}

/**
 * Col O — ORC. Uses strictly > 1.00 (matches Row 4 formula — correct behavior).
 * orcValue is raw A9 cell value; actual rate = orcValue / 100.
 */
export function calculateORC(
    achPct: number,
    achieveAmount: number,
    assignedTarget: number,
    orcValue: number,
): number {
    if (achPct > 1.00) return (achieveAmount - assignedTarget) * (orcValue / 100);
    return 0;
}

/** Col H Cat B — grossSalary = basic + otherOffer */
export function calculateGrossSalaryCatB(basicSalary: number, otherOffer: number): number {
    return basicSalary + (otherOffer || 0);
}

/** No-pay deduction: 0.5-day grace, daily rate = basic/25 */
export function calculateNoPayDeduction(nopayDays: number, basicSalary: number): number {
    if (nopayDays > 0) return (basicSalary / WORKING_DAYS_PER_MONTH) * (nopayDays - 0.5);
    return 0;
}

/** Late deduction: per-minute rate = basic / 12,000 */
export function calculateLateDeduction(lateHours: number, lateMinutes: number, basicSalary: number): number {
    const totalMinutes = lateHours * 60 + lateMinutes;
    return totalMinutes * (basicSalary / TOTAL_MINUTES_PER_MONTH);
}

/** EPF on configured basic salary (A3), NOT gross. Employee contribution deducted; employer is company cost only. */
export function calculateEPF(basicSalary: number, epfAvailability: 0 | 1): { employee: number; employer: number } {
    if (epfAvailability !== 1) return { employee: 0, employer: 0 };
    return { employee: basicSalary * EPF_EMPLOYEE_RATE, employer: basicSalary * EPF_EMPLOYER_RATE };
}

/** ETF — employer cost only, NOT deducted from net */
export function calculateETF(basicSalary: number, epfAvailability: 0 | 1): number {
    return epfAvailability === 1 ? basicSalary * ETF_RATE : 0;
}

// ============================================================
// Payslip generators
// ============================================================

export function calculateSalesPayslip(input: SalesEmployeeInput): SalesPayslip {
    const cfg = SALES_CONFIG[input.role];
    if (!cfg) throw new Error(`Unknown sales role: ${input.role}`);

    const assignedTarget   = calculateAssignedTarget(input.months, cfg.baseTarget);
    const achievementPct   = calculateAchievementPct(input.achieveAmount, assignedTarget);
    const grossSalary      = calculateGrossSalary(achievementPct, cfg.basicSalary);
    const vehicleAllowance = calculateVehicleAllowance(achievementPct, cfg.vehicleAllowance);
    const fuelAllowance    = calculateFuelAllowance(achievementPct, cfg.fuelAllowance);
    const generalAllowance = input.generalAllowance || 0;
    const orc              = calculateORC(achievementPct, input.achieveAmount, assignedTarget, cfg.orcValue);
    const subTotal         = grossSalary + vehicleAllowance + fuelAllowance + generalAllowance + orc;
    const nopayDeduction   = calculateNoPayDeduction(input.nopayDays, cfg.basicSalary);
    const lateDeduction    = calculateLateDeduction(input.lateHours, input.lateMinutes, cfg.basicSalary);
    const epf              = calculateEPF(cfg.basicSalary, input.epfAvailability);
    const etf              = calculateETF(cfg.basicSalary, input.epfAvailability);
    const welfare          = input.welfare || 0;
    const netSalary        = subTotal - (nopayDeduction + lateDeduction + epf.employee + welfare);

    return {
        employee: input, config: cfg, months: input.months, achieveAmount: input.achieveAmount,
        assignedTarget, achievementPct, grossSalary, vehicleAllowance, fuelAllowance,
        generalAllowance, orc, subTotal, nopayDeduction, lateDeduction,
        epfEmployee: epf.employee, epfEmployer: epf.employer, etf, welfare, netSalary,
    };
}

export function calculateNonTargetPayslip(input: NonTargetEmployeeInput): NonTargetPayslip {
    const cfg = NON_TARGET_CONFIG[input.role];
    if (!cfg) throw new Error(`Unknown non-target role: ${input.role}`);

    const otherOffer     = input.otherOffer ?? 0;
    const grossSalary    = calculateGrossSalaryCatB(cfg.basicSalary, otherOffer);
    const nopayDeduction = calculateNoPayDeduction(input.nopayDays, cfg.basicSalary);
    const lateDeduction  = calculateLateDeduction(input.lateHours, input.lateMinutes, cfg.basicSalary);
    const epf            = calculateEPF(cfg.basicSalary, input.epfAvailability);
    const etf            = calculateETF(cfg.basicSalary, input.epfAvailability);
    const welfare        = input.welfare || 0;
    const netSalary      = grossSalary - (nopayDeduction + lateDeduction + epf.employee + welfare);

    return {
        employee: input, config: cfg, otherOffer, grossSalary,
        nopayDeduction, lateDeduction, epfEmployee: epf.employee,
        epfEmployer: epf.employer, etf, welfare, netSalary,
    };
}

// ============================================================
// Verification test suite
// ============================================================

function fmt(n: number) { return "LKR " + n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function pct(n: number) { return (n * 100).toFixed(2) + "%"; }
function check(label: string, got: number, expect: number) {
    const ok = Math.abs(got - expect) < 0.01;
    console.log(`  ${ok ? "✓" : "✗"} ${label.padEnd(20)} got ${fmt(got)}  |  expect ${fmt(expect)}`);
}

function runTests() {
    console.log("=".repeat(70));
    console.log(" Prestige Salary System — Verification Test Suite");
    console.log("=".repeat(70));

    console.log("\nTest 1 — GM, 2 months, 75M achievement, 2 no-pay, 5h45m late");
    const t1 = calculateSalesPayslip({
        codeNo:"BM0005", bankAccount:"", bankName:"", name:"Test GM",
        joinDate:"", epfAvailability:1,
        role:"GM", months:2, achieveAmount:75_000_000,
        generalAllowance:0, nopayDays:2, lateHours:5, lateMinutes:45, welfare:0,
    });
    check("assignedTarget",   t1.assignedTarget,  175_000_000);
    check("achievementPct",   t1.achievementPct * 100, 42);
    check("grossSalary",      t1.grossSalary,     231_000);
    check("vehicleAllowance", t1.vehicleAllowance, 0);
    check("fuelAllowance",    t1.fuelAllowance,    0);
    check("orc",              t1.orc,              0);
    check("nopayDeduction",   t1.nopayDeduction,  16_500);
    check("lateDeduction",    t1.lateDeduction,    7_906.25);
    check("epfEmployee",      t1.epfEmployee,     22_000);
    check("netSalary",        t1.netSalary,       184_593.75);

    console.log("\nTest 2 — AGM, 6 months, 251.5M (1.006 floored → 1.00, no ORC)");
    const t2 = calculateSalesPayslip({
        codeNo:"BM0001", bankAccount:"", bankName:"", name:"Test AGM",
        joinDate:"", epfAvailability:1,
        role:"AGM", months:6, achieveAmount:251_500_000,
        generalAllowance:0, nopayDays:0, lateHours:0, lateMinutes:0, welfare:0,
    });
    check("assignedTarget",   t2.assignedTarget,  250_000_000);
    check("vehicleAllowance", t2.vehicleAllowance, 120_000);
    check("fuelAllowance",    t2.fuelAllowance,    100_000);
    check("orc",              t2.orc,              0);
    check("netSalary",        t2.netSalary,        450_000);

    console.log("\nTest 3 — Senior Executive HR (Cat B), 2 no-pay, 10h late");
    const t3 = calculateNonTargetPayslip({
        codeNo:"", bankAccount:"", bankName:"", name:"Test SR_EXEC_HR",
        joinDate:"", epfAvailability:1,
        role:"SR_EXEC_HR", otherOffer:10_000,
        nopayDays:2, lateHours:10, lateMinutes:0, welfare:0,
    });
    check("grossSalary",    t3.grossSalary,    52_500);
    check("nopayDeduction", t3.nopayDeduction,  2_550);
    check("lateDeduction",  t3.lateDeduction,   2_125);
    check("epfEmployee",    t3.epfEmployee,     3_400);
    check("netSalary",      t3.netSalary,      44_425);

    console.log("\nTest 4 — CCI (Cat B), no deductions");
    const t4 = calculateNonTargetPayslip({
        codeNo:"", bankAccount:"", bankName:"", name:"Test CCI",
        joinDate:"", epfAvailability:1,
        role:"CCI", otherOffer:10_000,
        nopayDays:0, lateHours:0, lateMinutes:0, welfare:0,
    });
    check("grossSalary", t4.grossSalary, 45_000);
    check("netSalary",   t4.netSalary,  42_200);

    console.log("\nTest 5 — Manager Admin (Cat B), otherOffer=0");
    const t5 = calculateNonTargetPayslip({
        codeNo:"", bankAccount:"", bankName:"", name:"Test MANAGER_ADMIN",
        joinDate:"", epfAvailability:1,
        role:"MANAGER_ADMIN", otherOffer:0,
        nopayDays:2, lateHours:10, lateMinutes:0, welfare:0,
    });
    check("grossSalary", t5.grossSalary, 75_000);
    check("netSalary",   t5.netSalary,  60_750);

    console.log("\nTest 6 — BM, 5 months, exactly 100%");
    const t6 = calculateSalesPayslip({
        codeNo:"", bankAccount:"", bankName:"", name:"Test BM",
        joinDate:"", epfAvailability:1,
        role:"BM", months:5, achieveAmount:2_625_000,
        generalAllowance:0, nopayDays:0, lateHours:0, lateMinutes:0, welfare:0,
    });
    check("assignedTarget",   t6.assignedTarget,  2_625_000);
    check("vehicleAllowance", t6.vehicleAllowance,  30_000);
    check("orc",              t6.orc,               0);
    check("netSalary",        t6.netSalary,        96_000);

    console.log("\nTest 7 — Micro Finance Executive (Cat B), EPF not enrolled");
    const t7 = calculateNonTargetPayslip({
        codeNo:"", bankAccount:"", bankName:"", name:"Test MICRO_FIN_EXEC",
        joinDate:"", epfAvailability:0,
        role:"MICRO_FIN_EXEC", otherOffer:50_000,
        nopayDays:0, lateHours:0, lateMinutes:0, welfare:0,
    });
    check("grossSalary", t7.grossSalary, 80_000);
    check("epfEmployee", t7.epfEmployee,      0);
    check("netSalary",   t7.netSalary,   80_000);

    console.log("\n" + "=".repeat(70));
}

runTests();