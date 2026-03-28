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
  period: string; // "2026-03"
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
