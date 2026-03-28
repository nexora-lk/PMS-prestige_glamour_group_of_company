import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { User, UsersResponse } from '../types';
import { showToast } from '../components/Toast';

export default function Users() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        ...(search && { search }),
        ...(department !== 'all' && { department }),
        ...(status !== 'all' && { status }),
      });
      const res = await api.get<UsersResponse>(`/users?${params}`);
      setData(res.data);
    } catch (err) {
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, department, status, page]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await api.delete(`/users/${id}`);
      showToast('User deleted successfully', 'success');
      fetchUsers();
    } catch (err) {
      showToast('Failed to delete user', 'error');
    }
  };

  return (
    <div className="animate-in">
      <div className="card">
        <div className="filter-bar">
          <div className="search-input">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name, email, role..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <select
            className="filter-select"
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Departments</option>
            {data?.departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => navigate('/users/new')}>
            + Add User
          </button>
        </div>

        <div className="table-wrapper">
          {loading && !data ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : data?.users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <h3>No users found</h3>
              <p>Adjust your filters or add a new user.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Contact</th>
                  <th>Department / Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.users.map((user: User) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{user.firstName.charAt(0)}</div>
                        <div>
                          <div className="user-name">{user.firstName} {user.lastName}</div>
                          <div className="user-email text-muted" style={{ fontSize: 11 }}>ID: {user.id.substring(0, 8)}</div>
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
                      <span className={`badge badge-${user.status}`}>{user.status}</span>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/users/${user.id}`)}>
                          ✏️ Edit
                        </button>
                        <button className="btn btn-ghost btn-danger btn-sm" onClick={() => handleDelete(user.id, user.firstName)}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data && data.totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">
              Showing {((page - 1) * 15) + 1} to {Math.min(page * 15, data.total)} of {data.total} entries
            </div>
            <div className="pagination-buttons">
              <button
                className="pagination-btn"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Prev
              </button>
              {[...Array(data.totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  className={`pagination-btn ${page === i + 1 ? 'active' : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="pagination-btn"
                disabled={page === data.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
