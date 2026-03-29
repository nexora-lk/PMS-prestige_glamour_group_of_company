import { useState, useEffect } from 'react';
import { payrollService } from '../services/payrollService';
import type { PayrollRecord, PayrollHistoryResponse } from '../types';

interface UsePayrollOptions {
  userId?: string;
  period?: string;
  search?: string;
  skip?: boolean;
}

export const usePayroll = (options: UsePayrollOptions = {}) => {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PayrollHistoryResponse | null>(null);

  useEffect(() => {
    if (options.skip) return;

    const fetchPayroll = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await payrollService.getPayrollHistory(options);
        setRecords(data.records);
        setResponse(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPayroll();
  }, [options.userId, options.period, options.search, options.skip]);

  const deleteRecord = async (id: string) => {
    try {
      await payrollService.deletePayroll(id);
      setRecords(records.filter((r) => r.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const refreshRecords = async () => {
    try {
      const data = await payrollService.getPayrollHistory(options);
      setRecords(data.records);
      setResponse(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return {
    records,
    loading,
    error,
    response,
    deleteRecord,
    refreshRecords,
  };
};

