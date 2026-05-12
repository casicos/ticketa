import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';

/**
 * PostgrestError 는 Error instance 가 아니라 plain object — server-action 래퍼에서
 * `instanceof Error` 체크에 걸려 메시지가 "[object Object]" 로 직렬화되는 문제를
 * 막기 위해 진짜 Error 로 감싸서 throw.
 */
function throwPgError(error: PostgrestError, fallback = 'RPC 호출 실패'): never {
  const msg = error.message || error.details || error.hint || fallback;
  const wrapped = new Error(msg) as Error & { code?: string; details?: unknown };
  wrapped.code = error.code;
  wrapped.details = error;
  throw wrapped;
}

export type GiftStatus =
  | 'sent'
  | 'claimed_mileage'
  | 'claimed_delivery'
  | 'shipped'
  | 'completed'
  | 'refunded'
  | 'expired';

/**
 * send_gift RPC wrapper.
 * 발송자 cash 차감 + agent_inventory.qty_available 차감 + gift insert + 수령자 알림.
 */
export async function sendGift(
  supabase: SupabaseClient,
  input: {
    recipientNickname: string;
    inventoryId: string;
    qty: number;
    message: string | null;
    unitPrice: number;
  },
): Promise<string> {
  const { data, error } = await supabase.rpc('send_gift', {
    p_recipient_nickname: input.recipientNickname,
    p_inventory_id: input.inventoryId,
    p_qty: input.qty,
    p_message: input.message,
    p_unit_price: input.unitPrice,
  });
  if (error) throwPgError(error);
  return data as string;
}

/**
 * send_gift_from_listing RPC wrapper.
 * 에이전트 listing 의 quantity_remaining 과 inventory.qty_reserved 를 같이 차감하는 atomic.
 *  - listing.pre_verified=true 만 허용
 *  - 수령자는 username(사용자 아이디) 기준
 *  - 발송자 cash 차감 + listing.quantity_remaining -= qty + inventory.qty_reserved -= qty
 *    + gifts insert + 수령자 알림
 */
export async function sendGiftFromListing(
  supabase: SupabaseClient,
  input: {
    recipientUsername: string;
    listingId: string;
    qty: number;
    message: string | null;
  },
): Promise<string> {
  const { data, error } = await supabase.rpc('send_gift_from_listing', {
    p_recipient_username: input.recipientUsername,
    p_listing_id: input.listingId,
    p_qty: input.qty,
    p_message: input.message,
  });
  if (error) throwPgError(error);
  return data as string;
}

/** 수령자 마일리지 수령 — silent (발송자에게 알림 안 감) */
export async function claimGiftMileage(supabase: SupabaseClient, giftId: string): Promise<void> {
  const { error } = await supabase.rpc('claim_gift_mileage', { p_gift_id: giftId });
  if (error) throwPgError(error);
}

/** 수령자 현물 배송 선택 → admin 큐 진입 */
export async function claimGiftDelivery(
  supabase: SupabaseClient,
  giftId: string,
  addressId: string,
): Promise<void> {
  const { error } = await supabase.rpc('claim_gift_delivery', {
    p_gift_id: giftId,
    p_address_id: addressId,
  });
  if (error) throwPgError(error);
}

/** 어드민 발송 처리 — 송장 입력 */
export async function shipGift(
  supabase: SupabaseClient,
  input: {
    giftId: string;
    carrier: string;
    trackingNo: string;
    adminMemo: string | null;
  },
): Promise<void> {
  const { error } = await supabase.rpc('ship_gift', {
    p_gift_id: input.giftId,
    p_carrier: input.carrier,
    p_tracking_no: input.trackingNo,
    p_admin_memo: input.adminMemo,
  });
  if (error) throwPgError(error);
}

/** 어드민 발송 완료 — 에이전트 단가 정산 */
export async function completeGift(supabase: SupabaseClient, giftId: string): Promise<void> {
  const { error } = await supabase.rpc('complete_gift', { p_gift_id: giftId });
  if (error) throwPgError(error);
}

/** 환불 — sent 단계는 sender 본인, 그 외는 admin (claimed_delivery 까지) */
export async function refundGift(supabase: SupabaseClient, giftId: string): Promise<void> {
  const { error } = await supabase.rpc('refund_gift', { p_gift_id: giftId });
  if (error) throwPgError(error);
}

/** 어드민 만료 처리 — 7일 미수령 등 */
export async function expireGift(supabase: SupabaseClient, giftId: string): Promise<void> {
  const { error } = await supabase.rpc('expire_gift', { p_gift_id: giftId });
  if (error) throwPgError(error);
}
