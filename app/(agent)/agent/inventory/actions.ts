'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireRole, requireAuth } from '@/lib/auth/guards';
import { withServerAction } from '@/lib/server-actions';

const createListingSchema = z.object({
  inventory_id: z.string().uuid(),
  qty: z.coerce.number().int().min(1).max(10_000),
  unit_price: z.coerce.number().int().min(1000).max(10_000_000),
});

export async function createAgentListingAction(formData: FormData) {
  return withServerAction('createAgentListing', async () => {
    await requireRole('agent');
    const user = await requireAuth();

    const parsed = createListingSchema.safeParse({
      inventory_id: formData.get('inventory_id'),
      qty: formData.get('qty'),
      unit_price: formData.get('unit_price'),
    });
    if (!parsed.success) {
      throw Object.assign(new Error(parsed.error.issues[0]?.message ?? '입력값을 확인해주세요'), {
        code: 'VALIDATION',
      });
    }

    const supabase = await createSupabaseServerClient();

    // 정산 단가 이상이어야 함 (플랫폼 손실 방지)
    const { data: inv } = await supabase
      .from('agent_inventory')
      .select('unit_cost')
      .eq('id', parsed.data.inventory_id)
      .eq('agent_id', user.id)
      .maybeSingle<{ unit_cost: number }>();
    if (inv && parsed.data.unit_price < inv.unit_cost) {
      throw Object.assign(
        new Error(`판매가는 정산 단가 ${inv.unit_cost.toLocaleString('ko-KR')}원 이상이어야 해요`),
        { code: 'PRICE_BELOW_COST' },
      );
    }

    const { data, error } = await supabase.rpc('create_agent_listing', {
      p_agent: user.id,
      p_inventory: parsed.data.inventory_id,
      p_qty: parsed.data.qty,
      p_unit_price: parsed.data.unit_price,
    });

    if (error) {
      throw Object.assign(new Error(error.message), { code: 'RPC_ERROR' });
    }
    if (data && typeof data === 'object' && 'ok' in data && !data.ok) {
      throw Object.assign(new Error('CREATE_FAILED'), { code: 'CREATE_FAILED' });
    }

    revalidatePath('/agent/inventory');
    revalidatePath('/agent');
    revalidatePath('/catalog');

    return {
      ok: true as const,
      listing_id:
        data && typeof data === 'object' && 'listing_id' in data
          ? (data.listing_id as string)
          : null,
    };
  });
}
