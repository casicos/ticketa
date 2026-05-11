'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAuth, requireRole } from '@/lib/auth/guards';
import { withServerAction } from '@/lib/server-actions';
import { insertAuditEvent } from '@/lib/domain/audit';
import { notifyUser } from '@/lib/domain/notifications';
import { callCreditMileage, callResolveWithdraw } from '@/lib/domain/mileage';
import {
  adminConfirmChargeSchema,
  adminRejectChargeSchema,
  adminResolveWithdrawSchema,
} from '@/lib/domain/schemas/mileage';

async function fetchChargeRow(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  id: number,
) {
  const { data, error } = await supabase
    .from('charge_requests')
    .select('id, user_id, amount, method, status, depositor_name')
    .eq('id', id)
    .single();
  if (error || !data) {
    throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' });
  }
  return data as {
    id: number;
    user_id: string;
    amount: number;
    method: 'bank_transfer' | 'pg';
    status: 'pending' | 'confirmed' | 'cancelled';
    depositor_name: string | null;
  };
}

/**
 * 어드민: 충전 요청 승인.
 *  - 이미 confirmed 이면 NOOP.
 *  - method='pg' → bucket='pg', 그 외 → bucket='cash'
 *  - credit_mileage + charge_requests 상태 업데이트 + 알림.
 */
export async function adminConfirmChargeAction(formData: FormData) {
  return withServerAction('adminConfirmCharge', async () => {
    await requireRole('admin');
    const admin = await requireAuth();

    const parsed = adminConfirmChargeSchema.safeParse({
      charge_id: formData.get('charge_id'),
    });
    if (!parsed.success) {
      throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
    }

    const supabase = await createSupabaseServerClient();
    const row = await fetchChargeRow(supabase, parsed.data.charge_id);
    if (row.status === 'confirmed') return { ok: true as const, noop: true };
    if (row.status === 'cancelled') {
      throw Object.assign(new Error('이미 반려된 요청입니다'), { code: 'BAD_STATE' });
    }

    const bucket = row.method === 'pg' ? 'pg' : 'cash';
    const userMemo =
      row.method === 'pg'
        ? '카드 충전 완료'
        : `무통장입금 충전 완료${row.depositor_name ? ` · 입금자 ${row.depositor_name}` : ''}`;
    await callCreditMileage({
      userId: row.user_id,
      amount: row.amount,
      bucket,
      type: 'charge',
      relatedChargeId: row.id,
      memo: userMemo,
    });

    const { error: updateErr } = await supabase
      .from('charge_requests')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by: admin.id,
      })
      .eq('id', row.id);
    if (updateErr) {
      throw Object.assign(new Error(updateErr.message), { code: 'DB_ERROR' });
    }

    await notifyUser(supabase, {
      userId: row.user_id,
      kind: 'charge_confirmed',
      title: '충전이 완료됐어요',
      body: `${row.amount.toLocaleString('ko-KR')}원이 적립됐어요.`,
      linkTo: '/account/mileage',
    });

    await insertAuditEvent(supabase, {
      actor_id: admin.id,
      entity_type: 'system',
      entity_id: String(row.id),
      event: 'charge:confirmed',
      from_state: 'pending',
      to_state: 'confirmed',
      metadata: { amount: row.amount, bucket, method: row.method },
    });

    revalidatePath('/admin/mileage');
    revalidatePath('/account/mileage');
    return { ok: true as const };
  });
}

/**
 * 어드민: 충전 요청 반려.
 */
export async function adminRejectChargeAction(formData: FormData) {
  return withServerAction('adminRejectCharge', async () => {
    await requireRole('admin');
    const admin = await requireAuth();

    const parsed = adminRejectChargeSchema.safeParse({
      charge_id: formData.get('charge_id'),
      reason: formData.get('reason'),
    });
    if (!parsed.success) {
      throw Object.assign(new Error(parsed.error.issues[0]?.message ?? 'INVALID_INPUT'), {
        code: 'INVALID_INPUT',
      });
    }

    const supabase = await createSupabaseServerClient();
    const row = await fetchChargeRow(supabase, parsed.data.charge_id);
    if (row.status !== 'pending') {
      throw Object.assign(new Error('대기 중 요청만 반려할 수 있어요'), {
        code: 'BAD_STATE',
      });
    }

    const { error: updateErr } = await supabase
      .from('charge_requests')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: parsed.data.reason,
      })
      .eq('id', row.id);
    if (updateErr) {
      throw Object.assign(new Error(updateErr.message), { code: 'DB_ERROR' });
    }

    await notifyUser(supabase, {
      userId: row.user_id,
      kind: 'charge_cancelled',
      title: '충전 요청이 반려됐어요',
      body: parsed.data.reason,
      linkTo: '/account/mileage',
    });

    await insertAuditEvent(supabase, {
      actor_id: admin.id,
      entity_type: 'system',
      entity_id: String(row.id),
      event: 'charge:cancelled',
      from_state: 'pending',
      to_state: 'cancelled',
      metadata: { reason: parsed.data.reason, amount: row.amount },
    });

    revalidatePath('/admin/mileage');
    revalidatePath('/account/mileage');
    return { ok: true as const };
  });
}

/**
 * 어드민: 출금 요청 처리 (processing / completed / rejected).
 */
export async function adminResolveWithdrawAction(formData: FormData) {
  return withServerAction('adminResolveWithdraw', async () => {
    await requireRole('admin');
    const admin = await requireAuth();

    const parsed = adminResolveWithdrawSchema.safeParse({
      withdraw_id: formData.get('withdraw_id'),
      status: formData.get('status'),
      reason: formData.get('reason') || undefined,
    });
    if (!parsed.success) {
      throw Object.assign(new Error(parsed.error.issues[0]?.message ?? 'INVALID_INPUT'), {
        code: 'INVALID_INPUT',
      });
    }

    try {
      await callResolveWithdraw({
        adminId: admin.id,
        withdrawId: parsed.data.withdraw_id,
        status: parsed.data.status,
        memo: parsed.data.reason ?? null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw Object.assign(new Error(msg), { code: 'RPC_ERROR' });
    }

    const supabase = await createSupabaseServerClient();
    await insertAuditEvent(supabase, {
      actor_id: admin.id,
      entity_type: 'system',
      entity_id: String(parsed.data.withdraw_id),
      event: `withdraw:${parsed.data.status}`,
      to_state: parsed.data.status,
      metadata: parsed.data.reason ? { reason: parsed.data.reason } : null,
    });

    revalidatePath('/admin/mileage');
    revalidatePath('/account/mileage');
    return { ok: true as const };
  });
}
