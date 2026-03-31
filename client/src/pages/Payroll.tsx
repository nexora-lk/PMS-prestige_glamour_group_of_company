import { useState, useEffect, useRef, useCallback } from 'react';
import { FiSearch, FiPrinter, FiDownload, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import { payrollService } from '../services/payrollService';
import { userService } from '../services/userService';
import { BRANCHES } from '../constants/branches';
import { formatCurrency } from '../utils/format';
import type { User, PayrollRecord, MonthlyPaysheet } from '../types';
import { showToast } from '../components/Toast';
import { PaysheetGeneration } from '../components/PaysheetGeneration';
import PaySheet from '../components/PaySheet';
import api from '../services/api';

// ── Type conversions for PaySheet component ─────────────────

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
    otherOffer: 0,
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
    bankAccount: '',
    bankName: '',
    basicSalary: record.basicSalary,
    allowances: record.allowances,
    deductions: record.deductions,
    status: 'active',
    createdAt: '',
    updatedAt: '',
  };
}

// ── Bulk PDF job progress type ──────────────────────────────

interface JobProgress {
  id: string;
  status: 'pending' | 'processing' | 'zipping' | 'completed' | 'failed';
  total: number;
  completed: number;
  failed: number;
  progress: number;
  error: string | null;
}

// ── Main Component ──────────────────────────────────────────

