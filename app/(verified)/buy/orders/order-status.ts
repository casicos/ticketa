/**
 * Wave 2 이후: 주문 단위가 아니라 listing 단위로 구매자 내역을 표시한다.
 * listing 상태 enum (7단계):
 *   submitted → purchased → handed_over → received → verified → shipped → completed
 *   (+ cancelled)
 * submitted 는 아직 구매 이전이므로 /buy/orders 에서는 보이지 않는다.
 */

export type BuyListingStatus =
  | 'purchased'
  | 'handed_over'
  | 'received'
  | 'verified'
  | 'shipped'
  | 'completed'
  | 'cancelled';

export const BUY_LISTING_STATUSES: BuyListingStatus[] = [
  'purchased',
  'handed_over',
  'received',
  'verified',
  'shipped',
  'completed',
  'cancelled',
];

export const BUY_LISTING_STATUS_LABELS: Record<BuyListingStatus, string> = {
  purchased: '구매 완료',
  handed_over: '판매자 인계 완료',
  received: '중간업체 수령',
  verified: '검증 완료',
  shipped: '발송됨 · 인수 대기',
  completed: '거래 완료',
  cancelled: '취소',
};

/** 탭 배지 색상 톤 (Tailwind classes) */
export const BUY_LISTING_STATUS_BADGE_CLASS: Record<BuyListingStatus, string> = {
  purchased: 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
  handed_over: 'bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200',
  received: 'bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200',
  verified: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200',
  shipped: 'bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200',
  completed: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
  cancelled: 'bg-muted text-muted-foreground',
};

/** 리스트 탭 순서 */
export const BUY_LISTING_TABS: Array<{ key: 'all' | BuyListingStatus; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'purchased', label: '구매 완료' },
  { key: 'handed_over', label: '인계 완료' },
  { key: 'received', label: '수령 완료' },
  { key: 'verified', label: '검증 완료' },
  { key: 'shipped', label: '인수 대기' },
  { key: 'completed', label: '거래 완료' },
  { key: 'cancelled', label: '취소' },
];

/** 상태별 구매자용 안내 문구 */
export const BUY_LISTING_STATUS_GUIDES: Record<BuyListingStatus, string> = {
  purchased: '판매자가 중간업체 주소로 발송 준비 중이에요.',
  handed_over: '판매자가 발송했어요. 중간업체 수령 대기 중.',
  received: '중간업체가 실물을 수령했어요. 검증이 진행됩니다.',
  verified: '검증이 완료됐어요. 곧 발송됩니다.',
  shipped: '구매자(본인) 측으로 발송됐어요. 수령 후 "인수 확인" 해주세요.',
  completed: '거래가 완료됐어요. 판매자 정산이 처리됐습니다.',
  cancelled: '거래가 취소됐어요.',
};
