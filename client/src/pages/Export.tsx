import { useState } from 'react';
import { FiUsers, FiDollarSign, FiInfo } from 'react-icons/fi';
import { exportService } from '../services/exportService';
import { showToast } from '../components/Toast';

export default function Export() {
  const [isExportingUsers, setIsExportingUsers] = useState(false);
  const [isExportingPaysheets, setIsExportingPaysheets] = useState(false);

  const handleExportUsers = async () => {
    try {
      setIsExportingUsers(true);
      await exportService.downloadUsersExcel();
      showToast('Employees export successful', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Export failed', 'error');
    } finally {
      setIsExportingUsers(false);
    }
  };

  const handleExportPaysheets = async () => {
    try {
      setIsExportingPaysheets(true);
      await exportService.downloadPaysheetsExcel();
      showToast('Monthly paysheets export successful', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Export failed', 'error');
    } finally {
      setIsExportingPaysheets(false);
    }
  };

  return (
    <div className="animate-in">
      <div className="export-grid">
        <div className="export-card stagger-1">
          <div className="export-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <FiUsers size={40} />
          </div>
          <h3>Employees Data</h3>
          <p>Download a complete Excel (.xlsx) report of all employee profiles, bank details and salary information.</p>
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
            <FiDollarSign size={40} />
          </div>
          <h3>Monthly Paysheets</h3>
          <p>Download Excel (.xlsx) with each sheet organized by role and month, containing all paysheet details.</p>
          <button
            className="btn btn-primary btn-full"
            onClick={handleExportPaysheets}
            disabled={isExportingPaysheets}
          >
            {isExportingPaysheets ? 'Exporting...' : 'Export to Excel'}
          </button>
        </div>

        <div className="export-card stagger-3">
          <div className="export-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
            <FiInfo size={40} />
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
