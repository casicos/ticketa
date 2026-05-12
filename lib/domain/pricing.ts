// 단일 소스: 수수료·주문 총액·정산액 계산.
//
// Wave 1 리팩터: 마일리지 플로우 도입 이후로는 SKU별 CommissionConfig 를 기준으로 계산한다.
// calculateCommission / COMMISSION_PER_UNIT_KRW 는 legacy fallback (c2c M4 경로에서 재활용 가능).

export const COMMISSION_PER_UNIT_KRW = 400;

export function calculateCommission(quantity: number): number {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error('invalid quantity');
  return quantity * COMMISSION_PER_UNIT_KRW;
}

export function calculateOrderTotal(items: { quantity: number; unit_price: number }[]): number {
  return items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
}

export function calculateNetPayout(gross: number, commission: number): number {
  return gross - commission;
}

// ------------------------------------------------------------------
// Wave 1: SKU별 수수료 설정 기반 계산
// ------------------------------------------------------------------

/**
 * 수수료 설정. DB `public.sku` 의 commission_* 컬럼과 1:1 매핑.
 *   - type=fixed:   amount = 원 단위 (400 = 400원/장)
 *   - type=percent: amount = basis points (300 = 3.00%). 유효 범위 0~10000
 *   - charged_to:   수수료 부담 주체 (MVP 기본: seller)
 */
export type CommissionConfig = {
  type: 'fixed' | 'percent';
  amount: number;
  charged_to: 'seller' | 'buyer' | 'both';
};

export const DEFAULT_COMMISSION: CommissionConfig = {
  type: 'fixed',
  amount: 400,
  charged_to: 'seller',
};

/**
 * 수수료 총액 계산.
 *   - fixed:   amount * quantity
 *   - percent: floor(gross * amount / 10000)
 *
 * 반환값은 원 단위 정수 (KRW).
 */
export function calculateCommissionTotal(
  quantity: number,
  unitPrice: number,
  config: CommissionConfig,
): number {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error('invalid quantity');
  if (!Number.isInteger(unitPrice) || unitPrice < 0) throw new Error('invalid unit_price');
  if (config.type === 'fixed') {
    return quantity * config.amount;
  }
  const gross = quantity * unitPrice;
  return Math.floor((gross * config.amount) / 10_000);
}

/**
 * 판매자 정산액 계산.
 *   - seller / both: gross - commission
 *   - buyer:         gross (판매자 차감 없음)
 */
export function calculateSellerNet(
  gross: number,
  commission: number,
  chargedTo: CommissionConfig['charged_to'],
): number {
  if (chargedTo === 'buyer') return gross;
  return gross - commission;
}
