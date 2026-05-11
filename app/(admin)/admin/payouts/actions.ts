'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/guards';
import { withServerAction } from '@/lib/server-actions';
import { callReleasePayout } from '@/lib/domain/payouts';

const releaseSchema = z.object({
  payout_id: z.string().uuid(),
  memo: z.string().max(400).optional(),
});

/**
 * pending → released 전이.
 * RPC 가 admin role 검증 + 상태 전이 + audit_events 기록을 책임진다.
 * memo 는 admin_memo 컬럼에 별도 UPDATE.
 */
export async function releasePayoutAction(formData: FormData) {
  return withServerAction('releasePayout', async () => {
    await requireRole('admin');

    const rawMemo = formData.get('memo');
    const parsed = releaseSchema.safeParse({
      payout_id: formData.get('payout_id'),
      memo: typeof rawMemo === 'string' && rawMemo.trim().length > 0 ? rawMemo : undefined,
    });
    if (!parsed.success) {
      throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user: admin },
    } = await supabase.auth.getUser();
    if (!admin) {
      throw Object.assign(new Error('UNAUTHENTICATED'), { code: 'UNAUTHENTICATED' });
    }

    await callReleasePayout(parsed.data.payout_id, admin.id);

    if (parsed.data.memo) {
      await supabase
        .from('payouts')
        .update({ admin_memo: parsed.data.memo })
        .eq('id', parsed.data.payout_id);
    }

    revalidatePath('/admin/payouts');
    return { ok: true as const };
  });
}
