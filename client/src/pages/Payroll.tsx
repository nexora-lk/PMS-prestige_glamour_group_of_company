import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { payrollService } from '../services/payrollService';
import { userService } from '../services/userService';
import type { User, PayrollRecord, MonthlyPaysheet } from '../types';
import { showToast } from '../components/Toast';
import { PaysheetGeneration } from '../components/PaysheetGeneration';
import PaySheet from '../components/PaySheet';

/** Convert a PayrollRecord into the shape PaySheet expects */
function recordToPaysheet(record: PayrollRecord): MonthlyPaysheet {
  return {
    id: record.id,
    employeeId: record.userId,
    codeNo: record.userId.substring(0, 8),
    payMonth: record.period,
    role: record.designation,
    monthsOfService: 0,
    achieve: 0,
    allowance: record.allowances,
    nopay: 0,
    late: 0,
    epfAvailability: record.tax > 0,
    etfAvailability: record.tax > 0,
    welfare: 0,
    otherOfficers: 0,
    basicSalary: record.basicSalary,
    grossSalary: record.grossSalary,
    netSalary: record.netSalary,
    generalAllowance: record.allowances,
    epfEmployee: record.tax,
    nopayDeduction: 0,
    lateDeduction: 0,
    createdAt: record.generatedAt,
  };
}

/** Build a minimal User from a PayrollRecord for display */
function recordToUser(record: PayrollRecord): User {
  const nameParts = record.userName.split(' ');
  return {
    id: record.userId,
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    email: '',
    phone: '',
    branch: record.branch,
    role: record.designation,
    designation: record.designation,
    joinDate: '',
    basicSalary: record.basicSalary,
    allowances: record.allowances,
    deductions: record.deductions,
    status: 'active',
    createdAt: '',
    updatedAt: '',
  };
}

export default function Payroll() {
  const [activeTab, setActiveTab] = useState<'generate' | 'branch-role' | 'history'>('generate');
  const [users, setUsers] = useState<User[]>([]);
  const [history, setHistory] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [generatedRecords, setGeneratedRecords] = useState<PayrollRecord[]>([]);
  const [generating, setGenerating] = useState(false);

  // Print Ref
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Payroll_${period}`,
  });

  useEffect(() => {
    fetchUsers();
    fetchHistory();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await userService.listUsers({ status: 'active', limit: 1000 });
      setUsers(res.users);
    } catch (err: any) {
      showToast(err.message || 'Failed to load active employees', 'error');
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await payrollService.getPayrollHistory();
      setHistory(res.records);
    } catch (err: any) {
      showToast(err.message || 'Failed to load payroll history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!period) return showToast('Please select a period', 'error');

    setGenerating(true);
    try {
      const res = await payrollService.generatePayroll({
        userIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
        period,
      });
      setGeneratedRecords(res.records);
      showToast(res.message, 'success');
      fetchHistory();
    } catch (err: any) {
      showToast(err.message || 'Failed to generate payroll', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const viewRecord = (record: PayrollRecord) => {
    setGeneratedRecords([record]);
    setActiveTab('generate');
  };

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button
          className={`btn ${activeTab === 'generate' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('generate')}
        >
          Generate & Print
        </button>
        <button
          className={`btn ${activeTab === 'branch-role' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('branch-role')}
        >
          By Branch & Role
        </button>
        <button
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('history')}
        >
          History & Reports
        </button>
      </div>

      {activeTab === 'generate' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
          {/* Controls */}
          <div className="card h-fit">
            <div className="card-header">
              <h2>Generate Pay Sheet</h2>
            </div>
            <div className="card-body">
              <form onSubmit={handleGenerate}>
                <div className="form-group">
                  <label>Payroll Period</label>
                  <input
                    type="month"
                    className="form-input"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Select Employee(s)</label>
                  <select
                    className="form-select"
                    multiple
                    value={selectedUserIds}
                    onChange={(e) =>
                      setSelectedUserIds(
                        Array.from(e.target.selectedOptions, (option) => option.value)
                      )
                    }
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.branch})
                      </option>
                    ))}
                  </select>
                  <p className="text-muted" style={{ fontSize: 11, marginTop: 6 }}>
                    Note: Leave empty to generate for all active employees. Hold Ctrl/Cmd to
                    select multiple.
                  </p>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={generating}
                >
                  {generating ? 'Processing...' : 'Generate Pay Sheet'}
                </button>
              </form>
            </div>
          </div>

          {/* Preview & Print Area */}
          <div className="card" style={{ minHeight: 500 }}>
            <div className="card-header">
              <h2>Preview</h2>
              {generatedRecords.length > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={() => handlePrint()}>
                  Print
                </button>
              )}
            </div>
            <div className="card-body">
              {generatedRecords.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📄</div>
                  <p>Generate a pay sheet to view preview</p>
                </div>
              ) : (
                <div
                  ref={printRef}
                  style={{
                    background: '#eaeaea',
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 40,
                  }}
                >
                  {generatedRecords.map((record) => (
                    <PaySheet
                      key={record.id}
                      paysheet={recordToPaysheet(record)}
                      employee={recordToUser(record)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'branch-role' && (
        <PaysheetGeneration onSuccess={() => fetchHistory()} />
      )}

      {activeTab === 'history' && (
        <div className="card">
          <div className="table-wrapper">
            {loading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🕒</div>
                <p>No payroll history found</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Employee</th>
                    <th>Branch</th>
                    <th>Gross Pay</th>
                    <th>Net Pay</th>
                    <th>Date Generated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <span className="badge badge-info">{record.period}</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{record.userName}</td>
                      <td>{record.branch}</td>
                      <td>Rs. {record.grossSalary.toFixed(2)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                        Rs. {record.netSalary.toFixed(2)}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {new Date(record.generatedAt).toLocaleString()}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => viewRecord(record)}
                        >
                          View / Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
