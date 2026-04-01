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

export async function exportMonthlyPaysheetsToExcel(
  records: MonthlyPaysheetDTO[],
  users?: User[]
): Promise<string> {
  ensureExportsDir();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Payroll System';
  workbook.created = new Date();

  // Build user lookup for employee names
  const userMap = new Map<string, User>();
  if (users) {
    users.forEach((u) => userMap.set(u.codeNo, u));
  }

  // Group records by payMonth → each month is one sheet
  const byMonth = new Map<string, MonthlyPaysheetDTO[]>();
  for (const rec of records) {
    if (!byMonth.has(rec.payMonth)) byMonth.set(rec.payMonth, []);
    byMonth.get(rec.payMonth)!.push(rec);
  }

  // Sort months chronologically
  const sortedMonths = [...byMonth.keys()].sort();

  const HEADER_COLOR = 'FF1b1464';        // Navy
  const ROLE_SECTION_COLOR = 'FF059669';   // Green
  const GOLD_COLOR = 'FFc8a415';           // Gold

  const dataColumns = [
    { header: 'Code No', key: 'codeNo', width: 14 },
    { header: 'Employee Name', key: 'employeeName', width: 24 },
    { header: 'Role', key: 'role', width: 18 },
    { header: 'Basic Salary', key: 'basicSalary', width: 14 },
    { header: 'Achieve', key: 'achieve', width: 14 },
    { header: 'Allowance', key: 'allowance', width: 14 },
    { header: 'Vehicle Allow.', key: 'vehicleAllowance', width: 14 },
    { header: 'Fuel Allow.', key: 'fuelAllowance', width: 14 },
    { header: 'General Allow.', key: 'generalAllowance', width: 14 },
    { header: 'ORC', key: 'orc', width: 12 },
    { header: 'Other Offer', key: 'otherOffer', width: 14 },
    { header: 'Custom Earning', key: 'customEarningAmount', width: 14 },
    { header: 'Gross Salary', key: 'grossSalary', width: 14 },
    { header: 'No Pay Days', key: 'nopay', width: 10 },
    { header: 'No Pay Ded.', key: 'nopayDeduction', width: 14 },
    { header: 'Late Ded.', key: 'lateDeduction', width: 14 },
    { header: 'EPF 8%', key: 'epfEmployee', width: 14 },
    { header: 'Welfare', key: 'welfare', width: 12 },
    { header: 'Custom Ded.', key: 'customDeductionAmount', width: 14 },
    { header: 'Net Salary', key: 'netSalary', width: 14 },
    { header: 'EPF 12%', key: 'epfEmployer', width: 14 },
    { header: 'ETF 3%', key: 'etf', width: 12 },
  ];

  for (const month of sortedMonths) {
    const monthRecords = byMonth.get(month)!;

    // Format sheet name: "2026-03" → "Mar 2026"
    const [yr, mo] = month.split('-');
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const sheetLabel = `${monthNames[parseInt(mo, 10) - 1] || mo} ${yr}`;
    const safeName = sheetLabel.replace(/[\\/*?[\]:]/g, '').slice(0, 31);
    const sheet = workbook.addWorksheet(safeName);

    // Group within this month by role, sort roles alphabetically
    const byRole = new Map<string, MonthlyPaysheetDTO[]>();
    for (const rec of monthRecords) {
      const role = rec.role || 'Unknown';
      if (!byRole.has(role)) byRole.set(role, []);
      byRole.get(role)!.push(rec);
    }
    const sortedRoles = [...byRole.keys()].sort();

    // Set column widths
    sheet.columns = dataColumns.map((c) => ({ key: c.key, width: c.width }));

    let currentRow = 1;

    // Sheet title row
    const titleRow = sheet.getRow(currentRow);
    titleRow.getCell(1).value = `Monthly Paysheets — ${sheetLabel}`;
    titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_COLOR } };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.mergeCells(currentRow, 1, currentRow, dataColumns.length);
    titleRow.height = 28;
    currentRow += 1;

    let monthGross = 0;
    let monthNet = 0;
    let monthEpfEr = 0;
    let monthEtf = 0;

    for (const role of sortedRoles) {
      const roleRecords = byRole.get(role)!;

      // Role section header
      const roleRow = sheet.getRow(currentRow);
      roleRow.getCell(1).value = role;
      roleRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      roleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROLE_SECTION_COLOR } };
      roleRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      // Fill entire role header row with green
      for (let i = 2; i <= dataColumns.length; i++) {
        roleRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROLE_SECTION_COLOR } };
      }
      sheet.mergeCells(currentRow, 1, currentRow, dataColumns.length);
      roleRow.height = 22;
      currentRow += 1;

      // Column headers under each role section
      const hdrRow = sheet.getRow(currentRow);
      dataColumns.forEach((col, idx) => {
        const cell = hdrRow.getCell(idx + 1);
        cell.value = col.header;
        cell.font = { bold: true, size: 10, color: { argb: 'FF222222' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
      });
      currentRow += 1;

      // Data rows
      let roleGross = 0;
      let roleNet = 0;

      for (const rec of roleRecords) {
        const user = userMap.get(rec.codeNo);
        const empName = user ? `${user.firstName} ${user.lastName}` : rec.codeNo;
        const row = sheet.getRow(currentRow);

        const values: Record<string, unknown> = { ...rec, employeeName: empName };
        dataColumns.forEach((col, idx) => {
          row.getCell(idx + 1).value = values[col.key] as string | number;
          row.getCell(idx + 1).alignment = { vertical: 'middle' };
        });

        roleGross += rec.grossSalary || 0;
        roleNet += rec.netSalary || 0;
        currentRow += 1;
      }

      // Role subtotal row
      const subtotalRow = sheet.getRow(currentRow);
      subtotalRow.getCell(1).value = `${role} Subtotal (${roleRecords.length})`;
      subtotalRow.getCell(1).font = { bold: true, size: 10 };
      // Gross column
      const grossIdx = dataColumns.findIndex((c) => c.key === 'grossSalary') + 1;
      const netIdx = dataColumns.findIndex((c) => c.key === 'netSalary') + 1;
      subtotalRow.getCell(grossIdx).value = roleGross;
      subtotalRow.getCell(grossIdx).font = { bold: true };
      subtotalRow.getCell(grossIdx).numFmt = '#,##0.00';
      subtotalRow.getCell(netIdx).value = roleNet;
      subtotalRow.getCell(netIdx).font = { bold: true };
      subtotalRow.getCell(netIdx).numFmt = '#,##0.00';
      // Light border on subtotal
      for (let i = 1; i <= dataColumns.length; i++) {
        subtotalRow.getCell(i).border = { top: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
        subtotalRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      }
      currentRow += 2; // blank row after each role

      monthGross += roleGross;
      monthNet += roleNet;
      monthEpfEr += roleRecords.reduce((s, r) => s + (r.epfEmployer || 0), 0);
      monthEtf += roleRecords.reduce((s, r) => s + (r.etf || 0), 0);
    }

    // Month grand total row
    currentRow += 1;
    const totalRow = sheet.getRow(currentRow);
    totalRow.getCell(1).value = `GRAND TOTAL — ${sheetLabel} (${monthRecords.length} employees)`;
    totalRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    const grossIdx = dataColumns.findIndex((c) => c.key === 'grossSalary') + 1;
    const netIdx = dataColumns.findIndex((c) => c.key === 'netSalary') + 1;
    const epfErIdx = dataColumns.findIndex((c) => c.key === 'epfEmployer') + 1;
    const etfIdx = dataColumns.findIndex((c) => c.key === 'etf') + 1;
    totalRow.getCell(grossIdx).value = monthGross;
    totalRow.getCell(grossIdx).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    totalRow.getCell(grossIdx).numFmt = '#,##0.00';
    totalRow.getCell(netIdx).value = monthNet;
    totalRow.getCell(netIdx).font = { bold: true, color: { argb: GOLD_COLOR } };
    totalRow.getCell(netIdx).numFmt = '#,##0.00';
    totalRow.getCell(epfErIdx).value = monthEpfEr;
    totalRow.getCell(epfErIdx).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    totalRow.getCell(epfErIdx).numFmt = '#,##0.00';
    totalRow.getCell(etfIdx).value = monthEtf;
    totalRow.getCell(etfIdx).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    totalRow.getCell(etfIdx).numFmt = '#,##0.00';
    for (let i = 1; i <= dataColumns.length; i++) {
      totalRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_COLOR } };
    }
    totalRow.height = 24;
  }

  const filename = `monthly_paysheets_export_${Date.now()}.xlsx`;
  const filePath = path.join(EXPORTS_DIR, filename);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}
