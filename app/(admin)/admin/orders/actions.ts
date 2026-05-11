'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireRole, requireAuth } from '@/lib/auth/guards';
import { withServerAction } from '@/lib/server-actions';
import { callRestoreListingStock } from '@/lib/domain/orders-rpc';
import { insertAuditEvent } from '@/lib/domain/audit';
import { z } from 'zod';

const orderIdSchema = z.object({ order_id: z.string().uuid() });
const cancelSchema = z.object({
  order_id: z.string().uuid(),
  reason: z.string().min(5).max(400),
});

/**
 * pending_payment → payment_confirmed
 */
export async function confirmPaymentAction(formData: FormData) {
  return withServerAction('confirmPayment', async () => {
    await requireRole('admin');
    const actor = await requireAuth();

    const parsed = orderIdSchema.safeParse({ order_id: formData.get('order_id') });
    if (!parsed.success) throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });

    const { order_id } = parsed.data;
    const supabase = await createSupabaseServerClient();

    const { data: order } = await supabase
      .from('orders')
      .select('status')
      .eq('id', order_id)
      .single();

    if (order?.status !== 'pending_payment') {
      throw Object.assign(new Error('BAD_STATE'), { code: 'BAD_STATE' });
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('orders')
      .update({ status: 'payment_confirmed', payment_confirmed_at: now })
      .eq('id', order_id);
    if (error) throw Object.assign(new Error('DB_ERROR'), { code: 'DB_ERROR' });

    await insertAuditEvent(supabase, {
      actor_id: actor.id,
      entity_type: 'order',
      entity_id: order_id,
      event: 'status_change:payment_confirmed',
      from_state: 'pending_payment',
      to_state: 'payment_confirmed',
    });

    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${order_id}`);
    return { ok: true };
  });
}

/**
 * payment_confirmed → shipped
 * 모든 order_items 를 fulfilled 로 전이 (플랜 6.1 — fulfilled_at 세팅)
 * 이로써 Phase 5 의 payout 자동 생성 트리거 조건 충족.
 */
export async function markShippedAction(formData: FormData) {
  return withServerAction('markShipped', async () => {
    await requireRole('admin');
    const actor = await requireAuth();

    const parsed = orderIdSchema.safeParse({ order_id: formData.get('order_id') });
    if (!parsed.success) throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });

    const { order_id } = parsed.data;
    const supabase = await createSupabaseServerClient();

    const { data: order } = await supabase
      .from('orders')
      .select('status')
      .eq('id', order_id)
      .single();

    if (order?.status !== 'payment_confirmed') {
      throw Object.assign(new Error('BAD_STATE'), { code: 'BAD_STATE' });
    }

    const now = new Date().toISOString();

    // 모든 order_items pending → fulfilled
    const { error: itemsError } = await supabase
      .from('order_items')
      .update({ status: 'fulfilled', fulfilled_at: now })
      .eq('order_id', order_id)
      .eq('status', 'pending');
    if (itemsError) throw Object.assign(new Error('DB_ERROR'), { code: 'DB_ERROR' });

    const { error: orderError } = await supabase
      .from('orders')
      .update({ status: 'shipped', shipped_at: now })
      .eq('id', order_id);
    if (orderError) throw Object.assign(new Error('DB_ERROR'), { code: 'DB_ERROR' });

    await insertAuditEvent(supabase, {
      actor_id: actor.id,
      entity_type: 'order',
      entity_id: order_id,
      event: 'status_change:shipped',
      from_state: 'payment_confirmed',
      to_state: 'shipped',
    });

    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${order_id}`);
    return { ok: true };
  });
}

/**
 * shipped → delivered
 */
export async function markDeliveredAction(formData: FormData) {
  return withServerAction('markDelivered', async () => {
    await requireRole('admin');
    const actor = await requireAuth();

    const parsed = orderIdSchema.safeParse({ order_id: formData.get('order_id') });
    if (!parsed.success) throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });

    const { order_id } = parsed.data;
    const supabase = await createSupabaseServerClient();

    const { data: order } = await supabase
      .from('orders')
      .select('status')
      .eq('id', order_id)
      .single();

    if (order?.status !== 'shipped') {
      throw Object.assign(new Error('BAD_STATE'), { code: 'BAD_STATE' });
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('orders')
      .update({ status: 'delivered', delivered_at: now })
      .eq('id', order_id);
    if (error) throw Object.assign(new Error('DB_ERROR'), { code: 'DB_ERROR' });

    await insertAuditEvent(supabase, {
      actor_id: actor.id,
      entity_type: 'order',
      entity_id: order_id,
      event: 'status_change:delivered',
      from_state: 'shipped',
      to_state: 'delivered',
    });

    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${order_id}`);
    return { ok: true };
  });
}

/**
 * 어드민 주문 취소 — restore_listing_stock RPC 가 cancelled 전이 + audit_events 처리.
 * cancel_reason 은 별도 UPDATE.
 */
export async function adminCancelOrderAction(formData: FormData) {
  return withServerAction('adminCancelOrder', async () => {
    await requireRole('admin');

    const parsed = cancelSchema.safeParse({
      order_id: formData.get('order_id'),
      reason: formData.get('reason'),
    });
    if (!parsed.success) throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });

    const { order_id, reason } = parsed.data;

    // restore_listing_stock 이 cancelled 전이 + audit_events 처리함
    await callRestoreListingStock(order_id);

    // reason 만 따로 UPDATE
    const supabase = await createSupabaseServerClient();
    await supabase.from('orders').update({ cancel_reason: reason }).eq('id', order_id);

    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${order_id}`);
    return { ok: true };
  });
}
