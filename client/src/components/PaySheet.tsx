import type { CSSProperties } from 'react';
import type { MonthlyPaysheet, User } from '../types';
import { formatCurrency, formatMonth } from '../utils/format';

interface PaySheetProps {
  paysheet: MonthlyPaysheet;
  employee?: User | null;
}

export default function PaySheet({ paysheet, employee }: PaySheetProps) {
  const earnings = {
    basicSalary: paysheet.basicSalary || 0,
    vehicleAllowance: paysheet.vehicleAllowance || 0,
    fuelAllowance: paysheet.fuelAllowance || 0,
    orc: paysheet.orc || 0,
    otherOffers: paysheet.otherOffer || 0,
    generalAllowance: paysheet.generalAllowance || 0,
    customEarning: paysheet.customEarningAmount || 0,
  };

  const customEarningLabel = paysheet.customEarningName || 'Custom Earning';
  const customDeductionLabel = paysheet.customDeductionName || 'Custom Deduction';

  const deductions = {
    epf8: paysheet.epfEmployee || 0,
    noPay: paysheet.nopayDeduction || 0,
    lateComes: paysheet.lateDeduction || 0,
    welfare: paysheet.welfare || 0,
    customDeduction: paysheet.customDeductionAmount || 0,
  };

  const grossSalary = paysheet.grossSalary || (
    earnings.basicSalary +
    earnings.vehicleAllowance +
    earnings.fuelAllowance +
    earnings.orc +
    earnings.otherOffers +
    earnings.generalAllowance +
    earnings.customEarning
  );

  const totalDeductions =
    deductions.epf8 +
    deductions.noPay +
    deductions.lateComes +
    deductions.welfare +
    deductions.customDeduction;

  const netSalary = paysheet.netSalary || (grossSalary - totalDeductions);

  const employeeName = employee
    ? `${employee.firstName} ${employee.lastName}`
    : paysheet.codeNo;

  const designation = employee?.designation || paysheet.role;
  const branch = employee?.branch || '';

  return (
    <div style={s.page}>
      {/* ── HEADER ── */}
      <div style={s.header}>
        <div style={s.logoWrap}>
          <div style={s.logoCircle}>
            <div style={s.logoInner}>
              <span style={s.logoText}>PGWCS</span>
            </div>
          </div>
        </div>
        <div style={s.headerRight}>
          <div style={s.companyName}>PRESTIGE GLAMOUR WORKING CAPITAL SOLUTIONS</div>
          <div style={s.companySub}>GROUP OF COMPANY (PRIVATE) LIMITED</div>
          <div style={s.contactRow}>
            <span style={s.contactText}>404/A, Galle Road, Maggona</span>
            <span style={s.contactText}>info@pgwcs.com</span>
            <span style={s.contactText}>+94 75 169 3138</span>
          </div>
        </div>
      </div>

      {/* ── EMPLOYEE INFO ── */}
      <div style={s.infoSection}>
        <div style={s.infoGrid}>
          <div style={s.infoCol}>
            <Row label="Employee ID" value={paysheet.codeNo} />
            <Row label="Name" value={employeeName} />
            <Row label="Designation" value={designation} />
            <Row label="Branch" value={branch} />
          </div>
          <div style={s.infoCol}>
            <Row label="Pay Month" value={formatMonth(paysheet.payMonth)} />
            {employee?.bankName && <Row label="Bank" value={employee.bankName} />}
            {employee?.bankAccount && <Row label="Account" value={employee.bankAccount} />}
            <Row
              label="Date"
              value={
                paysheet.createdAt
                  ? new Date(paysheet.createdAt).toLocaleDateString('en-LK')
                  : new Date().toLocaleDateString('en-LK')
              }
            />
          </div>
        </div>
      </div>

      {/* ── EARNINGS ── */}
      <SectionHeader left="EARNINGS" right="AMOUNT (Rs.)" />
      <DataRow label="Basic Salary" amount={earnings.basicSalary} />
      {earnings.vehicleAllowance > 0 && (
        <DataRow label="Vehicle Allowance" amount={earnings.vehicleAllowance} alt />
      )}
      {earnings.fuelAllowance > 0 && (
        <DataRow label="Fuel Allowance" amount={earnings.fuelAllowance} />
      )}
      {earnings.generalAllowance > 0 && (
        <DataRow label="General Allowance" amount={earnings.generalAllowance} alt />
      )}
      {earnings.orc > 0 && <DataRow label="ORC" amount={earnings.orc} />}
      {earnings.otherOffers > 0 && (
        <DataRow label="Other Offers" amount={earnings.otherOffers} alt />
      )}
      {earnings.customEarning > 0 && (
        <DataRow label={customEarningLabel} amount={earnings.customEarning} />
      )}

      {/* ── GROSS SALARY ── */}
      <TotalRow label="GROSS SALARY" amount={grossSalary} />

      {/* ── DEDUCTIONS ── */}
      <SectionHeader left="DEDUCTIONS" right="AMOUNT (Rs.)" />
      {deductions.epf8 > 0 && <DataRow label="EPF (8%)" amount={deductions.epf8} />}
      <DataRow label="No Pay" amount={deductions.noPay} alt />
      <DataRow label="Late Comes" amount={deductions.lateComes} />
      <DataRow label="Welfare" amount={deductions.welfare} alt />
      {deductions.customDeduction > 0 && (
        <DataRow label={customDeductionLabel} amount={deductions.customDeduction} />
      )}

      {/* ── TOTAL DEDUCTIONS ── */}
      <TotalRow label="TOTAL DEDUCTIONS" amount={totalDeductions} />

      {/* ── EPF / ETF (employer) ── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ flex: 1, ...s.dataRow, paddingLeft: 14 }}>
          <span style={s.rowLabel}>EPF 12% (Employer)</span>
          <span style={s.rowAmt}>{formatCurrency(paysheet.epfEmployer || 0)}</span>
        </div>
        <div style={{ flex: 1, ...s.dataRow, ...s.altBg, paddingLeft: 14 }}>
          <span style={s.rowLabel}>ETF 3% (Employer)</span>
          <span style={s.rowAmt}>{formatCurrency(paysheet.etf || 0)}</span>
        </div>
      </div>

      {/* ── NET SALARY ── */}
      <div style={s.netRow}>
        <span style={s.netLabel}>NET SALARY</span>
        <span style={s.netAmount}>{formatCurrency(netSalary)}</span>
      </div>

      {/* ── FOOTER ── */}
      <div style={s.footer}>
        This is a computer-generated document. No signature is required.
      </div>
    </div>
  );
}

