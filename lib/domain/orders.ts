/**
 * 오더북 매칭 도메인 헬퍼.
 * Supabase 의존 없는 pure utility.
 * Phase 4-A: create_order_transaction RPC 래퍼가 쓰는 Input/Result 타입과
 *            클라이언트-프리뷰 signature 계산 유틸 추가.
 */

export type OrderBookListing = {
  id: string;
  unit_price: number;
  quantity_remaining: number;
  seller_id: string;
  listed_at: string;
};

export type OrderBookAllocation = {
  listing_id: string;
  seller_id: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
};

export type OrderBookMatch =
  | { ok: true; allocations: OrderBookAllocation[]; total: number }
  | { ok: false; reason: string };

/**
 * 주어진 listing 배열을 최저가 우선으로 소진하며 requestedQty 를 채운다.
 * listing 은 이미 `unit_price ASC, listed_at ASC` 로 정렬됐다고 가정.
 * 자기 매입 차단(seller_id != buyer_id) 은 호출자가 이미 필터링.
 */
export function matchOrderBook(listings: OrderBookListing[], requestedQty: number): OrderBookMatch {
  if (requestedQty <= 0) return { ok: false, reason: '수량은 1 이상' };
  let remaining = requestedQty;
  const allocations: OrderBookAllocation[] = [];
  let total = 0;
  for (const l of listings) {
    if (remaining === 0) break;
    const take = Math.min(remaining, l.quantity_remaining);
    if (take === 0) continue;
    const subtotal = take * l.unit_price;
    allocations.push({
      listing_id: l.id,
      seller_id: l.seller_id,
      unit_price: l.unit_price,
      quantity: take,
      subtotal,
    });
    total += subtotal;
    remaining -= take;
  }
  if (remaining > 0) {
    return { ok: false, reason: `재고 부족 — ${requestedQty - remaining}장만 가능` };
  }
  return { ok: true, allocations, total };
}

/**
 * create_order_transaction RPC 입력 아이템.
 */
export type CreateOrderItem = { sku_id: string; quantity: number };

/**
 * create_order_transaction RPC 반환 페이로드.
 * DB 측에서 jsonb_build_object 로 직렬화됨.
 */
export type CreateOrderResult = {
  order_id: string;
  total_amount: number;
  allocations: Array<{
    listing_id: string;
    seller_id: string;
    sku_id: string;
    unit_price: number;
    quantity: number;
  }>;
  computed_signature: string;
  preview_matches: boolean;
};

/**
 * 배송지 입력 — `orders.shipping_address` jsonb 에 저장.
 */
export type ShippingAddressInput = {
  recipient: string;
  phone: string;
  postal_code: string;
  address_line1: string;
  address_line2?: string;
  note?: string;
};

/**
 * 클라이언트 프리뷰 signature 재계산 — `previewOrderAction` 의 signMatch 와 동일 포맷.
 * DB 의 computed_signature 와 "정확히 일치" 를 기대하지는 않고 (서로 다른 canonical 사용),
 * 프리뷰 <-> 실제 allocations 비교 시 이 함수를 양쪽에 적용해 동등성 확인.
 *
 * hasher 주입식: 서버는 `createHash('sha256').update(s).digest('hex')`,
 *                 클라이언트는 Web Crypto 등 별도 주입.
 */
export function signAllocations(
  allocations: Array<{ listing_id: string; unit_price: number; quantity: number }>,
  hasher: (data: string) => string,
): string {
  const canonical = JSON.stringify(
    allocations
      .map((a) => ({ listing_id: a.listing_id, unit_price: a.unit_price, qty: a.quantity }))
      .sort((x, y) => x.listing_id.localeCompare(y.listing_id)),
  );
  return hasher(canonical);
}
