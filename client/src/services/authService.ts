import api from './api';
import type { LoginResponse } from '../types';

interface LoginRequest {
  username: string;
  password: string;
}

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await api.post<LoginResponse>('/auth/login', credentials);
      localStorage.setItem('payroll_token', response.data.token);
      localStorage.setItem('payroll_user', JSON.stringify(response.data.user));
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },

  async getCurrentUser() {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error: any) {
      throw new Error('Failed to fetch current user');
    }
  },

  logout(): void {
    localStorage.removeItem('payroll_token');
    localStorage.removeItem('payroll_user');
  },

  isLoggedIn(): boolean {
    return !!localStorage.getItem('payroll_token');
  },

  getStoredToken(): string | null {
    return localStorage.getItem('payroll_token');
  },

  getStoredUser() {
    const user = localStorage.getItem('payroll_user');
    return user ? JSON.parse(user) : null;
  },
};

