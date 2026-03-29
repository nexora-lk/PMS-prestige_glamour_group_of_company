import { useState, useEffect } from 'react';
import { paysheetService } from '../services/paysheetService';
import type { MonthlyPaysheet } from '../types';
import { showToast } from './Toast';
import { pgwcsTheme } from '../theme/colors';

interface PaysheetListProps {
  onEdit?: (paysheet: MonthlyPaysheet) => void;
  onDelete?: (paysheet: MonthlyPaysheet) => void;
  refreshTrigger?: number;
}

export function PaysheetList({ onEdit, onDelete, refreshTrigger }: PaysheetListProps) {
  const [paysheets, setPaysheets] = useState<MonthlyPaysheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchPaysheets();
  }, [refreshTrigger, filterMonth]);

  const fetchPaysheets = async () => {
    setLoading(true);
    try {
      const res = await paysheetService.getMonthPaysheets(filterMonth);
      setPaysheets(res.paysheets);
    } catch (err: any) {
      showToast(err.message || 'Failed to load paysheets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this paysheet?')) return;

    try {
      const paysheet = paysheets.find(p => p.id === id);
      await paysheetService.deletePaysheet(id);
      showToast('Paysheet deleted successfully', 'success');
      fetchPaysheets();
      onDelete?.(paysheet!);
    } catch (error: any) {
      showToast(error.message || 'Failed to delete paysheet', 'error');
    }
  };

  const filteredPaysheets = paysheets.filter(p =>
    p.codeNo.toLowerCase().includes(searchText.toLowerCase()) ||
    p.role.toLowerCase().includes(searchText.toLowerCase())
  );

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Filter Controls */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <input
            type="text"
            placeholder="Search by code or role..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid ${pgwcsTheme.neutral[300]}`,
              borderRadius: '4px',
              fontSize: '14px',
              color: pgwcsTheme.navy[900],
            }}
          />
        </div>
        <div>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            style={{
              padding: '8px 12px',
              border: `1px solid ${pgwcsTheme.neutral[300]}`,
              borderRadius: '4px',
              fontSize: '14px',
              color: pgwcsTheme.navy[900],
            }}
          />
        </div>
        <button
          onClick={fetchPaysheets}
          className="btn btn-secondary"
          style={{ padding: '8px 16px' }}
          disabled={loading}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: `1px solid ${pgwcsTheme.neutral[200]}`, borderRadius: '4px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: pgwcsTheme.neutral[500] }}>
            ⏳ Loading paysheets...
          </div>
        ) : filteredPaysheets.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: pgwcsTheme.neutral[500] }}>
            📋 No paysheets found for {filterMonth}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: pgwcsTheme.neutral[100], borderBottom: `2px solid ${pgwcsTheme.neutral[200]}` }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: pgwcsTheme.navy[900] }}>Code</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: pgwcsTheme.navy[900] }}>Role</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: pgwcsTheme.navy[900] }}>Months</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: pgwcsTheme.navy[900] }}>Achievement %</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: pgwcsTheme.navy[900] }}>Gross Salary</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: pgwcsTheme.navy[900] }}>Net Salary</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: pgwcsTheme.navy[900] }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPaysheets.map((paysheet, index) => (
                <tr
                  key={paysheet.id}
                  style={{
                    backgroundColor: index % 2 === 0 ? pgwcsTheme.neutral[100] : pgwcsTheme.neutral[50],
                    borderBottom: `1px solid ${pgwcsTheme.neutral[200]}`,
                  }}
                >
                  <td style={{ padding: '12px', fontWeight: 500, color: pgwcsTheme.navy[900] }}>{paysheet.codeNo}</td>
                  <td style={{ padding: '12px', color: pgwcsTheme.navy[900] }}>{paysheet.role}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: pgwcsTheme.navy[900] }}>{paysheet.monthsOfService}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <span style={{
                      backgroundColor: pgwcsTheme.neutral[100],
                      padding: '4px 8px',
                      borderRadius: '4px',
                      color: pgwcsTheme.navy[600],
                      fontWeight: 600,
                    }}>
                      {((paysheet.achievementPct || 0) * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 500, color: pgwcsTheme.navy[900] }}>
                    {formatCurrency(paysheet.grossSalary || 0)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: pgwcsTheme.gold[700] }}>
                    {formatCurrency(paysheet.netSalary || 0)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => onEdit?.(paysheet)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px',
                        marginRight: '8px',
                      }}
                      aria-label="Edit"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(paysheet.id!)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px',
                      }}
                      aria-label="Delete"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Stats */}
      {filteredPaysheets.length > 0 && (
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div style={{ backgroundColor: pgwcsTheme.neutral[100], padding: 12, borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: pgwcsTheme.neutral[500], marginBottom: 4 }}>Total Paysheets</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: pgwcsTheme.navy[900] }}>{filteredPaysheets.length}</div>
          </div>
          <div style={{ backgroundColor: pgwcsTheme.neutral[100], padding: 12, borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: pgwcsTheme.neutral[500], marginBottom: 4 }}>Total Gross</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: pgwcsTheme.navy[900] }}>
              {formatCurrency(filteredPaysheets.reduce((sum, p) => sum + (p.grossSalary || 0), 0))}
            </div>
          </div>
          <div style={{ backgroundColor: pgwcsTheme.neutral[100], padding: 12, borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: pgwcsTheme.neutral[500], marginBottom: 4 }}>Total Net</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: pgwcsTheme.gold[700] }}>
              {formatCurrency(filteredPaysheets.reduce((sum, p) => sum + (p.netSalary || 0), 0))}
            </div>
          </div>
          <div style={{ backgroundColor: pgwcsTheme.neutral[100], padding: 12, borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: pgwcsTheme.neutral[500], marginBottom: 4 }}>Avg Net</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: pgwcsTheme.navy[900] }}>
              {formatCurrency(filteredPaysheets.reduce((sum, p) => sum + (p.netSalary || 0), 0) / filteredPaysheets.length)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

