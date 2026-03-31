/**
 * Comprehensive Test Suite for the Prestige Salary System Calculator
 * Testing all role types (Category A & B), scenarios, and edge cases
 */

import {
  calculatePaysheet,
  getRoleConfig,
  isSalesRole,
} from '../salary-calculator';

// ═════════════════════════════════════════════════════════════════
// FORMATTING & TEST UTILITIES
// ═════════════════════════════════════════════════════════════════

function fmt(n: number) {
  return 'LKR ' + n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function check(label: string, got: number, expect: number) {
  const ok = Math.abs(got - expect) < 0.01;
  console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(28)} got ${fmt(got)}  |  expect ${fmt(expect)}`);
  return ok;
}

function checkBool(label: string, condition: boolean) {
  console.log(`  ${condition ? '✓' : '✗'} ${label.padEnd(28)}`);
  return condition;
}

let totalTests = 0;
let passedTests = 0;

function startTest(title: string) {
  totalTests++;
  console.log(`\n[Test ${totalTests}] ${title}`);
}

function endTest(passed: boolean) {
  if (passed) {
    passedTests++;
    console.log('✓ PASSED');
  } else {
    console.log('✗ FAILED');
  }
}

console.log('╔' + '═'.repeat(68) + '╗');
console.log('║' + ' Comprehensive Salary Calculator Test Suite'.padStart(50).padEnd(68) + '║');
console.log('║' + ' Testing all role types, scenarios & edge cases'.padStart(50).padEnd(68) + '║');
console.log('╚' + '═'.repeat(68) + '╝');

// ═════════════════════════════════════════════════════════════════
// CATEGORY A TESTS (SALES/TARGET-BASED ROLES)
// ═════════════════════════════════════════════════════════════════

console.log('\n' + '─'.repeat(70));
console.log('CATEGORY A: SALES/TARGET-BASED ROLES');
console.log('─'.repeat(70));

// Test A1: GM
startTest('A1: GM - 2 months, 75M achievement, 10K otherOffer');
const gmConfig = getRoleConfig('GM');
if (gmConfig && isSalesRole('GM')) {
  const result = calculatePaysheet({
    role: gmConfig,
    monthsOfService: 2,
    achievementAmount: 75_000_000,
    generalAllowance: 0,
    otherOffer: 10_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('assignedTarget', result.assignedTarget ?? 0, 175_000_000) && testPass;
  testPass = check('achievementPct', (result.achievementPct ?? 0) * 100, 42) && testPass;
  testPass = check('otherOffer', result.otherOffer ?? 0, 10_000) && testPass;
  testPass = checkBool('grossSalary includes otherOffer', result.grossSalary >= 10_000) && testPass;
  endTest(testPass);
}

// Test A2: AGM
startTest('A2: AGM - 6 months, 251.5M (100% achievement)');
const agmConfig = getRoleConfig('AGM');
if (agmConfig && isSalesRole('AGM')) {
  const result = calculatePaysheet({
    role: agmConfig,
    monthsOfService: 6,
    achievementAmount: 251_500_000,
    generalAllowance: 0,
    otherOffer: 0,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('assignedTarget', result.assignedTarget ?? 0, 250_000_000) && testPass;
  testPass = check('vehicleAllowance', result.vehicleAllowance ?? 0, 120_000) && testPass;
  testPass = check('fuelAllowance', result.fuelAllowance ?? 0, 100_000) && testPass;
  endTest(testPass);
}

// Test A3: PH
startTest('A3: PH - 3 months, 35M achievement, 5K otherOffer, deductions');
const phConfig = getRoleConfig('PH');
if (phConfig && isSalesRole('PH')) {
  const result = calculatePaysheet({
    role: phConfig,
    monthsOfService: 3,
    achievementAmount: 35_000_000,
    generalAllowance: 5_000,
    otherOffer: 5_000,
    nopayDays: 1,
    lateHours: 2,
    lateMinutes: 30,
    others: 1_000,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('otherOffer', result.otherOffer ?? 0, 5_000) && testPass;
  testPass = checkBool('has deductions', result.nopayDeduction > 0) && testPass;
  endTest(testPass);
}

// Test A4: DPH
startTest('A4: DPH - 1 month, 10M achievement, 3K otherOffer');
const dphConfig = getRoleConfig('DPH');
if (dphConfig && isSalesRole('DPH')) {
  const result = calculatePaysheet({
    role: dphConfig,
    monthsOfService: 1,
    achievementAmount: 10_000_000,
    generalAllowance: 0,
    otherOffer: 3_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('otherOffer', result.otherOffer ?? 0, 3_000) && testPass;
  endTest(testPass);
}

// Test A5: SRM
startTest('A5: SRM - 2 months, 12M achievement, 15K otherOffer');
const srmConfig = getRoleConfig('SRM');
if (srmConfig && isSalesRole('SRM')) {
  const result = calculatePaysheet({
    role: srmConfig,
    monthsOfService: 2,
    achievementAmount: 12_000_000,
    generalAllowance: 2_000,
    otherOffer: 15_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 500,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('otherOffer', result.otherOffer ?? 0, 15_000) && testPass;
  endTest(testPass);
}

// Test A6: RM
startTest('A6: RM - 3 months, 15M achievement, custom earnings');
const rmConfig = getRoleConfig('RM');
if (rmConfig && isSalesRole('RM')) {
  const result = calculatePaysheet({
    role: rmConfig,
    monthsOfService: 3,
    achievementAmount: 15_000_000,
    generalAllowance: 3_000,
    otherOffer: 5_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    customEarningAmount: 2_000,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('otherOffer', result.otherOffer ?? 0, 5_000) && testPass;
  testPass = check('customEarningAmount', result.customEarningAmount ?? 0, 2_000) && testPass;
  endTest(testPass);
}

// Test A7: BM
startTest('A7: BM - 4 months, 2.2M achievement, comprehensive test');
const bmConfig = getRoleConfig('BM');
if (bmConfig && isSalesRole('BM')) {
  const result = calculatePaysheet({
    role: bmConfig,
    monthsOfService: 4,
    achievementAmount: 2_200_000,
    generalAllowance: 10_000,
    otherOffer: 5_000,
    nopayDays: 2,
    lateHours: 1,
    lateMinutes: 45,
    others: 2_000,
    customEarningAmount: 1_000,
    customDeductionAmount: 500,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('assignedTarget', result.assignedTarget ?? 0, 2_275_000) && testPass;
  testPass = check('otherOffer', result.otherOffer ?? 0, 5_000) && testPass;
  testPass = check('vehicleAllowance', result.vehicleAllowance ?? 0, 30_000) && testPass;
  testPass = check('nopayDeduction', result.nopayDeduction, 3_000) && testPass;
  endTest(testPass);
}

// Test A8: BDE
startTest('A8: BDE - 1 month, 2M achievement, 2K otherOffer');
const bdeConfig = getRoleConfig('BDE');
if (bdeConfig && isSalesRole('BDE')) {
  const result = calculatePaysheet({
    role: bdeConfig,
    monthsOfService: 1,
    achievementAmount: 2_000_000,
    generalAllowance: 1_000,
    otherOffer: 2_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('otherOffer', result.otherOffer ?? 0, 2_000) && testPass;
  endTest(testPass);
}

// ═════════════════════════════════════════════════════════════════
// CATEGORY B TESTS (NON-TARGET ROLES)
// ═════════════════════════════════════════════════════════════════

console.log('\n' + '─'.repeat(70));
console.log('CATEGORY B: NON-TARGET ROLES');
console.log('─'.repeat(70));

// Test B1: CCI
startTest('B1: CCI - 1 month, 10K otherOffer, no deductions');
const cciConfig = getRoleConfig('CCI');
if (cciConfig && !isSalesRole('CCI')) {
  const result = calculatePaysheet({
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
  testPass = check('otherOffer', result.otherOffer ?? 0, 10_000) && testPass;
  testPass = check('nopayDeduction', result.nopayDeduction, 0) && testPass;
  endTest(testPass);
}

// Test B2: HR_FIN_HEAD
startTest('B2: HR_FIN_HEAD - 2 months, 5K otherOffer, with deductions');
const hrFinHeadConfig = getRoleConfig('HR_FIN_HEAD');
if (hrFinHeadConfig && !isSalesRole('HR_FIN_HEAD')) {
  const result = calculatePaysheet({
    role: hrFinHeadConfig,
    monthsOfService: 2,
    otherOffer: 5_000,
    nopayDays: 1,
    lateHours: 1,
    lateMinutes: 0,
    others: 1_000,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('otherOffer', result.otherOffer ?? 0, 5_000) && testPass;
  testPass = checkBool('has deductions', result.nopayDeduction > 0) && testPass;
  endTest(testPass);
}

// Test B3: MANAGER_ADMIN
startTest('B3: MANAGER_ADMIN - 1 month, otherOffer=0, with deductions');
const adminConfig = getRoleConfig('MANAGER_ADMIN');
if (adminConfig && !isSalesRole('MANAGER_ADMIN')) {
  const result = calculatePaysheet({
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
  testPass = check('otherOffer', result.otherOffer ?? 0, 0) && testPass;
  testPass = check('grossSalary', result.grossSalary, 75_000) && testPass;
  testPass = check('netSalary', result.netSalary, 60_750) && testPass;
  endTest(testPass);
}

// Test B4: SR_EXEC_HR
startTest('B4: SR_EXEC_HR - 1 month, 10K otherOffer, with deductions');
const srExecHrConfig = getRoleConfig('SR_EXEC_HR');
if (srExecHrConfig && !isSalesRole('SR_EXEC_HR')) {
  const result = calculatePaysheet({
    role: srExecHrConfig,
    monthsOfService: 1,
    otherOffer: 10_000,
    nopayDays: 2,
    lateHours: 10,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('grossSalary', result.grossSalary, 52_500) && testPass;
  testPass = check('netSalary', result.netSalary, 44_425) && testPass;
  endTest(testPass);
}

// Test B5: SR_EXEC_FINANCE
startTest('B5: SR_EXEC_FINANCE - 3 months, 8K otherOffer');
const srExecFinConfig = getRoleConfig('SR_EXEC_FINANCE');
if (srExecFinConfig && !isSalesRole('SR_EXEC_FINANCE')) {
  const result = calculatePaysheet({
    role: srExecFinConfig,
    monthsOfService: 3,
    otherOffer: 8_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('otherOffer', result.otherOffer ?? 0, 8_000) && testPass;
  endTest(testPass);
}

// Test B6: ASST_HR_EXEC
startTest('B6: ASST_HR_EXEC - 2 months, 3K otherOffer');
const asshHrExecConfig = getRoleConfig('ASST_HR_EXEC');
if (asshHrExecConfig && !isSalesRole('ASST_HR_EXEC')) {
  const result = calculatePaysheet({
    role: asshHrExecConfig,
    monthsOfService: 2,
    otherOffer: 3_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('otherOffer', result.otherOffer ?? 0, 3_000) && testPass;
  endTest(testPass);
}

// Test B7: ASST_FIN_EXEC
startTest('B7: ASST_FIN_EXEC - 1 month, 4K otherOffer');
const asshFinExecConfig = getRoleConfig('ASST_FIN_EXEC');
if (asshFinExecConfig && !isSalesRole('ASST_FIN_EXEC')) {
  const result = calculatePaysheet({
    role: asshFinExecConfig,
    monthsOfService: 1,
    otherOffer: 4_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('otherOffer', result.otherOffer ?? 0, 4_000) && testPass;
  endTest(testPass);
}

// Test B8: MICRO_FIN_MANAGER
startTest('B8: MICRO_FIN_MANAGER - 6 months, 25K otherOffer');
const microFinMgrConfig = getRoleConfig('MICRO_FIN_MANAGER');
if (microFinMgrConfig && !isSalesRole('MICRO_FIN_MANAGER')) {
  const result = calculatePaysheet({
    role: microFinMgrConfig,
    monthsOfService: 6,
    otherOffer: 25_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('otherOffer', result.otherOffer ?? 0, 25_000) && testPass;
  endTest(testPass);
}

// Test B9: MICRO_FIN_EXEC
startTest('B9: MICRO_FIN_EXEC - 1 month, 50K otherOffer, NO EPF');
const microFinExecConfig = getRoleConfig('MICRO_FIN_EXEC');
if (microFinExecConfig && !isSalesRole('MICRO_FIN_EXEC')) {
  const result = calculatePaysheet({
    role: microFinExecConfig,
    monthsOfService: 1,
    otherOffer: 50_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: false,
  });
  let testPass = true;
  testPass = check('otherOffer', result.otherOffer ?? 0, 50_000) && testPass;
  testPass = check('epfEmployee', result.epfEmployee, 0) && testPass;
  endTest(testPass);
}

// ═════════════════════════════════════════════════════════════════
// EDGE CASES & SPECIAL SCENARIOS
// ═════════════════════════════════════════════════════════════════

console.log('\n' + '─'.repeat(70));
console.log('EDGE CASES & SPECIAL SCENARIOS');
console.log('─'.repeat(70));

// Test E1: High otherOffer with all deductions
startTest('E1: BM - High otherOffer (20K) with multiple deductions');
const bmConfigE1 = getRoleConfig('BM');
if (bmConfigE1 && isSalesRole('BM')) {
  const result = calculatePaysheet({
    role: bmConfigE1,
    monthsOfService: 2,
    achievementAmount: 1_000_000,
    generalAllowance: 0,
    otherOffer: 20_000,
    nopayDays: 3,
    lateHours: 8,
    lateMinutes: 15,
    others: 5_000,
    customDeductionAmount: 2_000,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('otherOffer', result.otherOffer ?? 0, 20_000) && testPass;
  testPass = checkBool('has all deductions', (result.nopayDeduction > 0 && result.lateDeduction > 0)) && testPass;
  endTest(testPass);
}

// Test E2: Custom earning + deduction + otherOffer
startTest('E2: RM - Custom earning + deduction + otherOffer');
const rmConfigE2 = getRoleConfig('RM');
if (rmConfigE2 && isSalesRole('RM')) {
  const result = calculatePaysheet({
    role: rmConfigE2,
    monthsOfService: 1,
    achievementAmount: 5_000_000,
    generalAllowance: 2_000,
    otherOffer: 8_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    customEarningAmount: 5_000,
    customDeductionAmount: 1_500,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('otherOffer', result.otherOffer ?? 0, 8_000) && testPass;
  testPass = check('customEarningAmount', result.customEarningAmount ?? 0, 5_000) && testPass;
  endTest(testPass);
}

// Test E3: Only otherOffer, no deductions
startTest('E3: BDE - Only otherOffer, no deductions');
const bdeConfigE3 = getRoleConfig('BDE');
if (bdeConfigE3 && isSalesRole('BDE')) {
  const result = calculatePaysheet({
    role: bdeConfigE3,
    monthsOfService: 3,
    achievementAmount: 500_000,
    generalAllowance: 0,
    otherOffer: 15_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('otherOffer', result.otherOffer ?? 0, 15_000) && testPass;
  testPass = check('nopayDeduction', result.nopayDeduction, 0) && testPass;
  testPass = check('lateDeduction', result.lateDeduction, 0) && testPass;
  endTest(testPass);
}

// Test E4: Heavy deductions with Category B
startTest('E4: MANAGER_ADMIN - Zero otherOffer with heavy deductions');
const adminConfigE4 = getRoleConfig('MANAGER_ADMIN');
if (adminConfigE4 && !isSalesRole('MANAGER_ADMIN')) {
  const result = calculatePaysheet({
    role: adminConfigE4,
    monthsOfService: 1,
    otherOffer: 0,
    nopayDays: 5,
    lateHours: 15,
    lateMinutes: 30,
    others: 3_000,
    customDeductionAmount: 2_000,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('otherOffer', result.otherOffer ?? 0, 0) && testPass;
  testPass = checkBool('netSalary still positive', result.netSalary > 0) && testPass;
  endTest(testPass);
}

// Test E5: Very high otherOffer for Category B
startTest('E5: HR_FIN_HEAD - Very high otherOffer (30K)');
const hrFinHeadE5 = getRoleConfig('HR_FIN_HEAD');
if (hrFinHeadE5 && !isSalesRole('HR_FIN_HEAD')) {
  const result = calculatePaysheet({
    role: hrFinHeadE5,
    monthsOfService: 2,
    otherOffer: 30_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('otherOffer', result.otherOffer ?? 0, 30_000) && testPass;
  endTest(testPass);
}

// Test E6: Maximum service months with otherOffer
startTest('E6: AGM - 12 months service with otherOffer');
const agmConfigE6 = getRoleConfig('AGM');
if (agmConfigE6 && isSalesRole('AGM')) {
  const result = calculatePaysheet({
    role: agmConfigE6,
    monthsOfService: 12,
    achievementAmount: 100_000_000,
    generalAllowance: 5_000,
    otherOffer: 12_000,
    nopayDays: 0,
    lateHours: 0,
    lateMinutes: 0,
    others: 0,
    epfAvailability: true,
  });
  let testPass = true;
  testPass = check('otherOffer', result.otherOffer ?? 0, 12_000) && testPass;
  testPass = checkBool('grossSalary > 0', result.grossSalary > 0) && testPass;
  endTest(testPass);
}

// ═════════════════════════════════════════════════════════════════
// SUMMARY
// ═════════════════════════════════════════════════════════════════

console.log('\n' + '╔' + '═'.repeat(68) + '╗');
console.log(`║ Test Results: ${passedTests}/${totalTests} tests passed`.padEnd(68) + '║');
console.log('╚' + '═'.repeat(68) + '╝');

if (passedTests === totalTests) {
  console.log('\n✓ ALL TESTS PASSED!\n');
} else {
  console.log(`\n✗ ${totalTests - passedTests} test(s) failed\n`);
}

