import { useState, useEffect } from 'react';
import api from '../services/api';
import type { MonthlyPaysheet } from '../types';
import { showToast } from './Toast';

export function PaysheetExport() {
  const [paysheets, setPaysheets] = useState<MonthlyPaysheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchPaysheets();
  }, [selectedMonth]);

  const fetchPaysheets = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/paysheets/month/${selectedMonth}`);
      setPaysheets(res.data.paysheets || []);
    } catch {
      showToast('Failed to load paysheets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (paysheets.length === 0) {
      showToast('No paysheets to export', 'info');
      return;
    }

    setExporting(true);
    try {
      const headers = [
        'Code No',
        'Role',
        'Months Service',
        'Achievement %',
        'Basic Salary',
        'Gross Salary',
        'No-Pay Deduction',
        'Late Deduction',
        'EPF Employee',
        'ETF',
        'Net Salary',
      ];

      const rows = paysheets.map((p) => [
        p.codeNo,
        p.role,
        p.monthsOfService,
        ((p.achievementPct || 0) * 100).toFixed(2),
        p.basicSalary || 0,
        p.grossSalary || 0,
        p.nopayDeduction || 0,
        p.lateDeduction || 0,
        p.epfEmployee || 0,
        p.etf || 0,
        p.netSalary || 0,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paysheets-${selectedMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast(`Exported ${paysheets.length} paysheets to CSV`, 'success');
    } catch (error) {
      showToast('Failed to export paysheets', 'error');
    } finally {
      setExporting(false);
    }
  };

  const printPaysheets = () => {
    if (paysheets.length === 0) {
      showToast('No paysheets to print', 'info');
      return;
    }

    const printWindow = window.open('', '', 'width=1200,height=800');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Paysheets - ${selectedMonth}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          th { background-color: #0A0A3E; color: white; font-weight: bold; }
          td:first-child, th:first-child { text-align: left; }
          .page-break { page-break-after: always; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>Monthly Paysheets - ${selectedMonth}</h1>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Role</th>
              <th>Months</th>
              <th>Achievement %</th>
              <th>Gross Salary</th>
              <th>Deductions</th>
              <th>Net Salary</th>
            </tr>
          </thead>
          <tbody>
            ${paysheets
              .map(
                (p) => `
              <tr>
                <td>${p.codeNo}</td>
                <td>${p.role}</td>
                <td>${p.monthsOfService}</td>
                <td>${((p.achievementPct || 0) * 100).toFixed(2)}%</td>
                <td>Rs. ${(p.grossSalary || 0).toLocaleString()}</td>
                <td>Rs. ${(
                  (p.nopayDeduction || 0) +
                  (p.lateDeduction || 0) +
                  (p.epfEmployee || 0)
                ).toLocaleString()}</td>
                <td>Rs. ${(p.netSalary || 0).toLocaleString()}</td>
              </tr>
            `
              )
              .join('')}
            <tr class="total-row">
              <td colspan="4">TOTAL</td>
              <td>Rs. ${paysheets.reduce((sum, p) => sum + (p.grossSalary || 0), 0).toLocaleString()}</td>
              <td>Rs. ${paysheets
                .reduce(
                  (sum, p) =>
                    sum +
                    (p.nopayDeduction || 0) +
                    (p.lateDeduction || 0) +
                    (p.epfEmployee || 0),
                  0
                )
                .toLocaleString()}</td>
              <td>Rs. ${paysheets.reduce((sum, p) => sum + (p.netSalary || 0), 0).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const formatCurrency = (num: number) =>
    `Rs. ${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2>Export Paysheets</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
            Export and print paysheet records for reporting
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Select Month</label>
            <input
              type="month"
              className="form-input"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={exportToCSV}
            disabled={exporting || loading || paysheets.length === 0}
            style={{ marginTop: 20 }}
          >
            Export to CSV
          </button>
          <button
            className="btn btn-secondary"
            onClick={printPaysheets}
            disabled={loading || paysheets.length === 0}
            style={{ marginTop: 20 }}
          >
            Print
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          ) : paysheets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>No paysheets found for {selectedMonth}</p>
            </div>
          ) : (
            <>
              <div className="card-header">
                <h2>{paysheets.length} Paysheets Ready to Export</h2>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Role</th>
                    <th>Months</th>
                    <th>Achievement %</th>
                    <th>Gross Salary</th>
                    <th>Net Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {paysheets.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{p.codeNo}</td>
                      <td>{p.role}</td>
                      <td style={{ textAlign: 'center' }}>{p.monthsOfService}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="badge badge-info">
                          {((p.achievementPct || 0) * 100).toFixed(2)}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {formatCurrency(p.grossSalary || 0)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                        {formatCurrency(p.netSalary || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary Stats */}
              <div className="stats-grid" style={{ padding: 24 }}>
                <div className="stat-card">
                  <div className="stat-info">
                    <h3>{paysheets.length}</h3>
                    <p>Total Paysheets</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-info">
                    <h3>{formatCurrency(paysheets.reduce((sum, p) => sum + (p.grossSalary || 0), 0))}</h3>
                    <p>Total Gross</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-info">
                    <h3 style={{ color: 'var(--gold-400)' }}>
                      {formatCurrency(paysheets.reduce((sum, p) => sum + (p.netSalary || 0), 0))}
                    </h3>
                    <p>Total Net</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-info">
                    <h3>
                      {formatCurrency(
                        paysheets.reduce((sum, p) => sum + (p.netSalary || 0), 0) / paysheets.length
                      )}
                    </h3>
                    <p>Avg Net</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaysheetExport;
