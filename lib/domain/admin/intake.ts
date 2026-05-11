import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { ListingStatus } from '@/lib/domain/listings';

export type IntakeRow = {
  id: string;
  status: ListingStatus;
  unit_price: number;
  quantity_offered: number;
  pre_verified: boolean;
  shipping_carrier: string | null;
  tracking_no: string | null;
  admin_memo: string | null;
  cancel_reason: string | null;
  submitted_at: string | null;
  purchased_at: string | null;
  handed_over_at: string | null;
  received_at: string | null;
  verified_at: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  seller_id: string;
  buyer_id: string | null;
  seller: { full_name: string | null; username: string | null; store_name: string | null } | null;
  buyer: { full_name: string | null; username: string | null } | null;
  sku: {
    brand: string;
    denomination: number;
    display_name: string;
    thumbnail_url: string | null;
  } | null;
};

const SELECT = `
  id, status, unit_price, quantity_offered, pre_verified,
  shipping_carrier, tracking_no, admin_memo, cancel_reason,
  submitted_at, purchased_at, handed_over_at, received_at, verified_at, shipped_at, completed_at, cancelled_at,
  seller_id, buyer_id,
  seller:seller_id(full_name, username, store_name),
  buyer:buyer_id(full_name, username),
  sku:sku_id(brand, denomination, display_name, thumbnail_url)
` as const;

/**
 * 어드민 intake 큐 — 특정 status 의 listing 목록 + seller/buyer/sku 조인.
 *   - admin client 로 RLS 우회 (다른 사용자의 store_name 등을 노출하기 위해)
 *   - tabAnchor 컬럼 기준 최신순 정렬
 */
export async function fetchAdminIntakeByStatus(
  status: ListingStatus,
  orderCol: string,
  limit = 100,
): Promise<IntakeRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('listing')
    .select(SELECT)
    .eq('status', status)
    .order(orderCol, { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[fetchAdminIntakeByStatus]', status, error.message);
    return [];
  }
  return (data ?? []) as unknown as IntakeRow[];
}

/**
 * 사전 송부 (pre_verified=true) 매물 중 어드민 수령 전 (verified_at is null) 목록.
 *   - status='submitted' 만 (다른 상태는 별도 큐에서 처리)
 *   - 가장 오래된 등록부터 처리하기 좋게 submitted_at 오름차순
 */
export async function fetchAdminIntakePreSend(limit = 100): Promise<IntakeRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('listing')
    .select(SELECT)
    .eq('status', 'submitted')
    .eq('pre_verified', true)
    .is('verified_at', null)
    .order('submitted_at', { ascending: true })
    .limit(limit);
  if (error) {
    console.error('[fetchAdminIntakePreSend]', error.message);
    return [];
  }
  return (data ?? []) as unknown as IntakeRow[];
}

/** 사전 송부 대기 카운트. */
export async function fetchAdminIntakePreSendCount(): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { count } = await supabase
    .from('listing')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'submitted')
    .eq('pre_verified', true)
    .is('verified_at', null);
  return count ?? 0;
}

/** 탭별 카운트 (head=true, count=exact). admin client 로 RLS 우회. */
export async function fetchAdminIntakeCounts(statuses: ListingStatus[]): Promise<number[]> {
  const supabase = createSupabaseAdminClient();
  const results = await Promise.all(
    statuses.map((s) =>
      supabase.from('listing').select('id', { count: 'exact', head: true }).eq('status', s),
    ),
  );
  return results.map((r) => r.count ?? 0);
}
