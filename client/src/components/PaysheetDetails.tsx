import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { paysheetService } from '../services/paysheetService';
import { userService } from '../services/userService';
import type { MonthlyPaysheet, User } from '../types';
import { showToast } from './Toast';
import PaySheet from './PaySheet';

export function PaysheetDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [paysheet, setPaysheet] = useState<MonthlyPaysheet | null>(null);
  const [employee, setEmployee] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: paysheet ? `PaySheet_${paysheet.codeNo}_${paysheet.payMonth}` : 'PaySheet',
  });

  useEffect(() => {
    fetchPaysheet();
  }, [id]);

  const fetchPaysheet = async () => {
    if (!id) return;
    try {
      const res = await paysheetService.getPaysheet(id);
      setPaysheet(res.paysheet);

      if (res.paysheet.employeeId) {
        try {
          const user = await userService.getUser(res.paysheet.employeeId);
          setEmployee(user);
        } catch {
          // Employee may have been deleted
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load paysheet', 'error');
      navigate('/paysheets');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>Loading paysheet...</p>
      </div>
    );
  }

  if (!paysheet) {
    return (
      <div className="empty-state">
        <p style={{ fontSize: 18 }}>Paysheet not found</p>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/paysheets')}
          style={{ marginTop: 16 }}
        >
          Back to Paysheets
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          maxWidth: 780,
          margin: '0 auto 20px auto',
        }}
      >
        <button className="btn btn-secondary" onClick={() => navigate('/paysheets')}>
          Back to Paysheets
        </button>
        <button className="btn btn-primary" onClick={() => handlePrint()}>
          Print PaySheet
        </button>
      </div>

      {/* Printable PaySheet */}
      <div ref={printRef}>
        <PaySheet paysheet={paysheet} employee={employee} />
      </div>
    </div>
  );
}
