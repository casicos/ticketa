import { describe, it, expect } from 'vitest';
import { matchOrderBook, type OrderBookListing } from '@/lib/domain/orders';

function makeListing(overrides: Partial<OrderBookListing> & { id: string }): OrderBookListing {
  return {
    unit_price: 10_000,
    quantity_remaining: 100,
    seller_id: 'seller-1',
    listed_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('matchOrderBook', () => {
  it('정확 매칭: 1개 listing 으로 수량 충분', () => {
    const listings = [makeListing({ id: 'l1', quantity_remaining: 10 })];
    const result = matchOrderBook(listings, 5);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0]?.quantity).toBe(5);
    expect(result.allocations[0]?.subtotal).toBe(50_000);
    expect(result.total).toBe(50_000);
  });

  it('다중 listing 분할: 두 listing 에 걸쳐 매칭', () => {
    const listings = [
      makeListing({ id: 'l1', quantity_remaining: 3, unit_price: 9_000 }),
      makeListing({ id: 'l2', quantity_remaining: 10, unit_price: 10_000 }),
    ];
    const result = matchOrderBook(listings, 5);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allocations).toHaveLength(2);
    expect(result.allocations[0]).toMatchObject({
      listing_id: 'l1',
      quantity: 3,
      subtotal: 27_000,
    });
    expect(result.allocations[1]).toMatchObject({
      listing_id: 'l2',
      quantity: 2,
      subtotal: 20_000,
    });
    expect(result.total).toBe(47_000);
  });

  it('재고 부족: 전체 재고보다 많은 수량 요청', () => {
    const listings = [makeListing({ id: 'l1', quantity_remaining: 3 })];
    const result = matchOrderBook(listings, 10);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/재고 부족/);
    expect(result.reason).toMatch(/3장/);
  });

  it('빈 배열: 즉시 재고 부족 반환', () => {
    const result = matchOrderBook([], 1);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/재고 부족/);
  });

  it('수량 0 이하: 즉시 실패', () => {
    const listings = [makeListing({ id: 'l1' })];
    expect(matchOrderBook(listings, 0).ok).toBe(false);
    expect(matchOrderBook(listings, -1).ok).toBe(false);
  });

  it('동일 가격 FIFO: listed_at 이 이른 것 먼저 소진 (정렬은 호출자 책임)', () => {
    // 호출자가 이미 listed_at ASC 정렬을 한다고 가정. 여기서는 입력 순서를 신뢰.
    const listings = [
      makeListing({ id: 'l-early', quantity_remaining: 2, listed_at: '2026-01-01T00:00:00Z' }),
      makeListing({ id: 'l-late', quantity_remaining: 10, listed_at: '2026-01-02T00:00:00Z' }),
    ];
    const result = matchOrderBook(listings, 3);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allocations[0]?.listing_id).toBe('l-early');
    expect(result.allocations[0]?.quantity).toBe(2);
    expect(result.allocations[1]?.listing_id).toBe('l-late');
    expect(result.allocations[1]?.quantity).toBe(1);
  });
});
