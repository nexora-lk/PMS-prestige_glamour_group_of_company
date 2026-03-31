import { useState, useEffect } from 'react';
import { paysheetService } from '../services/paysheetService';
import { userService } from '../services/userService';
import type { User, MonthlyPaysheet } from '../types';
import { showToast } from './Toast';

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
    codeNo: initialData?.codeNo || '',
    payMonth: initialData?.payMonth || new Date().toISOString().slice(0, 7),
    role: initialData?.role || '',
    monthsOfService: initialData?.monthsOfService || 0,
    achieve: initialData?.achieve || 0,
    allowance: initialData?.allowance || 0,
    nopay: initialData?.nopay || 0,
    lateHours: initialData?.lateHours || 0,
    lateMinutes: initialData?.lateMinutes || 0,
    epfAvailability: initialData?.epfAvailability || false,
    etfAvailability: initialData?.etfAvailability || false,
    welfare: initialData?.welfare || 0,
    otherOffer: initialData?.otherOffer || 0,
    customEarningName: initialData?.customEarningName || '',
    customEarningAmount: initialData?.customEarningAmount || 0,
    customDeductionName: initialData?.customDeductionName || '',
    customDeductionAmount: initialData?.customDeductionAmount || 0,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await userService.listUsers({ status: 'active', limit: 1000 });
      setUsers(res.users);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load employees', 'error');
    }
  };

  const handleUserChange = (codeNo: string) => {
    const selected = users.find((u) => u.codeNo === codeNo);
    if (selected) {
      setFormData({
        ...formData,
        codeNo: selected.codeNo,
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
      !formData.codeNo ||
      !formData.payMonth ||
      !formData.role
    ) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    console.log('[Form Submit] formData.otherOffer:', formData.otherOffer);
    console.log('[Form Submit] Complete formData:', formData);

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
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to save paysheet', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="form-row">
        <div className="form-group">
          <label>
            Select Employee <span style={{ color: 'var(--ruby-500)' }}>*</span>
          </label>
          <select
            className="form-select"
            value={formData.codeNo || ''}
            onChange={(e) => handleUserChange(e.target.value)}
            required
            disabled={isEditMode}
          >
            <option value="">Select Employee</option>
            {users.map((u) => (
              <option key={u.codeNo} value={u.codeNo}>
                {u.firstName} {u.lastName} ({u.role})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>
            Code No. <span style={{ color: 'var(--ruby-500)' }}>*</span>
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
            Pay Month <span style={{ color: 'var(--ruby-500)' }}>*</span>
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
            Role <span style={{ color: 'var(--ruby-500)' }}>*</span>
          </label>
          <select
            className="form-select"
            name="role"
            value={formData.role || ''}
            onChange={handleInputChange}
            required
            disabled={isEditMode}
          >
            <option value="">Select Role</option>
            <optgroup label="Sales/Target-Based Roles">
              <option value="GM">GM - General Manager</option>
              <option value="AGM">AGM - Assistant General Manager</option>
              <option value="PH">PH - Provincial Head</option>
              <option value="DPH">DPH - Deputy Provincial Head</option>
              <option value="SRM">SRM - Senior Regional Manager</option>
              <option value="RM">RM - Regional Manager</option>
              <option value="BM">BM - Branch Manager</option>
              <option value="BDE">BDE - Business Development Executive</option>
            </optgroup>
            <optgroup label="Non-Target Roles">
              <option value="CCI">CCI - Collections/Call Center</option>
              <option value="HR_FIN_HEAD">HR_FIN_HEAD - HR & Finance Head</option>
              <option value="MANAGER_ADMIN">MANAGER_ADMIN - Manager Admin</option>
              <option value="SR_EXEC_HR">SR_EXEC_HR - Senior Executive HR</option>
              <option value="SR_EXEC_FINANCE">SR_EXEC_FINANCE - Senior Executive Finance</option>
              <option value="ASST_HR_EXEC">ASST_HR_EXEC - Assistant HR Executive</option>
              <option value="ASST_FIN_EXEC">ASST_FIN_EXEC - Assistant Finance Executive</option>
              <option value="MICRO_FIN_MANAGER">MICRO_FIN_MANAGER - Micro Finance Manager</option>
              <option value="MICRO_FIN_EXEC">MICRO_FIN_EXEC - Micro Finance Executive</option>
            </optgroup>
          </select>
        </div>

        <div className="form-group">
          <label>
            Months of Service <span style={{ color: 'var(--ruby-500)' }}>*</span>
          </label>
          <input
            type="number"
            className="form-input"
            name="monthsOfService"
            value={formData.monthsOfService || 0}
            onChange={handleInputChange}
            placeholder="e.g., 6"
            min="0"
            step="1"
            required
          />
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--neutral-700)', paddingTop: 16, marginTop: 8 }}>
        <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          Salary Components
        </h3>
        <div className="form-row">
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
            <label>Other Offers</label>
            <input
              type="number"
              className="form-input"
              name="otherOffer"
              value={formData.otherOffer || 0}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
            />
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--neutral-700)', paddingTop: 16, marginTop: 8 }}>
        <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          Deductions
        </h3>
        <div className="form-row">
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
            <label>Late Hours</label>
            <input
              type="number"
              className="form-input"
              name="lateHours"
              value={formData.lateHours || 0}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              step="1"
            />
          </div>

          <div className="form-group">
            <label>Late Minutes</label>
            <input
              type="number"
              className="form-input"
              name="lateMinutes"
              value={formData.lateMinutes || 0}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              max="59"
              step="1"
            />
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--neutral-700)', paddingTop: 16, marginTop: 8 }}>
        <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          Custom Earnings & Deductions
        </h3>
        <div className="form-row">
          <div className="form-group">
            <label>Custom Earning Name</label>
            <input
              type="text"
              className="form-input"
              name="customEarningName"
              value={formData.customEarningName || ''}
              onChange={handleInputChange}
              placeholder="e.g., Bonus"
            />
          </div>

          <div className="form-group">
            <label>Custom Earning Amount</label>
            <input
              type="number"
              className="form-input"
              name="customEarningAmount"
              value={formData.customEarningAmount || 0}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label>Custom Deduction Name</label>
            <input
              type="text"
              className="form-input"
              name="customDeductionName"
              value={formData.customDeductionName || ''}
              onChange={handleInputChange}
              placeholder="e.g., Loan"
            />
          </div>

          <div className="form-group">
            <label>Custom Deduction Amount</label>
            <input
              type="number"
              className="form-input"
              name="customDeductionAmount"
              value={formData.customDeductionAmount || 0}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
            />
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--neutral-700)', paddingTop: 16, marginTop: 8 }}>
        <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          Fund Availability
        </h3>
        <div className="form-row">
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                name="epfAvailability"
                checked={formData.epfAvailability === true}
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
                checked={formData.etfAvailability === true}
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
