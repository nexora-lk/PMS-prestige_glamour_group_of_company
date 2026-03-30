import { useState, useEffect } from 'react';
import { FiSearch, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { paysheetService } from '../services/paysheetService';
import { formatCurrency } from '../utils/format';
import type { MonthlyPaysheet } from '../types';
import { showToast } from './Toast';

interface PaysheetListProps {
  onEdit?: (paysheet: MonthlyPaysheet) => void;
  onDelete?: (paysheet: MonthlyPaysheet) => void;
  refreshTrigger?: number;
}

export function PaysheetList({ onEdit, onDelete, refreshTrigger }: PaysheetListProps) {
  const [paysheets, setPaysheets] = useState<MonthlyPaysheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchPaysheets();
  }, [refreshTrigger, filterMonth]);

  const fetchPaysheets = async () => {
    setLoading(true);
    try {
      const res = await paysheetService.getMonthPaysheets(filterMonth);
      setPaysheets(res.paysheets);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load paysheets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this paysheet?')) return;

    try {
      const paysheet = paysheets.find(p => p.id === id);
      await paysheetService.deletePaysheet(id);
      showToast('Paysheet deleted successfully', 'success');
      fetchPaysheets();
      onDelete?.(paysheet!);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to delete paysheet', 'error');
    }
  };

  const filteredPaysheets = paysheets.filter(p =>
    p.codeNo.toLowerCase().includes(searchText.toLowerCase()) ||
    p.role.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div style={{ width: '100%' }}>
      {/* Filter Controls */}
      <div className="filter-bar">
        <div className="search-input">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by code or role..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <input
          type="month"
          className="form-input"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          style={{ width: 'auto' }}
        />
        <button
          onClick={fetchPaysheets}
          className="btn btn-secondary"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : filteredPaysheets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No paysheets found for {filterMonth}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Role</th>
                <th>Months</th>
                <th>Achievement %</th>
                <th>Gross Salary</th>
                <th>Net Salary</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPaysheets.map((paysheet) => (
                <tr key={paysheet.id}>
                  <td style={{ fontWeight: 500 }}>{paysheet.codeNo}</td>
                  <td>{paysheet.role}</td>
                  <td style={{ textAlign: 'center' }}>{paysheet.monthsOfService}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="badge badge-info">
                      {((paysheet.achievementPct || 0) * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>
                    {formatCurrency(paysheet.grossSalary || 0)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--gold-400)' }}>
                    {formatCurrency(paysheet.netSalary || 0)}
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onEdit?.(paysheet)}
                        title="Edit"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        className="btn btn-ghost btn-danger btn-sm"
                        onClick={() => handleDelete(paysheet.id!)}
                        title="Delete"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Stats */}
      {filteredPaysheets.length > 0 && (
        <div className="stats-grid" style={{ marginTop: 20 }}>
          <div className="stat-card">
            <div className="stat-info">
              <h3>{filteredPaysheets.length}</h3>
              <p>Total Paysheets</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>{formatCurrency(filteredPaysheets.reduce((sum, p) => sum + (p.grossSalary || 0), 0))}</h3>
              <p>Total Gross</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3 style={{ color: 'var(--gold-400)' }}>
                {formatCurrency(filteredPaysheets.reduce((sum, p) => sum + (p.netSalary || 0), 0))}
              </h3>
              <p>Total Net</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>
                {formatCurrency(filteredPaysheets.reduce((sum, p) => sum + (p.netSalary || 0), 0) / filteredPaysheets.length)}
              </h3>
              <p>Avg Net</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
