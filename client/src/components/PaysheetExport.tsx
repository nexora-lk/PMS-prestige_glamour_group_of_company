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
          th { background-color: #f5f5f5; font-weight: bold; }
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
                <td>${(p.grossSalary || 0).toLocaleString()}</td>
                <td>${(
                  (p.nopayDeduction || 0) +
                  (p.lateDeduction || 0) +
                  (p.epfEmployee || 0)
                ).toLocaleString()}</td>
                <td>${(p.netSalary || 0).toLocaleString()}</td>
              </tr>
            `
              )
              .join('')}
            <tr class="total-row">
              <td colspan="4">TOTAL</td>
              <td>${paysheets.reduce((sum, p) => sum + (p.grossSalary || 0), 0).toLocaleString()}</td>
              <td>${paysheets
                .reduce(
                  (sum, p) =>
                    sum +
                    (p.nopayDeduction || 0) +
                    (p.lateDeduction || 0) +
                    (p.epfEmployee || 0),
                  0
                )
                .toLocaleString()}</td>
              <td>${paysheets.reduce((sum, p) => sum + (p.netSalary || 0), 0).toLocaleString()}</td>
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: 700 }}>
            📤 Export Paysheets
          </h1>
          <p style={{ margin: '0', color: '#666', fontSize: '13px' }}>
            Export and print paysheet records for reporting
          </p>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          marginBottom: '24px',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
        }}
      >
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
            Select Month
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={exportToCSV}
          disabled={exporting || loading || paysheets.length === 0}
          style={{ marginTop: '24px', padding: '8px 16px' }}
        >
          📊 Export to CSV
        </button>
        <button
          className="btn btn-secondary"
          onClick={printPaysheets}
          disabled={loading || paysheets.length === 0}
          style={{ marginTop: '24px', padding: '8px 16px' }}
        >
          🖨️ Print
        </button>
      </div>

      {/* Results */}
      <div
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
        }}
      >
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
            ⏳ Loading paysheets...
          </div>
        ) : paysheets.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
            📋 No paysheets found for {selectedMonth}
          </div>
        ) : (
          <>
            <h2 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>
              {paysheets.length} Paysheets Ready to Export
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Code</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Role</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>Months</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>Achievement %</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>Gross Salary</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>Net Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {paysheets.map((p, i) => (
                    <tr
                      key={p.id}
                      style={{
                        backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa',
                        borderBottom: '1px solid #e0e0e0',
                      }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{p.codeNo}</td>
                      <td style={{ padding: '10px 12px' }}>{p.role}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{p.monthsOfService}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {((p.achievementPct || 0) * 100).toFixed(2)}%
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {(p.grossSalary || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#2e7d32' }}>
                        {(p.netSalary || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Stats */}
            <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Paysheets</div>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>{paysheets.length}</div>
              </div>
              <div style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Gross</div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>
                  {paysheets.reduce((sum, p) => sum + (p.grossSalary || 0), 0).toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                  })}
                </div>
              </div>
              <div style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Net</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#2e7d32' }}>
                  {paysheets.reduce((sum, p) => sum + (p.netSalary || 0), 0).toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                  })}
                </div>
              </div>
              <div style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Avg Net</div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>
                  {(
                    paysheets.reduce((sum, p) => sum + (p.netSalary || 0), 0) / paysheets.length
                  ).toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PaysheetExport;

