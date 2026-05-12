import { z } from 'zod';

// 휴대폰 번호: 국내 `010-1234-5678`, `01012345678`, 또는 E.164 `+821012345678` 허용.
// 하이픈/공백은 zod 검증 전에 trim + dehyphenate 하므로, regex는 숫자+선택적 '+' 기준.
const phoneInputSchema = z
  .string()
  .transform((v) => v.trim().replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^\+?\d{10,15}$/, '휴대폰 번호 형식이 올바르지 않습니다'));

// 합성 이메일 도메인. Supabase Auth 는 이메일을 1급 식별자로 요구하므로,
// username 가입 시 `${username}@ticketa.local` 로 변환해 저장한다.
// 사용자에게는 노출되지 않고, 로그인 시 식별자 → 이메일 변환 layer 만 거친다.
const SYNTH_EMAIL_DOMAIN = 'ticketa.local';

const USERNAME_RESERVED = new Set([
  'admin',
  'root',
  'support',
  'system',
  'ticketa',
  'official',
  'help',
  'security',
  'auth',
]);

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z
      .string()
      .regex(/^[a-z][a-z0-9_]{3,19}$/, '영문 소문자/숫자/언더스코어, 영문으로 시작하는 4~20자')
      .refine((v) => !USERNAME_RESERVED.has(v), '사용할 수 없는 아이디입니다'),
  );

// 가입 단계는 ID/비번/약관 만 받음. 실명·휴대폰은 본인인증 단계에서 수집.
export const signupSchema = z
  .object({
    username: usernameSchema,
    password: z
      .string()
      .min(8, '8자 이상 입력해주세요')
      .regex(/[A-Za-z]/, '영문자를 포함해주세요')
      .regex(/[0-9]/, '숫자를 포함해주세요'),
    password_confirm: z.string().min(1, '비밀번호를 한 번 더 입력해주세요'),
    agree_terms: z.literal(true, { message: '이용약관 동의 필수' }),
    agree_privacy: z.literal(true, { message: '개인정보처리방침 동의 필수' }),
    marketing_opt_in: z.boolean().default(false),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['password_confirm'],
  });

// 본인인증 단계에서 이름·휴대폰을 수집해 저장.
export const verifyIdentitySchema = z.object({
  full_name: z.string().trim().min(1, '이름을 입력해주세요').max(40, '40자 이내로 입력해주세요'),
  phone: phoneInputSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;

// 로그인은 아이디 또는 (admin) 이메일 둘 다 허용.
// 입력에 `@` 가 포함되면 raw email 로 처리, 아니면 username 으로 보고 합성 이메일로 변환.
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, '아이디 또는 이메일을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const verifyOtpSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, '6자리 숫자를 입력해주세요'),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

/**
 * 한국 휴대폰 입력(`01012345678`, `010-1234-5678`)을 E.164 `+82...`로 정규화.
 * 이미 `+`로 시작하면 digit만 남긴 채 유지.
 */
export function normalizeKoreanPhone(input: string): string {
  const trimmed = input.trim().replace(/[\s-]/g, '');
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.slice(1).replace(/\D/g, '');
  }
  const digits = trimmed.replace(/\D/g, '');
  // 0으로 시작하는 국내 번호는 0을 떼고 국가코드(+82) 부착.
  if (digits.startsWith('0')) {
    return '+82' + digits.slice(1);
  }
  return '+' + digits;
}

/** username → Supabase Auth 내부 합성 이메일. */
export function usernameToSynthEmail(username: string): string {
  return `${username.toLowerCase().trim()}@${SYNTH_EMAIL_DOMAIN}`;
}

/**
 * 로그인 식별자(username 또는 email)를 Supabase signInWithPassword 가 요구하는 email 로 변환.
 * `@` 포함이면 그대로(admin 실제 이메일), 아니면 username 으로 보고 합성.
 */
export function identifierToEmail(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.includes('@')) return trimmed;
  return usernameToSynthEmail(trimmed);
}
