import { describe, expect, it } from 'vitest';
import { calculateCommission, companyResult, validateSplit } from '../lib/calculations';

describe('Friends Included finance rules', () => {
  it('validates complete and invalid splits', () => {
    expect(validateSplit({ Richard: 50, Anastasia: 30, 'Jean-Claude': 20 })).toBe(true);
    expect(validateSplit({ Richard: 60, Anastasia: 30, 'Jean-Claude': 20 })).toBe(false);
  });
  it('balances commission cents using the largest-share rule', () => {
    const c = calculateCommission(1000, { Richard: 50, Anastasia: 30, 'Jean-Claude': 20 });
    expect(c.pool).toBe(100);
    expect(c.amounts).toEqual({ Richard: 50, Anastasia: 30, 'Jean-Claude': 20 });
  });
  it('reconciles Test 1 without hardcoded dashboard totals', () => {
    expect(companyResult(3000, 300, 300)).toBe(2400);
  });
  it('reconciles Test 2 without hardcoded dashboard totals', () => {
    expect(companyResult(5300, 530, 840)).toBe(3930);
  });
});
