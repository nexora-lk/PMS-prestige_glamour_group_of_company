import { useState, useEffect, useRef, useCallback } from 'react';
import { FiPrinter, FiDownload, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import api from '../services/api';
import { showToast } from '../components/Toast';

interface JobProgress {
  id: string;
  status: 'pending' | 'processing' | 'zipping' | 'completed' | 'failed';
  total: number;
  completed: number;
  failed: number;
  progress: number;
  error: string | null;
}

export default function PayslipGeneration() {
  const [payMonth, setPayMonth] = useState(new Date().toISOString().slice(0, 7));
  const [concurrency, setConcurrency] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [job, setJob] = useState<JobProgress | null>(null);
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
          const res = await api.get<JobProgress>(`/payslips/progress/${jobId}`);
          setJob(res.data);

          if (res.data.status === 'completed' || res.data.status === 'failed') {
            stopPolling();
            setGenerating(false);

            if (res.data.status === 'completed') {
              showToast(`Generated ${res.data.completed} payslips successfully!`, 'success');
            } else {
              showToast(res.data.error || 'Generation failed', 'error');
            }
          }
        } catch {
          stopPolling();
          setGenerating(false);
        }
      }, 800);
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
      const res = await api.post<{ jobId: string; total: number }>('/payslips/generate', {
        payMonth,
        concurrency,
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
      const res = await api.get(`/payslips/download/${job.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslips_${payMonth}.zip`);
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

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Queued...';
      case 'processing':
        return 'Generating PDFs...';
      case 'zipping':
        return 'Creating ZIP archive...';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  return (
    <div className="animate-in">
      {/* Controls */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2>Bulk Payslip Generation</h2>
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
                value={payMonth}
                onChange={(e) => setPayMonth(e.target.value)}
                disabled={generating}
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
                disabled={generating}
              />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={generating}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <FiPrinter size={18} />
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
            {/* Status line */}
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

            {/* Download button */}
            {job.status === 'completed' && (
              <button
                className="btn btn-primary"
                onClick={handleDownload}
                disabled={downloading}
                style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <FiDownload size={18} />
                {downloading ? 'Downloading...' : 'Download ZIP'}
              </button>
            )}
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
            <li>Click <strong>Generate Payslips</strong> to start PDF generation.</li>
            <li>The system processes payslips in parallel using worker threads and Puppeteer.</li>
            <li>Once complete, all PDFs are packaged into a single ZIP file.</li>
            <li>Click <strong>Download ZIP</strong> to save the file.</li>
          </ol>
          <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>
            Performance: 1000 payslips typically generate in under 2 minutes with 5 workers.
          </p>
        </div>
      </div>
    </div>
  );
}
