import type { CSSProperties } from 'react';
import type { MonthlyPaysheet, User } from '../types';

interface PaySheetProps {
  paysheet: MonthlyPaysheet;
  employee?: User | null;
}

const formatCurrency = (amount: number): string => {
  if (amount === 0) return 'Rs.';
  return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatMonth = (payMonth: string): string => {
  const [year, month] = payMonth.split('-');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
};

export default function PaySheet({ paysheet, employee }: PaySheetProps) {
  const earnings = {
    basicSalary: paysheet.basicSalary || 0,
    vehicleAllowance: paysheet.vehicleAllowance || 0,
    fuelAllowance: paysheet.fuelAllowance || 0,
    orc: paysheet.orc || 0,
    otherOffers: paysheet.otherOffer || 0,
    generalAllowance: paysheet.generalAllowance || 0,
  };

  const deductions = {
    epf8: paysheet.epfEmployee || 0,
    noPay: paysheet.nopayDeduction || 0,
    lateComes: paysheet.lateDeduction || 0,
    welfare: paysheet.welfare || 0,
  };

  const grossSalary = paysheet.grossSalary || (
    earnings.basicSalary +
    earnings.vehicleAllowance +
    earnings.fuelAllowance +
    earnings.orc +
    earnings.otherOffers +
    earnings.generalAllowance
  );

  const totalDeductions =
    deductions.epf8 +
    deductions.noPay +
    deductions.lateComes +
    deductions.welfare;

  const netSalary = paysheet.netSalary || (grossSalary - totalDeductions);

  const employeeName = employee
    ? `${employee.firstName} ${employee.lastName}`
    : paysheet.codeNo;

  const designation = employee?.designation || paysheet.role;
  const branch = employee?.branch || 'Maggona';

  return (
    <div style={styles.container}>
      {/* ===== HEADER ===== */}
      <div style={styles.header}>
        <div style={styles.logoArea}>
          <div style={styles.logoCircle}>
            <div style={styles.logoInner}>
              <span style={styles.logoText}>PGWCS</span>
            </div>
          </div>
          <div style={styles.logoSubText}>
            <span style={styles.cursiveText}>Prestige Glamour</span>
            <span style={styles.smallCapText}>Working Capital Solutions</span>
            <span style={styles.tinyText}>Group Of Company (Private) Limited</span>
          </div>
        </div>
        <div style={styles.headerRight}>
          <h1 style={styles.companyName}>PRESTIGE GLAMOUR WORKING CAPITAL SOLUTIONS</h1>
          <h2 style={styles.companySubName}>GROUP OF COMPANY (PRIVATE) LIMITED</h2>
          <div style={styles.contactRow}>
            <div style={styles.contactItem}>
              <span style={styles.contactIcon}>📍</span>
              <span style={styles.contactText}>
                404/A, Galle Road,<br />Maggona, Sri Lanka
              </span>
            </div>
            <div style={styles.contactItem}>
              <span style={styles.contactIcon}>✉</span>
              <div>
                <span style={styles.contactText}>info@pgwcs.com</span>
                <br />
                <span style={styles.contactText}>www.pgwcs.com</span>
              </div>
            </div>
            <div style={styles.contactItem}>
              <span style={styles.contactIcon}>📞</span>
              <div>
                <span style={styles.contactText}>+94 75 169 3138</span>
                <br />
                <span style={styles.contactText}>+94 75 203 8613</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== EMPLOYEE INFO ===== */}
      <div style={styles.employeeSection}>
        <div style={styles.employeeGrid}>
          <div style={styles.employeeLeft}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Employee ID</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>{paysheet.codeNo}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Employee Name</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>{employeeName}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Designation</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>{designation}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Branch</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>{branch}</span>
            </div>
          </div>
          <div style={styles.employeeRight}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Report For Month</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>{formatMonth(paysheet.payMonth)}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Branch</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>{branch}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Generated On</span>
              <span style={styles.infoColon}>:</span>
              <span style={styles.infoValue}>
                {paysheet.createdAt
                  ? new Date(paysheet.createdAt).toLocaleDateString('en-LK')
                  : new Date().toLocaleDateString('en-LK')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== EARNINGS ===== */}
      <div style={styles.tableSection}>
        <div style={styles.tableHeader}>
          <span style={styles.tableHeaderLeft}>EARNINGS</span>
          <span style={styles.tableHeaderRight}>AMOUNT (RUPEES)</span>
        </div>
        <div style={styles.tableRow}>
          <span style={styles.rowLabel}>Basic Salary</span>
          <span style={styles.rowAmount}>{formatCurrency(earnings.basicSalary)}</span>
        </div>
        {earnings.vehicleAllowance > 0 && (
          <div style={{ ...styles.tableRow, ...styles.tableRowAlt }}>
            <span style={styles.rowLabel}>Vehicle Allowance</span>
            <span style={styles.rowAmount}>{formatCurrency(earnings.vehicleAllowance)}</span>
          </div>
        )}
        {earnings.fuelAllowance > 0 && (
          <div style={styles.tableRow}>
            <span style={styles.rowLabel}>Fuel Allowance</span>
            <span style={styles.rowAmount}>{formatCurrency(earnings.fuelAllowance)}</span>
          </div>
        )}
        {earnings.generalAllowance > 0 && (
          <div style={{ ...styles.tableRow, ...styles.tableRowAlt }}>
            <span style={styles.rowLabel}>General Allowance</span>
            <span style={styles.rowAmount}>{formatCurrency(earnings.generalAllowance)}</span>
          </div>
        )}
        {earnings.orc > 0 && (
          <div style={styles.tableRow}>
            <span style={styles.rowLabel}>ORC</span>
            <span style={styles.rowAmount}>{formatCurrency(earnings.orc)}</span>
          </div>
        )}
        {earnings.otherOffers > 0 && (
          <div style={{ ...styles.tableRow, ...styles.tableRowAlt }}>
            <span style={styles.rowLabel}>Other Offers</span>
            <span style={styles.rowAmount}>{formatCurrency(earnings.otherOffers)}</span>
          </div>
        )}
      </div>

      {/* ===== GROSS SALARY ===== */}
      <div style={styles.grossRow}>
        <span style={styles.grossLabel}>GROSS SALARY</span>
        <span style={styles.grossAmount}>{formatCurrency(grossSalary)}</span>
      </div>

      {/* ===== DEDUCTIONS ===== */}
      <div style={{ ...styles.tableSection, marginTop: 8 }}>
        <div style={styles.tableHeader}>
          <span style={styles.tableHeaderLeft}>DEDUCTIONS</span>
          <span style={styles.tableHeaderRight}>AMOUNT (RUPEES)</span>
        </div>
        {deductions.epf8 > 0 && (
          <div style={styles.tableRow}>
            <span style={styles.rowLabel}>EPF ( 8% )</span>
            <span style={styles.rowAmount}>{formatCurrency(deductions.epf8)}</span>
          </div>
        )}
        <div style={{ ...styles.tableRow, ...styles.tableRowAlt }}>
          <span style={styles.rowLabel}>No Pay</span>
          <span style={styles.rowAmount}>{formatCurrency(deductions.noPay)}</span>
        </div>
        <div style={styles.tableRow}>
          <span style={styles.rowLabel}>Late Comes</span>
          <span style={styles.rowAmount}>{formatCurrency(deductions.lateComes)}</span>
        </div>
        <div style={{ ...styles.tableRow, ...styles.tableRowAlt }}>
          <span style={styles.rowLabel}>Welfare</span>
          <span style={styles.rowAmount}>{formatCurrency(deductions.welfare)}</span>
        </div>
      </div>

      {/* ===== TOTAL DEDUCTIONS ===== */}
      <div style={styles.grossRow}>
        <span style={styles.grossLabel}>TOTAL DEDUCTIONS</span>
        <span style={styles.grossAmount}>{formatCurrency(totalDeductions)}</span>
      </div>

      {/* ===== EPF / ETF ===== */}
      <div style={{ ...styles.tableSection, marginTop: 12 }}>
        <div style={{ ...styles.tableRow, paddingLeft: 24 }}>
          <span style={styles.rowLabel}>EPF ( 12% )</span>
          <span style={styles.rowAmount}>{formatCurrency(paysheet.epfEmployer || 0)}</span>
        </div>
        <div style={{ ...styles.tableRow, ...styles.tableRowAlt, paddingLeft: 24 }}>
          <span style={styles.rowLabel}>ETF ( 3% )</span>
          <span style={styles.rowAmount}>{formatCurrency(paysheet.etf || 0)}</span>
        </div>
      </div>

      {/* ===== NET SALARY ===== */}
      <div style={styles.netSalaryRow}>
        <span style={styles.netSalaryLabel}>NET SALARY</span>
        <span style={styles.netSalaryAmount}>{formatCurrency(netSalary)}</span>
      </div>
    </div>
  );
}

