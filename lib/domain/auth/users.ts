/**
 * 사용자 조회 헬퍼 — RLS 우회가 필요한 lookup 용도.
 * `lib/supabase/admin.ts` 는 `lib/domain/**` 에서만 import 허용 (ESLint boundaries).
 */
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * 닉네임으로 사용자 1명 lookup. 존재하지 않으면 null.
 *
 *  - 닉네임은 케이스 sensitive 비교 (`users.nickname` 컬럼 그대로)
 *  - 호출자에게 노출하는 정보는 `id` / `nickname` 만 — 다른 메타 데이터는 반환하지 않음
 */
export async function lookupUserByNickname(
  nickname: string,
): Promise<{ id: string; nickname: string } | null> {
  const trimmed = nickname.trim().replace(/^@/, '');
  if (!trimmed) return null;
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('users')
    .select('id, nickname')
    .eq('nickname', trimmed)
    .maybeSingle<{ id: string; nickname: string }>();
  return data ?? null;
}

/**
 * username (사용자 아이디) 으로 사용자 1명 lookup. 존재하지 않으면 null.
 *  - `@` 접두사 허용 후 stripped
 *  - 케이스 sensitive
 */
export async function lookupUserByUsername(
  username: string,
): Promise<{ id: string; username: string } | null> {
  const trimmed = username.trim().replace(/^@/, '');
  if (!trimmed) return null;
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('users')
    .select('id, username')
    .eq('username', trimmed)
    .maybeSingle<{ id: string; username: string }>();
  return data ?? null;
}
