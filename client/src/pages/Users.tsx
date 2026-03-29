import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '../hooks/useUsers';
import { showToast } from '../components/Toast';
import type { User } from '../types';

export default function Users() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { users, loading, error, response, deleteUser, refreshUsers } = useUsers({
    search,
    department: department || undefined,
    status: (status as any) || 'all',
    page,
    limit: 15,
  });

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
      try {
        await deleteUser(id);
        showToast('User deleted successfully', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to delete user', 'error');
      }
    },
    [deleteUser]
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleDepartmentChange = (value: string) => {
    setDepartment(value);
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
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name, email, role..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={department}
            onChange={(e) => handleDepartmentChange(e.target.value)}
          >
            <option value="">All Departments</option>
            {response?.departments.map((d) => (
              <option key={d} value={d}>
                {d}
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
            <option value="inactive">Inactive</option>
          </select>

          <button
            className="btn btn-primary"
            style={{ marginLeft: 'auto' }}
            onClick={() => navigate('/users')}
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
                  <th>Department / Role</th>
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
                      <div>{user.department}</div>
                      <div className="user-email">{user.designation}</div>
                    </td>
                    <td>
                      <div>
                        ${user.basicSalary.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${user.status}`}>{user.status}</span>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/users/${user.id}`)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-ghost btn-danger btn-sm"
                          onClick={() => handleDelete(user.id, user.firstName)}
                        >
                          🗑️ Delete
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
