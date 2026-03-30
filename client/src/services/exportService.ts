import api from './api';

function downloadBlob(data: Blob, filename: string): void {
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
}

async function downloadExcel(endpoint: string, filenamePrefix: string): Promise<void> {
  try {
    const response = await api.get(endpoint, { responseType: 'blob' });
    const date = new Date().toISOString().split('T')[0];
    downloadBlob(response.data, `${filenamePrefix}-${date}.xlsx`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Download failed';
    throw new Error(message);
  }
}

export const exportService = {
  downloadUsersExcel: () => downloadExcel('/export/users-excel', 'users'),
  downloadPayrollExcel: () => downloadExcel('/export/payroll-excel', 'payroll'),
};
