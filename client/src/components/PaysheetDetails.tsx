import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { paysheetService } from '../services/paysheetService';
import type { MonthlyPaysheet } from '../types';
import { showToast } from './Toast';
import pgwcsTheme from "../theme/colors.ts";

export function PaysheetDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [paysheet, setPaysheet] = useState<MonthlyPaysheet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaysheet();
  }, [id]);

  const fetchPaysheet = async () => {
    if (!id) return;
    try {
      const res = await paysheetService.getPaysheet(id);
      setPaysheet(res.paysheet);
    } catch (err: any) {
      showToast(err.message || 'Failed to load paysheet', 'error');
      navigate('/paysheets');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatPercentage = (value: number) => {
    return (value * 100).toFixed(2);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
        <p>Loading paysheet details...</p>
      </div>
    );
  }

  if (!paysheet) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <p>Paysheet not found</p>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/paysheets')}
          style={{ marginTop: '16px' }}
        >
          ← Back to Paysheets
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700 }}>
            {paysheet.codeNo} - {paysheet.role}
          </h1>
          <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
            {paysheet.payMonth} • Months of Service: {paysheet.monthsOfService}
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/paysheets')}
          style={{ padding: '8px 16px' }}
        >
          ← Back
        </button>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Earnings Section */}
        <div
          style={{
            backgroundColor: '#e8f5e9',
            padding: '20px',
            borderRadius: '8px',
            border: '2px solid #4caf50',
          }}
        >
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#2e7d32' }}>
            💰 Earnings
          </h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#555' }}>Basic Salary</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(paysheet.basicSalary || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#555' }}>Gross Salary</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(paysheet.grossSalary || 0)}</span>
            </div>
            {paysheet.vehicleAllowance ? (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#555' }}>Vehicle Allowance</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(paysheet.vehicleAllowance)}</span>
              </div>
            ) : null}
            {paysheet.fuelAllowance ? (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#555' }}>Fuel Allowance</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(paysheet.fuelAllowance)}</span>
              </div>
            ) : null}
            {paysheet.generalAllowance ? (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#555' }}>General Allowance</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(paysheet.generalAllowance)}</span>
              </div>
            ) : null}
            {paysheet.orc ? (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#555' }}>ORC (Over-Target)</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(paysheet.orc)}</span>
              </div>
            ) : null}
            {paysheet.subTotal && paysheet.subTotal > paysheet.grossSalary! ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '1px solid #4caf50',
                  fontWeight: 700,
                  color: '#2e7d32',
                }}
              >
                <span>Subtotal</span>
                <span>{formatCurrency(paysheet.subTotal)}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Deductions Section */}
        <div
          style={{
            backgroundColor: '#ffebee',
            padding: '20px',
            borderRadius: '8px',
            border: '2px solid #f44336',
          }}
        >
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#c62828' }}>
            📉 Deductions
          </h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            {paysheet.nopay > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: pgwcsTheme.neutral[700] }}>No-Pay Deduction ({paysheet.nopay}d)</span>
                <span style={{ fontWeight: 600, color: pgwcsTheme.ruby[600] }}>
                  -{formatCurrency(paysheet.nopayDeduction || 0)}
                </span>
              </div>
            )}
            {paysheet.late > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#555' }}>Late Deduction ({paysheet.late}h)</span>
                <span style={{ fontWeight: 600, color: '#d32f2f' }}>
                  -{formatCurrency(paysheet.lateDeduction || 0)}
                </span>
              </div>
            )}
            {paysheet.epfAvailability && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#555' }}>EPF (Employee 8%)</span>
                <span style={{ fontWeight: 600, color: '#d32f2f' }}>
                  -{formatCurrency(paysheet.epfEmployee || 0)}
                </span>
              </div>
            )}
            {paysheet.welfare > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#555' }}>Welfare</span>
                <span style={{ fontWeight: 600, color: '#d32f2f' }}>
                  -{formatCurrency(paysheet.welfare)}
                </span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid #f44336',
                fontWeight: 700,
                color: '#c62828',
              }}
            >
              <span>Total Deductions</span>
              <span>
                -{formatCurrency(
                  (paysheet.nopayDeduction || 0) +
                    (paysheet.lateDeduction || 0) +
                    (paysheet.epfEmployee || 0) +
                    paysheet.welfare
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div
        style={{
          backgroundColor: '#f5f5f5',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
          📊 Performance Metrics
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
          <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '4px', border: '1px solid #ddd' }}>
            <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px', fontWeight: 500 }}>
              ASSIGNED TARGET
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>
              {formatCurrency(paysheet.assignedTarget || 0)}
            </div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '4px', border: '1px solid #ddd' }}>
            <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px', fontWeight: 500 }}>
              ACHIEVEMENT %
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1976d2' }}>
              {formatPercentage(paysheet.achievementPct || 0)}%
            </div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '4px', border: '1px solid #ddd' }}>
            <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px', fontWeight: 500 }}>
              MONTHS OF SERVICE
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>{paysheet.monthsOfService}</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '4px', border: '1px solid #ddd' }}>
            <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px', fontWeight: 500 }}>
              ATTENDANCE SCORE
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>
              {Math.max(0, 100 - (paysheet.nopay || 0) * 4 - Math.min((paysheet.late || 0) * 2, 20)).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Net Salary Highlight */}
      <div
        style={{
          backgroundColor: '#e8f5e9',
          padding: '24px',
          borderRadius: '8px',
          border: '3px solid #4caf50',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '14px', color: '#2e7d32', marginBottom: '12px', fontWeight: 600 }}>
          💰 FINAL NET SALARY (Amount to be Paid)
        </div>
        <div style={{ fontSize: '36px', fontWeight: 800, color: '#2e7d32' }}>
          {formatCurrency(paysheet.netSalary || 0)}
        </div>
        {paysheet.epfEmployer ? (
          <div style={{ fontSize: '12px', color: '#558b2f', marginTop: '12px', fontStyle: 'italic' }}>
            (Employer EPF: {formatCurrency(paysheet.epfEmployer || 0)} | ETF: {formatCurrency(paysheet.etf || 0)})
          </div>
        ) : null}
      </div>
    </div>
  );
}

