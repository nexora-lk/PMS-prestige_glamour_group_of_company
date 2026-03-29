import { useState } from 'react';
import type { MonthlyPaysheet } from '../types';
import { showToast } from '../components/Toast';
import { MonthlyPaysheetForm } from '../components/MonthlyPaysheetForm';
import { PaysheetList } from '../components/PaysheetList';
import { pgwcsTheme } from '../theme/colors';

export default function MonthlyPaysheets() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<MonthlyPaysheet | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEdit = (paysheet: MonthlyPaysheet) => {
    setEditingData(paysheet);
    setEditingId(paysheet.id || '');
    setShowForm(true);
    // Scroll to form
    setTimeout(() => {
      document.querySelector('.card')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingId(null);
    setEditingData(null);
    setRefreshTrigger(prev => prev + 1);
    showToast('Paysheet saved successfully!', 'success');
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setEditingData(null);
  };

  return (
    <div className="animate-in">
      {/* Header Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px',
            borderBottom: `1px solid ${pgwcsTheme.neutral[200]}`,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: pgwcsTheme.navy[900] }}>
              📊 Monthly Paysheets
            </h1>
            <p style={{ margin: '8px 0 0 0', color: pgwcsTheme.neutral[500], fontSize: '14px' }}>
              Create and manage employee paysheets based on performance and attendance
            </p>
          </div>
          {!showForm && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setEditingData(null);
              }}
              style={{ padding: '10px 20px', fontSize: '14px', whiteSpace: 'nowrap' }}
            >
              ➕ Create Paysheet
            </button>
          )}
        </div>
      </div>

      {/* Form Card */}
      {showForm && (
        <div className="card" style={{ marginBottom: '24px', backgroundColor: pgwcsTheme.neutral[50] }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderBottom: `1px solid ${pgwcsTheme.neutral[200]}`,
              backgroundColor: pgwcsTheme.neutral[100],
            }}
          >
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: pgwcsTheme.navy[900] }}>
              {editingId ? '✏️ Edit Paysheet' : '➕ Create New Paysheet'}
            </h2>
            <button
              type="button"
              onClick={handleFormCancel}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: pgwcsTheme.neutral[500],
              }}
              title="Close"
            >
              ✕
            </button>
          </div>
          <div style={{ padding: '24px' }}>
            <MonthlyPaysheetForm
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
              initialData={editingData || undefined}
              isEditMode={!!editingId}
            />
          </div>
        </div>
      )}

      {/* List Card */}
      <div className="card">
        <div style={{ padding: '24px' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600, color: pgwcsTheme.navy[900] }}>
            📋 Paysheet Records
          </h2>
          <PaysheetList
            onEdit={handleEdit}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
    </div>
  );
}




