'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { signupSchema, usernameToSynthEmail } from '@/lib/domain/schemas/auth';
import { withServerAction } from '@/lib/server-actions';

export async function signupAction(formData: FormData) {
  const result = await withServerAction('signup', async () => {
    const raw = {
      username: String(formData.get('username') ?? ''),
      password: String(formData.get('password') ?? ''),
      password_confirm: String(formData.get('password_confirm') ?? ''),
      agree_terms: formData.get('agree_terms') === 'on' || formData.get('agree_terms') === 'true',
      agree_privacy:
        formData.get('agree_privacy') === 'on' || formData.get('agree_privacy') === 'true',
      marketing_opt_in:
        formData.get('marketing_opt_in') === 'on' || formData.get('marketing_opt_in') === 'true',
    };

    const parsed = signupSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const err = new Error(first?.message ?? 'VALIDATION') as Error & { code?: string };
      err.code = 'VALIDATION';
      throw err;
    }

    const data = parsed.data;
    const synthEmail = usernameToSynthEmail(data.username);

    const supabase = await createSupabaseServerClient();

    // 합성 이메일로 Supabase signUp.
    // handle_new_user 트리거가 raw_user_meta_data 의 username/marketing_opt_in 을
    // public.users 로 픽업. 실명·휴대폰은 본인인증 단계에서 별도로 update.
    const { error: signUpError } = await supabase.auth.signUp({
      email: synthEmail,
      password: data.password,
      options: {
        data: {
          username: data.username,
          marketing_opt_in: data.marketing_opt_in,
        },
      },
    });

    if (signUpError) {
      const lower = signUpError.message.toLowerCase();
      const message =
        lower.includes('already') || lower.includes('exists') || lower.includes('duplicate')
          ? '이미 사용 중인 아이디입니다'
          : signUpError.message;
      const err = new Error(message) as Error & { code?: string };
      err.code = 'SIGNUP_FAILED';
      throw err;
    }

    return { redirect: '/verify-phone' as const };
  });

  if (result.ok) {
    redirect(result.data.redirect);
  }
  return result;
}
