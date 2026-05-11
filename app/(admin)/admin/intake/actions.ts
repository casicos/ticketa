'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAuth, requireRole } from '@/lib/auth/guards';
import { withServerAction } from '@/lib/server-actions';
import { insertAuditEvent } from '@/lib/domain/audit';
import { notifyUser } from '@/lib/domain/notifications';
import {
  canAdminReceive,
  canAdminVerify,
  canAdminShipToBuyer,
  canAdminCancel,
  type ListingStatus,
} from '@/lib/domain/listings';
import { callCancelListing } from '@/lib/domain/mileage';
import { SHIPPING_CARRIERS, type ShippingCarrierCode } from './data';

const listingIdSchema = z.object({
  listing_id: z.string().uuid(),
});

const shippingCarrierCodes = SHIPPING_CARRIERS.map((c) => c.code) as [
  ShippingCarrierCode,
  ...ShippingCarrierCode[],
];

const shipSchema = z.object({
  listing_id: z.string().uuid(),
  shipping_carrier: z.enum(shippingCarrierCodes),
  tracking_no: z.string().trim().min(1, '송장번호를 입력해주세요').max(60),
  memo: z.string().trim().max(200).optional().or(z.literal('')),
});

const cancelSchema = z.object({
  listing_id: z.string().uuid(),
  reason: z.string().min(5).max(400),
});

type ListingSnapshot = {
  id: string;
  status: ListingStatus;
  seller_id: string;
  buyer_id: string | null;
  admin_memo: string | null;
  gross_amount: number | null;
};

async function fetchListing(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  id: string,
): Promise<ListingSnapshot> {
  const { data, error } = await supabase
    .from('listing')
    .select('id, status, seller_id, buyer_id, admin_memo, gross_amount')
    .eq('id', id)
    .single<ListingSnapshot>();
  if (error || !data) {
    throw Object.assign(new Error('LISTING_NOT_FOUND'), {
      code: 'LISTING_NOT_FOUND',
    });
  }
  return data;
}

/**
 * handed_over → received
 * 판매자가 인계 확인한 매물을 중간업체가 실물 수령했음을 기록.
 */
export async function markReceivedAction(formData: FormData) {
  return withServerAction('markReceivedAction', async () => {
    await requireRole('admin');
    const actor = await requireAuth();

    const parsed = listingIdSchema.safeParse({
      listing_id: formData.get('listing_id'),
    });
    if (!parsed.success) {
      throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
    }

    const { listing_id } = parsed.data;
    const supabase = await createSupabaseServerClient();
    const listing = await fetchListing(supabase, listing_id);

    if (!canAdminReceive(listing.status)) {
      throw Object.assign(new Error('BAD_STATE'), { code: 'BAD_STATE' });
    }

    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('listing')
      .update({ status: 'received', received_at: nowIso })
      .eq('id', listing_id);
    if (error) throw Object.assign(new Error('DB_ERROR'), { code: 'DB_ERROR' });

    await insertAuditEvent(supabase, {
      actor_id: actor.id,
      entity_type: 'listing',
      entity_id: listing_id,
      event: 'status_change:received',
      from_state: 'handed_over',
      to_state: 'received',
    });

    // 판매자 + 구매자 알림 (RPC 경유 — RLS 우회)
    await notifyUser(supabase, {
      userId: listing.seller_id,
      kind: 'listing_received',
      title: '중간업체가 실물을 수령했어요',
      body: '검증이 진행될 예정이에요.',
      linkTo: `/sell/listings/${listing_id}`,
    });
    if (listing.buyer_id) {
      await notifyUser(supabase, {
        userId: listing.buyer_id,
        kind: 'listing_received',
        title: '중간업체가 실물을 수령했어요',
        body: '진위 검증이 진행됩니다.',
        linkTo: `/buy/orders/${listing_id}`,
      });
    }

    revalidatePath('/admin/intake');
    return { ok: true as const };
  });
}

/**
 * received → verified
 * 진위 검증 완료. 구매자에게 "곧 발송됩니다" 알림.
 */
export async function markVerifiedAction(formData: FormData) {
  return withServerAction('markVerifiedAction', async () => {
    await requireRole('admin');
    const actor = await requireAuth();

    const parsed = listingIdSchema.safeParse({
      listing_id: formData.get('listing_id'),
    });
    if (!parsed.success) {
      throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
    }

    const { listing_id } = parsed.data;
    const supabase = await createSupabaseServerClient();
    const listing = await fetchListing(supabase, listing_id);

    if (!canAdminVerify(listing.status)) {
      throw Object.assign(new Error('BAD_STATE'), { code: 'BAD_STATE' });
    }

    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('listing')
      .update({ status: 'verified', verified_at: nowIso })
      .eq('id', listing_id);
    if (error) throw Object.assign(new Error('DB_ERROR'), { code: 'DB_ERROR' });

    await insertAuditEvent(supabase, {
      actor_id: actor.id,
      entity_type: 'listing',
      entity_id: listing_id,
      event: 'status_change:verified',
      from_state: 'received',
      to_state: 'verified',
    });

    if (listing.buyer_id) {
      await notifyUser(supabase, {
        userId: listing.buyer_id,
        kind: 'listing_verified',
        title: '검증이 완료됐어요',
        body: '곧 발송될 예정이에요.',
        linkTo: `/buy/orders/${listing_id}`,
      });
    }
    // 판매자에게도 진행 상황 알림
    await notifyUser(supabase, {
      userId: listing.seller_id,
      kind: 'listing_verified',
      title: '검증이 완료됐어요',
      body: '구매자에게 발송 준비 중이에요.',
      linkTo: `/sell/listings/${listing_id}`,
    });

    revalidatePath('/admin/intake');
    return { ok: true as const };
  });
}

