/**
 * Test suite for the Prestige Salary System Calculator
 */

import {
  WORKING_DAYS_PER_MONTH,
  TOTAL_MINUTES_PER_MONTH,
  EPF_EMPLOYEE_RATE,
  EPF_EMPLOYER_RATE,
  ETF_RATE,
  SALES_CONFIG,
  NON_TARGET_CONFIG,
  calculatePaysheet,
  getRoleConfig,
  isSalesRole,
  calculateAssignedTarget,
  calculateAchievementPct,
  calculateGrossSalary,
  calculateVehicleAllowance,
  calculateFuelAllowance,
  calculateORC,
  calculateNoPayDeduction,
  calculateLateDeduction,
  calculateEPF,
  calculateETF,
} from '../salary-calculator';

// Formatting utilities
function fmt(n: number) {
  return 'LKR ' + n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function check(label: string, got: number, expect: number) {
  const ok = Math.abs(got - expect) < 0.01;
  console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(20)} got ${fmt(got)}  |  expect ${fmt(expect)}`);
  return ok;
}

console.log('='.repeat(70));
console.log(' Prestige Salary System — Verification Test Suite');
console.log('='.repeat(70));

// Test 1 — GM, 2 months, 75M achievement, 2 no-pay, 5h45m late
console.log('\nTest 1 — GM, 2 months, 75M achievement, 2 no-pay, 5h45m late');
const gmConfig = getRoleConfig('GM');
if (gmConfig && isSalesRole('GM')) {
  const result1 = calculatePaysheet({
    role: gmConfig,
    monthsOfService: 2,
    achievementAmount: 75_000_000,
    generalAllowance: 0,
    nopayDays: 2,
    lateHours: 5,
    lateMinutes: 45,
    others: 0,
    epfAvailability: true,
  });

  let testPass = true;
  testPass = check('assignedTarget', result1.assignedTarget ?? 0, 175_000_000) && testPass;
  testPass = check('achievementPct', (result1.achievementPct ?? 0) * 100, 42) && testPass;
  testPass = check('grossSalary', result1.grossSalary, 231_000) && testPass;
  testPass = check('vehicleAllowance', result1.vehicleAllowance ?? 0, 0) && testPass;
  testPass = check('fuelAllowance', result1.fuelAllowance ?? 0, 0) && testPass;
  testPass = check('orc', result1.orc ?? 0, 0) && testPass;
  testPass = check('nopayDeduction', result1.nopayDeduction, 16_500) && testPass;
  testPass = check('lateDeduction', result1.lateDeduction, 7_906.25) && testPass;
  testPass = check('epfEmployee', result1.epfEmployee, 22_000) && testPass;
  testPass = check('netSalary', result1.netSalary, 184_593.75) && testPass;
  console.log(testPass ? '✓ Test 1 PASSED' : '✗ Test 1 FAILED');
}

// Test 2 — AGM, 6 months, 251.5M (1.006 floored → 1.00, no ORC)
console.log('\nTest 2 — AGM, 6 months, 251.5M (1.006 floored → 1.00, no ORC)');
const agmConfig = getRoleConfig('AGM');
if (agmConfig && isSalesRole('AGM')) {
  const result2 = calculatePaysheet({
    role: agmConfig,
    monthsOfService: 6,
    achievementAmount: 251_500_000,
    generalAllowance: 0,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  let testPass = true;
  testPass = check('assignedTarget', result2.assignedTarget ?? 0, 250_000_000) && testPass;
  testPass = check('vehicleAllowance', result2.vehicleAllowance ?? 0, 120_000) && testPass;
  testPass = check('fuelAllowance', result2.fuelAllowance ?? 0, 100_000) && testPass;
  testPass = check('orc', result2.orc ?? 0, 0) && testPass;
  testPass = check('netSalary', result2.netSalary, 450_000) && testPass;
  console.log(testPass ? '✓ Test 2 PASSED' : '✗ Test 2 FAILED');
}

// Test 3 — Senior Executive HR (Cat B), 2 no-pay, 10h late
console.log('\nTest 3 — Senior Executive HR (Cat B), 2 no-pay, 10h late');
const hrConfig = getRoleConfig('SR_EXEC_HR');
if (hrConfig && !isSalesRole('SR_EXEC_HR')) {
  const result3 = calculatePaysheet({
    role: hrConfig,
    monthsOfService: 1,
    otherOffer: 10_000,
    nopayDays: 2,
    lateHours: 10,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  let testPass = true;
  testPass = check('grossSalary', result3.grossSalary, 52_500) && testPass;
  testPass = check('nopayDeduction', result3.nopayDeduction, 2_550) && testPass;
  testPass = check('lateDeduction', result3.lateDeduction, 2_125) && testPass;
  testPass = check('epfEmployee', result3.epfEmployee, 3_400) && testPass;
  testPass = check('netSalary', result3.netSalary, 44_425) && testPass;
  console.log(testPass ? '✓ Test 3 PASSED' : '✗ Test 3 FAILED');
}

// Test 4 — CCI (Cat B), no deductions
console.log('\nTest 4 — CCI (Cat B), no deductions');
const cciConfig = getRoleConfig('CCI');
if (cciConfig && !isSalesRole('CCI')) {
  const result4 = calculatePaysheet({
    role: cciConfig,
    monthsOfService: 1,
    otherOffer: 10_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  let testPass = true;
  testPass = check('grossSalary', result4.grossSalary, 45_000) && testPass;
  testPass = check('netSalary', result4.netSalary, 42_200) && testPass;
  console.log(testPass ? '✓ Test 4 PASSED' : '✗ Test 4 FAILED');
}

// Test 5 — Manager Admin (Cat B), otherOffer=0
console.log('\nTest 5 — Manager Admin (Cat B), otherOffer=0');
const adminConfig = getRoleConfig('MANAGER_ADMIN');
if (adminConfig && !isSalesRole('MANAGER_ADMIN')) {
  const result5 = calculatePaysheet({
    role: adminConfig,
    monthsOfService: 1,
    otherOffer: 0,
    nopayDays: 2,
    lateHours: 10,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  let testPass = true;
  testPass = check('grossSalary', result5.grossSalary, 75_000) && testPass;
  testPass = check('netSalary', result5.netSalary, 60_750) && testPass;
  console.log(testPass ? '✓ Test 5 PASSED' : '✗ Test 5 FAILED');
}

// Test 6 — BM, 5 months, exactly 100%
console.log('\nTest 6 — BM, 5 months, exactly 100%');
const bmConfig = getRoleConfig('BM');
if (bmConfig && isSalesRole('BM')) {
  const result6 = calculatePaysheet({
    role: bmConfig,
    monthsOfService: 5,
    achievementAmount: 2_625_000,
    generalAllowance: 0,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });

  let testPass = true;
  testPass = check('assignedTarget', result6.assignedTarget ?? 0, 2_625_000) && testPass;
  testPass = check('vehicleAllowance', result6.vehicleAllowance ?? 0, 30_000) && testPass;
  testPass = check('orc', result6.orc ?? 0, 0) && testPass;
  testPass = check('netSalary', result6.netSalary, 96_000) && testPass;
  console.log(testPass ? '✓ Test 6 PASSED' : '✗ Test 6 FAILED');
}

// Test 7 — Micro Finance Executive (Cat B), EPF not enrolled
console.log('\nTest 7 — Micro Finance Executive (Cat B), EPF not enrolled');
const microExecConfig = getRoleConfig('MICRO_FIN_EXEC');
if (microExecConfig && !isSalesRole('MICRO_FIN_EXEC')) {
  const result7 = calculatePaysheet({
    role: microExecConfig,
    monthsOfService: 1,
    otherOffer: 50_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: false,
  });

  let testPass = true;
  testPass = check('grossSalary', result7.grossSalary, 80_000) && testPass;
  testPass = check('epfEmployee', result7.epfEmployee, 0) && testPass;
  testPass = check('netSalary', result7.netSalary, 80_000) && testPass;
  console.log(testPass ? '✓ Test 7 PASSED' : '✗ Test 7 FAILED');
}

console.log('\n' + '='.repeat(70));
console.log('Test suite completed!');
console.log('='.repeat(70));

