/**
 * cancellation_requests 도메인 헬퍼.
 *
 * Wave 3 범위: 판매자/구매자가 cancellation_requests insert + 어드민에게 알림 발송.
 * Wave 4 가 어드민 측 승인/거절 UI 와 RPC (cancel_listing) 호출을 붙인다.
 *
 * ssr 서버 클라이언트(auth.uid() 가 있는 상태)만 사용한다. RLS `cxr_self_insert` 가
 * requested_by = auth.uid() 를 강제하므로 조작 불가.
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requirePhoneVerified } from '@/lib/auth/guards';
import { withServerAction } from '@/lib/server-actions';
import { canRequestCancel, type ListingStatus } from '@/lib/domain/listings';
import { notifyUsers, fetchActiveAdminIds } from '@/lib/domain/notifications';

export const cancellationRoleSchema = z.enum(['seller', 'buyer']);
export type CancellationRole = z.infer<typeof cancellationRoleSchema>;

export const submitCancellationRequestSchema = z.object({
  listing_id: z.string().uuid('유효하지 않은 매물 ID 입니다'),
  role_at_request: cancellationRoleSchema,
  reason: z
    .string()
    .min(10, '취소 사유는 10자 이상 입력해주세요')
    .max(400, '취소 사유는 400자 이내로 입력해주세요'),
});

export type SubmitCancellationRequestInput = z.infer<typeof submitCancellationRequestSchema>;

/**
 * cancellation_requests insert. 성공 시 어드민 전원에게 notifications 로 전파.
 *
 * 에러 코드:
 *  - UNAUTHENTICATED / PHONE_UNVERIFIED
 *  - VALIDATION (사유/ID 포맷)
 *  - NOT_FOUND (매물 없음 또는 본인 매물 아님)
 *  - INVALID_STATE (취소 요청 불가 상태)
 *  - ALREADY_PENDING (이미 pending 요청 존재)
 */
export async function submitCancellationRequestAction(input: SubmitCancellationRequestInput) {
  return withServerAction('submitCancellationRequest', async () => {
    await requirePhoneVerified();

    const parsed = submitCancellationRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw Object.assign(
        new Error(parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다'),
        { code: 'VALIDATION' },
      );
    }
    const { listing_id, role_at_request, reason } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw Object.assign(new Error('UNAUTHENTICATED'), {
        code: 'UNAUTHENTICATED',
      });
    }

    // 매물 존재 및 본인 매물(판매자 or 구매자) 검증
    const { data: row } = await supabase
      .from('listing')
      .select('id, status, seller_id, buyer_id')
      .eq('id', listing_id)
      .maybeSingle<{
        id: string;
        status: ListingStatus;
        seller_id: string;
        buyer_id: string | null;
      }>();

    if (!row) {
      throw Object.assign(new Error('매물을 찾을 수 없습니다'), {
        code: 'NOT_FOUND',
      });
    }

    if (role_at_request === 'seller' && row.seller_id !== user.id) {
      throw Object.assign(new Error('본인 매물만 취소 요청할 수 있어요'), {
        code: 'NOT_FOUND',
      });
    }
    if (role_at_request === 'buyer' && row.buyer_id !== user.id) {
      throw Object.assign(new Error('본인 매입만 취소 요청할 수 있어요'), {
        code: 'NOT_FOUND',
      });
    }

    if (!canRequestCancel(row.status)) {
      throw Object.assign(new Error('현재 상태에서는 취소 요청을 보낼 수 없어요'), {
        code: 'INVALID_STATE',
      });
    }

    // 이미 본인이 pending 요청을 걸어뒀다면 중복 차단
    const { data: existing } = await supabase
      .from('cancellation_requests')
      .select('id')
      .eq('listing_id', listing_id)
      .eq('requested_by', user.id)
      .eq('status', 'pending')
      .maybeSingle<{ id: number }>();
    if (existing) {
      throw Object.assign(new Error('이미 검토 중인 취소 요청이 있어요'), {
        code: 'ALREADY_PENDING',
      });
    }

    const { data: inserted, error: insErr } = await supabase
      .from('cancellation_requests')
      .insert({
        listing_id,
        requested_by: user.id,
        role_at_request,
        reason,
        status: 'pending',
      })
      .select('id')
      .single();
    if (insErr || !inserted) {
      throw Object.assign(new Error(`요청 저장 실패: ${insErr?.message ?? 'unknown'}`), {
        code: 'DB_ERROR',
      });
    }

    // 어드민 전원에게 알림 (RPC notify_users → RLS 우회). best-effort.
    const adminIds = await fetchActiveAdminIds(supabase);
    await notifyUsers(supabase, {
      userIds: adminIds,
      kind: 'cancellation_requested',
      title: '취소 요청이 접수됐어요',
      body: `${role_at_request === 'seller' ? '판매자' : '구매자'}가 매물 취소를 요청했습니다.`,
      linkTo: '/admin/cancellations',
    });

    revalidatePath('/admin/cancellations');

    return { request_id: inserted.id as number };
  });
}
