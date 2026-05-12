'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireRole, requireAuth } from '@/lib/auth/guards';
import { withServerAction } from '@/lib/server-actions';
import { insertAuditEvent } from '@/lib/domain/audit';
import { notifyUser } from '@/lib/domain/notifications';
import { isActiveAgent } from '@/lib/domain/admin/consignments';

const consignSchema = z.object({
  agent_id: z.string().uuid('에이전트를 선택해주세요'),
  sku_id: z.string().uuid('SKU를 선택해주세요'),
  qty: z.coerce.number().int().min(1).max(10_000),
  unit_cost: z.coerce.number().int().min(0).max(10_000_000),
});

const releaseSchema = z.object({
  inventory_id: z.string().uuid('대상 인벤토리 행이 필요해요'),
  qty: z.coerce.number().int().min(1).max(10_000),
  reason: z.string().max(400).optional(),
});

const updateUnitCostSchema = z.object({
  inventory_id: z.string().uuid('대상 인벤토리 행이 필요해요'),
  unit_cost: z.coerce.number().int().min(0).max(10_000_000),
  reason: z.string().max(400).optional(),
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

    const { agent_id, sku_id, qty, unit_cost } = parsed.data;

    // 에이전트 role 확인 — admin client 로 RLS 우회 (JWT 갱신 상태 무관)
    if (!(await isActiveAgent(agent_id))) {
      throw Object.assign(new Error('대상 사용자에게 agent role이 없어요'), {
        code: 'NOT_AGENT',
      });
    }

    const supabase = await createSupabaseServerClient();

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
      body: `${qty.toLocaleString('ko-KR')}매가 정산 단가 ${unit_cost.toLocaleString('ko-KR')}원으로 재고에 추가됐어요. 판매 등록을 시작할 수 있어요.`,
      linkTo: '/agent/inventory',
    });

    revalidatePath('/admin/consignments');
    revalidatePath('/agent/inventory');
    return { ok: true as const, inventory_id: inventoryId };
  });
}

/**
 * 위탁 출고 — 어드민이 특정 inventory 행에서 미리스팅(qty_available) 분을 에이전트에게 반환.
 *  - qty_reserved 는 매물에 묶여있어 출고 불가 → qty_available 한도 내에서만 허용.
 *  - 행이 (0, 0) 되어도 row 는 보존 (history 보호). 향후 별도 cleanup 으로 제거 가능.
 */
