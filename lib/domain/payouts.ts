import { createSupabaseTransactionClient } from '@/lib/supabase/transaction';

/**
 * payout 상태.
 * DB check constraint: public.payouts.status in ('pending','released','held')
 */
export type PayoutStatus = 'pending' | 'released' | 'held';

/**
 * release_payout RPC 래퍼.
 *
 * SECURITY DEFINER 함수가 admin role + payout status 검증을 책임진다.
 * 서비스 롤 채널 경유로 JWT 만료/RLS 혼동 제거 — 플랜 Principle 5 "명시적 예외 경로".
 *
 * ESLint boundaries 상 `lib/supabase/transaction.ts` 는 `lib/domain/**` 에서만 import 허용.
 * 이 파일은 lib/domain/ 내부이므로 허용 구역.
 */
export async function callReleasePayout(payoutId: string, adminId: string): Promise<void> {
  const supabase = createSupabaseTransactionClient();
  const { error } = await supabase.rpc('release_payout', {
    p_payout: payoutId,
    p_admin: adminId,
  });
  if (error) throw error;
}
