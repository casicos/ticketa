'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/guards';
import { withServerAction } from '@/lib/server-actions';
import { claimGiftMileage, claimGiftDelivery, refundGift, sendGift } from '@/lib/domain/gifts';

const giftIdSchema = z.object({ gift_id: z.string().uuid() });

export async function claimGiftMileageAction(formData: FormData) {
  return withServerAction('claimGiftMileage', async () => {
    await requireAuth();
    const parsed = giftIdSchema.safeParse({ gift_id: formData.get('gift_id') });
    if (!parsed.success) {
      throw Object.assign(new Error('gift_id 누락'), { code: 'VALIDATION' });
    }
    const supabase = await createSupabaseServerClient();
    await claimGiftMileage(supabase, parsed.data.gift_id);
    revalidatePath('/account/gift');
    revalidatePath('/account/mileage');
    return { ok: true as const };
  });
}

const claimDeliverySchema = z.object({
  gift_id: z.string().uuid(),
  address_id: z.string().uuid('배송지를 선택해주세요'),
});

export async function claimGiftDeliveryAction(formData: FormData) {
  return withServerAction('claimGiftDelivery', async () => {
    await requireAuth();
    const parsed = claimDeliverySchema.safeParse({
      gift_id: formData.get('gift_id'),
      address_id: formData.get('address_id'),
    });
    if (!parsed.success) {
      throw Object.assign(new Error(parsed.error.issues[0]?.message ?? '입력값을 확인해주세요'), {
        code: 'VALIDATION',
      });
    }
    const supabase = await createSupabaseServerClient();
    await claimGiftDelivery(supabase, parsed.data.gift_id, parsed.data.address_id);
    revalidatePath('/account/gift');
    return { ok: true as const };
  });
}

export async function refundGiftAction(formData: FormData) {
  return withServerAction('refundGift', async () => {
    await requireAuth();
    const parsed = giftIdSchema.safeParse({ gift_id: formData.get('gift_id') });
    if (!parsed.success) {
      throw Object.assign(new Error('gift_id 누락'), { code: 'VALIDATION' });
    }
    const supabase = await createSupabaseServerClient();
    await refundGift(supabase, parsed.data.gift_id);
    revalidatePath('/account/gift');
    revalidatePath('/account/mileage');
    return { ok: true as const };
  });
}

const sendSchema = z.object({
  recipient_nickname: z.string().trim().min(1, '받는 사람 닉네임을 입력하세요').max(40),
  inventory_id: z.string().uuid(),
  qty: z.coerce.number().int().min(1).max(100),
  unit_price: z.coerce.number().int().min(1).max(10_000_000),
  message: z.string().trim().max(200).optional().or(z.literal('')),
});

export async function sendGiftAction(formData: FormData) {
  return withServerAction('sendGift', async () => {
    await requireAuth();
    const parsed = sendSchema.safeParse({
      recipient_nickname: formData.get('recipient_nickname'),
      inventory_id: formData.get('inventory_id'),
      qty: formData.get('qty'),
      unit_price: formData.get('unit_price'),
      message: formData.get('message') ?? '',
    });
    if (!parsed.success) {
      throw Object.assign(new Error(parsed.error.issues[0]?.message ?? '입력값을 확인해주세요'), {
        code: 'VALIDATION',
      });
    }
    const supabase = await createSupabaseServerClient();
    const giftId = await sendGift(supabase, {
      recipientNickname: parsed.data.recipient_nickname,
      inventoryId: parsed.data.inventory_id,
      qty: parsed.data.qty,
      unitPrice: parsed.data.unit_price,
      message: parsed.data.message ? parsed.data.message : null,
    });
    revalidatePath('/account/gift');
    revalidatePath('/account/mileage');
    return { ok: true as const, gift_id: giftId };
  });
}
