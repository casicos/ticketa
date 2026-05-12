'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/domain/schemas/auth';
import { resolveIdentifierToEmail } from '@/lib/domain/auth/resolve-identifier';
import { withServerAction } from '@/lib/server-actions';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';

export async function loginAction(formData: FormData) {
  const result = await withServerAction('login', async () => {
    const raw = {
      identifier: String(formData.get('identifier') ?? ''),
      password: String(formData.get('password') ?? ''),
    };
    const nextParam = sanitizeRedirectPath(String(formData.get('next') ?? '/'));

    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const err = new Error(first?.message ?? 'VALIDATION') as Error & { code?: string };
      err.code = 'VALIDATION';
      throw err;
    }

    const signInEmail = await resolveIdentifierToEmail(parsed.data.identifier);

    const supabase = await createSupabaseServerClient();
    const { data: auth, error } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: parsed.data.password,
    });

    if (error || !auth.user) {
      const err = new Error('아이디 또는 비밀번호가 올바르지 않습니다') as Error & {
        code?: string;
      };
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    // phone_verified 여부에 따라 분기
    const { data: profile } = await supabase
      .from('users')
      .select('phone_verified')
      .eq('id', auth.user.id)
      .maybeSingle<{ phone_verified: boolean }>();

    const destination = profile?.phone_verified ? nextParam : '/verify-phone';
    return { redirect: destination };
  });

  if (result.ok) {
    redirect(result.data.redirect);
  }
  return result;
}
