import { describe, it, expect } from 'vitest';
import {
  DEFAULT_COMMISSION,
  calculateCommissionTotal,
  calculateSellerNet,
  type CommissionConfig,
} from '@/lib/domain/pricing';

describe('calculateCommissionTotal', () => {
  it('fixed: amount * quantity', () => {
    const cfg: CommissionConfig = { type: 'fixed', amount: 400, charged_to: 'seller' };
    expect(calculateCommissionTotal(1, 10_000, cfg)).toBe(400);
    expect(calculateCommissionTotal(5, 10_000, cfg)).toBe(2_000);
    expect(calculateCommissionTotal(10, 50_000, cfg)).toBe(4_000);
  });

  it('fixed: unit_price 와 무관', () => {
    const cfg: CommissionConfig = { type: 'fixed', amount: 400, charged_to: 'seller' };
    expect(calculateCommissionTotal(3, 5_000, cfg)).toBe(1_200);
    expect(calculateCommissionTotal(3, 100_000, cfg)).toBe(1_200);
  });

  it('percent: gross * basis_points / 10000 (floor)', () => {
    // 3.00% (300 bp)
    const cfg: CommissionConfig = { type: 'percent', amount: 300, charged_to: 'seller' };
    // gross = 10 * 10_000 = 100_000 → 3% = 3_000
    expect(calculateCommissionTotal(10, 10_000, cfg)).toBe(3_000);
    // gross = 1 * 33_333 = 33_333 → 3% = 999.99 → floor 999
    expect(calculateCommissionTotal(1, 33_333, cfg)).toBe(999);
  });

  it('percent: 0% → 0', () => {
    const cfg: CommissionConfig = { type: 'percent', amount: 0, charged_to: 'seller' };
    expect(calculateCommissionTotal(5, 10_000, cfg)).toBe(0);
  });

  it('percent: 100% (10000 bp) → gross 전액', () => {
    const cfg: CommissionConfig = { type: 'percent', amount: 10_000, charged_to: 'seller' };
    expect(calculateCommissionTotal(2, 5_000, cfg)).toBe(10_000);
  });

  it('DEFAULT_COMMISSION: 판매자 400원 정량', () => {
    expect(DEFAULT_COMMISSION).toEqual({
      type: 'fixed',
      amount: 400,
      charged_to: 'seller',
    });
    expect(calculateCommissionTotal(3, 10_000, DEFAULT_COMMISSION)).toBe(1_200);
  });
});

describe('calculateSellerNet', () => {
  it('seller 부담: gross - commission', () => {
    expect(calculateSellerNet(10_000, 400, 'seller')).toBe(9_600);
  });

  it('buyer 부담: gross 그대로 (판매자 정산액 = gross)', () => {
    expect(calculateSellerNet(10_000, 400, 'buyer')).toBe(10_000);
  });

  it('both 부담: 판매자 몫만 제외 (단순화: 전체 수수료 차감)', () => {
    // MVP 스펙: both 는 fixed 분할 로직을 아직 안 넣는다. seller 와 동일.
    expect(calculateSellerNet(10_000, 400, 'both')).toBe(9_600);
  });
});
