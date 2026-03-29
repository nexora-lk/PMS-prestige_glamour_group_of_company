import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { userService } from '../services/userService';
import type { User } from '../types';
import { showToast } from '../components/Toast';

const initialFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: '',
  role: '',
  designation: '',
  joinDate: '',
  basicSalary: 0,
  allowances: 0,
  deductions: 0,
  status: 'active' as const,
};

export default function UserForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id && id !== 'new' && id !== undefined;
  const navigate = useNavigate();

  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    department: string;
    role: string;
    designation: string;
    joinDate: string;
    basicSalary: number;
    allowances: number;
    deductions: number;
    status: 'active' | 'inactive';
  }>(initialFormData);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      const fetchUser = async () => {
        try {
          const user = await userService.getUser(id);
          setFormData({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            department: user.department,
            role: user.role,
            designation: user.designation,
            joinDate: user.joinDate.split('T')[0],
            basicSalary: user.basicSalary,
            allowances: user.allowances,
            deductions: user.deductions,
            status: user.status,
          });
        } catch (err: any) {
          showToast(err.message || 'Failed to fetch user details', 'error');
          navigate('/users');
        } finally {
          setLoading(false);
        }
      };
      fetchUser();
    }
  }, [id, navigate, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await userService.updateUser(id, formData);
        showToast('Employee updated successfully', 'success');
      } else {
        await userService.createUser(formData as Omit<User, 'id' | 'createdAt' | 'updatedAt'>);
        showToast('Employee created successfully', 'success');
      }
      navigate('/users');
    } catch (err: any) {
      showToast(err.message || 'Failed to save employee', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );

  return (
    <div className="card animate-in">
      <div className="card-header">
        <h2>{isEdit ? 'Edit Employee Data' : 'Add New Employee'}</h2>
        <button className="btn btn-ghost" onClick={() => navigate('/users')}>
          ✕ Cancel
        </button>
      </div>

      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <h3 style={{ marginBottom: 16, fontSize: 14, color: 'var(--accent)' }}>
            Personal Information
          </h3>
          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input
                required
                type="text"
                className="form-input"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input
                required
                type="text"
                className="form-input"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email Address *</label>
              <input
                required
                type="email"
                className="form-input"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                className="form-input"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <h3 style={{ margin: '24px 0 16px', fontSize: 14, color: 'var(--accent)' }}>
            Employment Details
          </h3>
          <div className="form-row">
            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                className="form-input"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g. Engineering"
              />
            </div>
            <div className="form-group">
              <label>Designation</label>
              <input
                type="text"
                className="form-input"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                placeholder="e.g. Senior Developer"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Role</label>
              <input
                type="text"
                className="form-input"
                name="role"
                value={formData.role}
                onChange={handleChange}
                placeholder="e.g. Employee, Manager"
              />
            </div>
            <div className="form-group">
              <label>Join Date</label>
              <input
                type="date"
                className="form-input"
                name="joinDate"
                value={formData.joinDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <h3 style={{ margin: '24px 0 16px', fontSize: 14, color: 'var(--accent)' }}>
            Payroll Setup
          </h3>
          <div className="form-row">
            <div className="form-group">
              <label>Basic Salary (Monthly) *</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                name="basicSalary"
                value={formData.basicSalary}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                className="form-select"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Total Allowances (Monthly)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                name="allowances"
                value={formData.allowances}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Fixed Deductions (Monthly)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                name="deductions"
                value={formData.deductions}
                onChange={handleChange}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 32,
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end',
              borderTop: '1px solid var(--border)',
              paddingTop: 24,
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/users')}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
