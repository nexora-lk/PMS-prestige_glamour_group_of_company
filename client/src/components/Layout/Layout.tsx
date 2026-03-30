import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Overview of your payroll system' },
  '/users': { title: 'User Management', subtitle: 'Manage employees and their data' },
  '/users/new': { title: 'Add New User', subtitle: 'Create a new employee record' },
  '/payroll': { title: 'Payroll', subtitle: 'Generate and manage pay sheets' },
  '/paysheets': { title: 'Monthly Paysheets', subtitle: 'Create and manage monthly paysheets' },
  '/payslip-generation': { title: 'Payslip PDFs', subtitle: 'Generate bulk PDF payslips with high performance' },
  '/dot-matrix': { title: 'Dot Matrix Printing', subtitle: 'Generate and print text payslips for dot matrix printers' },
  '/export': { title: 'Export & Backup', subtitle: 'Download data and manage backups' },
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const currentPage = pageTitles[location.pathname] || { title: 'PMS', subtitle: '' };

  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className={`main-wrapper${collapsed ? ' collapsed' : ''}`}>
        <Header collapsed={collapsed} title={currentPage.title} subtitle={currentPage.subtitle} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
