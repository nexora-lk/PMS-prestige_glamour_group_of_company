import { useState, useEffect, useRef, useCallback } from 'react';
import { FiSearch, FiPrinter, FiDownload, FiCheckCircle, FiAlertCircle, FiFileText } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import { paysheetService } from '../services/paysheetService';
import { userService } from '../services/userService';
import { BRANCHES } from '../constants/branches';
import { ROLES } from '../constants/roleSalaries';
import { formatCurrency } from '../utils/format';
import type { User, MonthlyPaysheet } from '../types';
import { showToast } from '../components/Toast';
import PaySheet from '../components/PaySheet';
import api from '../services/api';

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
  const [activeTab, setActiveTab] = useState<'generate' | 'bulk-pdf' | 'history'>('generate');

  // ── Generate & Preview state ──────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [userMap, setUserMap] = useState<Map<string, User>>(new Map());
  const [selectedCodeNos, setSelectedCodeNos] = useState<Set<string>>(new Set());
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [empFilterBranch, setEmpFilterBranch] = useState('');
  const [empFilterRole, setEmpFilterRole] = useState('');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [previewPaysheets, setPreviewPaysheets] = useState<MonthlyPaysheet[]>([]);
  const [fetching, setFetching] = useState(false);
  const [printMode, setPrintMode] = useState<'a4' | '2up'>('a4');
  const [missingEmployees, setMissingEmployees] = useState<string[]>([]);

  // ── History state ─────────────────────────────────────────
  const [historyPaysheets, setHistoryPaysheets] = useState<MonthlyPaysheet[]>([]);
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
  const [jsonExporting, setJsonExporting] = useState(false);
  const [pdfPrinterName, setPdfPrinterName] = useState('');
  const [pdfCopies, setPdfCopies] = useState(1);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Preview PDF download state ─────────────────────────────
  const [previewPdfDownloading, setPreviewPdfDownloading] = useState(false);

  // ── Print ref ─────────────────────────────────────────────
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Payroll_${period}`,
    pageStyle: '@page { size: A4 portrait; margin: 8mm 10mm; }',
  });

  // ── Data fetching ─────────────────────────────────────────

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await userService.listUsers({ status: 'active', limit: 1000 });
      setUsers(res.users);
      const map = new Map<string, User>();
      res.users.forEach((u) => map.set(u.codeNo, u));
      setUserMap(map);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load active employees', 'error');
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await paysheetService.listPaysheets({ limit: 10000 });
      setHistoryPaysheets(res.paysheets);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load paysheet history', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Employee selection helpers ─────────────────────────────

  const filteredUsers = users.filter((u) => {
    if (empFilterBranch && u.branch !== empFilterBranch) return false;
    if (empFilterRole && (u.role || u.designation) !== empFilterRole) return false;
    if (employeeSearch) {
      const q = employeeSearch.toLowerCase();
      return (
        u.codeNo.toLowerCase().includes(q) ||
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q) ||
        u.branch.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const toggleUser = (codeNo: string) => {
    setSelectedCodeNos((prev) => {
      const next = new Set(prev);
      if (next.has(codeNo)) next.delete(codeNo);
      else next.add(codeNo);
      return next;
    });
  };

  const toggleAllUsers = () => {
    if (selectedCodeNos.size === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedCodeNos(new Set());
    } else {
      setSelectedCodeNos(new Set(filteredUsers.map((u) => u.codeNo)));
    }
  };

  const isAllSelected = filteredUsers.length > 0 && selectedCodeNos.size === filteredUsers.length;

  // ── Fetch paysheets for preview ───────────────────────────

  const handleFetchPreview = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!period) return showToast('Please select a period', 'error');

    setFetching(true);
    setMissingEmployees([]);
    try {
      let res = await paysheetService.getMonthPaysheets(period, { limit: 10000 });
      let paysheets = res.paysheets;

      // Filter by selected employees if any
      if (selectedCodeNos.size > 0) {
        paysheets = paysheets.filter((p) => selectedCodeNos.has(p.codeNo));

        // Find which selected employees have no paysheet
        const foundCodes = new Set(paysheets.map((p) => p.codeNo));
        const missingCodes = [...selectedCodeNos].filter((c) => !foundCodes.has(c));

        // Auto-create basic paysheets for missing employees
        if (missingCodes.length > 0) {
          try {
            const bulkRes = await api.post<{ created: number; errors: string[] }>('/paysheets/bulk-create', {
              codeNos: missingCodes,
              payMonth: period,
            });
            if (bulkRes.data.created > 0) {
              showToast(`Auto-created ${bulkRes.data.created} basic paysheet(s) for missing employees`, 'info');
              // Re-fetch to include newly created
              res = await paysheetService.getMonthPaysheets(period, { limit: 10000 });
              paysheets = res.paysheets.filter((p) => selectedCodeNos.has(p.codeNo));
            }
            if (bulkRes.data.errors.length > 0) {
              const failedNames = bulkRes.data.errors.map((err) => {
                const match = err.match(/:\s*(.+)/);
                return match ? match[1] : err;
              });
              setMissingEmployees(failedNames);
            }
          } catch {
            // If bulk-create fails, just show what we have
            const missingNames = missingCodes.map((c) => {
              const u = userMap.get(c);
              return u ? `${u.firstName} ${u.lastName} (${c})` : c;
            });
            setMissingEmployees(missingNames);
          }
        }
      }

      // Filter out paysheets with achievedSalary = 0 and warn
      const zeroSalary = paysheets.filter((p) => !p.achievedSalary || p.achievedSalary === 0);
      if (zeroSalary.length > 0) {
        const names = zeroSalary.map((p) => {
          const u = userMap.get(p.codeNo);
          return u ? `${u.firstName} ${u.lastName} (${p.codeNo})` : p.codeNo;
        });
        showToast(
          `Cannot generate paysheet for: ${names.join(', ')} — Basic offer is 0.`,
          'error'
        );
        paysheets = paysheets.filter((p) => p.achievedSalary && p.achievedSalary > 0);
      }

      if (paysheets.length === 0) {
        showToast('No valid paysheets found for the selected period/employees.', 'error');
      } else {
        showToast(`Loaded ${paysheets.length} paysheet(s)`, 'success');
      }

      setPreviewPaysheets(paysheets);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to fetch paysheets', 'error');
    } finally {
      setFetching(false);
    }
  };

  // ── Download preview paysheets as PDF ─────────────────────

  const handlePreviewPdfDownload = async () => {
    if (previewPaysheets.length === 0) return;
    setPreviewPdfDownloading(true);

    try {
      if (previewPaysheets.length === 1 && previewPaysheets[0].id) {
        // Single paysheet — use the single PDF endpoint
        const res = await api.get(`/payslips/pdf/${previewPaysheets[0].id}`, { responseType: 'arraybuffer' });
        const ps = previewPaysheets[0];
        const filename = `PaySlip_${ps.codeNo}_${ps.payMonth}.pdf`;

        if (window.electronAPI?.saveFile) {
          const result = await window.electronAPI.saveFile({
            data: Array.from(new Uint8Array(res.data as ArrayBuffer)),
            defaultName: filename,
          });
          if (result.success) showToast(`Saved to ${result.filePath}`, 'success');
          else if (result.error !== 'Cancelled') showToast(result.error || 'Save failed', 'error');
        } else {
          const url = window.URL.createObjectURL(new Blob([res.data as ArrayBuffer], { type: 'application/pdf' }));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          link.parentNode?.removeChild(link);
          window.URL.revokeObjectURL(url);
          showToast('PDF download started', 'success');
        }
      } else {
        // Multiple paysheets — use bulk generation for selected code numbers
        const codeNos = previewPaysheets.map((p) => p.codeNo);
        const res = await api.post<{ jobId: string; total: number; skipped: string[] }>('/payslips/generate', {
          payMonth: period,
          codeNos,
          concurrency: 5,
        });

        if (res.data.skipped.length > 0) {
          showToast(`Skipped (basic offer is 0): ${res.data.skipped.join(', ')}`, 'error');
        }
        showToast(`Generating ${res.data.total} PDFs... Go to "Bulk PDF Export" tab to download when ready.`, 'info');
        setJob({
          id: res.data.jobId,
          status: 'processing',
          total: res.data.total,
          completed: 0,
          failed: 0,
          progress: 0,
          error: null,
        });
        setPdfMonth(period);
        setActiveTab('bulk-pdf');
        pollProgress(res.data.jobId);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'PDF download failed', 'error');
    } finally {
      setPreviewPdfDownloading(false);
    }
  };

  const viewPaysheet = (paysheet: MonthlyPaysheet) => {
    setPreviewPaysheets([paysheet]);
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
      const res = await api.post<{ jobId: string; total: number; skipped: string[] }>('/payslips/generate', {
        payMonth: pdfMonth,
        concurrency,
      });

      if (res.data.skipped.length > 0) {
        showToast(
          `Skipped (basic offer is 0): ${res.data.skipped.join(', ')}`,
          'error'
        );
      }
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
      const res = await api.get(`/payslips/download/${job.id}`, { responseType: 'arraybuffer' });
      if (window.electronAPI?.saveFile) {
        // Electron: use native save dialog
        const result = await window.electronAPI.saveFile({
          data: Array.from(new Uint8Array(res.data as ArrayBuffer)),
          defaultName: `payslips_${pdfMonth}.zip`,
        });
        if (result.success) {
          showToast(`Saved to ${result.filePath}`, 'success');
        } else if (result.error !== 'Cancelled') {
          showToast(result.error || 'Save failed', 'error');
        }
      } else {
        // Web browser: blob download
        const url = window.URL.createObjectURL(new Blob([res.data as ArrayBuffer]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `payslips_${pdfMonth}.zip`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
        showToast('Download started', 'success');
      }
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

  // ── JSON Export (ZIP of individual JSON files) ────────────

  const handleJsonExport = async () => {
    if (!pdfMonth) {
      showToast('Please select a pay month', 'error');
      return;
    }

    setJsonExporting(true);
    try {
      const res = await api.get(`/export/paysheets-json`, {
        params: { payMonth: pdfMonth },
        responseType: 'arraybuffer',
      });

      // Show skipped paysheets notification
      const skippedNames = res.headers['x-skipped-names'];
      if (skippedNames) {
        showToast(
          `Skipped (basic offer is 0): ${decodeURIComponent(skippedNames)}`,
          'error'
        );
      }

      if (window.electronAPI?.saveFile) {
        const result = await window.electronAPI.saveFile({
          data: Array.from(new Uint8Array(res.data as ArrayBuffer)),
          defaultName: `paysheets_json_${pdfMonth}.zip`,
        });
        if (result.success) {
          showToast(`Saved to ${result.filePath}`, 'success');
        } else if (result.error !== 'Cancelled') {
          showToast(result.error || 'Save failed', 'error');
        }
      } else {
        const url = window.URL.createObjectURL(new Blob([res.data as ArrayBuffer]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `paysheets_json_${pdfMonth}.zip`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
        showToast('JSON export download started', 'success');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'JSON export failed', 'error');
    } finally {
      setJsonExporting(false);
    }
  };

  // ── Filter history ────────────────────────────────────────

  const filteredHistory = historyPaysheets.filter((ps) => {
    const user = userMap.get(ps.codeNo);
    const name = user ? `${user.firstName} ${user.lastName}` : ps.codeNo;
    const branch = user?.branch || '';
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      name.toLowerCase().includes(searchLower) ||
      ps.codeNo.toLowerCase().includes(searchLower) ||
      ps.role.toLowerCase().includes(searchLower);
    const matchesPeriod = !filterPeriod || ps.payMonth === filterPeriod;
    const matchesBranch = !filterBranch || branch.toLowerCase() === filterBranch.toLowerCase();
    return matchesSearch && matchesPeriod && matchesBranch;
  });

  const uniquePeriods = Array.from(new Set(historyPaysheets.map((p) => p.payMonth))).sort().reverse();

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
          ['generate', 'Preview & Print'],
          ['bulk-pdf', 'Bulk PDF Export'],
          ['history', 'History & Reports'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            className={`btn ${activeTab === key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setActiveTab(key);
              if (key === 'history') fetchHistory();
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════ TAB 1: Preview & Print ═══════════════ */}
      {activeTab === 'generate' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Employee Selection Card */}
          <div className="card">
            <div className="card-header">
              <h2>Select Employees</h2>
              {selectedCodeNos.size > 0 && (
                <span style={{ fontSize: 13, color: 'var(--gold-400)' }}>
                  {selectedCodeNos.size} selected
                </span>
              )}
            </div>

            {/* Filter Bar — same layout as Users Management */}
            <div className="filter-bar">
              <div className="search-input">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by code no, name, role..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                />
              </div>

              <select
                className="filter-select"
                value={empFilterBranch}
                onChange={(e) => setEmpFilterBranch(e.target.value)}
              >
                <option value="">All Branches</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <select
                className="filter-select"
                value={empFilterRole}
                onChange={(e) => setEmpFilterRole(e.target.value)}
              >
                <option value="">All Roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <input
                type="month"
                className="form-input"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                required
                style={{ width: 'auto' }}
              />

              {selectedCodeNos.size > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setSelectedCodeNos(new Set())}
                  style={{ color: 'var(--ruby-500)', fontSize: 13 }}
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Employee Table */}
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleAllUsers}
                        title="Select All"
                      />
                    </th>
                    <th>Employee</th>
                    <th>Code No</th>
                    <th>Role</th>
                    <th>Branch</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                        No employees found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr
                        key={u.codeNo}
                        onClick={() => toggleUser(u.codeNo)}
                        style={{
                          cursor: 'pointer',
                          background: selectedCodeNos.has(u.codeNo)
                            ? 'rgba(200, 164, 21, 0.08)'
                            : undefined,
                        }}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedCodeNos.has(u.codeNo)}
                            onChange={() => toggleUser(u.codeNo)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar">{u.firstName.charAt(0)}</div>
                            <div>
                              <div className="user-name">{u.firstName} {u.lastName}</div>
                              <div className="user-email" style={{ fontSize: 11 }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 13 }}>{u.codeNo}</td>
                        <td>{u.role || u.designation}</td>
                        <td>{u.branch}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer with Load button */}
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--neutral-700)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {filteredUsers.length} employee(s) shown
                {selectedCodeNos.size === 0 && ' — leave none selected to load all paysheets'}
              </span>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFetchPreview}
                disabled={fetching}
              >
                {fetching ? 'Loading...' : `Load Pay Sheets${selectedCodeNos.size > 0 ? ` (${selectedCodeNos.size})` : ''}`}
              </button>
            </div>
          </div>

          {/* Preview & Print */}
          <div className="card" style={{ minHeight: 400 }}>
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
              <h2>
                Preview ({previewPaysheets.length})
                {selectedCodeNos.size > 0 && previewPaysheets.length > 0 && previewPaysheets.length < selectedCodeNos.size && (
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                    of {selectedCodeNos.size} selected
                  </span>
                )}
              </h2>
              {previewPaysheets.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                  {/* Print mode toggle */}
                  <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <button
                      className={`btn btn-sm ${printMode === 'a4' ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setPrintMode('a4')}
                      style={{ borderRadius: 0, fontSize: 12, padding: '6px 12px' }}
                    >
                      A4 (1/page)
                    </button>
                    <button
                      className={`btn btn-sm ${printMode === '2up' ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setPrintMode('2up')}
                      style={{ borderRadius: 0, fontSize: 12, padding: '6px 12px' }}
                    >
                      A4 (2/page)
                    </button>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handlePreviewPdfDownload}
                    disabled={previewPdfDownloading}
                  >
                    <FiDownload size={14} style={{ marginRight: 6 }} />
                    {previewPdfDownloading ? 'Generating...' : 'Download PDF'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handlePrint()}>
                    <FiPrinter size={14} style={{ marginRight: 6 }} />
                    Print
                  </button>
                </div>
              )}
            </div>
            {/* Warning banner for missing paysheets */}
            {missingEmployees.length > 0 && (
              <div className="no-print" style={{
                padding: '12px 16px',
                background: 'rgba(212, 160, 23, 0.12)',
                borderBottom: '1px solid rgba(212, 160, 23, 0.3)',
                color: 'var(--gold-400, #d4a017)',
                fontSize: 13,
              }}>
                <strong>Missing paysheets ({missingEmployees.length}):</strong>{' '}
                {missingEmployees.join(', ')}.
                <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                  Create paysheets for these employees in Monthly Paysheets first.
                </span>
              </div>
            )}
            <div className="card-body">
              {previewPaysheets.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📄</div>
                  <p>Select employees and click "Load Pay Sheets" to preview.</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                    Paysheets must be created first in the Monthly Paysheets section.
                  </p>
                </div>
              ) : (
                <div
                  ref={printRef}
                  className={`print-area ${printMode === '2up' ? 'print-mode-2up' : 'print-mode-a4'}`}
                  style={{
                    background: '#eaeaea',
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 30,
                  }}
                >
                  {printMode === '2up' ? (
                    // 2-per-page: group paysheets into pairs, stacked top/bottom
                    // Each paysheet is A5 portrait (148×210mm) rotated 90° to fill
                    // a 210×148.5mm landscape slot. Two slots per A4 portrait page.
                    (() => {
                      const pairs: MonthlyPaysheet[][] = [];
                      for (let i = 0; i < previewPaysheets.length; i += 2) {
                        pairs.push(previewPaysheets.slice(i, i + 2));
                      }
                      return pairs.map((pair, idx) => (
                        <div
                          key={idx}
                          className="print-page-pair"
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: 794,  /* 210mm at 96dpi */
                            background: '#fff',
                            borderRadius: 4,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            overflow: 'hidden',
                          }}
                        >
                          {pair.map((ps) => (
                            <div
                              key={ps.id || ps.codeNo}
                              className="paysheet-slot"
                              style={{
                                width: 794,      /* 210mm */
                                height: 561,     /* 148.5mm */
                                position: 'relative',
                                overflow: 'hidden',
                                borderBottom: '1px dashed #ccc',
                              }}
                            >
                              <div style={{
                                transformOrigin: 'top left',
                                transform: 'rotate(90deg) translateY(-100%)',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                              }}>
                                <PaySheet
                                  paysheet={ps}
                                  employee={userMap.get(ps.codeNo) || null}
                                  size="2up"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ));
                    })()
                  ) : (
                    // A4 single per page
                    previewPaysheets.map((ps) => (
                      <PaySheet
                        key={ps.id || ps.codeNo}
                        paysheet={ps}
                        employee={userMap.get(ps.codeNo) || null}
                        size="a4"
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 2: Bulk PDF Export ═══════════════ */}
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
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleBulkPdfGenerate}
                    disabled={pdfGenerating}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <FiPrinter size={18} />
                    {pdfGenerating ? 'Processing...' : 'Generate PDF Payslips'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleJsonExport}
                    disabled={jsonExporting}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <FiFileText size={18} />
                    {jsonExporting ? 'Exporting...' : 'Export JSON ZIP'}
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
                <li>Create paysheets in the <strong>Monthly Paysheets</strong> section first.</li>
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

      {/* ═══════════════ TAB 3: History & Reports ═══════════════ */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="filter-bar">
            <div className="search-input">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by employee, code, or role..."
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
                <p>No paysheet records found</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Code No</th>
                    <th>Employee</th>
                    <th>Role</th>
                    <th>Gross Pay</th>
                    <th>Net Pay</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((ps) => {
                    const user = userMap.get(ps.codeNo);
                    const name = user ? `${user.firstName} ${user.lastName}` : ps.codeNo;
                    return (
                      <tr key={ps.id || ps.codeNo + ps.payMonth}>
                        <td>
                          <span className="badge badge-info">{ps.payMonth}</span>
                        </td>
                        <td style={{ fontSize: 13 }}>{ps.codeNo}</td>
                        <td style={{ fontWeight: 500 }}>{name}</td>
                        <td>{ps.role}</td>
                        <td>{formatCurrency(ps.grossSalary || 0)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                          {formatCurrency(ps.netSalary || 0)}
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => viewPaysheet(ps)}
                          >
                            View / Print
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