export default function Payroll() {
  const [activeTab, setActiveTab] = useState<'generate' | 'branch-role' | 'bulk-pdf' | 'history'>('generate');

  // ── Generate & Preview state ──────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [generatedRecords, setGeneratedRecords] = useState<PayrollRecord[]>([]);
  const [generating, setGenerating] = useState(false);

  // ── History state ─────────────────────────────────────────
  const [history, setHistory] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterBranch, setFilterBranch] = useState('');

  // ── Bulk PDF state ────────────────────────────────────────
  const [pdfMonth, setPdfMonth] = useState(new Date().toISOString().slice(0, 7));
  const [concurrency, setConcurrency] = useState(5);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [job, setJob] = useState<JobProgress | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [pdfPrinting, setPdfPrinting] = useState(false);
  const [pdfPrinterName, setPdfPrinterName] = useState('');
  const [pdfCopies, setPdfCopies] = useState(1);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Print ref ─────────────────────────────────────────────
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Payroll_${period}`,
  });

  // ── Data fetching ─────────────────────────────────────────

  useEffect(() => {
    fetchUsers();
    fetchHistory();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await userService.listUsers({ status: 'active', limit: 1000 });
      setUsers(res.users);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load active employees', 'error');
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await payrollService.getPayrollHistory();
      setHistory(res.records);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load payroll history', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Generate handlers ─────────────────────────────────────

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
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to generate payroll', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const viewRecord = (record: PayrollRecord) => {
    setGeneratedRecords([record]);
    setActiveTab('generate');
  };

  // ── Bulk PDF polling ──────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return stopPolling;
  }, [stopPolling]);

  const pollProgress = useCallback(
    (jobId: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const res = await api.get<JobProgress>(`/payslips/progress/${jobId}`);
          setJob(res.data);

          if (res.data.status === 'completed' || res.data.status === 'failed') {
            stopPolling();
            setPdfGenerating(false);

            if (res.data.status === 'completed') {
              showToast(`Generated ${res.data.completed} PDF payslips successfully!`, 'success');
            } else {
              showToast(res.data.error || 'Generation failed', 'error');
            }
          }
        } catch {
          stopPolling();
          setPdfGenerating(false);
        }
      }, 800);
    },
    [stopPolling]
  );

  const handleBulkPdfGenerate = async () => {
    if (!pdfMonth) {
      showToast('Please select a pay month', 'error');
      return;
    }

    setPdfGenerating(true);
    setJob(null);

    try {
      const res = await api.post<{ jobId: string; total: number }>('/payslips/generate', {
        payMonth: pdfMonth,
        concurrency,
      });

      showToast(`Started PDF generation for ${res.data.total} payslips`, 'info');
      setJob({
        id: res.data.jobId,
        status: 'processing',
        total: res.data.total,
        completed: 0,
        failed: 0,
        progress: 0,
        error: null,
      });

      pollProgress(res.data.jobId);
    } catch (err: unknown) {
      setPdfGenerating(false);
      showToast(err instanceof Error ? err.message : 'Failed to start generation', 'error');
    }
  };

  const handleDownloadZip = async () => {
    if (!job?.id) return;

    setDownloading(true);
    try {
      const res = await api.get(`/payslips/download/${job.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslips_${pdfMonth}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Download started', 'success');
    } catch {
      showToast('Download failed', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintPdfs = async () => {
    if (!job?.id) return;

    setPdfPrinting(true);
    try {
      const res = await api.post<{ message: string }>('/payslips/print', {
        jobId: job.id,
        printerName: pdfPrinterName || undefined,
        copies: pdfCopies,
      });
      showToast(res.data.message, 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Print failed', 'error');
    } finally {
      setPdfPrinting(false);
    }
  };

  // ── Filter history ────────────────────────────────────────

  const filteredHistory = history.filter((record) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      record.userName.toLowerCase().includes(searchLower) ||
      record.period.toLowerCase().includes(searchLower) ||
      record.designation.toLowerCase().includes(searchLower);
    const matchesPeriod = !filterPeriod || record.period === filterPeriod;
    const matchesBranch = !filterBranch || record.branch === filterBranch;
    return matchesSearch && matchesPeriod && matchesBranch;
  });

  const uniquePeriods = Array.from(new Set(history.map((r) => r.period))).sort().reverse();

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Queued...';
      case 'processing': return 'Generating PDFs...';
      case 'zipping': return 'Creating ZIP archive...';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="animate-in">
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {([
          ['generate', 'Generate & Preview'],
          ['branch-role', 'By Branch & Role'],
          ['bulk-pdf', 'Bulk PDF Export'],
          ['history', 'History & Reports'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            className={`btn ${activeTab === key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════ TAB 1: Generate & Preview ═══════════════ */}
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

          {/* Preview & Print */}
          <div className="card" style={{ minHeight: 500 }}>
            <div className="card-header">
              <h2>Preview</h2>
              {generatedRecords.length > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={() => handlePrint()}>
                  <FiPrinter size={14} style={{ marginRight: 6 }} />
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

      {/* ═══════════════ TAB 2: By Branch & Role ═══════════════ */}
      {activeTab === 'branch-role' && (
        <PaysheetGeneration onSuccess={() => fetchHistory()} />
      )}

      {/* ═══════════════ TAB 3: Bulk PDF Export ═══════════════ */}
      {activeTab === 'bulk-pdf' && (
        <div>
          {/* Controls */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2>Bulk PDF Payslip Generation</h2>
              <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
                Generate PDF payslips for all employees with paysheets in a given month.
                Uses parallel worker threads for high-performance processing.
              </p>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Pay Month</label>
                  <input
                    type="month"
                    className="form-input"
                    value={pdfMonth}
                    onChange={(e) => setPdfMonth(e.target.value)}
                    disabled={pdfGenerating}
                  />
                </div>
                <div className="form-group">
                  <label>Worker Threads (1-10)</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    max={10}
                    value={concurrency}
                    onChange={(e) => setConcurrency(Math.min(10, Math.max(1, Number(e.target.value))))}
                    disabled={pdfGenerating}
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleBulkPdfGenerate}
                    disabled={pdfGenerating}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <FiPrinter size={18} />
                    {pdfGenerating ? 'Processing...' : 'Generate PDF Payslips'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Progress */}
          {job && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h2>Generation Progress</h2>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {job.status === 'completed' && <FiCheckCircle color="var(--success)" size={18} />}
                    {job.status === 'failed' && <FiAlertCircle color="var(--error)" size={18} />}
                    {statusLabel(job.status)}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    {job.completed} / {job.total}
                    {job.failed > 0 && (
                      <span style={{ color: 'var(--error)', marginLeft: 8 }}>
                        ({job.failed} failed)
                      </span>
                    )}
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    width: '100%',
                    height: 28,
                    background: 'var(--bg-secondary, #1a1a3e)',
                    borderRadius: 6,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: `${job.progress}%`,
                      height: '100%',
                      background:
                        job.status === 'failed'
                          ? 'var(--error, #B22234)'
                          : job.status === 'completed'
                          ? 'var(--success, #1A8754)'
                          : 'linear-gradient(90deg, var(--gold-600, #D4A017), var(--gold-400, #F0CC5A))',
                      transition: 'width 0.3s ease',
                      borderRadius: 6,
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    }}
                  >
                    {job.progress}%
                  </span>
                </div>

                {/* Error */}
                {job.error && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: 12,
                      background: 'rgba(178, 34, 52, 0.1)',
                      borderLeft: '4px solid var(--error)',
                      borderRadius: 4,
                      color: 'var(--error)',
                      fontSize: 14,
                    }}
                  >
                    {job.error}
                  </div>
                )}

                {/* Action buttons */}
                {job.status === 'completed' && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary"
                      onClick={handleDownloadZip}
                      disabled={downloading}
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <FiDownload size={18} />
                      {downloading ? 'Downloading...' : 'Download ZIP'}
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handlePrintPdfs}
                      disabled={pdfPrinting}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'var(--gold-700, #B8860B)',
                      }}
                    >
                      <FiPrinter size={18} />
                      {pdfPrinting ? 'Sending to Printer...' : 'Print All PDFs'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Printer Settings */}
          {job?.status === 'completed' && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h2>Printer Settings</h2>
              </div>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Printer Name (optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Leave blank for default printer"
                      value={pdfPrinterName}
                      onChange={(e) => setPdfPrinterName(e.target.value)}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                      Enter your printer name as shown in Windows Settings &gt; Printers
                    </span>
                  </div>
                  <div className="form-group">
                    <label>Copies</label>
                    <input
                      type="number"
                      className="form-input"
                      min={1}
                      max={50}
                      value={pdfCopies}
                      onChange={(e) => setPdfCopies(Math.min(50, Math.max(1, Number(e.target.value))))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="card">
            <div className="card-header">
              <h2>How It Works</h2>
            </div>
            <div className="card-body" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
              <ol style={{ paddingLeft: 20 }}>
                <li>Select the pay month for which paysheets have been created.</li>
                <li>Adjust the number of worker threads (more = faster, but uses more resources).</li>
                <li>Click <strong>Generate PDF Payslips</strong> to start PDF generation.</li>
                <li>The system processes payslips in parallel using worker threads and Puppeteer.</li>
                <li>Once complete, <strong>Download ZIP</strong> or <strong>Print All PDFs</strong> directly.</li>
                <li>Configure your printer name and copies in <strong>Printer Settings</strong>.</li>
              </ol>
              <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                Performance: 1000 payslips typically generate in under 2 minutes with 5 workers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 4: History & Reports ═══════════════ */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="filter-bar">
            <div className="search-input">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by employee name, period, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
            >
              <option value="">All Periods</option>
              {uniquePeriods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
            >
              <option value="">All Branches</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="table-wrapper">
            {loading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🕒</div>
                <p>No payroll records found</p>
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
                  {filteredHistory.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <span className="badge badge-info">{record.period}</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{record.userName}</td>
                      <td>{record.branch}</td>
                      <td>{formatCurrency(record.grossSalary)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                        {formatCurrency(record.netSalary)}
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

