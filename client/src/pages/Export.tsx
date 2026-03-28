import { useState } from 'react';
import api from '../services/api';
import { showToast } from '../components/Toast';

export default function Export() {
  const [isExportingUsers, setIsExportingUsers] = useState(false);
  const [isExportingPayroll, setIsExportingPayroll] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleDownload = async (url: string, filename: string, setLoader: (val: boolean) => void) => {
    try {
      setLoader(true);
      const res = await api.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Export successful', 'success');
    } catch (err: any) {
      showToast(
        err.response?.data?.error || 'Export failed. Ensure data exists before exporting.',
        'error'
      );
    } finally {
      setLoader(false);
    }
  };

  const handleBackup = async () => {
    try {
      setIsBackingUp(true);
      const res = await api.post('/export/backup');
      showToast(res.data.message, 'info');
    } catch (err) {
      showToast('Backup failed', 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="animate-in">
      <div className="export-grid">
        <div className="export-card stagger-1">
          <div className="export-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            👥
          </div>
          <h3>Employees Data</h3>
          <p>Download a complete Excel (.xlsx) report of all employee profiles and salary information.</p>
          <button
            className="btn btn-primary btn-full"
            onClick={() => handleDownload('/export/users-excel', 'employee_data.xlsx', setIsExportingUsers)}
            disabled={isExportingUsers}
          >
            {isExportingUsers ? 'Exporting...' : 'Export to Excel'}
          </button>
        </div>

        <div className="export-card stagger-2">
          <div className="export-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            💰
          </div>
          <h3>Payroll History</h3>
          <p>Download a complete Excel (.xlsx) report of all generated pay sheets and tax deductions.</p>
          <button
            className="btn btn-primary btn-full"
            onClick={() => handleDownload('/export/payroll-excel', 'payroll_history.xlsx', setIsExportingPayroll)}
            disabled={isExportingPayroll}
          >
            {isExportingPayroll ? 'Exporting...' : 'Export to Excel'}
          </button>
        </div>

        <div className="export-card stagger-3">
          <div className="export-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
            ☁️
          </div>
          <h3>Google Drive Backup</h3>
          <p>Auto-sync the latest Excel backups directly to your connected Google drive.</p>
          <button
            className="btn btn-secondary btn-full"
            onClick={handleBackup}
            disabled={isBackingUp}
          >
            {isBackingUp ? 'Syncing...' : 'Trigger Backup Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
