/**
 * 마일리지 RPC 래퍼 (Wave 1).
 *
 * 모든 RPC 는 DB 의 SECURITY DEFINER 함수이며, 여기서는 service-role 전용
 * transaction 클라이언트를 경유한다. ESLint boundaries 상 `lib/supabase/transaction.ts`
 * 는 `lib/domain/**` 에서만 import 허용.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseTransactionClient } from '@/lib/supabase/transaction';

export type MileageTxType = 'charge' | 'spend' | 'refund' | 'settle' | 'withdraw' | 'adjust';

export type PurchaseListingResult =
  | {
      ok: true;
      listing_id: string;
      parent_listing_id?: string;
      status?: 'purchased' | 'verified';
      qty?: number;
      gross: number;
      commission: number;
      seller_net: number;
      pre_verified?: boolean;
      parent_remaining?: number;
    }
  | {
      ok: false;
      code: 'SHORT_BALANCE';
      needed: number;
      balance: number;
      shortage: number;
    }
  | {
      ok: false;
      code: string;
      message?: string;
      shortage?: undefined;
    };

/**
 * 마일리지 차감. 잔액 부족이면 SHORT_BALANCE 예외가 던져진다.
 * purchase 플로우에선 purchase_listing 이 balance 체크 후 호출하므로 여기선 drop-in.
 */
export async function callDebitMileage(args: {
  userId: string;
  amount: number;
  type?: MileageTxType;
  relatedListingId?: string | null;
  memo?: string | null;
}): Promise<number> {
  const supabase = createSupabaseTransactionClient();
  const { data, error } = await supabase.rpc('debit_mileage', {
    p_user_id: args.userId,
    p_amount: args.amount,
    p_type: args.type ?? 'spend',
    p_related_listing: args.relatedListingId ?? null,
    p_memo: args.memo ?? null,
  });
  if (error) throw error;
  return data as unknown as number;
}

/**
 * 마일리지 버킷. 카드깡 방지:
 *  - `cash`: 무통장입금 / 판매 정산 / 환불 — 즉시 출금 가능
 *  - `pg`  : PG 카드 충전 — 거래에 쓰여야만 출금 가능 (debit 시 선소진)
 */
export type MileageBucket = 'cash' | 'pg';

/**
 * 마일리지 증가. 충전 확정, 정산, 환불, adjust 등 모든 경로에 공통.
 * bucket 은 돈의 출처에 따라 결정:
 *  - 무통장입금 confirm → cash
 *  - PG 충전 confirm    → pg
 *  - 판매 정산 / 취소 환불 / adjust → cash (거래를 거친 것으로 간주)
 */
export async function callCreditMileage(args: {
  userId: string;
  amount: number;
  bucket: MileageBucket;
  type?: MileageTxType;
  relatedListingId?: string | null;
  relatedChargeId?: number | null;
  relatedWithdrawId?: number | null;
  memo?: string | null;
}): Promise<number> {
  const supabase = createSupabaseTransactionClient();
  const { data, error } = await supabase.rpc('credit_mileage', {
    p_user_id: args.userId,
    p_amount: args.amount,
    p_type: args.type ?? 'adjust',
    p_bucket: args.bucket,
    p_related_listing: args.relatedListingId ?? null,
    p_related_charge: args.relatedChargeId ?? null,
    p_related_withdraw: args.relatedWithdrawId ?? null,
    p_memo: args.memo ?? null,
  });
  if (error) throw error;
  return data as unknown as number;
}

/**
 * 매입 확정 RPC.
 *
 * 성공: { ok: true, listing_id, gross, commission, seller_net }
 * 잔액 부족: { ok: false, code: 'SHORT_BALANCE', needed, balance, shortage }
 *   → /account/mileage/charge?amount=<shortage> 로 리다이렉트.
 * 기타 예외 (UNAUTHENTICATED / FORBIDDEN / LISTING_NOT_FOUND / INVALID_STATE /
 *   SELF_PURCHASE_FORBIDDEN / SKU_NOT_FOUND) 는 throw.
 */
