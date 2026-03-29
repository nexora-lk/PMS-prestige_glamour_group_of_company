import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
import type { StatsResponse } from '../types';
import { showToast } from '../components/Toast';

export default function Dashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await userService.getStats();
        setStats(res);
      } catch (err: any) {
        showToast(err.message || 'Failed to load dashboard stats', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="animate-in">
      <div className="stats-grid">
        <div className="stat-card stagger-1">
          <div className="stat-icon blue">👥</div>
          <div className="stat-info">
            <h3>{stats?.totalUsers || 0}</h3>
            <p>Total Employees</p>
          </div>
        </div>

        <div className="stat-card stagger-2">
          <div className="stat-icon green">✨</div>
          <div className="stat-info">
            <h3>{stats?.activeUsers || 0}</h3>
            <p>Active Employees</p>
          </div>
        </div>

        <div className="stat-card stagger-3">
          <div className="stat-icon purple">🏢</div>
          <div className="stat-info">
            <h3>{stats?.totalDepartments || 0}</h3>
            <p>Departments</p>
          </div>
        </div>

        <div className="stat-card stagger-4">
          <div className="stat-icon yellow">💰</div>
          <div className="stat-info">
            <h3>{formatCurrency(stats?.totalMonthlySalary || 0)}</h3>
            <p>Total Monthly Payroll Build</p>
          </div>
        </div>
      </div>

      <div className="card animate-in stagger-4">
        <div className="card-header">
          <h2>Quick Actions</h2>
        </div>
        <div className="card-body" style={{ display: 'flex', gap: '16px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/users/new')}>
            + Add New Employee
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/payroll')}>
            Generate Payroll
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/export')}>
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
}