export async function releaseConsignmentAction(formData: FormData) {
  return withServerAction('releaseConsignment', async () => {
    await requireRole('admin');
    const actor = await requireAuth();

    const parsed = releaseSchema.safeParse({
      inventory_id: formData.get('inventory_id'),
      qty: formData.get('qty'),
      reason: formData.get('reason') ?? undefined,
    });
    if (!parsed.success) {
      throw Object.assign(new Error(parsed.error.issues[0]?.message ?? '입력값을 확인해주세요'), {
        code: 'VALIDATION',
      });
    }

    const supabase = await createSupabaseServerClient();
    const { inventory_id, qty, reason } = parsed.data;

    // 현재 행 조회 (server client + admin RLS — 서버 액션은 admin role 확인 이후라 안전)
    const { data: row, error: fetchErr } = await supabase
      .from('agent_inventory')
      .select('id, agent_id, sku_id, qty_available, qty_reserved, unit_cost')
      .eq('id', inventory_id)
      .maybeSingle<{
        id: string;
        agent_id: string;
        sku_id: string;
        qty_available: number;
        qty_reserved: number;
        unit_cost: number;
      }>();
    if (fetchErr || !row) {
      throw Object.assign(new Error('대상 인벤토리 행을 찾을 수 없어요'), {
        code: 'NOT_FOUND',
      });
    }
    if (qty > row.qty_available) {
      throw Object.assign(
        new Error(
          `출고 가능 수량을 초과해요 (보유 ${row.qty_available}, 요청 ${qty}). 판매중(${row.qty_reserved})은 출고할 수 없어요.`,
        ),
        { code: 'INSUFFICIENT' },
      );
    }

    const { error: updateErr } = await supabase
      .from('agent_inventory')
      .update({
        qty_available: row.qty_available - qty,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    if (updateErr) {
      throw Object.assign(new Error(updateErr.message), { code: 'DB_ERROR' });
    }

    await insertAuditEvent(supabase, {
      actor_id: actor.id,
      entity_type: 'agent_inventory',
      entity_id: row.id,
      event: 'consignment_released',
      metadata: {
        agent_id: row.agent_id,
        sku_id: row.sku_id,
        qty,
        unit_cost: row.unit_cost,
        reason: reason ?? null,
      },
    });

    await notifyUser(supabase, {
      userId: row.agent_id,
      kind: 'agent_inventory_released',
      title: '위탁 재고가 출고됐어요',
      body: `${qty.toLocaleString('ko-KR')}매가 반환됐어요${reason ? ` — ${reason}` : ''}.`,
      linkTo: '/agent/inventory',
    });

    revalidatePath('/admin/consignments');
    revalidatePath('/agent/inventory');
    return { ok: true as const, inventory_id: row.id };
  });
}

/**
 * 위탁 정산 단가 수정 — 어드민이 기존 inventory 행의 unit_cost 를 변경.
 *  - 기존 listing 의 unit_price 는 영향 받지 않음 (listing 에 자체 unit_price 가 복사돼 있음).
 *  - 변경 후 등록되는 신규 listing 부터 새 단가가 floor 로 적용됨.
 *  - (agent, sku, unit_cost) UNIQUE 제약 위반 시 차단.
 */
export async function updateConsignmentUnitCostAction(formData: FormData) {
  return withServerAction('updateConsignmentUnitCost', async () => {
    await requireRole('admin');
    const actor = await requireAuth();

    const parsed = updateUnitCostSchema.safeParse({
      inventory_id: formData.get('inventory_id'),
      unit_cost: formData.get('unit_cost'),
      reason: formData.get('reason') ?? undefined,
    });
    if (!parsed.success) {
      throw Object.assign(new Error(parsed.error.issues[0]?.message ?? '입력값을 확인해주세요'), {
        code: 'VALIDATION',
      });
    }

    const supabase = await createSupabaseServerClient();
    const { inventory_id, unit_cost, reason } = parsed.data;

    const { data: row, error: fetchErr } = await supabase
      .from('agent_inventory')
      .select('id, agent_id, sku_id, unit_cost, qty_available, qty_reserved')
      .eq('id', inventory_id)
      .maybeSingle<{
        id: string;
        agent_id: string;
        sku_id: string;
        unit_cost: number;
        qty_available: number;
        qty_reserved: number;
      }>();
    if (fetchErr || !row) {
      throw Object.assign(new Error('대상 인벤토리 행을 찾을 수 없어요'), {
        code: 'NOT_FOUND',
      });
    }

    if (row.unit_cost === unit_cost) {
      return { ok: true as const, inventory_id: row.id, changed: false };
    }

    // UNIQUE (agent_id, sku_id, unit_cost) 충돌 사전 차단
    const { data: conflict } = await supabase
      .from('agent_inventory')
      .select('id')
      .eq('agent_id', row.agent_id)
      .eq('sku_id', row.sku_id)
      .eq('unit_cost', unit_cost)
      .neq('id', row.id)
      .maybeSingle<{ id: string }>();
    if (conflict) {
      throw Object.assign(
        new Error(
          '같은 에이전트·권종에 동일 단가의 다른 재고 행이 이미 있어요. 합치려면 한 쪽을 출고한 뒤 다시 입고하세요.',
        ),
        { code: 'UNIQUE_CONFLICT' },
      );
    }

    const oldCost = row.unit_cost;
    const { error: updateErr } = await supabase
      .from('agent_inventory')
      .update({ unit_cost, updated_at: new Date().toISOString() })
      .eq('id', row.id);
    if (updateErr) {
      throw Object.assign(new Error(updateErr.message), { code: 'DB_ERROR' });
    }

    await insertAuditEvent(supabase, {
      actor_id: actor.id,
      entity_type: 'agent_inventory',
      entity_id: row.id,
      event: 'consignment_unit_cost_updated',
      metadata: {
        agent_id: row.agent_id,
        sku_id: row.sku_id,
        from: oldCost,
        to: unit_cost,
        reason: reason ?? null,
      },
    });

    await notifyUser(supabase, {
      userId: row.agent_id,
      kind: 'agent_inventory_cost_changed',
      title: '위탁 정산 단가가 변경됐어요',
      body: `정산 단가가 ${oldCost.toLocaleString('ko-KR')}원 → ${unit_cost.toLocaleString('ko-KR')}원으로 변경됐어요${reason ? ` — ${reason}` : ''}. 이후 등록하는 판매부터 새 단가가 적용돼요.`,
      linkTo: '/agent/inventory',
    });

    revalidatePath('/admin/consignments');
    revalidatePath('/agent/inventory');
    return { ok: true as const, inventory_id: row.id, changed: true };
  });
}
