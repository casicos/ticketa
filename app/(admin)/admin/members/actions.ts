'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAuth, requireRole } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withServerAction } from '@/lib/server-actions';

const roleSchema = z.object({
  user_id: z.string().uuid('유효하지 않은 사용자 ID'),
  role: z.enum(['seller', 'agent', 'admin']),
});

/**
 * 역할 부여. user_roles unique active index 위반 시 이미 활성 상태로 보고 idempotent 처리.
 */
export async function grantRoleAction(formData: FormData) {
  return withServerAction('grantRole', async () => {
    await requireRole('admin');
    const parsed = roleSchema.safeParse({
      user_id: formData.get('user_id'),
      role: formData.get('role'),
    });
    if (!parsed.success) {
      throw Object.assign(
        new Error(parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다'),
        { code: 'VALIDATION' },
      );
    }

    const supabase = await createSupabaseServerClient();
    const actor = await requireAuth();

    const { error } = await supabase.from('user_roles').insert({
      user_id: parsed.data.user_id,
      role: parsed.data.role,
      granted_by: actor.id,
    });

    if (error) {
      // ux_user_roles_active 중복 = 이미 활성 역할 → idempotent
      if (error.code === '23505' || /duplicate/i.test(error.message)) {
        revalidatePath('/admin/members');
        revalidatePath('/admin/users');
        return { already_active: true as const };
      }
      throw Object.assign(new Error(error.message), { code: 'DB_ERROR' });
    }

    revalidatePath('/admin/members');
    revalidatePath('/admin/users');
    return { already_active: false as const };
  });
}

/**
 * 역할 회수. admin 의 자기 자신 admin 회수는 금지.
 */
export async function revokeRoleAction(formData: FormData) {
  return withServerAction('revokeRole', async () => {
    await requireRole('admin');
    const parsed = roleSchema.safeParse({
      user_id: formData.get('user_id'),
      role: formData.get('role'),
    });
    if (!parsed.success) {
      throw Object.assign(
        new Error(parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다'),
        { code: 'VALIDATION' },
      );
    }

    const actor = await requireAuth();
    if (parsed.data.role === 'admin' && parsed.data.user_id === actor.id) {
      throw Object.assign(new Error('자기 자신의 admin 권한은 회수할 수 없어요'), {
        code: 'SELF_ADMIN_REVOKE',
      });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('user_roles')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', parsed.data.user_id)
      .eq('role', parsed.data.role)
      .is('revoked_at', null);

    if (error) throw Object.assign(new Error(error.message), { code: 'DB_ERROR' });

    revalidatePath('/admin/members');
    revalidatePath('/admin/users');
    return { ok: true as const };
  });
}
