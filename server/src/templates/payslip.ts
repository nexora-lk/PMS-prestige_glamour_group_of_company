import type { PayslipEmployee } from '../types/worker';

const NAVY = '#1b1464';
const NAVY_DARK = '#111052';
const GOLD = '#c8a415';

function formatCurrency(amount: number): string {
  if (amount === 0) return 'Rs. 0.00';
  return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMonth(payMonth: string): string {
  const [year, month] = payMonth.split('-');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}

export function renderPayslipHTML(emp: PayslipEmployee): string {
  const totalDeductions =
    emp.epfEmployee + emp.nopayDeduction + emp.lateDeduction + emp.welfare;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #fff;
      color: #333;
      width: 780px;
      margin: 0 auto;
    }

    .header {
      background: ${NAVY};
      display: flex;
      align-items: center;
      padding: 18px 24px;
      gap: 18px;
    }
    .logo-circle {
      width: 72px; height: 72px; border-radius: 50%;
      background: linear-gradient(135deg, ${GOLD} 0%, #e8c930 40%, #a08510 100%);
      display: flex; align-items: center; justify-content: center;
      border: 3px solid ${GOLD};
      flex-shrink: 0;
    }
    .logo-inner {
      width: 56px; height: 56px; border-radius: 50%;
      background: ${NAVY_DARK};
      display: flex; align-items: center; justify-content: center;
      border: 2px solid ${GOLD};
    }
    .logo-text {
      color: ${GOLD}; font-size: 13px; font-weight: 800;
      letter-spacing: 1.5px; font-family: Georgia, serif;
    }
    .header-right { flex: 1; }
    .company-name {
      color: #fff; font-size: 16px; font-weight: 700;
      letter-spacing: 0.8px; line-height: 1.3;
      font-family: Georgia, 'Times New Roman', serif;
    }
    .company-sub {
      color: #fff; font-size: 14px; font-weight: 600;
      margin: 2px 0 10px 0; letter-spacing: 0.6px;
      font-family: Georgia, 'Times New Roman', serif;
    }
    .contact-row { display: flex; gap: 20px; flex-wrap: wrap; }
    .contact-item { display: flex; align-items: flex-start; gap: 6px; }
    .contact-text { color: #d0d0d0; font-size: 10.5px; line-height: 1.5; }

    .employee-section { padding: 16px 24px; border-bottom: 2px solid #e0e0e0; }
    .employee-grid { display: flex; gap: 32px; flex-wrap: wrap; }
    .employee-col { flex: 1; min-width: 220px; }
    .info-row { display: flex; align-items: center; padding: 5px 0; gap: 8px; }
    .info-label { font-weight: 600; font-size: 13px; color: #222; min-width: 140px; }
    .info-colon { font-weight: 600; color: #222; }
    .info-value { font-size: 13px; color: #444; }

    .section-header {
      background: ${NAVY}; display: flex; justify-content: space-between;
      align-items: center; padding: 10px 24px;
    }
    .section-header span {
      color: #fff; font-size: 13px; font-weight: 800;
      letter-spacing: 2px; text-transform: uppercase;
    }
    .row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 24px; border-bottom: 1px solid #e0e0e0;
    }
    .row-alt { background: #f5f5f5; }
    .row-label { font-size: 13px; color: #333; }
    .row-amount { font-size: 13px; color: #333; font-weight: 500; min-width: 140px; text-align: right; }

    .total-row {
      background: ${NAVY}; display: flex; justify-content: space-between;
      align-items: center; padding: 10px 24px;
    }
    .total-label {
      color: #fff; font-size: 14px; font-weight: 800;
      letter-spacing: 2px; text-transform: uppercase;
    }
    .total-amount {
      color: #fff; font-size: 14px; font-weight: 700;
      min-width: 140px; text-align: right;
    }

    .net-row {
      background: ${NAVY_DARK}; display: flex; justify-content: space-between;
      align-items: center; padding: 14px 24px; margin-top: 8px;
      border-top: 3px solid ${GOLD};
    }
    .net-label {
      color: #fff; font-size: 16px; font-weight: 900;
      letter-spacing: 3px; text-transform: uppercase;
    }
    .net-amount {
      color: ${GOLD}; font-size: 16px; font-weight: 800;
      min-width: 140px; text-align: right;
    }

    .footer {
      padding: 12px 24px; text-align: center;
      font-size: 10px; color: #999; border-top: 1px solid #e0e0e0;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <div class="logo-circle">
      <div class="logo-inner">
        <span class="logo-text">PGWCS</span>
      </div>
    </div>
    <div class="header-right">
      <div class="company-name">PRESTIGE GLAMOUR WORKING CAPITAL SOLUTIONS</div>
      <div class="company-sub">GROUP OF COMPANY (PRIVATE) LIMITED</div>
      <div class="contact-row">
        <div class="contact-item">
          <span class="contact-text">404/A, Galle Road, Maggona, Sri Lanka</span>
        </div>
        <div class="contact-item">
          <span class="contact-text">info@pgwcs.com | www.pgwcs.com</span>
        </div>
        <div class="contact-item">
          <span class="contact-text">+94 75 169 3138</span>
        </div>
      </div>
    </div>
  </div>

  <!-- EMPLOYEE INFO -->
  <div class="employee-section">
    <div class="employee-grid">
      <div class="employee-col">
        <div class="info-row">
          <span class="info-label">Employee ID</span>
          <span class="info-colon">:</span>
          <span class="info-value">${emp.codeNo}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Employee Name</span>
          <span class="info-colon">:</span>
          <span class="info-value">${emp.firstName} ${emp.lastName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Designation</span>
          <span class="info-colon">:</span>
          <span class="info-value">${emp.designation}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Branch</span>
          <span class="info-colon">:</span>
          <span class="info-value">${emp.branch}</span>
        </div>
      </div>
      <div class="employee-col">
        <div class="info-row">
          <span class="info-label">Report For Month</span>
          <span class="info-colon">:</span>
          <span class="info-value">${formatMonth(emp.payMonth)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Generated On</span>
          <span class="info-colon">:</span>
          <span class="info-value">${new Date(emp.createdAt).toLocaleDateString('en-LK')}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- EARNINGS -->
  <div class="section-header">
    <span>Earnings</span>
    <span>Amount (Rupees)</span>
  </div>
  <div class="row">
    <span class="row-label">Basic Salary</span>
    <span class="row-amount">${formatCurrency(emp.basicSalary)}</span>
  </div>
  ${emp.vehicleAllowance > 0 ? `<div class="row row-alt">
    <span class="row-label">Vehicle Allowance</span>
    <span class="row-amount">${formatCurrency(emp.vehicleAllowance)}</span>
  </div>` : ''}
  ${emp.fuelAllowance > 0 ? `<div class="row">
    <span class="row-label">Fuel Allowance</span>
    <span class="row-amount">${formatCurrency(emp.fuelAllowance)}</span>
  </div>` : ''}
  ${emp.generalAllowance > 0 ? `<div class="row row-alt">
    <span class="row-label">General Allowance</span>
    <span class="row-amount">${formatCurrency(emp.generalAllowance)}</span>
  </div>` : ''}
  ${emp.orc > 0 ? `<div class="row">
    <span class="row-label">ORC</span>
    <span class="row-amount">${formatCurrency(emp.orc)}</span>
  </div>` : ''}
  ${emp.otherOffer > 0 ? `<div class="row row-alt">
    <span class="row-label">Other Offers</span>
    <span class="row-amount">${formatCurrency(emp.otherOffer)}</span>
  </div>` : ''}

  <!-- GROSS SALARY -->
  <div class="total-row">
    <span class="total-label">Gross Salary</span>
    <span class="total-amount">${formatCurrency(emp.grossSalary)}</span>
  </div>

  <!-- DEDUCTIONS -->
  <div class="section-header" style="margin-top: 4px;">
    <span>Deductions</span>
    <span>Amount (Rupees)</span>
  </div>
  ${emp.epfEmployee > 0 ? `<div class="row">
    <span class="row-label">EPF (8%)</span>
    <span class="row-amount">${formatCurrency(emp.epfEmployee)}</span>
  </div>` : ''}
  <div class="row row-alt">
    <span class="row-label">No Pay</span>
    <span class="row-amount">${formatCurrency(emp.nopayDeduction)}</span>
  </div>
  <div class="row">
    <span class="row-label">Late Comes</span>
    <span class="row-amount">${formatCurrency(emp.lateDeduction)}</span>
  </div>
  <div class="row row-alt">
    <span class="row-label">Welfare</span>
    <span class="row-amount">${formatCurrency(emp.welfare)}</span>
  </div>

  <!-- TOTAL DEDUCTIONS -->
  <div class="total-row">
    <span class="total-label">Total Deductions</span>
    <span class="total-amount">${formatCurrency(totalDeductions)}</span>
  </div>

  <!-- EPF / ETF Company -->
  <div class="row" style="margin-top: 8px; padding-left: 28px;">
    <span class="row-label">EPF (12%) - Employer</span>
    <span class="row-amount">${formatCurrency(emp.epfEmployer)}</span>
  </div>
  <div class="row row-alt" style="padding-left: 28px;">
    <span class="row-label">ETF (3%) - Employer</span>
    <span class="row-amount">${formatCurrency(emp.etf)}</span>
  </div>

  <!-- NET SALARY -->
  <div class="net-row">
    <span class="net-label">Net Salary</span>
    <span class="net-amount">${formatCurrency(emp.netSalary)}</span>
  </div>

  <div class="footer">
    This is a computer-generated document. No signature is required.
    &copy; ${new Date().getFullYear()} Prestige Glamour Working Capital Solutions (Pvt) Ltd.
  </div>
</body>
</html>`;
}
