import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { ListingStatus } from '@/lib/domain/listings';

export type AdminListingRow = {
  id: string;
  status: ListingStatus;
  unit_price: number;
  quantity_offered: number;
  pre_verified: boolean;
  verified_at: string | null;
  submitted_at: string;
  admin_memo: string | null;
  seller_id: string;
  seller: {
    id: string;
    full_name: string | null;
    username: string | null;
    store_name: string | null;
  } | null;
  sku: { id: string; brand: string; denomination: number; display_name: string } | null;
};

export async function fetchAdminListings(limit = 100): Promise<{
  rows: AdminListingRow[];
  agentSellerIds: Set<string>;
}> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('listing')
    .select(
      `id, status, unit_price, quantity_offered, pre_verified, verified_at, submitted_at, admin_memo,
       seller_id,
       seller:seller_id(id, full_name, username, store_name),
       sku:sku_id(id, brand, denomination, display_name)`,
    )
    .order('submitted_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[fetchAdminListings]', error.message);
    return { rows: [], agentSellerIds: new Set() };
  }
  const rows = (data ?? []) as unknown as AdminListingRow[];

  const sellerIds = Array.from(new Set(rows.map((l) => l.seller_id)));
  const agentSellerIds = new Set<string>();
  if (sellerIds.length > 0) {
    const { data: agents } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'agent')
      .is('revoked_at', null)
      .in('user_id', sellerIds);
    for (const a of (agents ?? []) as { user_id: string }[]) agentSellerIds.add(a.user_id);
  }
  return { rows, agentSellerIds };
}
