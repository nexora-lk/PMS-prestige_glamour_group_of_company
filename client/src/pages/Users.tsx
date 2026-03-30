import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useUsers } from '../hooks/useUsers';
import { userService } from '../services/userService';
import { BRANCHES } from '../constants/branches';
import { ROLES } from '../constants/roleSalaries';
import { formatCurrency } from '../utils/format';
import { showToast } from '../components/Toast';
import type { User } from '../types';

export default function Users() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { users, loading, error, response, refreshUsers } = useUsers({
    search,
    branch: branch || undefined,
    role: role || undefined,
    status: (status as 'active' | 'delete' | 'all') || 'all',
    page,
    limit: 15,
  });

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
      try {
        await userService.updateUser(id, { status: 'delete' });
        showToast('User status changed to Delete', 'success');
        refreshUsers();
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Failed to delete user', 'error');
      }
    },
    [refreshUsers]
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleBranchChange = (value: string) => {
    setBranch(value);
    setPage(1);
  };

  const handleRoleChange = (value: string) => {
    setRole(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  return (
    <div className="animate-in">
      <div className="card">
        <div className="card-header">
          <h2>Employees Management</h2>
        </div>

        <div className="filter-bar">
          <div className="search-input">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, email, role..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={branch}
            onChange={(e) => handleBranchChange(e.target.value)}
          >
            <option value="">All Branches</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={role}
            onChange={(e) => handleRoleChange(e.target.value)}
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="delete">Delete</option>
          </select>

          <button
            className="btn btn-primary"
            onClick={() => navigate('/users/new')}
          >
            + Add User
          </button>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>⚠️ {error}</p>
              <button className="btn btn-primary" onClick={refreshUsers}>
                Retry
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <h3>No employees found</h3>
              <p>Adjust your filters or add a new employee.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Contact</th>
                  <th>Branch</th>
                  <th>Role</th>
                  <th>Salary</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: User) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{user.firstName.charAt(0)}</div>
                        <div>
                          <div className="user-name">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="user-email" style={{ fontSize: 11 }}>
                            ID: {user.id.substring(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="user-email">{user.email}</div>
                      <div className="user-email">{user.phone}</div>
                    </td>
                    <td>
                      <div>{user.branch}</div>
                    </td>
                    <td>
                      <div>{user.role || user.designation}</div>
                    </td>
                    <td>
                      <div>{formatCurrency(user.basicSalary)}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${user.status}`}>{user.status}</span>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/users/${user.id}`)}
                          title="Edit"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          className="btn btn-ghost btn-danger btn-sm"
                          onClick={() => handleDelete(user.id, user.firstName)}
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

        {response && response.totalPages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-ghost"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              ← Previous
            </button>
            <span>
              Page {response.page} of {response.totalPages}
            </span>
            <button
              className="btn btn-ghost"
              onClick={() => setPage(Math.min(response.totalPages, page + 1))}
              disabled={page === response.totalPages}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
