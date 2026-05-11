import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DesktopBuyOrders, type BuyOrderRow } from '@/components/buy/desktop-buy-orders';
import { MobileBuyOrders } from '@/components/buy/mobile-buy-orders';
import { MyRoomShell } from '@/components/account/my-room-shell';
import type { BuyListingStatus } from './order-status';

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function BuyOrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const activeTab = (params.tab ?? 'all') as BuyListingStatus | 'all';

  const current = await getCurrentUser();
  if (!current) redirect('/login?next=/buy/orders');

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('listing')
    .select(
      'id, status, quantity_offered, unit_price, gross_amount, purchased_at, handed_over_at, completed_at, cancelled_at, sku:sku_id(brand, denomination, display_name, thumbnail_url)',
    )
    .eq('buyer_id', current.auth.id)
    .order('purchased_at', { ascending: false });

  if (activeTab !== 'all') {
    query = query.eq('status', activeTab);
  }

  const { data } = await query;
  const listings = (data ?? []) as unknown as BuyOrderRow[];

  // Compute savings and counts from full data (need all rows for KPIs)
  const allQuery = supabase
    .from('listing')
    .select('id, status, quantity_offered, unit_price, gross_amount, sku:sku_id(denomination)')
    .eq('buyer_id', current.auth.id);
  const { data: allData } = await allQuery;
  const allListings = (allData ?? []) as unknown as Array<{
    id: string;
    status: string;
    quantity_offered: number;
    unit_price: number;
    gross_amount: number | null;
    sku: { denomination: number } | null;
  }>;

  const totalSaved = allListings.reduce((sum, r) => {
    const total = r.gross_amount ?? r.quantity_offered * r.unit_price;
    const face = r.sku?.denomination ?? 0;
    return sum + Math.max(face - total, 0);
  }, 0);

  const pendingCount = allListings.filter(
    (r) => !['completed', 'cancelled'].includes(r.status),
  ).length;
  const completedCount = allListings.filter((r) => r.status === 'completed').length;

  const tabCounts: Record<string, number> = {
    all: allListings.length,
    purchased: 0,
    handed_over: 0,
    received: 0,
    verified: 0,
    shipped: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const r of allListings) {
    if (r.status in tabCounts) tabCounts[r.status] = (tabCounts[r.status] ?? 0) + 1;
  }

  const sharedProps = {
    rows: listings,
    activeTab,
    totalSaved,
    pendingCount,
    completedCount,
    tabCounts,
  };

  return (
    <MyRoomShell active="buys">
      <DesktopBuyOrders {...sharedProps} />
      <MobileBuyOrders {...sharedProps} />
    </MyRoomShell>
  );
}
