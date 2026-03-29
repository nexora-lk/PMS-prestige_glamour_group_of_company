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
  netSalary: number;
  grossSalary: number;
  generatedAt: string;
  branch: string;
  designation: string;
}

export interface LoginResponse {
  token: string;
  user: {
    username: string;
    name: string;
    role: string;
  };
}

export interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
  branches: string[];
  roles: string[];
}

export interface StatsResponse {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalBranches: number;
  branches: string[];
  totalMonthlySalary: number;
}

export interface PayrollResponse {
  message: string;
  records: PayrollRecord[];
}

export interface PayrollHistoryResponse {
  records: PayrollRecord[];
  total: number;
}

export interface MonthlyPaysheet {
  id?: string;
  employeeId: string;
  codeNo: string;
  payMonth: string;
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

  // Calculated Results
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

export interface PaysheetResponse {
  paysheets: MonthlyPaysheet[];
  total: number;
}

export interface PaysheetDetailResponse {
  paysheet: MonthlyPaysheet;
}
