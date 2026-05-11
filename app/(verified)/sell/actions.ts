'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requirePhoneVerified } from '@/lib/auth/guards';
import { withServerAction } from '@/lib/server-actions';
import { submitListingSchema } from '@/lib/domain/schemas/listing';
import { canSellerHandover, type ListingStatus } from '@/lib/domain/listings';
import { insertAuditEvent } from '@/lib/domain/audit';
import { notifyUser, notifyUsers, fetchActiveAdminIds } from '@/lib/domain/notifications';
import { submitCancellationRequestAction, type CancellationRole } from '@/lib/domain/cancellations';
import { z } from 'zod';

function throwCoded(message: string, code: string): never {
  throw Object.assign(new Error(message), { code });
}

/**
 * 판매 등록 (listing 'submitted' 생성).
 * - 정산 계좌는 이 흐름에서 받지 않음 — 마일리지 출금 시 등록.
 * - listing insert 후 audit_events 에 status_change:submitted 기록.
 * - 성공 시 결과 내부 redirect 경로 반환. 폼 측에서 redirect 를 유발.
 */
export async function submitListingAction(formData: FormData) {
  return withServerAction('submitListing', async () => {
    await requirePhoneVerified();
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throwCoded('UNAUTHENTICATED', 'UNAUTHENTICATED');

    const parsed = submitListingSchema.safeParse({
      sku_id: formData.get('sku_id'),
      quantity: formData.get('quantity'),
      unit_price: formData.get('unit_price'),
      pre_verified:
        formData.get('pre_verified') === 'on' || formData.get('pre_verified') === 'true',
    });
    if (!parsed.success) {
      throwCoded(parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다', 'VALIDATION');
    }

    const input = parsed.data;

    // 액면가 가드 — 클라이언트 우회/직접 호출 대비. unit_price ≤ denomination.
    const { data: skuRow } = await supabase
      .from('sku')
      .select('id, denomination, is_active')
      .eq('id', input.sku_id)
      .maybeSingle<{ id: string; denomination: number; is_active: boolean }>();
    if (!skuRow || !skuRow.is_active) {
      throwCoded('선택한 상품권을 찾을 수 없습니다', 'SKU_NOT_FOUND');
    }
    if (input.unit_price > skuRow.denomination) {
      throwCoded(
        `장당 판매가는 액면가(${skuRow.denomination.toLocaleString('ko-KR')}원) 이하여야 합니다`,
        'PRICE_OVER_FACE',
      );
    }

    // seller role 자동 부여 (idempotent — 이미 활성이면 unique index 로 insert 실패 → 무시)
    await supabase
      .from('user_roles')
      .insert({ user_id: user.id, role: 'seller', granted_by: user.id })
      .then(({ error: roleErr }) => {
        // 중복 활성 role 은 ux_user_roles_active partial unique index 로 차단됨 — 의도된 동작
        if (roleErr && !/duplicate|unique|23505/i.test(roleErr.message)) {
          console.warn('[seller role grant]', roleErr.message);
        }
      });

    // 3. listing insert
    const nowIso = new Date().toISOString();
    const { data: listing, error: insErr } = await supabase
      .from('listing')
      .insert({
        seller_id: user.id,
        sku_id: input.sku_id,
        quantity_offered: input.quantity,
        quantity_remaining: input.quantity,
        unit_price: input.unit_price,
        status: 'submitted',
        submitted_at: nowIso,
        pre_verified: input.pre_verified,
      })
      .select('id')
      .single();

    if (insErr || !listing) {
      throwCoded(`매물 등록 실패: ${insErr?.message ?? 'unknown'}`, 'DB_ERROR');
    }

    // 3. audit_events — RPC SECURITY DEFINER 로 RLS 우회.
    await insertAuditEvent(supabase, {
      actor_id: user.id,
      entity_type: 'listing',
      entity_id: listing.id,
      event: 'status_change:submitted',
      to_state: 'submitted',
      metadata: {
        sku_id: input.sku_id,
        quantity: input.quantity,
        unit_price: input.unit_price,
      },
    });

    revalidatePath('/sell/listings');
    return { redirect: `/sell/listings/${listing.id}` as const };
  });
}

/**
 * 서버 액션 진입 후 받은 result 로 redirect. 클라이언트에서 직접 redirect 하면
 * Next.js 의 redirect() throw 가 Server Action boundary 를 넘어 전파됨.
 */
export async function submitListingAndRedirect(formData: FormData) {
  const result = await submitListingAction(formData);
  if (result.ok) {
    redirect(result.data.redirect);
  }
  return result;
}

/**
 * 판매자 인계 확인 (purchased → handed_over).
 *
 * 운송장 번호는 선택. 발송 확인 체크박스는 클라이언트에서 강제.
 * 상태 전이 + handed_over_at 업데이트 + audit_events + 구매자/어드민 알림.
 */
const handoverSchema = z.object({
  listing_id: z.string().uuid('유효하지 않은 매물 ID 입니다'),
  tracking_no: z
    .string()
    .trim()
    .max(60, '운송장 번호는 60자 이내여야 합니다')
    .optional()
    .or(z.literal('')),
});

export async function handOverListingAction(formData: FormData) {
  return withServerAction('handOverListing', async () => {
    await requirePhoneVerified();
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throwCoded('UNAUTHENTICATED', 'UNAUTHENTICATED');

    const parsed = handoverSchema.safeParse({
      listing_id: formData.get('listing_id'),
      tracking_no: (formData.get('tracking_no') ?? '') as string,
    });
    if (!parsed.success) {
      throwCoded(parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다', 'VALIDATION');
    }
    const { listing_id } = parsed.data;
    const trackingNo = parsed.data.tracking_no?.trim() || null;

    const { data: current } = await supabase
      .from('listing')
      .select('id, status, seller_id, buyer_id, admin_memo')
      .eq('id', listing_id)
      .eq('seller_id', user.id)
      .maybeSingle<{
        id: string;
        status: ListingStatus;
        seller_id: string;
        buyer_id: string | null;
        admin_memo: string | null;
      }>();
    if (!current) throwCoded('매물을 찾을 수 없습니다', 'NOT_FOUND');

    if (!canSellerHandover(current.status)) {
      throwCoded('구매 완료 상태에서만 인계 확인을 할 수 있어요', 'INVALID_STATE');
    }

    const nowIso = new Date().toISOString();
    const memoLine = `[판매자인계] ${nowIso}${trackingNo ? ` 운송장=${trackingNo}` : ''}`;
    const nextMemo = current.admin_memo ? `${current.admin_memo}\n${memoLine}` : memoLine;

    const { error: updErr } = await supabase
      .from('listing')
      .update({
        status: 'handed_over',
        handed_over_at: nowIso,
        admin_memo: nextMemo,
      })
      .eq('id', listing_id)
      .eq('seller_id', user.id);
    if (updErr) throwCoded(`인계 처리 실패: ${updErr.message}`, 'DB_ERROR');

    await insertAuditEvent(supabase, {
      actor_id: user.id,
      entity_type: 'listing',
      entity_id: listing_id,
      event: 'status_change:handed_over',
      from_state: current.status,
      to_state: 'handed_over',
      metadata: trackingNo ? { tracking_no: trackingNo } : {},
    });

    // 구매자 알림 (RPC notify_user → RLS 우회)
    if (current.buyer_id) {
      await notifyUser(supabase, {
        userId: current.buyer_id,
        kind: 'listing_handed_over',
        title: '판매자가 발송했어요',
        body: trackingNo
          ? `운송장 ${trackingNo} 로 발송됐어요. 중간업체 수령 대기 중.`
          : '중간업체 수령 대기 중이에요.',
        linkTo: `/buy/orders/${listing_id}`,
      });
    }

    // 어드민 전원 알림
    const adminIds = await fetchActiveAdminIds(supabase);
    await notifyUsers(supabase, {
      userIds: adminIds,
      kind: 'listing_handed_over_admin',
      title: '실물 수령 대기',
      body: trackingNo
        ? `판매자가 운송장 ${trackingNo} 로 발송했어요.`
        : '판매자가 인계 확인을 했어요.',
      linkTo: '/admin/intake',
    });

    revalidatePath('/sell/listings');
    revalidatePath(`/sell/listings/${listing_id}`);
    return { ok: true as const };
  });
}

/**
 * 판매자 취소 요청 (cancellation_requests pending). 실제 취소는 어드민 승인 후.
 * submitted~verified 구간에서 허용. 사유 10자 이상 필수.
 */
export async function requestSellerCancellationAction(formData: FormData) {
  const listingIdRaw = formData.get('listing_id');
  const reasonRaw = formData.get('reason');
  const role: CancellationRole = 'seller';
  return submitCancellationRequestAction({
    listing_id: typeof listingIdRaw === 'string' ? listingIdRaw : '',
    role_at_request: role,
    reason: typeof reasonRaw === 'string' ? reasonRaw : '',
  }).then((res) => {
    if (res.ok) {
      revalidatePath('/sell/listings');
      if (typeof listingIdRaw === 'string') {
        revalidatePath(`/sell/listings/${listingIdRaw}`);
      }
    }
    return res;
  });
}
