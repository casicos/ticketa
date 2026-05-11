'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAuth, requireRole } from '@/lib/auth/guards';
import { withServerAction } from '@/lib/server-actions';
import { insertAuditEvent } from '@/lib/domain/audit';
import { notifyUser } from '@/lib/domain/notifications';
import { callCancelListing } from '@/lib/domain/mileage';
import {
  adminApproveCancellationSchema,
  adminRejectCancellationSchema,
} from '@/lib/domain/schemas/mileage';

async function fetchRequestRow(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  id: number,
) {
  const { data, error } = await supabase
    .from('cancellation_requests')
    .select('id, listing_id, requested_by, role_at_request, reason, status')
    .eq('id', id)
    .single();
  if (error || !data) {
    throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' });
  }
  return data as {
    id: number;
    listing_id: string;
    requested_by: string;
    role_at_request: 'seller' | 'buyer';
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
  };
}

/**
 * 어드민: 거래 취소 요청 승인.
 *  - callCancelListing RPC 가 구매자 환불 + 상태 전이 처리.
 *  - cancellation_requests.status='approved' + resolved_at, resolved_by 저장.
 */
export async function adminApproveCancellationAction(formData: FormData) {
  return withServerAction('adminApproveCancellation', async () => {
    await requireRole('admin');
    const admin = await requireAuth();

    const parsed = adminApproveCancellationSchema.safeParse({
      request_id: formData.get('request_id'),
    });
    if (!parsed.success) {
      throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
    }

    const supabase = await createSupabaseServerClient();
    const row = await fetchRequestRow(supabase, parsed.data.request_id);
    if (row.status !== 'pending') {
      throw Object.assign(new Error('대기 중 요청만 승인할 수 있어요'), {
        code: 'BAD_STATE',
      });
    }

    try {
      await callCancelListing({
        adminId: admin.id,
        listingId: row.listing_id,
        reason: row.reason,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw Object.assign(new Error(msg), { code: 'RPC_ERROR' });
    }

    const { error: updateErr } = await supabase
      .from('cancellation_requests')
      .update({
        status: 'approved',
        resolved_at: new Date().toISOString(),
        resolved_by: admin.id,
      })
      .eq('id', row.id);
    if (updateErr) {
      throw Object.assign(new Error(updateErr.message), { code: 'DB_ERROR' });
    }

    await insertAuditEvent(supabase, {
      actor_id: admin.id,
      entity_type: 'listing',
      entity_id: row.listing_id,
      event: 'cancellation_request:approved',
      to_state: 'approved',
      metadata: {
        request_id: row.id,
        requested_by: row.requested_by,
        role_at_request: row.role_at_request,
      },
    });

    revalidatePath('/admin/cancellations');
    return { ok: true as const };
  });
}

/**
 * 어드민: 거래 취소 요청 반려.
 *  - cancellation_requests.status='rejected' + admin_memo, resolved_at/by.
 *  - 요청자에게 알림.
 */
export async function adminRejectCancellationAction(formData: FormData) {
  return withServerAction('adminRejectCancellation', async () => {
    await requireRole('admin');
    const admin = await requireAuth();

    const parsed = adminRejectCancellationSchema.safeParse({
      request_id: formData.get('request_id'),
      reason: formData.get('reason'),
    });
    if (!parsed.success) {
      throw Object.assign(new Error(parsed.error.issues[0]?.message ?? 'INVALID_INPUT'), {
        code: 'INVALID_INPUT',
      });
    }

    const supabase = await createSupabaseServerClient();
    const row = await fetchRequestRow(supabase, parsed.data.request_id);
    if (row.status !== 'pending') {
      throw Object.assign(new Error('대기 중 요청만 반려할 수 있어요'), {
        code: 'BAD_STATE',
      });
    }

    const { error: updateErr } = await supabase
      .from('cancellation_requests')
      .update({
        status: 'rejected',
        resolved_at: new Date().toISOString(),
        resolved_by: admin.id,
        admin_memo: parsed.data.reason,
      })
      .eq('id', row.id);
    if (updateErr) {
      throw Object.assign(new Error(updateErr.message), { code: 'DB_ERROR' });
    }

    await notifyUser(supabase, {
      userId: row.requested_by,
      kind: 'cancellation_rejected',
      title: '거래 취소 요청이 반려됐어요',
      body: parsed.data.reason,
      linkTo: `/buy/orders/${row.listing_id}`,
    });

    await insertAuditEvent(supabase, {
      actor_id: admin.id,
      entity_type: 'listing',
      entity_id: row.listing_id,
      event: 'cancellation_request:rejected',
      to_state: 'rejected',
      metadata: {
        request_id: row.id,
        reason: parsed.data.reason,
        requested_by: row.requested_by,
      },
    });

    revalidatePath('/admin/cancellations');
    return { ok: true as const };
  });
}
