import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { User, MonthlyPaysheetDTO } from '../models';
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
    { header: 'Code No', key: 'codeNo', width: 15 },
    { header: 'First Name', key: 'firstName', width: 18 },
    { header: 'Last Name', key: 'lastName', width: 18 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Branch', key: 'branch', width: 18 },
    { header: 'Role', key: 'role', width: 16 },
    { header: 'Designation', key: 'designation', width: 20 },
    { header: 'Join Date', key: 'joinDate', width: 14 },
    { header: 'Bank Name', key: 'bankName', width: 16 },
    { header: 'Bank Account', key: 'bankAccount', width: 18 },
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

export async function exportMonthlyPaysheetsToExcel(records: MonthlyPaysheetDTO[]): Promise<string> {
  ensureExportsDir();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Payroll System';
  workbook.created = new Date();

  // Group records by role + payMonth
  const grouped = new Map<string, MonthlyPaysheetDTO[]>();
  for (const rec of records) {
    const key = `${rec.role} - ${rec.payMonth}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(rec);
  }

  const paysheetColumns = [
    { header: 'Code No', key: 'codeNo', width: 14 },
    { header: 'Pay Month', key: 'payMonth', width: 12 },
    { header: 'Role', key: 'role', width: 16 },
    { header: 'Months of Service', key: 'monthsOfService', width: 10 },
    { header: 'Achieve', key: 'achieve', width: 14 },
    { header: 'Allowance', key: 'allowance', width: 14 },
    { header: 'No Pay', key: 'nopay', width: 8 },
    { header: 'Late', key: 'late', width: 8 },
    { header: 'Late Hours', key: 'lateHours', width: 10 },
    { header: 'Late Minutes', key: 'lateMinutes', width: 10 },
    { header: 'EPF Available', key: 'epfAvailability', width: 12 },
    { header: 'ETF Available', key: 'etfAvailability', width: 12 },
    { header: 'Custom Earning Name', key: 'customEarningName', width: 20 },
    { header: 'Custom Earning Amount', key: 'customEarningAmount', width: 16 },
    { header: 'Custom Deduction Name', key: 'customDeductionName', width: 20 },
    { header: 'Custom Deduction Amount', key: 'customDeductionAmount', width: 16 },
    { header: 'Basic Salary', key: 'basicSalary', width: 14 },
    { header: 'Achieved Salary', key: 'achievedSalary', width: 14 },
    { header: 'Vehicle Allowance', key: 'vehicleAllowance', width: 14 },
    { header: 'Fuel Allowance', key: 'fuelAllowance', width: 14 },
    { header: 'General Allowance', key: 'generalAllowance', width: 14 },
    { header: 'Other Offer', key: 'otherOffer', width: 14 },
    { header: 'Assigned Target', key: 'assignedTarget', width: 14 },
    { header: 'Achievement %', key: 'achievementPct', width: 12 },
    { header: 'ORC', key: 'orc', width: 12 },
    { header: 'Gross Salary', key: 'grossSalary', width: 14 },
    { header: 'No Pay Deduction', key: 'nopayDeduction', width: 14 },
    { header: 'Late Deduction', key: 'lateDeduction', width: 14 },
    { header: 'EPF Employee (8%)', key: 'epfEmployee', width: 14 },
    { header: 'EPF Employer (12%)', key: 'epfEmployer', width: 14 },
    { header: 'ETF (3%)', key: 'etf', width: 12 },
    { header: 'Welfare', key: 'welfare', width: 12 },
    { header: 'Net Salary', key: 'netSalary', width: 14 },
  ];

  for (const [sheetName, sheetRecords] of grouped) {
    // Excel sheet names max 31 chars, no invalid characters
    const safeName = sheetName.replace(/[\\/*?[\]:]/g, '').slice(0, 31);
    const sheet = workbook.addWorksheet(safeName);
    sheet.columns = paysheetColumns;

    // Style header row
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

    sheetRecords.forEach((rec) => {
      sheet.addRow(rec);
    });

    // Style data rows
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle' };
        });
      }
    });
  }

  const filename = `monthly_paysheets_export_${Date.now()}.xlsx`;
  const filePath = path.join(EXPORTS_DIR, filename);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}
