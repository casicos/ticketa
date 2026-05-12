import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type Role = 'seller' | 'agent' | 'admin';

export type AdminUserRow = {
  id: string;
  username: string | null;
  email: string | null;
  full_name: string | null;
  nickname: string | null;
  phone: string | null;
  phone_verified: boolean;
  store_name: string | null;
  created_at: string;
};

export type AdminUserWithRoles = AdminUserRow & { roles: Role[] };

export type AdminTxStats = { tx_count: number; tx_volume: number };

export async function fetchAdminUsers(opts: {
  search: string;
  unverifiedOnly: boolean;
  sinceDays: number;
  limit?: number;
}): Promise<AdminUserWithRoles[]> {
  const { search, unverifiedOnly, sinceDays, limit = 100 } = opts;
  const supabase = createSupabaseAdminClient();

  let usersQuery = supabase
    .from('users')
    .select(
      'id, username, email, full_name, nickname, phone, phone_verified, store_name, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (search.trim()) {
    const q = `%${search.trim()}%`;
    usersQuery = usersQuery.or(
      `username.ilike.${q},email.ilike.${q},full_name.ilike.${q},phone.ilike.${q},nickname.ilike.${q}`,
    );
  }

  if (unverifiedOnly) {
    usersQuery = usersQuery.eq('phone_verified', false);
  }

  if (sinceDays > 0) {
    const cutoff = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
    usersQuery = usersQuery.gte('created_at', cutoff);
  }

  const { data: users } = await usersQuery;
  if (!users || users.length === 0) return [];

  const ids = users.map((u) => u.id);
  const { data: roleRows } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .in('user_id', ids)
    .is('revoked_at', null);

  const roleMap = new Map<string, Role[]>();
  for (const r of (roleRows ?? []) as { user_id: string; role: Role }[]) {
    const arr = roleMap.get(r.user_id) ?? [];
    arr.push(r.role);
    roleMap.set(r.user_id, arr);
  }

  return (users as AdminUserRow[]).map((u) => ({
    ...u,
    roles: roleMap.get(u.id) ?? [],
  }));
}

export async function fetchAdminUserCounts() {
  const supabase = createSupabaseAdminClient();
  const [totalUsers, verifiedUsers, agentCount, adminCount] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('phone_verified', true),
    supabase
      .from('user_roles')
      .select('user_id', { count: 'exact', head: true })
      .eq('role', 'agent')
      .is('revoked_at', null),
    supabase
      .from('user_roles')
      .select('user_id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .is('revoked_at', null),
  ]);
  return {
    total: totalUsers.count ?? 0,
    verified: verifiedUsers.count ?? 0,
    agents: agentCount.count ?? 0,
    admins: adminCount.count ?? 0,
  };
}

export async function fetchAdminUserTxStats(): Promise<Map<string, AdminTxStats>> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('listing')
    .select('seller_id, buyer_id, unit_price, quantity_offered')
    .eq('status', 'completed')
    .limit(10000);

  const map = new Map<string, AdminTxStats>();
  const bump = (uid: string, vol: number) => {
    const prev = map.get(uid) ?? { tx_count: 0, tx_volume: 0 };
    prev.tx_count += 1;
    prev.tx_volume += vol;
    map.set(uid, prev);
  };
  for (const l of (data ?? []) as {
    seller_id: string;
    buyer_id: string | null;
    unit_price: number;
    quantity_offered: number;
  }[]) {
    const vol = l.unit_price * l.quantity_offered;
    bump(l.seller_id, vol);
    if (l.buyer_id) bump(l.buyer_id, vol);
  }
  return map;
}
