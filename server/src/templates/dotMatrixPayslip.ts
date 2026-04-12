import type { PayslipEmployee } from '../types/worker';

// ── Constants ───────────────────────────────────────────────

const LINE_WIDTH = 80;
const PAGE_LINES = 66;

// ── ESC/P Control Codes ─────────────────────────────────────

export const ESCP = {
  INIT: '\x1B\x40',             // ESC @ — Initialize printer
  BOLD_ON: '\x1B\x45',          // ESC E — Bold ON
  BOLD_OFF: '\x1B\x46',         // ESC F — Bold OFF
  CONDENSED_ON: '\x0F',         // SI — Condensed ON
  CONDENSED_OFF: '\x12',        // DC2 — Condensed OFF
  UNDERLINE_ON: '\x1B\x2D\x01', // ESC - 1 — Underline ON
  UNDERLINE_OFF: '\x1B\x2D\x00', // ESC - 0 — Underline OFF
  LF: '\n',
  FF: '\x0C',                   // Form feed — advance to next page
  CR: '\r',                     // Carriage return
};

// ── Formatting helpers ──────────────────────────────────────

function center(text: string, width: number = LINE_WIDTH): string {
  if (text.length >= width) return text.slice(0, width);
  const pad = Math.floor((width - text.length) / 2);
  return ' '.repeat(pad) + text;
}

function line(char: string = '-', width: number = LINE_WIDTH): string {
  return char.repeat(width);
}

function doubleLine(width: number = LINE_WIDTH): string {
  return '='.repeat(width);
}

function labelValue(label: string, value: string, width: number = LINE_WIDTH): string {
  const gap = width - label.length - value.length;
  if (gap < 1) return (label + ' ' + value).slice(0, width);
  return label + ' '.repeat(gap) + value;
}

function twoColumn(
  leftLabel: string,
  leftVal: string,
  rightLabel: string,
  rightVal: string,
  width: number = LINE_WIDTH
): string {
  const half = Math.floor(width / 2);
  const left = (leftLabel + leftVal.padStart(half - leftLabel.length)).slice(0, half);
  const right = (rightLabel + rightVal.padStart(half - rightLabel.length)).slice(0, half);
  return left + right;
}

