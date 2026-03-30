export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  branch: string;
  role: string;
  designation: string;
  joinDate: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  status: 'active' | 'delete';
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
  branch: string;
  designation: string;
  generatedAt: string;
}

export interface MonthlyPaysheetDTO {
  id?: string;
  employeeId: string;
  codeNo: string;
  payMonth: string;
  role: string;
  monthsOfService: number;

  // Input fields
  achieve: number;
  allowance: number;
  nopay: number;
  late: number;
  epfAvailability: boolean;
  etfAvailability: boolean;
  welfare: number;
  otherOfficers: number;

  // Calculated results
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
