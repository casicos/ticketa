import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * notifications 테이블은 RLS 로 user_id = auth.uid() 만 허용.
 * 판매자/구매자/어드민이 서로에게 알림을 보내야 하므로 SECURITY DEFINER
 * RPC (notify_user / notify_users) 를 통해 RLS 를 우회한다.
 * ssr 서버 클라이언트에서 쓰는 공용 헬퍼.
 */

export type NotifyInput = {
  userId: string;
  kind: string;
  title: string;
  body: string;
  linkTo?: string | null;
};

/**
 * 단일 사용자에게 알림 발송. 실패 시 console.warn 만, 비즈니스 로직은 계속.
 */
export async function notifyUser(supabase: SupabaseClient, input: NotifyInput): Promise<void> {
  const { error } = await supabase.rpc('notify_user', {
    p_user_id: input.userId,
    p_kind: input.kind,
    p_title: input.title,
    p_body: input.body,
    p_link_to: input.linkTo ?? null,
  });
  if (error) {
    console.warn('[notifyUser] failed:', error.message, input);
  }
}

/**
 * 다수 사용자에게 동일 알림 발송.
 */
export async function notifyUsers(
  supabase: SupabaseClient,
  input: {
    userIds: string[];
    kind: string;
    title: string;
    body: string;
    linkTo?: string | null;
  },
): Promise<void> {
  const filtered = input.userIds.filter((id) => !!id);
  if (filtered.length === 0) return;
  const { error } = await supabase.rpc('notify_users', {
    p_user_ids: filtered,
    p_kind: input.kind,
    p_title: input.title,
    p_body: input.body,
    p_link_to: input.linkTo ?? null,
  });
  if (error) {
    console.warn('[notifyUsers] failed:', error.message, input);
  }
}

/**
 * 활성 어드민 uid 배열 조회.
 */
export async function fetchActiveAdminIds(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')
    .is('revoked_at', null);
  if (error) return [];
  const set = new Set<string>();
  for (const row of (data ?? []) as Array<{ user_id: string }>) {
    if (row.user_id) set.add(row.user_id);
  }
  return Array.from(set);
}
