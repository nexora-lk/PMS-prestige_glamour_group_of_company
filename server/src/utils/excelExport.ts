import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { User, PayrollRecord } from '../models';
import { getDataDir } from '../services/jsonStore';

const EXPORTS_DIR = path.join(getDataDir(), '..', 'exports');

function ensureExportsDir(): void {
  if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  }
}

export async function exportUsersToExcel(users: User[]): Promise<string> {
  ensureExportsDir();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Payroll System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Users', {
    headerFooter: { firstHeader: 'Employee Data Report' },
  });

  sheet.columns = [
    { header: 'ID', key: 'id', width: 15 },
    { header: 'First Name', key: 'firstName', width: 18 },
    { header: 'Last Name', key: 'lastName', width: 18 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Branch', key: 'branch', width: 18 },
    { header: 'Role', key: 'role', width: 16 },
    { header: 'Designation', key: 'designation', width: 20 },
    { header: 'Join Date', key: 'joinDate', width: 14 },
    { header: 'Basic Salary', key: 'basicSalary', width: 14 },
    { header: 'Allowances', key: 'allowances', width: 14 },
    { header: 'Deductions', key: 'deductions', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4338CA' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });

  // Add data rows
  users.forEach((user) => {
    sheet.addRow(user);
  });

  // Auto-fit and style data rows
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle' };
      });
    }
  });

  const filename = `users_export_${Date.now()}.xlsx`;
  const filePath = path.join(EXPORTS_DIR, filename);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

export async function exportPayrollToExcel(records: PayrollRecord[]): Promise<string> {
  ensureExportsDir();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Payroll System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Payroll', {
    headerFooter: { firstHeader: 'Payroll Report' },
  });

  sheet.columns = [
    { header: 'Employee', key: 'userName', width: 24 },
    { header: 'Branch', key: 'branch', width: 18 },
    { header: 'Designation', key: 'designation', width: 20 },
    { header: 'Period', key: 'period', width: 12 },
    { header: 'Basic Salary', key: 'basicSalary', width: 14 },
    { header: 'Allowances', key: 'allowances', width: 14 },
    { header: 'Gross Salary', key: 'grossSalary', width: 14 },
    { header: 'Deductions', key: 'deductions', width: 14 },
    { header: 'Tax', key: 'tax', width: 12 },
    { header: 'Net Salary', key: 'netSalary', width: 14 },
    { header: 'Generated At', key: 'generatedAt', width: 22 },
  ];

  // Style header
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  records.forEach((record) => {
    sheet.addRow(record);
  });

  const filename = `payroll_export_${Date.now()}.xlsx`;
  const filePath = path.join(EXPORTS_DIR, filename);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}