export async function callPurchaseListing(args: {
  buyerId: string;
  listingId: string;
  qty: number;
}): Promise<PurchaseListingResult> {
  const supabase = createSupabaseTransactionClient();
  const { data, error } = await supabase.rpc('purchase_listing', {
    p_buyer: args.buyerId,
    p_listing: args.listingId,
    p_qty: args.qty,
  });
  if (error) {
    // Supabase 의 PostgrestError 는 Error instance 가 아니라 plain object — 메시지를 보존해서 다시 던짐
    const msg = error.message || error.details || error.hint || 'RPC 호출 실패';
    const wrapped = new Error(msg) as Error & { code?: string; details?: unknown };
    wrapped.code = error.code;
    wrapped.details = error;
    throw wrapped;
  }
  return data as unknown as PurchaseListingResult;
}

/**
 * 구매자 인수 확인 → 판매자 정산 트리거. verified → completed.
 */
export async function callCompleteListing(args: {
  actorId: string;
  listingId: string;
}): Promise<void> {
  const supabase = createSupabaseTransactionClient();
  const { error } = await supabase.rpc('complete_listing', {
    p_actor: args.actorId,
    p_listing: args.listingId,
  });
  if (error) throw error;
}

/**
 * 어드민 수동 취소 → 구매자 마일리지 환불 + listing.cancelled.
 */
export async function callCancelListing(args: {
  adminId: string;
  listingId: string;
  reason: string;
}): Promise<void> {
  const supabase = createSupabaseTransactionClient();
  const { error } = await supabase.rpc('cancel_listing', {
    p_admin: args.adminId,
    p_listing: args.listingId,
    p_reason: args.reason,
  });
  if (error) throw error;
}

/**
 * 마일리지 잔액 상세.
 *  - total           : 전체 잔액 (거래 차감 시 이 중에서 pg 선소진)
 *  - withdrawable    : 출금 가능한 cash 잔액
 *  - pgLocked        : PG 충전 중 아직 거래되지 않아 출금 불가한 잔액
 */
export type MileageBalance = {
  total: number;
  withdrawable: number;
  pgLocked: number;
};

/**
 * 현재 로그인 사용자의 마일리지 잔액 조회.
 * RLS `mileage_accounts_self` 가 user_id = auth.uid() 로 필터하므로
 * ssr anon 클라이언트만으로 안전하게 조회 가능.
 *
 * 호출자는 `getCurrentUser()` 등으로 미리 확인한 userId 를 넘긴다.
 * (이전엔 내부에서 `supabase.auth.getUser()` 호출 — Auth API 200ms RTT 추가 비용.)
 * 미로그인이면 호출 자체를 안 하도록 호출자가 가드하고, 계좌 미생성 시엔
 * { total:0, withdrawable:0, pgLocked:0 } 가 반환됨.
 */
export async function fetchMyMileageBalance(
  supabase: SupabaseClient,
  userId: string,
): Promise<MileageBalance> {
  const { data } = await supabase
    .from('mileage_accounts')
    .select('cash_balance,pg_locked,balance')
    .eq('user_id', userId)
    .maybeSingle<{
      cash_balance: number | null;
      pg_locked: number | null;
      balance: number | null;
    }>();
  const cash = data?.cash_balance ?? 0;
  const pg = data?.pg_locked ?? 0;
  return {
    total: data?.balance ?? cash + pg,
    withdrawable: cash,
    pgLocked: pg,
  };
}

/**
 * 출금 신청 — cash_balance 에서 hold. RPC 내부에서 `INSUFFICIENT_WITHDRAWABLE` 체크.
 */
export async function callRequestWithdraw(args: {
  userId: string;
  amount: number;
  bankCode: string;
  accountNumberLast4: string;
  accountHolder: string;
}): Promise<number> {
  const supabase = createSupabaseTransactionClient();
  const { data, error } = await supabase.rpc('request_withdraw', {
    p_user_id: args.userId,
    p_amount: args.amount,
    p_bank_code: args.bankCode,
    p_account_number_last4: args.accountNumberLast4,
    p_account_holder: args.accountHolder,
  });
  if (error) throw error;
  return data as unknown as number;
}

/**
 * 어드민: 출금 처리 (completed/rejected/processing).
 * rejected 시 cash_balance 복원 포함.
 */
export async function callResolveWithdraw(args: {
  adminId: string;
  withdrawId: number;
  status: 'completed' | 'rejected' | 'processing';
  memo?: string | null;
}): Promise<void> {
  const supabase = createSupabaseTransactionClient();
  const { error } = await supabase.rpc('resolve_withdraw', {
    p_admin: args.adminId,
    p_withdraw: args.withdrawId,
    p_status: args.status,
    p_memo: args.memo ?? null,
  });
  if (error) throw error;
}
