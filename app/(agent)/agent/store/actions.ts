'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireRole, requireAuth } from '@/lib/auth/guards';
import { withServerAction } from '@/lib/server-actions';

const storeSchema = z.object({
  store_name: z
    .string()
    .trim()
    .min(2, '상점명은 2자 이상이어야 해요')
    .max(20, '상점명은 20자 이내여야 해요'),
  store_intro: z
    .string()
    .trim()
    .max(60, '한 줄 소개는 60자 이내여야 해요')
    .optional()
    .or(z.literal('')),
});

export async function updateStoreInfoAction(formData: FormData) {
  return withServerAction('updateStoreInfo', async () => {
    await requireRole('agent');
    const user = await requireAuth();

    const parsed = storeSchema.safeParse({
      store_name: String(formData.get('store_name') ?? ''),
      store_intro: String(formData.get('store_intro') ?? ''),
    });
    if (!parsed.success) {
      throw Object.assign(new Error(parsed.error.issues[0]?.message ?? '입력값을 확인해주세요'), {
        code: 'VALIDATION',
      });
    }

    const supabase = await createSupabaseServerClient();

    // 닉네임/store_name unique 충돌 → friendly 메시지
    const { error } = await supabase
      .from('users')
      .update({
        store_name: parsed.data.store_name,
        store_intro: parsed.data.store_intro || null,
      })
      .eq('id', user.id);
    if (error) {
      if (/duplicate|unique|23505/i.test(error.message)) {
        throw Object.assign(new Error('이미 사용 중인 상점명이에요. 다른 이름을 선택해주세요.'), {
          code: 'DUPLICATE_STORE_NAME',
        });
      }
      throw Object.assign(new Error(error.message), { code: 'DB_ERROR' });
    }

    revalidatePath('/agent/store');
    revalidatePath('/agent');
    return { ok: true as const };
  });
}
