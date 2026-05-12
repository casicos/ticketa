'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withServerAction } from '@/lib/server-actions';

export type NotificationRow = {
  id: number;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  link_to: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationsResult = {
  items: NotificationRow[];
  unread_count: number;
};

/**
 * 최근 N건 알림 + unread count 반환.
 * 미읽은 항목 먼저, 그다음 created_at desc 정렬.
 */
export async function getMyNotificationsAction(limit = 10): Promise<NotificationsResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { items: [], unread_count: 0 };
  }

  const { data: items } = await supabase
    .from('notifications')
    .select('id, user_id, kind, title, body, link_to, read_at, created_at')
    .eq('user_id', user.id)
    .order('read_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false })
    .limit(limit);

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null);

  return {
    items: (items ?? []) as NotificationRow[],
    unread_count: count ?? 0,
  };
}

/**
 * 단일 알림 읽음 처리.
 */
export async function markNotificationReadAction(id: number) {
  return withServerAction('markNotificationRead', async () => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw Object.assign(new Error('UNAUTHENTICATED'), { code: 'UNAUTHENTICATED' });

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) throw Object.assign(new Error('DB_ERROR'), { code: 'DB_ERROR' });

    revalidatePath('/', 'layout');
    return { ok: true };
  });
}

/**
 * 본인의 미읽은 알림 전체 읽음 처리.
 */
export async function markAllReadAction() {
  return withServerAction('markAllRead', async () => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw Object.assign(new Error('UNAUTHENTICATED'), { code: 'UNAUTHENTICATED' });

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) throw Object.assign(new Error('DB_ERROR'), { code: 'DB_ERROR' });

    revalidatePath('/', 'layout');
    return { ok: true };
  });
}
