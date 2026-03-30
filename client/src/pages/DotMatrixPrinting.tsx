import { useState, useEffect, useRef, useCallback } from 'react';
import { FiPrinter, FiDownload, FiCheckCircle, FiAlertCircle, FiFile } from 'react-icons/fi';
import api from '../services/api';
import { showToast } from '../components/Toast';

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

    setGenerating(true);
    setJob(null);

    try {
      const res = await api.post<{ jobId: string; total: number }>('/dot-matrix/generate', {
        payMonth,
        useEscP,
      });

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

  return (
    <div className="animate-in">
      {/* Controls */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2>Dot Matrix Payslip Printing</h2>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Generate fixed-width text payslips optimized for dot matrix printers.
            Supports 1000+ payslips with streaming generation and ESC/P control codes.
          </p>
        </div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label>Pay Month</label>
              <input
                type="month"
                className="form-input"
                value={payMonth}
                onChange={(e) => setPayMonth(e.target.value)}
                disabled={generating}
              />
            </div>
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
                disabled={generating}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <FiFile size={18} />
                {generating ? 'Processing...' : 'Generate Payslips'}
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
 Basic Salary               275,000.00   EPF (Employee 8%)        22,000.00
 Vehicle Allowance          200,000.00   No-Pay Deduction              0.00
 Fuel Allowance             100,000.00   Late Deduction                0.00
 General Allowance                0.00   Welfare                       0.00
 ORC                              0.00
 Other Allowance                  0.00
--------------------------------------------------------------------------------
 TOTAL EARNINGS             575,000.00   TOTAL DEDUCTIONS          22,000.00
--------------------------------------------------------------------------------

 EPF Employer (12%):         33,000.00   ETF (3%)       :           8,250.00

================================================================================
 GROSS SALARY  : 575,000.00                    NET SALARY  : 553,000.00
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
