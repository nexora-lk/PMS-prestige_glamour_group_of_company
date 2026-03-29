import { useState, useEffect } from 'react';
import { paysheetService } from '../services/paysheetService';
import type { MonthlyPaysheet, PaysheetResponse } from '../types';

interface UsePaysheetOptions {
  employeeId?: string;
  payMonth?: string;
  role?: string;
  search?: string;
  skip?: boolean;
}

export const usePaysheets = (options: UsePaysheetOptions = {}) => {
  const [paysheets, setPaysheets] = useState<MonthlyPaysheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PaysheetResponse | null>(null);

  useEffect(() => {
    if (options.skip) return;

    const fetchPaysheets = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await paysheetService.listPaysheets(options);
        setPaysheets(data.paysheets);
        setResponse(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPaysheets();
  }, [options.employeeId, options.payMonth, options.role, options.search, options.skip]);

  const createPaysheet = async (data: Omit<MonthlyPaysheet, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const result = await paysheetService.createPaysheet(data);
      setPaysheets([...paysheets, result.paysheet]);
      return result.paysheet;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updatePaysheet = async (id: string, updates: Partial<MonthlyPaysheet>) => {
    try {
      const result = await paysheetService.updatePaysheet(id, updates);
      setPaysheets(paysheets.map((p) => (p.id === id ? result.paysheet : p)));
      return result.paysheet;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deletePaysheet = async (id: string) => {
    try {
      await paysheetService.deletePaysheet(id);
      setPaysheets(paysheets.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const refreshPaysheets = async () => {
    try {
      const data = await paysheetService.listPaysheets(options);
      setPaysheets(data.paysheets);
      setResponse(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return {
    paysheets,
    loading,
    error,
    response,
    createPaysheet,
    updatePaysheet,
    deletePaysheet,
    refreshPaysheets,
  };
};

