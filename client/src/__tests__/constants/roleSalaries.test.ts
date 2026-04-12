/**
 * Constants: roleSalaries.ts
 * ROLE_SALARIES, ROLES, ROLE_NAME_TO_CODE
 */

import { describe, it, expect } from 'vitest';
import { ROLE_SALARIES, ROLES, ROLE_NAME_TO_CODE } from '../../constants/roleSalaries';

describe('ROLE_SALARIES', () => {
  it('is a non-empty object', () => {
    expect(typeof ROLE_SALARIES).toBe('object');
    expect(Object.keys(ROLE_SALARIES).length).toBeGreaterThan(0);
  });

  it('all salary values are positive numbers', () => {
    for (const [, salary] of Object.entries(ROLE_SALARIES)) {
      expect(typeof salary).toBe('number');
      expect(salary).toBeGreaterThan(0);
    }
  });

  it('contains Category A (sales) roles', () => {
    expect(ROLE_SALARIES).toHaveProperty('General Manager');
    expect(ROLE_SALARIES).toHaveProperty('Branch Manager');
    expect(ROLE_SALARIES).toHaveProperty('Regional Manager');
  });

  it('contains Category B (non-target) roles', () => {
    expect(ROLE_SALARIES).toHaveProperty('Manager Admin');
    expect(ROLE_SALARIES).toHaveProperty('HR & Finance Head');
  });

  it('General Manager has highest salary', () => {
    const maxSalary = Math.max(...Object.values(ROLE_SALARIES));
    expect(ROLE_SALARIES['General Manager']).toBe(maxSalary);
  });
});

describe('ROLES', () => {
  it('is a sorted array of role names', () => {
    expect(Array.isArray(ROLES)).toBe(true);
    expect(ROLES.length).toBe(Object.keys(ROLE_SALARIES).length);
  });

  it('is sorted alphabetically', () => {
    const sorted = [...ROLES].sort();
    expect(ROLES).toEqual(sorted);
  });

  it('contains all keys from ROLE_SALARIES', () => {
    for (const role of Object.keys(ROLE_SALARIES)) {
      expect(ROLES).toContain(role);
    }
  });
});

describe('ROLE_NAME_TO_CODE', () => {
  it('is a non-empty object', () => {
    expect(typeof ROLE_NAME_TO_CODE).toBe('object');
    expect(Object.keys(ROLE_NAME_TO_CODE).length).toBeGreaterThan(0);
  });

  it('maps General Manager → GM', () => {
    expect(ROLE_NAME_TO_CODE['General Manager']).toBe('GM');
  });

  it('maps Branch Manager → BM', () => {
    expect(ROLE_NAME_TO_CODE['Branch Manager']).toBe('BM');
  });

  it('maps Regional Manager → RM', () => {
    expect(ROLE_NAME_TO_CODE['Regional Manager']).toBe('RM');
  });

  it('maps Manager Admin → MANAGER_ADMIN', () => {
    expect(ROLE_NAME_TO_CODE['Manager Admin']).toBe('MANAGER_ADMIN');
  });

  it('all codes are non-empty strings', () => {
    for (const code of Object.values(ROLE_NAME_TO_CODE)) {
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    }
  });
});