/* ── Small sub-components ── */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={s.infoRow}>
      <span style={s.infoLabel}>{label}</span>
      <span style={s.infoColon}>:</span>
      <span style={s.infoValue}>{value}</span>
    </div>
  );
}

function SectionHeader({ left, right }: { left: string; right: string }) {
  return (
    <div style={s.sectionHeader}>
      <span style={s.sectionHeaderText}>{left}</span>
      <span style={s.sectionHeaderText}>{right}</span>
    </div>
  );
}

function DataRow({ label, amount, alt }: { label: string; amount: number; alt?: boolean }) {
  return (
    <div style={{ ...s.dataRow, ...(alt ? s.altBg : {}) }}>
      <span style={s.rowLabel}>{label}</span>
      <span style={s.rowAmt}>{formatCurrency(amount)}</span>
    </div>
  );
}

function TotalRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div style={s.totalRow}>
      <span style={s.totalLabel}>{label}</span>
      <span style={s.totalAmt}>{formatCurrency(amount)}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STYLES — designed for A5 (148 × 210 mm ≈ 420 × 595 px)
   ══════════════════════════════════════════════════════════════ */

const NAVY = '#1b1464';
const NAVY_DARK = '#111052';
const GOLD = '#c8a415';
const BORDER = '#ddd';
const ALT = '#f6f6f6';

const s: Record<string, CSSProperties> = {
  /* ── Page container ── */
  page: {
    width: 420,
    minHeight: 595,
    background: '#fff',
    margin: '0 auto',
    overflow: 'hidden',
    fontFamily: "'Segoe UI', Arial, sans-serif",
    fontSize: 9,
    color: '#333',
    boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
  } as CSSProperties,

  /* ── Header ── */
  header: {
    background: NAVY,
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    gap: 10,
  },
  logoWrap: {
    flexShrink: 0,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${GOLD} 0%, #e8c930 40%, #a08510 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `2px solid ${GOLD}`,
  },
  logoInner: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: NAVY_DARK,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${GOLD}`,
  },
  logoText: {
    color: GOLD,
    fontSize: 7,
    fontWeight: 800,
    letterSpacing: 1,
    fontFamily: 'Georgia, serif',
  },
  headerRight: {
    flex: 1,
  },
  companyName: {
    color: '#fff',
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 0.5,
    lineHeight: 1.2,
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  companySub: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 600,
    margin: '1px 0 4px 0',
    letterSpacing: 0.4,
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  contactRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap' as const,
  },
  contactText: {
    color: '#ccc',
    fontSize: 7,
    lineHeight: 1.3,
  },

  /* ── Employee info ── */
  infoSection: {
    padding: '6px 12px',
    borderBottom: `1.5px solid ${BORDER}`,
  },
  infoGrid: {
    display: 'flex',
    gap: 8,
  },
  infoCol: {
    flex: 1,
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '2px 0',
    gap: 4,
  },
  infoLabel: {
    fontWeight: 600,
    fontSize: 8,
    color: '#222',
    minWidth: 62,
  },
  infoColon: {
    fontWeight: 600,
    color: '#222',
    fontSize: 8,
  },
  infoValue: {
    fontSize: 8,
    color: '#444',
  },

  /* ── Section header (Earnings / Deductions) ── */
  sectionHeader: {
    background: NAVY,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 12px',
  },
  sectionHeaderText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },

  /* ── Data rows ── */
  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '3px 12px',
    borderBottom: `0.5px solid ${BORDER}`,
  },
  altBg: {
    background: ALT,
  },
  rowLabel: {
    fontSize: 8.5,
    color: '#333',
  },
  rowAmt: {
    fontSize: 8.5,
    color: '#333',
    fontWeight: 500,
    minWidth: 80,
    textAlign: 'right' as const,
  },

  /* ── Total rows (Gross / Total Deductions) ── */
  totalRow: {
    background: NAVY,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 12px',
  },
  totalLabel: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  totalAmt: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 700,
    minWidth: 80,
    textAlign: 'right' as const,
  },

  /* ── Net salary ── */
  netRow: {
    background: NAVY_DARK,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 12px',
    borderTop: `2px solid ${GOLD}`,
  },
  netLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  netAmount: {
    color: GOLD,
    fontSize: 10,
    fontWeight: 800,
    minWidth: 80,
    textAlign: 'right' as const,
  },

  /* ── Footer ── */
  footer: {
    textAlign: 'center' as const,
    padding: '5px 12px',
    fontSize: 6.5,
    color: '#999',
    borderTop: `0.5px solid ${BORDER}`,
  },
};
