import { useState, useEffect, useRef, useCallback } from 'react';
import { FiPrinter, FiDownload, FiCheckCircle, FiAlertCircle, FiFile, FiSearch } from 'react-icons/fi';
import api from '../services/api';
import { userService } from '../services/userService';
import { paysheetService } from '../services/paysheetService';
import { BRANCHES } from '../constants/branches';
import { ROLES } from '../constants/roleSalaries';
import { showToast } from '../components/Toast';
import type { User, MonthlyPaysheet } from '../types';

interface DotMatrixJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'printing';
  total: number;
  completed: number;
  failed: number;
  progress: number;
  error: string | null;
  payMonth: string;
}

export default function DotMatrixPrinting() {
  const [payMonth, setPayMonth] = useState(new Date().toISOString().slice(0, 7));
  const [useEscP, setUseEscP] = useState(false);
  const [printerName, setPrinterName] = useState('');
  const [copies, setCopies] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [job, setJob] = useState<DotMatrixJob | null>(null);
  const [downloading, setDownloading] = useState(false);
  
  // Employee selection state
  const [users, setUsers] = useState<User[]>([]);
  const [userMap, setUserMap] = useState<Map<string, User>>(new Map());
  const [selectedCodeNos, setSelectedCodeNos] = useState<Set<string>>(new Set());
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [empFilterBranch, setEmpFilterBranch] = useState('');
  const [empFilterRole, setEmpFilterRole] = useState('');
  
  // Preview state
  const [previewPaysheets, setPreviewPaysheets] = useState<MonthlyPaysheet[]>([]);
  const [fetching, setFetching] = useState(false);
  
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return stopPolling;
  }, [stopPolling]);

  // Fetch users on component mount
  useEffect(() => {
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
    fetchUsers();
  }, []);

  // Filter users based on search and filters
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

  // Fetch paysheets for preview
  const handleFetchPreview = async () => {
    if (!payMonth) return showToast('Please select a period', 'error');

    setFetching(true);
    try {
      const res = await paysheetService.getMonthPaysheets(payMonth, { limit: 10000 });
      let paysheets = res.paysheets;

      // Filter by selected employees if any
      if (selectedCodeNos.size > 0) {
        paysheets = paysheets.filter((p) => selectedCodeNos.has(p.codeNo));
      }

      // Filter out paysheets with achievedSalary = 0 and warn
      const zeroSalary = paysheets.filter((p) => !p.achievedSalary || p.achievedSalary === 0);
      if (zeroSalary.length > 0) {
        const names = zeroSalary.map((p) => {
          const u = userMap.get(p.codeNo);
          return u ? `${u.firstName} ${u.lastName} (${p.codeNo})` : p.codeNo;
        });
        showToast(
          `Cannot generate payslip for: ${names.join(', ')} — Basic offer is 0.`,
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

  const pollProgress = useCallback(
    (jobId: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const res = await api.get<DotMatrixJob>(`/dot-matrix/status/${jobId}`);
          setJob(res.data);

          if (res.data.status === 'completed' || res.data.status === 'failed') {
            stopPolling();
            setGenerating(false);

            if (res.data.status === 'completed') {
              showToast(`Generated ${res.data.completed} payslips for dot matrix printing!`, 'success');
            } else {
              showToast(res.data.error || 'Generation failed', 'error');
            }
          }
        } catch {
          stopPolling();
          setGenerating(false);
        }
      }, 500);
    },
    [stopPolling]
  );

  const handleGenerate = async () => {
    if (!payMonth) {
      showToast('Please select a pay month', 'error');
      return;
    }

    if (previewPaysheets.length === 0) {
      showToast('Please load paysheets first', 'error');
      return;
    }

    setGenerating(true);
    setJob(null);

    try {
      // Use the codeNos from loaded preview paysheets
      const codeNos = previewPaysheets.map((p) => p.codeNo);
      const res = await api.post<{ jobId: string; total: number; skipped: string[] }>('/dot-matrix/generate', {
        payMonth,
        codeNos,
        useEscP,
      });

      if (res.data.skipped.length > 0) {
        showToast(
          `Skipped (basic offer is 0): ${res.data.skipped.join(', ')}`,
          'error'
        );
      }
      showToast(`Started generation for ${res.data.total} payslips`, 'info');
      setJob({
        id: res.data.jobId,
        status: 'processing',
        total: res.data.total,
        completed: 0,
        failed: 0,
        progress: 0,
        error: null,
        payMonth,
      });

      pollProgress(res.data.jobId);
    } catch (err: unknown) {
      setGenerating(false);
      showToast(err instanceof Error ? err.message : 'Failed to start generation', 'error');
    }
  };

  const handleDownload = async () => {
    if (!job?.id) return;

    setDownloading(true);
    try {
      const res = await api.get(`/dot-matrix/download/${job.id}`, { responseType: 'blob' });
      const ext = useEscP ? '.prn' : '.txt';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslips_${payMonth}${ext}`);
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

  const handlePrint = async () => {
    if (!job?.id) return;

    setPrinting(true);
    try {
      const res = await api.post<{ message: string }>('/dot-matrix/print', {
        jobId: job.id,
        printerName: printerName || undefined,
        copies,
      });
      showToast(res.data.message, 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Print failed', 'error');
    } finally {
      setPrinting(false);
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Queued...';
      case 'processing': return 'Generating payslips...';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      case 'printing': return 'Sending to printer...';
      default: return status;
    }
  };

  const isJobDone = job?.status === 'completed' || job?.status === 'printing';

  // Format paysheet into dot matrix text format
  const formatDotMatrixPayslip = (ps: MonthlyPaysheet, employee: User | null) => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB');
    
    const basicSalary = ps.basicSalary || 0;
    const vehicleAllowance = ps.vehicleAllowance || 0;
    const fuelAllowance = ps.fuelAllowance || 0;
    const generalAllowance = ps.generalAllowance || 0;
    const orc = ps.orc || 0;
    const otherOffer = ps.otherOffer || 0;
    const totalEarnings = basicSalary + vehicleAllowance + fuelAllowance + generalAllowance + orc + otherOffer;
    
    const epfEmployee = ps.epfEmployee || 0;
    const nopayDeduction = ps.nopayDeduction || 0;
    const lateDeduction = ps.lateDeduction || 0;
    const welfare = ps.welfare || 0;
    const totalDeductions = epfEmployee + nopayDeduction + lateDeduction + welfare;
    
    const epfEmployer = ps.epfEmployer || 0;
    const etf = ps.etf || 0;
    const grossSalary = ps.grossSalary || totalEarnings;
    const netSalary = ps.netSalary || (grossSalary - totalDeductions);

    const formatNumber = (num: number) => num.toFixed(2).padStart(15);
    const pad = (str: string, len: number) => str.padEnd(len);

    return `================================================================================
              PRESTIGE GLAMOUR GROUP OF COMPANIES
                  Payroll Management System
================================================================================
          PAYSLIP FOR THE MONTH OF ${ps.payMonth.toUpperCase()}
--------------------------------------------------------------------------------

Employee ID : ${pad(ps.codeNo, 35)} Branch    :          ${employee?.branch || ''}
Name        : ${pad(employee?.firstName + ' ' + employee?.lastName || ps.codeNo, 35)} Month     :       ${ps.payMonth}
Designation : ${pad(ps.role || employee?.designation || '', 30)} Date      :       ${dateStr}

--------------------------------------------------------------------------------

 EARNINGS                                DEDUCTIONS
--------------------------------------------------------------------------------
 Basic Offer${formatNumber(basicSalary)}    EPF (Employee 8%)${formatNumber(epfEmployee)}
 Vehicle Offer${formatNumber(vehicleAllowance)}      No-Pay Deduction${formatNumber(nopayDeduction)}
 Fuel Offer${formatNumber(fuelAllowance)}         Late Deduction${formatNumber(lateDeduction)}
 General Offer${formatNumber(generalAllowance)}      Welfare${formatNumber(welfare)}
 ORC${formatNumber(orc)}
 Other Offer${formatNumber(otherOffer)}
--------------------------------------------------------------------------------
 TOTAL EARNINGS${formatNumber(totalEarnings)}   TOTAL DEDUCTIONS${formatNumber(totalDeductions)}
--------------------------------------------------------------------------------

 EPF Employer (12%):${formatNumber(epfEmployer)}   ETF (3%)       :${formatNumber(etf)}

================================================================================
 GROSS OFFER   : ${grossSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${' '.repeat(30)}NET OFFER   : ${netSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
================================================================================

           *** This is a system-generated payslip ***
           Prestige Glamour Welfare Credit Society`;
  };

  return (
    <div className="animate-in">
      {/* Employee Selection Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2>Select Employees for Printing</h2>
          {selectedCodeNos.size > 0 && (
            <span style={{ fontSize: 13, color: 'var(--gold-400)' }}>
              {selectedCodeNos.size} selected
            </span>
          )}
        </div>

        {/* Filter Bar */}
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
            value={payMonth}
            onChange={(e) => setPayMonth(e.target.value)}
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

        {/* Footer */}
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

      {/* Preview Section */}
      <div className="card" style={{ marginBottom: 24, minHeight: 200 }}>
        <div className="card-header">
          <h2>Dot Matrix Preview ({previewPaysheets.length})</h2>
        </div>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {previewPaysheets.map((ps, idx) => {
                const employee = userMap.get(ps.codeNo);
                const payslipText = formatDotMatrixPayslip(ps, employee ?? null);
                return (
                  <div
                    key={ps.id || ps.codeNo}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{
                      background: 'var(--border)',
                      padding: '8px 16px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                    }}>
                      Payslip {idx + 1} of {previewPaysheets.length} - {employee?.firstName} {employee?.lastName} ({ps.codeNo})
                    </div>
                    <div style={{
                      padding: 16,
                      background: 'var(--bg-secondary, #0f0f2e)',
                      fontFamily: 'monospace',
                      fontSize: 11,
                      lineHeight: 1.4,
                      whiteSpace: 'pre',
                      overflow: 'auto',
                      color: 'var(--text-secondary)',
                      maxHeight: 600,
                    }}>
                      {payslipText}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2>Dot Matrix Settings</h2>
        </div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={useEscP}
                  onChange={(e) => setUseEscP(e.target.checked)}
                  disabled={generating}
                  style={{ width: 16, height: 16, accentColor: 'var(--gold-500)' }}
                />
                ESC/P Mode (Epson dot matrix)
              </label>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Adds bold headers and form feed control codes
              </span>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={generating || previewPaysheets.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <FiFile size={18} />
                {generating ? 'Processing...' : `Generate (${previewPaysheets.length})`}
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
            {isJobDone && (
              <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleDownload}
                  disabled={downloading}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <FiDownload size={18} />
                  {downloading ? 'Downloading...' : `Download ${useEscP ? '.PRN' : '.TXT'} File`}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handlePrint}
                  disabled={printing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--gold-700, #B8860B)',
                  }}
                >
                  <FiPrinter size={18} />
                  {printing ? 'Sending...' : 'Send to Printer'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printer Settings */}
      {isJobDone && (
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
                  value={printerName}
                  onChange={(e) => setPrinterName(e.target.value)}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  Enter your dot matrix printer name (e.g., &quot;EPSON LX-350&quot;)
                </span>
              </div>
              <div className="form-group">
                <label>Copies</label>
                <input
                  type="number"
                  className="form-input"
                  min={1}
                  max={50}
                  value={copies}
                  onChange={(e) => setCopies(Math.min(50, Math.max(1, Number(e.target.value))))}
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
            <li>Enable <strong>ESC/P Mode</strong> if printing to an Epson-compatible dot matrix printer.</li>
            <li>Click <strong>Generate Payslips</strong> to create the text file using streaming workers.</li>
            <li>Each payslip is formatted to 80 columns x 66 lines (standard tractor paper).</li>
            <li>Download the file or send it directly to your dot matrix printer.</li>
            <li>Use <strong>Printer Settings</strong> to specify the printer name and number of copies.</li>
          </ol>

          <div style={{
            marginTop: 16,
            padding: 16,
            background: 'var(--bg-secondary, #0f0f2e)',
            borderRadius: 8,
            fontFamily: 'monospace',
            fontSize: 11,
            lineHeight: 1.4,
            whiteSpace: 'pre',
            overflow: 'auto',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border, #2a2a5e)',
          }}>
{`================================================================================
              PRESTIGE GLAMOUR GROUP OF COMPANIES
                  Payroll Management System
================================================================================
          PAYSLIP FOR THE MONTH OF MARCH 2026
--------------------------------------------------------------------------------

Employee ID : GM0001                    Branch    :          Colombo
Name        : John Doe                  Month     :       March 2026
Designation : General Manager           Date      :       30/03/2026

--------------------------------------------------------------------------------

 EARNINGS                                DEDUCTIONS
--------------------------------------------------------------------------------
 Basic Offer                275,000.00   EPF (Employee 8%)        22,000.00
 Vehicle Offer              200,000.00   No-Pay Deduction              0.00
 Fuel Offer                 100,000.00   Late Deduction                0.00
 General Offer                    0.00   Welfare                       0.00
 ORC                              0.00
 Other Offer                      0.00
--------------------------------------------------------------------------------
 TOTAL EARNINGS             575,000.00   TOTAL DEDUCTIONS          22,000.00
--------------------------------------------------------------------------------

 EPF Employer (12%):         33,000.00   ETF (3%)       :           8,250.00

================================================================================
 GROSS OFFER   : 575,000.00                    NET OFFER   : 553,000.00
================================================================================

           *** This is a system-generated payslip ***
           Prestige Glamour Welfare Credit Society`}
          </div>

          <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>
            Performance: 1000+ payslips generate in under 5 seconds using parallel streaming workers.
          </p>
        </div>
      </div>
    </div>
  );
}
