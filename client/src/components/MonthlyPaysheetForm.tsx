import { useState, useEffect } from 'react';
import { paysheetService } from '../services/paysheetService';
import { userService } from '../services/userService';
import type { User, MonthlyPaysheet } from '../types';
import { showToast } from './Toast';
import { pgwcsTheme } from '../theme/colors';

interface MonthlyPaysheetFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: MonthlyPaysheet;
  isEditMode?: boolean;
}

export function MonthlyPaysheetForm({
  onSuccess,
  onCancel,
  initialData,
  isEditMode = false,
}: MonthlyPaysheetFormProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<MonthlyPaysheet>>({
    employeeId: initialData?.employeeId || '',
    codeNo: initialData?.codeNo || '',
    payMonth: initialData?.payMonth || new Date().toISOString().slice(0, 7),
    role: initialData?.role || '',
    monthsOfService: initialData?.monthsOfService || 0,
    achieve: initialData?.achieve || 0,
    allowance: initialData?.allowance || 0,
    nopay: initialData?.nopay || 0,
    late: initialData?.late || 0,
    epfAvailability: initialData?.epfAvailability || false,
    etfAvailability: initialData?.etfAvailability || false,
    welfare: initialData?.welfare || 0,
    otherOfficers: initialData?.otherOfficers || 0,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await userService.listUsers({ status: 'active', limit: 1000 });
      setUsers(res.users);
    } catch (err: any) {
      showToast(err.message || 'Failed to load employees', 'error');
    }
  };

  const handleUserChange = (userId: string) => {
    const selected = users.find((u) => u.id === userId);
    if (selected) {
      setFormData({
        ...formData,
        employeeId: userId,
        codeNo: `${selected.firstName}-${selected.id.slice(0, 4)}`,
        role: selected.role || selected.designation,
      });
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : type === 'number'
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.employeeId ||
      !formData.codeNo ||
      !formData.payMonth ||
      !formData.role
    ) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      if (isEditMode && initialData?.id) {
        await paysheetService.updatePaysheet(initialData.id, formData as Partial<MonthlyPaysheet>);
        showToast('Paysheet updated successfully', 'success');
      } else {
        await paysheetService.createPaysheet(formData as Omit<MonthlyPaysheet, 'id' | 'createdAt' | 'updatedAt'>);
        showToast('Paysheet created successfully', 'success');
      }
      onSuccess?.();
    } catch (error: any) {
      showToast(error.message || 'Failed to save paysheet', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="form-group">
          <label>
            Months of Service <span style={{ color: pgwcsTheme.ruby[600] }}>*</span>
          </label>
          <select
            className="form-select"
            value={formData.employeeId || ''}
            onChange={(e) => handleUserChange(e.target.value)}
            required
            disabled={isEditMode}
          >
            <option value="">Select Employee</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} ({u.role})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>
            Code No. <span style={{ color: pgwcsTheme.ruby[600] }}>*</span>
          </label>
          <input
            type="text"
            className="form-input"
            name="codeNo"
            value={formData.codeNo || ''}
            onChange={handleInputChange}
            placeholder="e.g., EMP-0001"
            required
            disabled={isEditMode}
          />
        </div>

        <div className="form-group">
          <label>
            Pay Month <span style={{ color: pgwcsTheme.ruby[600] }}>*</span>
          </label>
          <input
            type="month"
            className="form-input"
            name="payMonth"
            value={formData.payMonth || ''}
            onChange={handleInputChange}
            required
            disabled={isEditMode}
          />
        </div>

        <div className="form-group">
          <label>
            Role <span style={{ color: pgwcsTheme.ruby[600] }}>*</span>
          </label>
          <input
            type="text"
            className="form-input"
            name="role"
            value={formData.role || ''}
            onChange={handleInputChange}
            placeholder="e.g., Manager"
            required
            disabled={isEditMode}
          />
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${pgwcsTheme.neutral[200]}`, paddingTop: 16, marginTop: 8 }}>
        <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 600 }}>
          Salary Components
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label>Achievement Amount</label>
            <input
              type="number"
              className="form-input"
              name="achieve"
              value={formData.achieve || 0}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label>Allowance</label>
            <input
              type="number"
              className="form-input"
              name="allowance"
              value={formData.allowance || 0}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label>Welfare</label>
            <input
              type="number"
              className="form-input"
              name="welfare"
              value={formData.welfare || 0}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label>Other Officers</label>
            <input
              type="number"
              className="form-input"
              name="otherOfficers"
              value={formData.otherOfficers || 0}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
            />
          </div>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${pgwcsTheme.neutral[200]}`, paddingTop: 16, marginTop: 8 }}>
        <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 600 }}>
          Deductions
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label>No Pay Days</label>
            <input
              type="number"
              className="form-input"
              name="nopay"
              value={formData.nopay || 0}
              onChange={handleInputChange}
              placeholder="0"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label>Late (Hours)</label>
            <input
              type="number"
              className="form-input"
              name="late"
              value={formData.late || 0}
              onChange={handleInputChange}
              placeholder="0"
              step="0.5"
            />
          </div>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${pgwcsTheme.neutral[200]}`, paddingTop: 16, marginTop: 8 }}>
        <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 600 }}>
          Fund Availability
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                name="epfAvailability"
                checked={formData.epfAvailability || false}
                onChange={handleInputChange}
              />
              EPF (Employee Provident Fund)
            </label>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                name="etfAvailability"
                checked={formData.etfAvailability || false}
                onChange={handleInputChange}
              />
              ETF (Employee Trust Fund)
            </label>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving...' : isEditMode ? 'Update Paysheet' : 'Create Paysheet'}
        </button>
      </div>
    </form>
  );
}

