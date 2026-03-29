import api from './api';
import type { MonthlyPaysheet, PaysheetResponse, PaysheetDetailResponse } from '../types';

interface PaysheetListParams {
  employeeId?: string;
  payMonth?: string;
  role?: string;
  search?: string;
}

interface PaysheetCalculationRequest {
  role: string;
  monthsOfService: number;
  achieve?: number;
  allowance?: number;
  nopay: number;
  late: number;
  epfAvailability: boolean;
  welfare?: number;
  otherOfficers?: number;
}

export const paysheetService = {
  async createPaysheet(
    data: Omit<MonthlyPaysheet, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ message: string; paysheet: MonthlyPaysheet }> {
    try {
      const response = await api.post('/paysheets', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create paysheet');
    }
  },

  async listPaysheets(
    filters: PaysheetListParams = {}
  ): Promise<PaysheetResponse> {
    try {
      const response = await api.get<PaysheetResponse>('/paysheets', {
        params: filters,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch paysheets');
    }
  },

  async getPaysheet(id: string): Promise<PaysheetDetailResponse> {
    try {
      const response = await api.get<PaysheetDetailResponse>(`/paysheets/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch paysheet');
    }
  },

  async updatePaysheet(
    id: string,
    updates: Partial<MonthlyPaysheet>
  ): Promise<{ message: string; paysheet: MonthlyPaysheet }> {
    try {
      const response = await api.put(`/paysheets/${id}`, updates);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update paysheet');
    }
  },

  async deletePaysheet(
    id: string
  ): Promise<{ message: string; paysheet: MonthlyPaysheet }> {
    try {
      const response = await api.delete(`/paysheets/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete paysheet');
    }
  },

  async calculatePaysheet(data: PaysheetCalculationRequest): Promise<{
    message: string;
    calculation: Record<string, any>;
  }> {
    try {
      const response = await api.post('/paysheets/calculate', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Calculation failed');
    }
  },

  async getMonthPaysheets(payMonth: string): Promise<PaysheetResponse & { month: string }> {
    try {
      const response = await api.get(`/paysheets/month/${payMonth}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch month paysheets');
    }
  },
};