/**
 * verified → shipped. admin_memo 에 운송장/발송 기록 추가 + 구매자 알림.
 * shipped 상태에서 구매자가 "인수 확인" 버튼을 볼 수 있다.
 */
export async function markShippedNotifyAction(formData: FormData) {
  return withServerAction('markShippedNotifyAction', async () => {
    await requireRole('admin');
    const actor = await requireAuth();

    const parsed = shipSchema.safeParse({
      listing_id: formData.get('listing_id'),
      shipping_carrier: formData.get('shipping_carrier'),
      tracking_no: (formData.get('tracking_no') ?? '') as string,
      memo: (formData.get('memo') ?? '') as string,
    });
    if (!parsed.success) {
      throw Object.assign(new Error(parsed.error.issues[0]?.message ?? 'INVALID_INPUT'), {
        code: 'INVALID_INPUT',
      });
    }

    const { listing_id, shipping_carrier, tracking_no, memo } = parsed.data;
    const carrierLabel =
      SHIPPING_CARRIERS.find((c) => c.code === shipping_carrier)?.label ?? shipping_carrier;
    const trimmedMemo = (memo ?? '').trim();

    const supabase = await createSupabaseServerClient();
    const listing = await fetchListing(supabase, listing_id);

    if (!canAdminShipToBuyer(listing.status)) {
      throw Object.assign(new Error('BAD_STATE'), { code: 'BAD_STATE' });
    }

    const nowIso = new Date().toISOString();
    const nowKr = new Date().toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const memoLine = `${nowKr} 발송 처리 — ${carrierLabel} 송장 ${tracking_no}${
      trimmedMemo ? `\n   메모: ${trimmedMemo}` : ''
    }`;
    const nextMemo = listing.admin_memo ? `${listing.admin_memo}\n\n${memoLine}` : memoLine;

    const { error } = await supabase
      .from('listing')
      .update({
        status: 'shipped',
        shipped_at: nowIso,
        admin_memo: nextMemo,
        shipping_carrier,
        tracking_no,
      })
      .eq('id', listing_id);
    if (error) throw Object.assign(new Error('DB_ERROR'), { code: 'DB_ERROR' });

    await insertAuditEvent(supabase, {
      actor_id: actor.id,
      entity_type: 'listing',
      entity_id: listing_id,
      event: 'status_change:shipped',
      from_state: listing.status,
      to_state: 'shipped',
      metadata: { shipping_carrier, tracking_no },
    });

    if (listing.buyer_id) {
      await notifyUser(supabase, {
        userId: listing.buyer_id,
        kind: 'listing_shipped',
        title: '상품권이 발송됐어요',
        body: `${carrierLabel} 운송장 ${tracking_no} 로 발송됐어요. 수령 후 "인수 확인" 해주세요.`,
        linkTo: `/buy/orders/${listing_id}`,
      });
    }

    revalidatePath('/admin/intake');
    return { ok: true as const };
  });
}

/**
 * shipped → completed (어드민 수동 자동완료).
 * 3일 자동완료를 cron 대신 어드민 수동 버튼으로 운영. force_complete_listing RPC.
 */
const forceCompleteSchema = z.object({
  listing_id: z.string().uuid(),
});

export async function adminForceCompleteAction(formData: FormData) {
  return withServerAction('adminForceComplete', async () => {
    await requireRole('admin');
    const actor = await requireAuth();

    const parsed = forceCompleteSchema.safeParse({
      listing_id: formData.get('listing_id'),
    });
    if (!parsed.success) {
      throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
    }

    const { listing_id } = parsed.data;
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('force_complete_listing', {
      p_admin: actor.id,
      p_listing: listing_id,
    });
    if (error) {
      throw Object.assign(new Error(error.message), { code: 'RPC_ERROR' });
    }
    if (data && typeof data === 'object' && 'ok' in data && !data.ok) {
      throw Object.assign(new Error('FORCE_COMPLETE_FAILED'), {
        code: 'FORCE_COMPLETE_FAILED',
      });
    }

    revalidatePath('/admin/intake');
    return { ok: true as const };
  });
}

/**
 * 임의 상태(!= completed/cancelled) → cancelled.
 * callCancelListing RPC 가 환불 + 판매자/구매자 알림까지 처리한다.
 */
export async function adminCancelAction(formData: FormData) {
  return withServerAction('adminCancelAction', async () => {
    await requireRole('admin');
    const actor = await requireAuth();

    const parsed = cancelSchema.safeParse({
      listing_id: formData.get('listing_id'),
      reason: formData.get('reason'),
    });
    if (!parsed.success) {
      throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
    }

    const { listing_id, reason } = parsed.data;
    const supabase = await createSupabaseServerClient();
    const listing = await fetchListing(supabase, listing_id);

    if (!canAdminCancel(listing.status)) {
      throw Object.assign(new Error('BAD_STATE'), { code: 'BAD_STATE' });
    }

    await callCancelListing({
      adminId: actor.id,
      listingId: listing_id,
      reason,
    });

    revalidatePath('/admin/intake');
    return { ok: true as const };
  });
}