function currency(amount: number): string {
  return amount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMonth(payMonth: string): string {
  const [year, month] = payMonth.split('-');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// ── Payslip renderer (plain text, 66 lines) ─────────────────

export function renderDotMatrixPayslip(emp: PayslipEmployee, useEscP: boolean): string {
  const lines: string[] = [];

  // Compute total earnings and deductions
  const totalEarnings =
    emp.basicSalary +
    emp.vehicleAllowance +
    emp.fuelAllowance +
    emp.generalAllowance +
    emp.orc +
    emp.otherOffer +
    emp.customEarningAmount;

  const totalDeductions =
    emp.epfEmployee +
    emp.nopayDeduction +
    emp.lateDeduction +
    emp.welfare +
    emp.customDeductionAmount;

  // ── Header (lines 1-8) ────────────────────────────────────
  lines.push(doubleLine());
  lines.push(center('PRESTIGE GLAMOUR GROUP OF COMPANIES'));
  lines.push(center('Payroll Management System'));
  lines.push(doubleLine());
  lines.push(center(`PAYSLIP FOR THE MONTH OF ${formatMonth(emp.payMonth).toUpperCase()}`));
  lines.push(line());
  lines.push('');

  // ── Employee Info (lines 8-14) ────────────────────────────
  lines.push(twoColumn('Employee ID : ', emp.codeNo, 'Branch    : ', emp.branch));
  lines.push(twoColumn('Name        : ', `${emp.firstName} ${emp.lastName}`, 'Month     : ', formatMonth(emp.payMonth)));
  lines.push(twoColumn('Designation : ', emp.designation, 'Date      : ', new Date(emp.createdAt).toLocaleDateString('en-GB')));
  if (emp.bankName || emp.bankAccount) {
    lines.push(twoColumn('Bank        : ', emp.bankName || '-', 'Account   : ', emp.bankAccount || '-'));
  } else {
    lines.push('');
  }

  // Achievement info (if target-based)
  if (emp.assignedTarget > 0) {
    lines.push(twoColumn('Target      : ', currency(emp.assignedTarget), 'Achieved  : ', pct(emp.achievementPct)));
  } else {
    lines.push('');
  }
  lines.push(line());
  lines.push('');

  // ── Earnings Section (lines 15-27) ────────────────────────
  const earningsLabel = ' EARNINGS';
  const deductionsLabel = '                                        DEDUCTIONS';
  lines.push(earningsLabel + deductionsLabel.slice(earningsLabel.length));
  lines.push(line());

  // Row-by-row: earnings on left half, deductions on right half
  const earningsRows: [string, number][] = [
    ['Basic Offer', emp.basicSalary],
    ['Vehicle Offer', emp.vehicleAllowance],
    ['Fuel Offer', emp.fuelAllowance],
    ['General Offer', emp.generalAllowance],
    ['ORC', emp.orc],
    ['Other Offer', emp.otherOffer],
  ];
  if (emp.customEarningAmount > 0) {
    earningsRows.push([emp.customEarningName || 'Custom Earning', emp.customEarningAmount]);
  }

  const deductionRows: [string, number][] = [
    ['EPF (Employee 8%)', emp.epfEmployee],
    ['No-Pay Deduction', emp.nopayDeduction],
    ['Late Deduction', emp.lateDeduction],
    ['Welfare', emp.welfare],
  ];
  if (emp.customDeductionAmount > 0) {
    deductionRows.push([emp.customDeductionName || 'Custom Deduction', emp.customDeductionAmount]);
  }

  const maxRows = Math.max(earningsRows.length, deductionRows.length);
  const half = 40;

  for (let i = 0; i < maxRows; i++) {
    let leftPart = ' '.repeat(half);
    let rightPart = ' '.repeat(half);

    if (i < earningsRows.length) {
      const [label, val] = earningsRows[i];
      const formatted = currency(val);
      leftPart = (' ' + label).padEnd(half - formatted.length - 1) + formatted + ' ';
      leftPart = leftPart.slice(0, half);
    }

    if (i < deductionRows.length) {
      const [label, val] = deductionRows[i];
      const formatted = currency(val);
      rightPart = (' ' + label).padEnd(half - formatted.length - 1) + formatted + ' ';
      rightPart = rightPart.slice(0, half);
    }

    lines.push(leftPart + rightPart);
  }

  lines.push(line());

  // ── Totals row ────────────────────────────────────────────
  {
    const leftTotal = currency(totalEarnings);
    const rightTotal = currency(totalDeductions);
    const leftStr = (' TOTAL EARNINGS').padEnd(half - leftTotal.length - 1) + leftTotal + ' ';
    const rightStr = (' TOTAL DEDUCTIONS').padEnd(half - rightTotal.length - 1) + rightTotal + ' ';
    lines.push(leftStr.slice(0, half) + rightStr.slice(0, half));
  }
  lines.push(line());
  lines.push('');

  // ── Gross / Net Offer ─────────────────────────────────────
  lines.push(doubleLine());
  lines.push(labelValue(' GROSS OFFER   : ' + currency(emp.grossSalary), 'NET OFFER   : ' + currency(emp.netSalary)));
  lines.push(doubleLine());
  lines.push('');

  // ── Footer ────────────────────────────────────────────────
  lines.push(center('*** This is a system-generated payslip ***'));
  lines.push(center('Prestige Glamour Welfare Credit Society'));
  lines.push('');

  // ── Pad to exactly PAGE_LINES ─────────────────────────────
  while (lines.length < PAGE_LINES) {
    lines.push('');
  }

  // Truncate if somehow over (should not happen)
  const pageLines = lines.slice(0, PAGE_LINES);

  // Ensure no line exceeds LINE_WIDTH
  const trimmed = pageLines.map((l) => l.length > LINE_WIDTH ? l.slice(0, LINE_WIDTH) : l);

  // Build final output
  let output = trimmed.join('\n');

  // Wrap with ESC/P if requested
  if (useEscP) {
    output =
      ESCP.INIT +
      ESCP.BOLD_ON +
      trimmed[0] + '\n' +    // double line (bold)
      trimmed[1] + '\n' +    // company name (bold)
      trimmed[2] + '\n' +    // subtitle (bold)
      trimmed[3] + '\n' +    // double line (bold)
      trimmed[4] + '\n' +    // payslip month title (bold)
      ESCP.BOLD_OFF +
      trimmed.slice(5).join('\n') +
      ESCP.FF;               // form feed after each payslip
  }

  return output;
}

// ── Separator between payslips (non-ESC/P mode) ─────────────

export function payslipSeparator(): string {
  // 3 blank lines between payslips
  return '\n\n\n';
}
