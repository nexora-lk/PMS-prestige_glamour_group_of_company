import { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import type { MonthlyPaysheet, User } from '../types';
import { showToast } from '../components/Toast';
import { MonthlyPaysheetForm } from '../components/MonthlyPaysheetForm';
import { PaysheetList } from '../components/PaysheetList';
import PaySheet from '../components/PaySheet';
import { userService } from '../services/userService';

export default function MonthlyPaysheets() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<MonthlyPaysheet | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Preview state
  const [previewPaysheet, setPreviewPaysheet] = useState<MonthlyPaysheet | null>(null);
  const [previewEmployee, setPreviewEmployee] = useState<User | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: previewPaysheet
      ? `PaySheet_${previewPaysheet.codeNo}_${previewPaysheet.payMonth}`
      : 'PaySheet',
  });

  const handleEdit = (paysheet: MonthlyPaysheet) => {
    setPreviewPaysheet(null);
    setEditingData(paysheet);
    setEditingId(paysheet.id || '');
    setShowForm(true);
    setTimeout(() => {
      document.querySelector('.card')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handlePreview = async (paysheet: MonthlyPaysheet) => {
    setShowForm(false);
    setEditingId(null);
    setEditingData(null);
    setPreviewPaysheet(paysheet);

    if (paysheet.employeeId) {
      try {
        const user = await userService.getUser(paysheet.employeeId);
        setPreviewEmployee(user);
      } catch {
        setPreviewEmployee(null);
      }
    }

    setTimeout(() => {
      document.getElementById('paysheet-preview')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingId(null);
    setEditingData(null);
    setRefreshTrigger((prev) => prev + 1);
    showToast('Paysheet saved successfully!', 'success');
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setEditingData(null);
  };

  const handleClosePreview = () => {
    setPreviewPaysheet(null);
    setPreviewEmployee(null);
  };

  return (
    <div className="animate-in">
      {/* Header Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div
          className="card-header"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Monthly Paysheets</h2>
            <p style={{ margin: '8px 0 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
              Create and manage employee paysheets based on performance and attendance
            </p>
          </div>
          {!showForm && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setPreviewPaysheet(null);
                setShowForm(true);
                setEditingId(null);
                setEditingData(null);
              }}
            >
              + Create Paysheet
            </button>
          )}
        </div>
      </div>

      {/* Form Card */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div
            className="card-header"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <h2 style={{ margin: 0 }}>
              {editingId ? 'Edit Paysheet' : 'Create New Paysheet'}
            </h2>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleFormCancel}
              title="Close"
            >
              X
            </button>
          </div>
          <div className="card-body">
            <MonthlyPaysheetForm
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
              initialData={editingData || undefined}
              isEditMode={!!editingId}
            />
          </div>
        </div>
      )}

      {/* PaySheet Preview */}
      {previewPaysheet && (
        <div id="paysheet-preview" className="card" style={{ marginBottom: 24 }}>
          <div
            className="card-header"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <h2 style={{ margin: 0 }}>PaySheet Preview - {previewPaysheet.codeNo}</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => handlePrint()}>
                Print
              </button>
              <button className="btn btn-secondary" onClick={handleClosePreview}>
                Close
              </button>
            </div>
          </div>
          <div
            className="card-body"
            style={{
              background: '#eaeaea',
              display: 'flex',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <div ref={printRef}>
              <PaySheet paysheet={previewPaysheet} employee={previewEmployee} />
            </div>
          </div>
        </div>
      )}

      {/* List Card */}
      <div className="card">
        <div className="card-header">
          <h2>Paysheet Records</h2>
        </div>
        <div className="card-body">
          <PaysheetList
            onEdit={handleEdit}
            onView={handlePreview}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
    </div>
  );
}
