'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withServerAction } from '@/lib/server-actions';
import { KOREAN_BANKS } from '@/lib/domain/banks';

const profileSchema = z.object({
  nickname: z.string().max(40).optional().default(''),
  marketing_opt_in: z.boolean().default(false),
});

const bankAccountSchema = z.object({
  bank_code: z.enum(KOREAN_BANKS.map((b) => b.code) as [string, ...string[]]),
  account_number: z.string().regex(/^\d{10,16}$/, '계좌번호는 숫자 10-16자리'),
  account_holder: z.string().min(1).max(40),
});

const passwordSchema = z
  .object({
    new_password: z
      .string()
      .min(8, '8자 이상')
      .regex(/[A-Za-z]/, '영문 포함')
      .regex(/[0-9]/, '숫자 포함'),
    confirm: z.string(),
  })
  .refine((d) => d.new_password === d.confirm, {
    message: '새 비밀번호와 확인 값이 달라요',
    path: ['confirm'],
  });

export async function updateProfileAction(formData: FormData) {
  return withServerAction('updateProfile', async () => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('UNAUTHENTICATED');

    const parsed = profileSchema.safeParse({
      nickname: String(formData.get('nickname') ?? ''),
      marketing_opt_in:
        formData.get('marketing_opt_in') === 'on' || formData.get('marketing_opt_in') === 'true',
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'VALIDATION');
    }

    const { error } = await supabase
      .from('users')
      .update({
        nickname: parsed.data.nickname || null,
        marketing_opt_in: parsed.data.marketing_opt_in,
      })
      .eq('id', user.id);
    if (error) throw error;

    revalidatePath('/account');
    return { ok: true as const };
  });
}

export async function updateBankAccountAction(formData: FormData) {
  return withServerAction('updateBankAccount', async () => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('UNAUTHENTICATED');

    const parsed = bankAccountSchema.safeParse({
      bank_code: formData.get('bank_code'),
      account_number: String(formData.get('account_number') ?? '').replace(/\D/g, ''),
      account_holder: String(formData.get('account_holder') ?? '').trim(),
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'VALIDATION');
    }

    // 기존 활성 계좌 비활성화 → 새 계좌 insert (정산 중 계좌 변경 영향 없음 — payout 스냅샷 이미 저장됨)
    const { error: deactivateErr } = await supabase
      .from('seller_payout_accounts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_active', true);
    if (deactivateErr) throw deactivateErr;

    const { error: insertErr } = await supabase.from('seller_payout_accounts').insert({
      user_id: user.id,
      bank_code: parsed.data.bank_code,
      // TODO(M1): pgp_sym_encrypt 로 암호화. 현재는 평문 bytea.
      account_number_encrypted: Buffer.from(parsed.data.account_number, 'utf8'),
      account_number_last4: parsed.data.account_number.slice(-4),
      account_holder: parsed.data.account_holder,
      is_active: true,
    });
    if (insertErr) throw insertErr;

    revalidatePath('/account');
    return { ok: true as const };
  });
}

export async function updatePasswordAction(formData: FormData) {
  return withServerAction('updatePassword', async () => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('UNAUTHENTICATED');

    const parsed = passwordSchema.safeParse({
      new_password: String(formData.get('new_password') ?? ''),
      confirm: String(formData.get('confirm') ?? ''),
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'VALIDATION');
    }

    const { error } = await supabase.auth.updateUser({ password: parsed.data.new_password });
    if (error) throw error;

    return { ok: true as const };
  });
}
