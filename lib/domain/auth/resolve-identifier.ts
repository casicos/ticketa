/**
 * 로그인 identifier 를 Supabase Auth 가 기대하는 email 로 해석.
 *
 * 흐름:
 *   - `@` 포함이면 raw email 그대로 (admin 의 실제 이메일 또는 일반 이메일 입력)
 *   - 아니면 username 으로 보고 public.users 에서 실제 email 룩업
 *   - 매칭 없으면 합성 이메일 `${username}@ticketa.local` 로 fallback
 *     (가입 직후 RLS 로 안 보이는 경우의 안전장치 — 어차피 signInWithPassword 가 검증)
 *
 * service-role 사용: 비공개 username→email 매핑이 필요해서 anon RLS 로는
 * 다른 유저 행을 못 본다. lib/supabase/admin.ts 는 ESLint boundaries 로
 * lib/domain/** 만 허용 → 본 모듈에서만 호출.
 */
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { usernameToSynthEmail } from '@/lib/domain/schemas/auth';

export async function resolveIdentifierToEmail(identifier: string): Promise<string> {
  const trimmed = identifier.trim();
  if (!trimmed) return '';
  if (trimmed.includes('@')) return trimmed;

  const username = trimmed.toLowerCase();
  const adminClient = createSupabaseAdminClient();

  const { data } = await adminClient
    .from('users')
    .select('email')
    .eq('username', username)
    .maybeSingle<{ email: string | null }>();

  return data?.email ?? usernameToSynthEmail(username);
}
