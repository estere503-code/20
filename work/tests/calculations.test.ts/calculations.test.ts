import { describe, expect, it } from 'vitest';
import { calculateCommission, companyResult, validateSplit } from '../../lib/calculations';
describe('finance calculations', () => {
  it('rejects splits that do not total 100%', () => {
    expect(validateSplit({ Richard: 60, Anastasia: 30, 'Jean-Claude': 20 })).toBe(false);
  });
  it('allocates the commission pool in cents', () => {
    const c = calculateCommission(1000, { Richard: 50, Anastasia: 30, 'Jean-Claude': 20 });
    expect(c.pool).toBe(100);
    expect(c.amounts).toEqual({ Richard: 50, Anastasia: 30, 'Jean-Claude': 20 });
  });
  it('reconciles Test 1 company result to 2400', () => {
    expect(companyResult([
      { amount: 1000, status: 'approved', commission: 100 },
      { amount: 2000, status: 'approved', commission: 200 },
    ], 200)).toBe(2400);
  });
  it('reconciles cumulative Test 2 company result to 3930', () => {
    expect(companyResult([
      { amount: 1000, status: 'approved', commission: 100 },
      { amount: 2000, status: 'approved', commission: 200 },
      { amount: 1500, status: 'approved', commission: 150 },
      { amount: 800, status: 'approved', commission: 80 },
    ], 840)).toBe(3930);
  });
});
