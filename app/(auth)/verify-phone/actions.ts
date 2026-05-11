'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { verifyOtpSchema, normalizeKoreanPhone } from '@/lib/domain/schemas/auth';
import { withServerAction } from '@/lib/server-actions';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';

// 서버 전용 ENABLE_DEV_OTP 로만 판정. NEXT_PUBLIC_* 은 클라이언트 번들에 포함되므로
// 사용 금지.
// NODE_ENV 가드는 사용 안 함 — Vercel 이 dev 배포에서도 NODE_ENV=production 으로 강제하므로.
//
// **임시 운영 정책 (KR SMS provider 전환 진행 중)**:
//   - 발신번호 등록(KISA) 대기 동안 OTP 입력 자체를 비활성화하고 통과시킴.
//   - INTERIM_OTP_DISABLED=true 면 어떤 코드 입력도 받지 않고 phone_verified=true 만 마킹.
//   - Nurigo 통합 완료 후엔 INTERIM_OTP_DISABLED=false 로 되돌리고 정상 OTP UX 복원.
const INTERIM_OTP_DISABLED = true;
const DEV_MODE = process.env.ENABLE_DEV_OTP === 'true' || INTERIM_OTP_DISABLED;
if (INTERIM_OTP_DISABLED) {
  console.warn(
    '[verify-phone] INTERIM_OTP_DISABLED=true → OTP 입력 우회. KR SMS 전환 시 false 로 되돌릴 것.',
  );
}

/**
 * 현재 로그인 사용자의 phone 번호로 OTP 발송 요청.
 * - production: Supabase Auth `updateUser({phone})` 호출 → SMS provider 가 OTP 발송
 * - development: Supabase 호출 스킵, public.users.phone 만 저장하고 바로 ok. 검증은 고정 코드 `765432`.
 *
 * 사유: MVP dev 환경은 SMS provider 미연동. 플랜 Section 4.3 Phase 1 Day 1 PoC 의 fallback 경로.
 */
export async function requestPhoneOtpAction(formData: FormData) {
  return withServerAction('requestPhoneOtp', async () => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const err = new Error('UNAUTHENTICATED') as Error & { code?: string };
      err.code = 'UNAUTHENTICATED';
      throw err;
    }

    let phone = String(formData.get('phone') ?? '').trim();
    if (!phone) {
      const { data: profile } = await supabase
        .from('users')
        .select('phone')
        .eq('id', user.id)
        .maybeSingle<{ phone: string | null }>();
      phone = profile?.phone ?? '';
    }

    if (!phone) {
      const err = new Error('휴대폰 번호를 입력해주세요') as Error & { code?: string };
      err.code = 'PHONE_MISSING';
      throw err;
    }

    const phoneE164 = normalizeKoreanPhone(phone);

    // dev: Supabase SMS 우회. 번호만 저장하고 진행.
    if (DEV_MODE) {
      const { error: updErr } = await supabase
        .from('users')
        .update({ phone: phoneE164 })
        .eq('id', user.id);
      if (updErr) {
        const err = new Error(updErr.message) as Error & { code?: string };
        err.code = 'PROFILE_UPDATE_FAILED';
        throw err;
      }
      return { phone: phoneE164, dev: true as const };
    }

    const { error } = await supabase.auth.updateUser({ phone: phoneE164 });
    if (error) {
      const err = new Error(error.message) as Error & { code?: string };
      err.code = 'OTP_REQUEST_FAILED';
      throw err;
    }

    return { phone: phoneE164, dev: false as const };
  });
}

/**
 * 사용자가 입력한 6자리 OTP 검증.
 * - production: Supabase verifyOtp(phone, token, type='phone_change')
 * - development: 고정 OTP `765432` 과 비교
 * 성공 시 public.users.phone_verified=true UPDATE 후 next 로 redirect.
 */
export async function verifyPhoneOtpAction(formData: FormData) {
  return withServerAction('verifyPhoneOtp', async () => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const err = new Error('UNAUTHENTICATED') as Error & { code?: string };
      err.code = 'UNAUTHENTICATED';
      throw err;
    }

    const nextParam = sanitizeRedirectPath(String(formData.get('next') ?? '/'));
    const phoneRaw = String(formData.get('phone') ?? '').trim();
    const phone = phoneRaw ? normalizeKoreanPhone(phoneRaw) : '';
    const fullName = String(formData.get('full_name') ?? '').trim();
    const carrierRaw = String(formData.get('carrier') ?? '').trim();
    const ALLOWED_CARRIERS = ['skt', 'kt', 'lgu', 'mvno_skt', 'mvno_kt'] as const;
    const carrier = (ALLOWED_CARRIERS as readonly string[]).includes(carrierRaw)
      ? carrierRaw
      : null;

    // 임시 정책: INTERIM_OTP_DISABLED 동안 OTP 입력 자체를 우회.
    // 본인인증 단계에서 받은 실명·휴대폰·통신사를 함께 저장 (가입 시 미수집).
    if (INTERIM_OTP_DISABLED) {
      const updates: {
        phone_verified: boolean;
        phone?: string;
        full_name?: string;
        carrier?: string;
      } = { phone_verified: true };
      if (phone) updates.phone = phone;
      if (fullName) updates.full_name = fullName;
      if (carrier) updates.carrier = carrier;

      const { error: updErr } = await supabase.from('users').update(updates).eq('id', user.id);
      if (updErr) {
        const err = new Error(updErr.message) as Error & { code?: string };
        err.code = 'PROFILE_UPDATE_FAILED';
        throw err;
      }
      // 본인인증 직후엔 환영 화면(/welcome)을 거쳐 nextPath 로 이어짐.
      // 클라이언트가 refreshSession() 후 router.push 로 이동 (JWT 캐시 갱신 보장).
      return { redirectTo: `/welcome?next=${encodeURIComponent(nextParam)}` };
    }

    const parsed = verifyOtpSchema.safeParse({ token: String(formData.get('token') ?? '') });
    if (!parsed.success) {
      const err = new Error('인증코드가 일치하지 않습니다') as Error & { code?: string };
      err.code = 'OTP_INVALID_FORMAT';
      throw err;
    }

    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: parsed.data.token,
      type: 'phone_change',
    });

    if (error) {
      const err = new Error('인증코드가 일치하지 않습니다') as Error & { code?: string };
      err.code = 'OTP_MISMATCH';
      throw err;
    }

    const { error: updErr } = await supabase
      .from('users')
      .update({ phone_verified: true, phone })
      .eq('id', user.id);
    if (updErr) {
      const err = new Error(updErr.message) as Error & { code?: string };
      err.code = 'PROFILE_UPDATE_FAILED';
      throw err;
    }

    // 클라이언트가 refreshSession() 후 router.push 로 이동 (JWT 캐시 갱신 보장).
    return { redirectTo: nextParam };
  });
}
