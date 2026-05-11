/**
 * listing 도메인 헬퍼 (7단계 상태머신).
 * Supabase 의존 없는 pure utility.
 * 참조: migrations/0012_mileage_refactor.sql, 0017_shipped_state.sql
 */

export type ListingStatus =
  | 'submitted'
  | 'purchased'
  | 'handed_over'
  | 'received'
  | 'verified'
  | 'shipped'
  | 'completed'
  | 'cancelled';

/** 전체 상태 목록 (cancelled 포함) */
export const LISTING_STATUSES: ListingStatus[] = [
  'submitted',
  'purchased',
  'handed_over',
  'received',
  'verified',
  'shipped',
  'completed',
  'cancelled',
];

/** 타임라인 stepper 순서 (cancelled 는 별도 처리) */
export const LISTING_STATUS_ORDER = [
  'submitted',
  'purchased',
  'handed_over',
  'received',
  'verified',
  'shipped',
  'completed',
] as const satisfies readonly ListingStatus[];

/** stepper 에 포함되는 정규 단계 (cancelled 제외) */
export type ListingStepStatus = (typeof LISTING_STATUS_ORDER)[number];

/** 상태 배지 · 라벨 */
export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  submitted: '등록됨',
  purchased: '매입됨',
  handed_over: '인계 완료',
  received: '수령 완료',
  verified: '검증 완료',
  shipped: '구매자 발송',
  completed: '거래 완료',
  cancelled: '취소됨',
};

/** 스테퍼 단계별 간단한 안내 문구 */
export const LISTING_STATUS_STEP_HINTS: Record<ListingStatus, string> = {
  submitted: '판매자 등록 완료',
  purchased: '구매자 매입 확정',
  handed_over: '판매자 발송 확인',
  received: '중간업체 실물 수령',
  verified: '진위 검증 완료',
  shipped: '구매자 측으로 발송됨',
  completed: '판매자 정산 완료',
  cancelled: '거래 취소됨',
};

/**
 * LISTING_STATUS_ORDER 기준 진행 단계 인덱스.
 * cancelled 는 -1 로 반환되어 stepper 가 "취소" 분기 처리 가능하도록 한다.
 */
export function listingStepIndex(status: ListingStatus): number {
  if (status === 'cancelled') return -1;
  return (LISTING_STATUS_ORDER as readonly ListingStatus[]).indexOf(status);
}

/** 종결 상태 (더 이상 변경 없음) */
export const isTerminal = (status: ListingStatus): boolean =>
  status === 'completed' || status === 'cancelled';

/** 판매자가 "인계 확인" 버튼을 누를 수 있는 상태 */
export const canSellerHandover = (status: ListingStatus): boolean => status === 'purchased';

/** 어드민이 "수령 확인" 을 누를 수 있는 상태 */
export const canAdminReceive = (status: ListingStatus): boolean => status === 'handed_over';

/** 어드민이 "검증 완료" 를 누를 수 있는 상태 */
export const canAdminVerify = (status: ListingStatus): boolean => status === 'received';

/** 어드민이 "구매자 발송 처리" 를 누를 수 있는 상태 (verified → shipped) */
export const canAdminShipToBuyer = (status: ListingStatus): boolean => status === 'verified';

/** 구매자가 "인수 확인" 버튼을 누를 수 있는 상태 (shipped → completed) */
export const canBuyerAccept = (status: ListingStatus): boolean => status === 'shipped';

/**
 * 취소 요청 가능한 상태 (판매자/구매자 공통).
 * cancellation_requests insert 만 허용하고, 실제 취소는 어드민이 수행.
 * shipped 는 이미 중간업체가 구매자에게 보낸 상태라 현실적으로 반환 회수 복잡 →
 * 기본은 제외하되, 어드민 직접 취소(callCancelListing)로는 여전히 가능.
 */
export const canRequestCancel = (status: ListingStatus): boolean =>
  ['submitted', 'purchased', 'handed_over', 'received', 'verified'].includes(status);

/** 어드민이 임의 상태에서 즉시 취소(cancel_listing RPC) 가능한지 */
export const canAdminCancel = (status: ListingStatus): boolean =>
  status !== 'completed' && status !== 'cancelled';
