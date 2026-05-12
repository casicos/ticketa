import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { ListingStatus } from '@/lib/domain/listings';

export type MonitorListing = {
  id: string;
  status: ListingStatus;
  unit_price: number;
  quantity_offered: number;
  purchased_at: string | null;
  handed_over_at: string | null;
  received_at: string | null;
  verified_at: string | null;
  shipped_at: string | null;
  seller_id: string;
  buyer_id: string | null;
  seller: { full_name: string | null; username: string | null; store_name: string | null } | null;
  buyer: { full_name: string | null; username: string | null } | null;
  sku: { brand: string; denomination: number; display_name: string } | null;
};

const ACTIVE_SELECT =
  'id, status, unit_price, quantity_offered, purchased_at, handed_over_at, received_at, verified_at, shipped_at, seller_id, buyer_id, seller:seller_id(full_name, username, store_name), buyer:buyer_id(full_name, username), sku:sku_id(brand, denomination, display_name)';

export async function fetchActiveListings(statuses: ListingStatus[]): Promise<MonitorListing[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('listing')
    .select(ACTIVE_SELECT)
    .in('status', statuses)
    .order('submitted_at', { ascending: false })
    .limit(200);
  if (error) {
    console.error('[fetchActiveListings]', error.message);
    return [];
  }
  return (data ?? []) as unknown as MonitorListing[];
}

export async function fetchTodayCounts(): Promise<{
  completedToday: number;
  cancelledToday: number;
}> {
  const supabase = createSupabaseAdminClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isoToday = today.toISOString();

  const [completedRes, cancelledRes] = await Promise.all([
    supabase
      .from('listing')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', isoToday),
    supabase
      .from('listing')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'cancelled')
      .gte('cancelled_at', isoToday),
  ]);

  return {
    completedToday: completedRes.count ?? 0,
    cancelledToday: cancelledRes.count ?? 0,
  };
}
