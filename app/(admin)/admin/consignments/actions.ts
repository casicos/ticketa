'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireRole, requireAuth } from '@/lib/auth/guards';
import { withServerAction } from '@/lib/server-actions';
import { insertAuditEvent } from '@/lib/domain/audit';
import { notifyUser } from '@/lib/domain/notifications';

const consignSchema = z.object({
  agent_id: z.string().uuid('에이전트를 선택해주세요'),
  sku_id: z.string().uuid('SKU를 선택해주세요'),
  qty: z.coerce.number().int().min(1).max(10_000),
  unit_cost: z.coerce.number().int().min(0).max(10_000_000),
});

/**
 * 위탁 입고 처리 (어드민 → agent_inventory 적재).
 * 시나리오 [4]: 에이전트가 위탁한 매물을 어드민이 검수/수령 → 인벤토리에 추가.
 *
 * 동일 (agent_id, sku_id, unit_cost) 행이 이미 있으면 qty_available 만 증가.
 * 없으면 새 행 insert.
 */
export async function admitConsignmentAction(formData: FormData) {
  return withServerAction('admitConsignment', async () => {
    await requireRole('admin');
    const actor = await requireAuth();

    const parsed = consignSchema.safeParse({
      agent_id: formData.get('agent_id'),
      sku_id: formData.get('sku_id'),
      qty: formData.get('qty'),
      unit_cost: formData.get('unit_cost'),
    });
    if (!parsed.success) {
      throw Object.assign(new Error(parsed.error.issues[0]?.message ?? '입력값을 확인해주세요'), {
        code: 'VALIDATION',
      });
    }

    const supabase = await createSupabaseServerClient();
    const { agent_id, sku_id, qty, unit_cost } = parsed.data;

    // 에이전트 role 확인
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', agent_id)
      .eq('role', 'agent')
      .is('revoked_at', null)
      .maybeSingle();
    if (!roleRow) {
      throw Object.assign(new Error('대상 사용자에게 agent role이 없어요'), {
        code: 'NOT_AGENT',
      });
    }

    // upsert: 같은 (agent, sku, cost) 이면 qty_available 만 증가
    const { data: existing } = await supabase
      .from('agent_inventory')
      .select('id, qty_available')
      .eq('agent_id', agent_id)
      .eq('sku_id', sku_id)
      .eq('unit_cost', unit_cost)
      .maybeSingle<{ id: string; qty_available: number }>();

    let inventoryId: string;
    if (existing) {
      const { error } = await supabase
        .from('agent_inventory')
        .update({
          qty_available: existing.qty_available + qty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) {
        throw Object.assign(new Error(error.message), { code: 'DB_ERROR' });
      }
      inventoryId = existing.id;
    } else {
      const { data: ins, error } = await supabase
        .from('agent_inventory')
        .insert({
          agent_id,
          sku_id,
          qty_available: qty,
          qty_reserved: 0,
          unit_cost,
        })
        .select('id')
        .single<{ id: string }>();
      if (error || !ins) {
        throw Object.assign(new Error(error?.message ?? '적재 실패'), {
          code: 'DB_ERROR',
        });
      }
      inventoryId = ins.id;
    }

    // 감사 로그
    await insertAuditEvent(supabase, {
      actor_id: actor.id,
      entity_type: 'agent_inventory',
      entity_id: inventoryId,
      event: 'consignment_admitted',
      metadata: { agent_id, sku_id, qty, unit_cost },
    });

    // 에이전트에게 알림
    await notifyUser(supabase, {
      userId: agent_id,
      kind: 'agent_inventory_loaded',
      title: '위탁 재고가 적재됐어요',
      body: `${qty.toLocaleString('ko-KR')}매 위탁가 ${unit_cost.toLocaleString('ko-KR')}원으로 재고에 추가됐어요. 판매 등록을 시작할 수 있어요.`,
      linkTo: '/agent/inventory',
    });

    revalidatePath('/admin/consignments');
    revalidatePath('/agent/inventory');
    return { ok: true as const, inventory_id: inventoryId };
  });
}