/* ===== STYLES ===== */
const NAVY = '#1b1464';
const NAVY_DARK = '#111052';
const GOLD = '#c8a415';
const LIGHT_GRAY = '#f5f5f5';
const BORDER_GRAY = '#e0e0e0';

const styles: Record<string, CSSProperties> = {
  container: {
    width: '100%',
    maxWidth: 780,
    background: '#ffffff',
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    borderRadius: 0,
    overflow: 'hidden',
    margin: '0 auto',
  },

  /* HEADER */
  header: {
    background: NAVY,
    display: 'flex',
    alignItems: 'center',
    padding: '18px 24px',
    gap: 18,
  },
  logoArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 100,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${GOLD} 0%, #e8c930 40%, #a08510 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `3px solid ${GOLD}`,
    boxShadow: `0 0 12px rgba(200,164,21,0.4)`,
  },
  logoInner: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: NAVY_DARK,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `2px solid ${GOLD}`,
  },
  logoText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 1.5,
    fontFamily: "'Georgia', serif",
  },
  logoSubText: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 2,
  },
  cursiveText: {
    color: GOLD,
    fontSize: 11,
    fontStyle: 'italic',
    fontFamily: "'Georgia', serif",
  },
  smallCapText: {
    color: '#ffffff',
    fontSize: 7,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  tinyText: {
    color: '#cccccc',
    fontSize: 6,
    letterSpacing: 0.3,
  },
  headerRight: {
    flex: 1,
  },
  companyName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 700,
    margin: 0,
    letterSpacing: 0.8,
    lineHeight: 1.3,
    fontFamily: "'Georgia', 'Times New Roman', serif",
  },
  companySubName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    margin: '2px 0 12px 0',
    letterSpacing: 0.6,
    fontFamily: "'Georgia', 'Times New Roman', serif",
  },
  contactRow: {
    display: 'flex',
    gap: 20,
    flexWrap: 'wrap' as const,
  },
  contactItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
  },
  contactIcon: {
    fontSize: 13,
    marginTop: 1,
  },
  contactText: {
    color: '#d0d0d0',
    fontSize: 10.5,
    lineHeight: 1.5,
  },

  /* EMPLOYEE INFO */
  employeeSection: {
    padding: '16px 24px',
    borderBottom: `2px solid ${BORDER_GRAY}`,
  },
  employeeGrid: {
    display: 'flex',
    gap: 32,
    flexWrap: 'wrap' as const,
  },
  employeeLeft: {
    flex: 1,
    minWidth: 220,
  },
  employeeRight: {
    flex: 1,
    minWidth: 220,
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '5px 0',
    gap: 8,
  },
  infoLabel: {
    fontWeight: 600,
    fontSize: 13.5,
    color: '#222',
    minWidth: 130,
  },
  infoColon: {
    fontWeight: 600,
    color: '#222',
  },
  infoValue: {
    fontSize: 13.5,
    color: '#444',
  },

  /* TABLE */
  tableSection: {
    margin: '0',
  },
  tableHeader: {
    background: NAVY,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 24px',
  },
  tableHeaderLeft: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 2.5,
    textTransform: 'uppercase' as const,
  },
  tableHeaderRight: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  tableRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 24px',
    background: '#ffffff',
    borderBottom: `1px solid ${BORDER_GRAY}`,
  },
  tableRowAlt: {
    background: LIGHT_GRAY,
  },
  rowLabel: {
    fontSize: 13.5,
    color: '#333',
    fontWeight: 400,
  },
  rowAmount: {
    fontSize: 13.5,
    color: '#333',
    fontWeight: 500,
    minWidth: 140,
    textAlign: 'right' as const,
  },

  /* GROSS / TOTAL */
  grossRow: {
    background: NAVY,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 24px',
  },
  grossLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  grossAmount: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 700,
    minWidth: 140,
    textAlign: 'right' as const,
  },

  /* NET SALARY */
  netSalaryRow: {
    background: NAVY_DARK,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 24px',
    marginTop: 8,
    borderTop: `3px solid ${GOLD}`,
  },
  netSalaryLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 900,
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
  },
  netSalaryAmount: {
    color: GOLD,
    fontSize: 16,
    fontWeight: 800,
    minWidth: 140,
    textAlign: 'right' as const,
  },
};
