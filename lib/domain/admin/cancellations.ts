import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { ListingStatus } from '@/lib/domain/listings';

export type CancellationRow = {
  id: number;
  listing_id: string;
  requested_by: string;
  role_at_request: 'seller' | 'buyer';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  resolved_at: string | null;
  admin_memo: string | null;
  requester: {
    full_name: string | null;
    username: string | null;
    store_name: string | null;
  } | null;
  listing: {
    id: string;
    status: ListingStatus;
    unit_price: number;
    quantity_offered: number;
    sku: {
      brand: string;
      denomination: number;
      display_name: string;
      thumbnail_url: string | null;
    } | null;
  } | null;
};

const SELECT = `
  id, listing_id, requested_by, role_at_request, reason, status,
  requested_at, resolved_at, admin_memo,
  requester:requested_by(full_name, username, store_name),
  listing:listing_id(id, status, unit_price, quantity_offered, sku:sku_id(brand, denomination, display_name, thumbnail_url))
` as const;

export async function fetchCancellations(): Promise<{
  pending: CancellationRow[];
  done: CancellationRow[];
}> {
  const supabase = createSupabaseAdminClient();
  const [pendingRes, doneRes] = await Promise.all([
    supabase
      .from('cancellation_requests')
      .select(SELECT)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })
      .limit(50),
    supabase
      .from('cancellation_requests')
      .select(SELECT)
      .in('status', ['approved', 'rejected'])
      .order('resolved_at', { ascending: false })
      .limit(20),
  ]);
  return {
    pending: (pendingRes.data ?? []) as unknown as CancellationRow[],
    done: (doneRes.data ?? []) as unknown as CancellationRow[],
  };
}
