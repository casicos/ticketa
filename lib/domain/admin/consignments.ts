import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type AgentRoleRow = {
  user_id: string;
  user: {
    id: string;
    username: string | null;
    full_name: string | null;
    store_name: string | null;
  } | null;
};

export type SkuRow = {
  id: string;
  brand: string;
  denomination: number;
  display_name: string;
  thumbnail_url: string | null;
  is_active: boolean;
};

export type RecentInventoryRow = {
  id: string;
  qty_available: number;
  qty_reserved: number;
  unit_cost: number;
  created_at: string;
  updated_at: string;
  agent: {
    id: string;
    username: string | null;
    full_name: string | null;
    store_name: string | null;
  } | null;
  sku: {
    id: string;
    brand: string;
    denomination: number;
    display_name: string;
    thumbnail_url: string | null;
  } | null;
};

export type AllInventoryRow = {
  id: string;
  agent_id: string;
  sku_id: string;
  qty_available: number;
  qty_reserved: number;
  unit_cost: number;
};

export type MonthlyInventoryRow = {
  qty_available: number;
  qty_reserved: number;
  unit_cost: number;
};

export async function isActiveAgent(userId: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('user_id', userId)
    .eq('role', 'agent')
    .is('revoked_at', null)
    .maybeSingle();
  if (error) {
    console.error('[isActiveAgent]', error.message);
    return false;
  }
  return !!data;
}

export async function fetchConsignmentData() {
  const supabase = createSupabaseAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [agentsRes, skusRes, recentRes, monthlyRes, allInvRes] = await Promise.all([
    supabase
      .from('user_roles')
      .select('user_id, user:user_id(id, username, full_name, store_name)')
      .eq('role', 'agent')
      .is('revoked_at', null),
    supabase
      .from('sku')
      .select('id, brand, denomination, display_name, thumbnail_url, is_active')
      .eq('is_active', true)
      .order('brand', { ascending: true })
      .order('denomination', { ascending: false }),
    supabase
      .from('agent_inventory')
      .select(
        'id, qty_available, qty_reserved, unit_cost, created_at, updated_at, agent:agent_id(id, username, full_name, store_name), sku:sku_id(id, brand, denomination, display_name, thumbnail_url)',
      )
      .order('updated_at', { ascending: false })
      .limit(20),
    supabase
      .from('agent_inventory')
      .select('qty_available, qty_reserved, unit_cost, agent_id, created_at')
      .gte('created_at', thirtyDaysAgo),
    supabase
      .from('agent_inventory')
      .select('id, agent_id, sku_id, qty_available, qty_reserved, unit_cost'),
  ]);

  return {
    agentRows: ((agentsRes.data ?? []) as unknown as AgentRoleRow[]).filter((r) => r.user !== null),
    skus: (skusRes.data ?? []) as SkuRow[],
    recent: (recentRes.data ?? []) as unknown as RecentInventoryRow[],
    monthly: (monthlyRes.data ?? []) as MonthlyInventoryRow[],
    allInventory: (allInvRes.data ?? []) as AllInventoryRow[],
  };
}
