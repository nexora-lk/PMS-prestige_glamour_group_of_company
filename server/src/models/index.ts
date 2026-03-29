export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  designation: string;
  joinDate: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRecord {
  id: string;
  userId: string;
  userName: string;
  period: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  tax: number;
  grossSalary: number;
  netSalary: number;
  department: string;
  designation: string;
  generatedAt: string;
}

export interface Role {
  id: number;

  roleCode: string;
  roleName: string;
  category: "A" | "B";

  basicSalary: number;
  baseTarget: number;
  vehicleAllowance: number;
  fuelAllowance: number;
  orcValue: number;
  defaultOtherOffer: number;

  employees: Employee[];

  createdAt: Date;
  updatedAt: Date;
}

export interface Employee {
  id: number;

  codeNo: string;
  name: string;

  bankAcc?: string;
  bankName?: string;

  joinDate: Date;

  roleId: number;
  role: Role;

  epfAvailability: boolean;
  otherOffer: number;
  isActive: boolean;

  paysheets: MonthlyPaysheet[];

  createdAt: Date;
  updatedAt: Date;
}

export interface MonthlyPaysheet {
  id: number;

  employeeId: number;
  employee: Employee; // make sure you already have Employee interface

  payMonth: Date;
  monthsOfService: number;

  // Target (Cat A)
  assignedTarget: number;
  achievementAmount: number;
  achievementPct: number;

  // Earnings
  grossSalary: number;
  vehicleAllowance: number;
  fuelAllowance: number;
  generalAllowance: number;
  otherOffer: number;
  orc: number;
  subTotal: number;

  // Attendance
  nopayDays: number;
  lateHours: number;
  lateMinutes: number;

  // Deductions
  nopayDeduction: number;
  lateDeduction: number;
  epfEmployee: number;
  epfEmployer: number;
  etf: number;
  welfare: number;

  // Final
  netSalary: number;
  status: "draft" | "approved" | "paid";

  createdAt: Date;
  updatedAt: Date;
}

export interface AdminCredentials {
  username: string;
  password: string;
  name: string;
  role: string;
}

export interface AuthPayload {
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface MonthlyPaysheetDTO {
  id?: string;
  employeeId: string;
  codeNo: string;
  payMonth: string; // YYYY-MM format
  role: string;
  monthsOfService: number;

  // Input Fields
  achieve: number;
  allowance: number;
  nopay: number;
  late: number;
  epfAvailability: boolean;
  etfAvailability: boolean;
  welfare: number;
  otherOfficers: number;

  // Calculated Results (from PaysheetResult)
  basicSalary?: number;
  assignedTarget?: number;
  achievementPct?: number;
  grossSalary?: number;
  vehicleAllowance?: number;
  fuelAllowance?: number;
  generalAllowance?: number;
  otherOffer?: number;
  orc?: number;
  subTotal?: number;
  nopayDeduction?: number;
  lateDeduction?: number;
  epfEmployee?: number;
  epfEmployer?: number;
  etf?: number;
  netSalary?: number;

  // Metadata
  createdAt?: string;
  updatedAt?: string;
}
