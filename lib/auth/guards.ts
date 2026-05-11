import 'server-only';
import { cache } from 'react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type Role = 'seller' | 'agent' | 'admin';

export type CurrentUser = {
  auth: User;
  profile: {
    id: string;
    email: string | null;
    username: string | null;
    phone: string | null;
    phone_verified: boolean;
    full_name: string;
    nickname: string | null;
    marketing_opt_in: boolean;
  } | null;
  roles: Role[];
};

/**
 * Supabase auth-js 가 throw 하는 에러를 식별하는 가드.
 * - over_request_rate_limit (429)
 * - refresh_token_not_found (stale cookie)
 * - 기타 401/403 등 모두 unauthenticated 로 처리.
 */
function isSupabaseAuthError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && ('__isAuthError' in e || 'isAuthError' in e);
}

/**
 * 현재 요청의 로그인 사용자 + 프로필 + 역할.
 *
 * `React.cache` 로 per-request memoize — 한 render 안에서 여러 번 호출돼도
 * Supabase auth.getUser + profile 조회는 각각 1회씩만 발생한다. 다른 guards
 * (requireAuth, hasRole, requireRole, requirePhoneVerified) 도 모두 이 함수를
 * 통해 동일 결과를 공유한다.
 *
 * 에러 처리 — auth.getUser 가 stale refresh token / rate limit (429) 등으로
 * throw 하거나 error 필드를 채우면 null 로 정상화. 보호 라우트의 가드가
 * 자연스럽게 unauthenticated 흐름을 타도록 한다.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const user = data.user;

    const { data: profile } = await supabase
      .from('users')
      .select('id,email,username,phone,phone_verified,full_name,nickname,marketing_opt_in')
      .eq('id', user.id)
      .maybeSingle<CurrentUser['profile']>();

    const roles = extractRoles(user.app_metadata);
    return { auth: user, profile: profile ?? null, roles };
  } catch (e) {
    // Supabase 가 stale refresh token / 429 rate limit / 네트워크 에러 등으로
    // throw 하는 모든 케이스를 unauthenticated 로 정상화. 보호 라우트는
    // proxy.ts 가 /login 으로 보내고, 공개 라우트는 비로그인 흐름을 탄다.
    if (isSupabaseAuthError(e)) return null;
    // 인증과 무관한 진짜 에러는 다시 throw (DB 권한 오류, 네트워크 등은 의도된 보고)
    throw e;
  }
});

export async function requireAuth(): Promise<User> {
  const current = await getCurrentUser();
  if (!current) throw new AuthError('UNAUTHENTICATED');
  return current.auth;
}

export async function hasRole(role: Role): Promise<boolean> {
  const current = await getCurrentUser();
  return current?.roles.includes(role) ?? false;
}

export async function requireRole(role: Role): Promise<void> {
  const ok = await hasRole(role);
  if (!ok) throw new AuthError('FORBIDDEN');
}

export async function requirePhoneVerified(): Promise<void> {
  const current = await getCurrentUser();
  if (!current) throw new AuthError('UNAUTHENTICATED');
  if (!current.profile?.phone_verified) throw new AuthError('PHONE_UNVERIFIED');
}

export function isForbidden(code: string) {
  return { ok: false as const, code };
}

export class AuthError extends Error {
  code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'PHONE_UNVERIFIED';
  constructor(code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'PHONE_UNVERIFIED') {
    super(code);
    this.name = 'AuthError';
    this.code = code;
  }
}

export function extractRoles(appMetadata: User['app_metadata'] | undefined): Role[] {
  const raw = (appMetadata?.['roles'] ?? []) as unknown;
  if (!Array.isArray(raw)) return [];
  const allowed: Role[] = ['seller', 'agent', 'admin'];
  return raw.filter((r): r is Role => typeof r === 'string' && (allowed as string[]).includes(r));
}
