import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import api from '../services/api';
import type { User, PayrollRecord, PayrollHistoryResponse } from '../types';
import { showToast } from '../components/Toast';

export default function Payroll() {
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  const [users, setUsers] = useState<User[]>([]);
  const [history, setHistory] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate State
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [generatedRecords, setGeneratedRecords] = useState<PayrollRecord[]>([]);

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
      const res = await api.get('/users?limit=1000&status=active');
      setUsers(res.data.users);
    } catch (err) {
      showToast('Failed to load active employees', 'error');
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get<PayrollHistoryResponse>('/payroll/history');
      setHistory(res.data.records);
    } catch (err) {
      showToast('Failed to load payroll history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!period) return showToast('Please select a period', 'error');

    setLoading(true);
    try {
      const payload = {
        userIds: selectedUserId === 'all' ? undefined : [selectedUserId],
        period,
      };
      const res = await api.post('/payroll/generate', payload);
      setGeneratedRecords(res.data.records);
      showToast(res.data.message, 'success');
      fetchHistory(); // Refresh history
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to generate payroll', 'error');
    } finally {
      setLoading(false);
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
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                  >
                    <option value="all">All Active Employees ({users.length})</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.department})
                      </option>
                    ))}
                  </select>
                  <p className="text-muted" style={{ fontSize: 11, marginTop: 6 }}>
                    Note: Generates paysheet based on current salary info in Employee profile.
                  </p>
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? 'Processing...' : 'Generate Pay Sheet'}
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
                  🖨️ Print
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
                <div style={{ overflowX: 'auto' }}>
                  <div ref={printRef} className="print-area">
                    {generatedRecords.map((record, index) => (
                      <div key={record.id} className="paysheet" style={{ marginBottom: index < generatedRecords.length - 1 ? 40 : 0 }}>
                        <div className="paysheet-header">
                          <h1>PAYROLL SLIP</h1>
                          <p>PayrollPro Management Inc.</p>
                        </div>

                        <div className="paysheet-info">
                          <div>
                            <div className="paysheet-info-item">
                              <span className="label">Employee Name</span>
                              <span className="value">{record.userName}</span>
                            </div>
                            <div className="paysheet-info-item">
                              <span className="label">Employee ID</span>
                              <span className="value">{record.userId.substring(0, 8)}</span>
                            </div>
                            <div className="paysheet-info-item">
                              <span className="label">Department</span>
                              <span className="value">{record.department}</span>
                            </div>
                          </div>
                          <div>
                            <div className="paysheet-info-item">
                              <span className="label">Pay Period</span>
                              <span className="value">{record.period}</span>
                            </div>
                            <div className="paysheet-info-item">
                              <span className="label">Designation</span>
                              <span className="value">{record.designation}</span>
                            </div>
                            <div className="paysheet-info-item">
                              <span className="label">Generated On</span>
                              <span className="value">{new Date(record.generatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <table className="paysheet-table">
                          <thead>
                            <tr>
                              <th>Earnings</th>
                              <th style={{ textAlign: 'right' }}>Amount ($)</th>
                              <th>Deductions</th>
                              <th style={{ textAlign: 'right' }}>Amount ($)</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>Basic Salary</td>
                              <td style={{ textAlign: 'right' }}>{record.basicSalary.toFixed(2)}</td>
                              <td>Tax Deduction</td>
                              <td style={{ textAlign: 'right' }}>{record.tax.toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td>Allowances</td>
                              <td style={{ textAlign: 'right' }}>{record.allowances.toFixed(2)}</td>
                              <td>Other Deductions</td>
                              <td style={{ textAlign: 'right' }}>{record.deductions.toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: 600 }}>Gross Earnings</td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{record.grossSalary.toFixed(2)}</td>
                              <td style={{ fontWeight: 600 }}>Total Deductions</td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{(record.tax + record.deductions).toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>

                        <div className="paysheet-total">
                          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>NET PAY</p>
                          <div className="net-salary">${record.netSalary.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <div className="table-wrapper">
            {loading ? (
              <div className="loading-spinner"><div className="spinner"></div></div>
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
                    <th>Department</th>
                    <th>Gross Pay</th>
                    <th>Net Pay</th>
                    <th>Date Generated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr key={record.id}>
                      <td><span className="badge badge-info">{record.period}</span></td>
                      <td style={{ fontWeight: 500 }}>{record.userName}</td>
                      <td>{record.department}</td>
                      <td>${record.grossSalary.toFixed(2)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--success)' }}>${record.netSalary.toFixed(2)}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {new Date(record.generatedAt).toLocaleString()}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => viewRecord(record)}>
                          👁️ View / Print
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
