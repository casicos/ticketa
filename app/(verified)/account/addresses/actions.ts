'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/guards';
import { withServerAction } from '@/lib/server-actions';

const addressSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().max(20).optional().or(z.literal('')),
  recipient_name: z.string().trim().min(1, '받는 사람 이름을 입력하세요').max(40),
  recipient_phone: z.string().trim().min(9, '연락처를 입력하세요').max(20),
  postal_code: z.string().trim().min(5, '우편번호 5자리').max(7),
  address1: z.string().trim().min(1, '주소를 입력하세요').max(200),
  address2: z.string().trim().max(200).optional().or(z.literal('')),
  is_default: z.coerce.boolean().optional(),
});

export async function saveAddressAction(formData: FormData) {
  return withServerAction('saveAddress', async () => {
    const me = await requireAuth();
    const parsed = addressSchema.safeParse({
      id: formData.get('id') || undefined,
      label: formData.get('label') ?? '',
      recipient_name: formData.get('recipient_name'),
      recipient_phone: formData.get('recipient_phone'),
      postal_code: formData.get('postal_code'),
      address1: formData.get('address1'),
      address2: formData.get('address2') ?? '',
      is_default: formData.get('is_default') === 'on' || formData.get('is_default') === 'true',
    });
    if (!parsed.success) {
      throw Object.assign(new Error(parsed.error.issues[0]?.message ?? '입력값을 확인해주세요'), {
        code: 'VALIDATION',
      });
    }

    const supabase = await createSupabaseServerClient();
    const payload = {
      user_id: me.id,
      label: parsed.data.label || null,
      recipient_name: parsed.data.recipient_name,
      recipient_phone: parsed.data.recipient_phone,
      postal_code: parsed.data.postal_code,
      address1: parsed.data.address1,
      address2: parsed.data.address2 || null,
      is_default: parsed.data.is_default ?? false,
      updated_at: new Date().toISOString(),
    };

    // is_default 가 true 면 기존 default 해제
    if (payload.is_default) {
      await supabase
        .from('shipping_addresses')
        .update({ is_default: false })
        .eq('user_id', me.id)
        .neq('id', parsed.data.id ?? '00000000-0000-0000-0000-000000000000');
    }

    if (parsed.data.id) {
      const { error } = await supabase
        .from('shipping_addresses')
        .update(payload)
        .eq('id', parsed.data.id)
        .eq('user_id', me.id);
      if (error) throw Object.assign(new Error(error.message), { code: 'DB_ERROR' });
    } else {
      const { error } = await supabase.from('shipping_addresses').insert(payload);
      if (error) throw Object.assign(new Error(error.message), { code: 'DB_ERROR' });
    }

    revalidatePath('/account/addresses');
    return { ok: true as const };
  });
}

export async function deleteAddressAction(formData: FormData) {
  return withServerAction('deleteAddress', async () => {
    const me = await requireAuth();
    const id = String(formData.get('id') ?? '');
    if (!id) {
      throw Object.assign(new Error('id 누락'), { code: 'VALIDATION' });
    }
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('shipping_addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', me.id);
    if (error) throw Object.assign(new Error(error.message), { code: 'DB_ERROR' });
    revalidatePath('/account/addresses');
    return { ok: true as const };
  });
}

export async function setDefaultAddressAction(formData: FormData) {
  return withServerAction('setDefaultAddress', async () => {
    const me = await requireAuth();
    const id = String(formData.get('id') ?? '');
    if (!id) {
      throw Object.assign(new Error('id 누락'), { code: 'VALIDATION' });
    }
    const supabase = await createSupabaseServerClient();
    await supabase.from('shipping_addresses').update({ is_default: false }).eq('user_id', me.id);
    const { error } = await supabase
      .from('shipping_addresses')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', me.id);
    if (error) throw Object.assign(new Error(error.message), { code: 'DB_ERROR' });
    revalidatePath('/account/addresses');
    return { ok: true as const };
  });
}
