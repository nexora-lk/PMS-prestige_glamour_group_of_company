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
