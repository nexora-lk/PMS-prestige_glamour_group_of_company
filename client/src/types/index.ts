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
  netSalary: number;
  grossSalary: number;
  generatedAt: string;
  department: string;
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
  departments: string[];
  roles: string[];
}

export interface StatsResponse {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalDepartments: number;
  departments: string[];
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
