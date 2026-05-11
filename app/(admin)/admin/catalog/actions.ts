'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAuth, requireRole } from '@/lib/auth/guards';
import { withServerAction } from '@/lib/server-actions';
import { insertAuditEvent } from '@/lib/domain/audit';
import { skuCreateSchema, skuUpdateSchema, skuToggleSchema } from '@/lib/domain/schemas/sku';

function readCommissionFields(formData: FormData) {
  const type = formData.get('commission_type');
  const amount = formData.get('commission_amount');
  const chargedTo = formData.get('commission_charged_to');
  return {
    commission_type: type || undefined,
    commission_amount: amount !== null && amount !== '' ? amount : undefined,
    commission_charged_to: chargedTo || undefined,
  };
}

export async function createSkuAction(formData: FormData) {
  return withServerAction('createSku', async () => {
    await requireRole('admin');
    const user = await requireAuth();

    const commission = readCommissionFields(formData);

    const parsed = skuCreateSchema.safeParse({
      brand: formData.get('brand'),
      denomination: formData.get('denomination'),
      display_order: formData.get('display_order'),
      commission_type: commission.commission_type ?? 'fixed',
      commission_amount: commission.commission_amount ?? 0,
      commission_charged_to: commission.commission_charged_to ?? 'seller',
    });
    if (!parsed.success) {
      throw Object.assign(
        new Error(parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다'),
        {
          code: 'VALIDATION',
        },
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data: sku, error } = await supabase
      .from('sku')
      .insert(parsed.data)
      .select(
        'id, brand, denomination, display_order, is_active, commission_type, commission_amount, commission_charged_to',
      )
      .single();

    if (error) {
      if (error.code === '23505') {
        throw Object.assign(new Error('이미 존재하는 SKU 입니다'), { code: 'DUPLICATE' });
      }
      throw Object.assign(new Error(error.message), { code: 'DB_ERROR' });
    }

    await insertAuditEvent(supabase, {
      actor_id: user.id,
      entity_type: 'sku',
      entity_id: sku.id,
      event: 'created',
      metadata: {
        brand: sku.brand,
        denomination: sku.denomination,
        display_order: sku.display_order,
        commission_type: sku.commission_type,
        commission_amount: sku.commission_amount,
        commission_charged_to: sku.commission_charged_to,
      },
    });

    revalidatePath('/admin/catalog');
    return sku;
  });
}

export async function updateSkuAction(formData: FormData) {
  return withServerAction('updateSku', async () => {
    await requireRole('admin');
    const user = await requireAuth();

    const commission = readCommissionFields(formData);

    const parsed = skuUpdateSchema.safeParse({
      id: formData.get('id'),
      brand: formData.get('brand') || undefined,
      denomination: formData.get('denomination') || undefined,
      display_order:
        formData.get('display_order') !== null && formData.get('display_order') !== ''
          ? formData.get('display_order')
          : undefined,
      commission_type: commission.commission_type,
      commission_amount: commission.commission_amount,
      commission_charged_to: commission.commission_charged_to,
    });
    if (!parsed.success) {
      throw Object.assign(
        new Error(parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다'),
        {
          code: 'VALIDATION',
        },
      );
    }

    const { id, ...fields } = parsed.data;

    const supabase = await createSupabaseServerClient();

    // Fetch before state for audit diff
    const { data: before } = await supabase
      .from('sku')
      .select(
        'brand, denomination, display_order, is_active, commission_type, commission_amount, commission_charged_to',
      )
      .eq('id', id)
      .single();

    const { data: sku, error } = await supabase
      .from('sku')
      .update(fields)
      .eq('id', id)
      .select(
        'id, brand, denomination, display_order, is_active, commission_type, commission_amount, commission_charged_to',
      )
      .single();

    if (error) {
      if (error.code === '23505') {
        throw Object.assign(new Error('이미 존재하는 SKU 입니다'), { code: 'DUPLICATE' });
      }
      throw Object.assign(new Error(error.message), { code: 'DB_ERROR' });
    }

    await insertAuditEvent(supabase, {
      actor_id: user.id,
      entity_type: 'sku',
      entity_id: sku.id,
      event: 'updated',
      metadata: {
        before,
        after: {
          brand: sku.brand,
          denomination: sku.denomination,
          display_order: sku.display_order,
          commission_type: sku.commission_type,
          commission_amount: sku.commission_amount,
          commission_charged_to: sku.commission_charged_to,
        },
      },
    });

    revalidatePath('/admin/catalog');
    return sku;
  });
}

export async function toggleSkuActiveAction(formData: FormData) {
  return withServerAction('toggleSkuActive', async () => {
    await requireRole('admin');
    const user = await requireAuth();

    const parsed = skuToggleSchema.safeParse({
      id: formData.get('id'),
      is_active: formData.get('is_active'),
    });
    if (!parsed.success) {
      throw Object.assign(
        new Error(parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다'),
        {
          code: 'VALIDATION',
        },
      );
    }

    const { id, is_active } = parsed.data;
    const supabase = await createSupabaseServerClient();

    const { data: sku, error } = await supabase
      .from('sku')
      .update({ is_active })
      .eq('id', id)
      .select('id, brand, denomination, is_active')
      .single();

    if (error) {
      throw Object.assign(new Error(error.message), { code: 'DB_ERROR' });
    }

    await insertAuditEvent(supabase, {
      actor_id: user.id,
      entity_type: 'sku',
      entity_id: sku.id,
      event: is_active ? 'activated' : 'deactivated',
      from_state: is_active ? 'inactive' : 'active',
      to_state: is_active ? 'active' : 'inactive',
      metadata: { brand: sku.brand, denomination: sku.denomination },
    });

    revalidatePath('/admin/catalog');
    return sku;
  });
}
