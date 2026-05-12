import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { signAllocations } from '@/lib/domain/orders';

const sha256 = (data: string) => createHash('sha256').update(data).digest('hex');

describe('signAllocations', () => {
  it('같은 내용이지만 순서가 다른 allocation → 같은 해시 (listing_id 기준 정렬)', () => {
    const a = [
      { listing_id: 'bb', unit_price: 10_000, quantity: 2 },
      { listing_id: 'aa', unit_price: 9_000, quantity: 3 },
    ];
    const b = [
      { listing_id: 'aa', unit_price: 9_000, quantity: 3 },
      { listing_id: 'bb', unit_price: 10_000, quantity: 2 },
    ];
    expect(signAllocations(a, sha256)).toBe(signAllocations(b, sha256));
  });

  it('다른 내용의 allocation → 다른 해시 (quantity 차이)', () => {
    const a = [{ listing_id: 'aa', unit_price: 9_000, quantity: 3 }];
    const b = [{ listing_id: 'aa', unit_price: 9_000, quantity: 4 }];
    expect(signAllocations(a, sha256)).not.toBe(signAllocations(b, sha256));
  });

  it('다른 내용의 allocation → 다른 해시 (unit_price 차이)', () => {
    const a = [{ listing_id: 'aa', unit_price: 9_000, quantity: 3 }];
    const b = [{ listing_id: 'aa', unit_price: 10_000, quantity: 3 }];
    expect(signAllocations(a, sha256)).not.toBe(signAllocations(b, sha256));
  });

  it('다른 내용의 allocation → 다른 해시 (listing_id 차이)', () => {
    const a = [{ listing_id: 'aa', unit_price: 9_000, quantity: 3 }];
    const b = [{ listing_id: 'bb', unit_price: 9_000, quantity: 3 }];
    expect(signAllocations(a, sha256)).not.toBe(signAllocations(b, sha256));
  });

  it('빈 배열: 결정적 (JSON "[]" 의 sha256)', () => {
    const first = signAllocations([], sha256);
    const second = signAllocations([], sha256);
    expect(first).toBe(second);
    expect(first).toBe(sha256('[]'));
  });

  it('hasher 주입: 다른 해시 함수 → 다른 결과', () => {
    const allocs = [{ listing_id: 'aa', unit_price: 9_000, quantity: 3 }];
    const reverseHasher = (s: string) => s.split('').reverse().join('');
    const sha = signAllocations(allocs, sha256);
    const rev = signAllocations(allocs, reverseHasher);
    expect(sha).not.toBe(rev);
  });
});
