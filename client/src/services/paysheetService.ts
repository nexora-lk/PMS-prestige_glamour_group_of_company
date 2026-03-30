import api from './api';
import type { MonthlyPaysheet, PaysheetResponse, PaysheetDetailResponse } from '../types';

interface PaysheetListParams {
  employeeId?: string;
  payMonth?: string;
  role?: string;
  search?: string;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

export const paysheetService = {
  async createPaysheet(
    data: Omit<MonthlyPaysheet, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ message: string; paysheet: MonthlyPaysheet }> {
    try {
      const response = await api.post('/paysheets', data);
      return response.data;
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, 'Failed to create paysheet'));
    }
  },

  async listPaysheets(filters: PaysheetListParams = {}): Promise<PaysheetResponse> {
    try {
      const response = await api.get<PaysheetResponse>('/paysheets', { params: filters });
      return response.data;
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, 'Failed to fetch paysheets'));
    }
  },

  async getPaysheet(id: string): Promise<PaysheetDetailResponse> {
    try {
      const response = await api.get<PaysheetDetailResponse>(`/paysheets/${id}`);
      return response.data;
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, 'Failed to fetch paysheet'));
    }
  },

  async updatePaysheet(
    id: string,
    updates: Partial<MonthlyPaysheet>
  ): Promise<{ message: string; paysheet: MonthlyPaysheet }> {
    try {
      const response = await api.put(`/paysheets/${id}`, updates);
      return response.data;
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, 'Failed to update paysheet'));
    }
  },

  async deletePaysheet(id: string): Promise<{ message: string; paysheet: MonthlyPaysheet }> {
    try {
      const response = await api.delete(`/paysheets/${id}`);
      return response.data;
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, 'Failed to delete paysheet'));
    }
  },

  async getMonthPaysheets(payMonth: string): Promise<PaysheetResponse & { month: string }> {
    try {
      const response = await api.get(`/paysheets/month/${payMonth}`);
      return response.data;
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, 'Failed to fetch month paysheets'));
    }
  },
};
