// Role-wise Basic Salary mappings based on salary calculator
export const ROLE_SALARIES: Record<string, number> = {
  // Sales/Target-Based Roles (Category A)
  'General Manager': 275_000,
  'Assistant General Manager': 250_000,
  'Provincial Head': 200_000,
  'Deputy Provincial Head': 150_000,
  'Senior Regional Manager': 85_000,
  'Regional Manager': 80_000,
  'Branch Manager': 50_000,
  'Business Development Executive': 30_000,

  // Non-Target Roles (Category B)
  'CCI (Collections/Call Center)': 35_000,
  'HR & Finance Head': 200_000,
  'Manager Admin': 75_000,
  'Senior Executive – HR': 42_500,
  'Senior Executive – Finance': 42_500,
  'Assistant HR Executive': 35_000,
  'Assistant Finance Executive': 35_000,
  'Micro Finance Manager': 80_000,
  'Micro Finance Executive': 30_000,
};

export const ROLES = Object.keys(ROLE_SALARIES).sort();

// Maps full role names (stored on User records) to backend role codes
export const ROLE_NAME_TO_CODE: Record<string, string> = {
  'General Manager': 'GM',
  'Assistant General Manager': 'AGM',
  'Provincial Head': 'PH',
  'Deputy Provincial Head': 'DPH',
  'Senior Regional Manager': 'SRM',
  'Regional Manager': 'RM',
  'Branch Manager': 'BM',
  'Business Development Executive': 'BDE',
  'CCI (Collections/Call Center)': 'CCI',
  'HR & Finance Head': 'HR_FIN_HEAD',
  'Manager Admin': 'MANAGER_ADMIN',
  'Senior Executive \u2013 HR': 'SR_EXEC_HR',
  'Senior Executive \u2013 Finance': 'SR_EXEC_FINANCE',
  'Assistant HR Executive': 'ASST_HR_EXEC',
  'Assistant Finance Executive': 'ASST_FIN_EXEC',
  'Micro Finance Manager': 'MICRO_FIN_MANAGER',
  'Micro Finance Executive': 'MICRO_FIN_EXEC',
};

// Reverse mapping: code → full name
export const ROLE_CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(ROLE_NAME_TO_CODE).map(([name, code]) => [code, name])
);
