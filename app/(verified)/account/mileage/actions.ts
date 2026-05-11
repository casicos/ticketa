'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAuth, requirePhoneVerified } from '@/lib/auth/guards';
import { withServerAction } from '@/lib/server-actions';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';
import { callRequestWithdraw } from '@/lib/domain/mileage';
import { chargeRequestSchema, withdrawRequestSchema } from '@/lib/domain/schemas/mileage';

/**
 * 사용자 충전 요청 (무통장입금). PG 는 disabled.
 *  - charge_requests insert (status='pending', method='bank_transfer')
 *  - 성공 후 /account/mileage?just_requested=1 로 redirect (returnTo 가 있으면 쿼리 전달)
 */
export async function chargeRequestAction(formData: FormData): Promise<never> {
  let redirectTarget = '/account/mileage?just_requested=1';

  const result = await withServerAction('chargeRequest', async () => {
    await requirePhoneVerified();
    const user = await requireAuth();

    const parsed = chargeRequestSchema.safeParse({
      amount: formData.get('amount'),
      depositor_name: formData.get('depositor_name'),
      method: formData.get('method') ?? 'bank_transfer',
      return_to: formData.get('return_to') ?? undefined,
    });
    if (!parsed.success) {
      throw Object.assign(new Error(parsed.error.issues[0]?.message ?? '입력값을 확인해주세요'), {
        code: 'VALIDATION',
      });
    }

    if (parsed.data.method === 'pg') {
      throw Object.assign(new Error('PG 결제는 아직 준비 중입니다'), {
        code: 'PG_DISABLED',
      });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('charge_requests').insert({
      user_id: user.id,
      amount: parsed.data.amount,
      method: 'bank_transfer',
      status: 'pending',
      depositor_name: parsed.data.depositor_name,
    });
    if (error) {
      throw Object.assign(new Error(error.message), { code: 'DB_ERROR' });
    }

    const returnTo = sanitizeRedirectPath(parsed.data.return_to ?? null);
    if (returnTo && returnTo !== '/') {
      redirectTarget = `/account/mileage?just_requested=1&returnTo=${encodeURIComponent(returnTo)}`;
    }

    revalidatePath('/account/mileage');
    revalidatePath('/admin/mileage');
    return { ok: true };
  });

  if (!result.ok) {
    const params = new URLSearchParams();
    params.set('error', result.code);
    if (result.message) params.set('error_message', result.message);
    redirect(`/account/mileage/charge?${params.toString()}`);
  }

  redirect(redirectTarget);
}

/**
 * 사용자 출금 신청. cash_balance 만 허용 (RPC 검증).
 *  - request_withdraw RPC 가 cash_balance hold.
 *  - INSUFFICIENT_WITHDRAWABLE 에러 시 친절한 메시지 + 현재 balance 표시.
 */
export async function withdrawRequestAction(formData: FormData): Promise<never> {
  const result = await withServerAction('withdrawRequest', async () => {
    await requirePhoneVerified();
    const user = await requireAuth();

    const parsed = withdrawRequestSchema.safeParse({
      amount: formData.get('amount'),
      account_id: formData.get('account_id'),
    });
    if (!parsed.success) {
      throw Object.assign(new Error(parsed.error.issues[0]?.message ?? '입력값을 확인해주세요'), {
        code: 'VALIDATION',
      });
    }

    const supabase = await createSupabaseServerClient();
    const { data: acct, error: acctErr } = await supabase
      .from('seller_payout_accounts')
      .select('bank_code, account_number_last4, account_holder')
      .eq('id', parsed.data.account_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle<{ bank_code: string; account_number_last4: string; account_holder: string }>();
    if (acctErr || !acct) {
      throw Object.assign(new Error('등록된 계좌를 찾을 수 없어요'), { code: 'ACCOUNT_NOT_FOUND' });
    }

    try {
      await callRequestWithdraw({
        userId: user.id,
        amount: parsed.data.amount,
        bankCode: acct.bank_code,
        accountNumberLast4: acct.account_number_last4,
        accountHolder: acct.account_holder,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('INSUFFICIENT_WITHDRAWABLE')) {
        throw Object.assign(
          new Error('출금 가능한 잔액이 부족해요. 마일리지 허브에서 다시 확인해주세요.'),
          { code: 'INSUFFICIENT_WITHDRAWABLE' },
        );
      }
      throw Object.assign(new Error(msg), { code: 'RPC_ERROR' });
    }

    revalidatePath('/account/mileage');
    revalidatePath('/admin/mileage');
    // 출금 신청은 cash_balance hold → /account 페이지 hero 의 마일리지 표시 무효화 필요.
    revalidatePath('/account');
    return { ok: true };
  });

  if (!result.ok) {
    const params = new URLSearchParams();
    params.set('error', result.code);
    if (result.message) params.set('error_message', result.message);
    redirect(`/account/mileage/withdraw?${params.toString()}`);
  }

  redirect('/account/mileage?just_withdrew=1');
}
