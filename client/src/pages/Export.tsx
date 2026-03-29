import { useState } from 'react';
import { exportService } from '../services/exportService';
import { showToast } from '../components/Toast';

export default function Export() {
  const [isExportingUsers, setIsExportingUsers] = useState(false);
  const [isExportingPayroll, setIsExportingPayroll] = useState(false);

  const handleExportUsers = async () => {
    try {
      setIsExportingUsers(true);
      await exportService.downloadUsersExcel();
      showToast('Users export successful', 'success');
    } catch (err: any) {
      showToast(err.message || 'Export failed', 'error');
    } finally {
      setIsExportingUsers(false);
    }
  };

  const handleExportPayroll = async () => {
    try {
      setIsExportingPayroll(true);
      await exportService.downloadPayrollExcel();
      showToast('Payroll export successful', 'success');
    } catch (err: any) {
      showToast(err.message || 'Export failed', 'error');
    } finally {
      setIsExportingPayroll(false);
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
            onClick={handleExportUsers}
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
            onClick={handleExportPayroll}
            disabled={isExportingPayroll}
          >
            {isExportingPayroll ? 'Exporting...' : 'Export to Excel'}
          </button>
        </div>

        <div className="export-card stagger-3">
          <div className="export-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
            ℹ️
          </div>
          <h3>Backup Information</h3>
          <p>Google Drive backup feature requires OAuth2 setup. See documentation for configuration details.</p>
          <button
            className="btn btn-secondary btn-full"
            disabled
          >
            Setup Backup
          </button>
        </div>
      </div>
    </div>
  );
}
