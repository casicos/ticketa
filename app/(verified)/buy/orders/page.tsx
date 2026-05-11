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

  // 내가 보낸 선물은 결제 시점에 거래완료로 간주.
  // /buy/orders 에 status='completed' 가상 행으로 합쳐서 보여줌.
  const giftsQuery = supabase
    .from('gifts')
    .select(
      'id, qty, unit_price, total_price, sent_at, sku:sku_id(brand, denomination, display_name, thumbnail_url)',
    )
    .eq('sender_id', current.auth.id)
    .neq('status', 'refunded')
    .neq('status', 'expired')
    .order('sent_at', { ascending: false });

  const [listingRes, giftsRes] = await Promise.all([query, giftsQuery]);
  const listings = (listingRes.data ?? []) as unknown as BuyOrderRow[];
  const giftRows = (giftsRes.data ?? []) as unknown as Array<{
    id: string;
    qty: number;
    unit_price: number;
    total_price: number;
    sent_at: string;
    sku: {
      brand: string;
      denomination: number;
      display_name: string;
      thumbnail_url: string | null;
    } | null;
  }>;

  const giftAsBuyRows: BuyOrderRow[] = giftRows.map((g) => ({
    id: `gift:${g.id}`,
    status: 'completed' as BuyListingStatus,
    quantity_offered: g.qty,
    unit_price: g.unit_price,
    gross_amount: g.total_price,
    purchased_at: g.sent_at,
    completed_at: g.sent_at,
    cancelled_at: null,
    sku: g.sku,
  }));

  const mergedRows =
    activeTab === 'all' || activeTab === 'completed'
      ? [...listings, ...giftAsBuyRows].sort((a, b) => {
          const ad = a.purchased_at ?? '';
          const bd = b.purchased_at ?? '';
          return bd.localeCompare(ad);
        })
      : listings;

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

  const allWithGifts = [
    ...allListings,
    ...giftRows.map((g) => ({
      id: g.id,
      status: 'completed',
      quantity_offered: g.qty,
      unit_price: g.unit_price,
      gross_amount: g.total_price,
      sku: g.sku ? { denomination: g.sku.denomination } : null,
    })),
  ];

  const totalSaved = allWithGifts.reduce((sum, r) => {
    const total = r.gross_amount ?? r.quantity_offered * r.unit_price;
    const face = r.sku?.denomination ?? 0;
    return sum + Math.max(face - total, 0);
  }, 0);

  const pendingCount = allWithGifts.filter(
    (r) => !['completed', 'cancelled'].includes(r.status),
  ).length;
  const completedCount = allWithGifts.filter((r) => r.status === 'completed').length;

  const tabCounts: Record<string, number> = {
    all: allWithGifts.length,
    purchased: 0,
    handed_over: 0,
    received: 0,
    verified: 0,
    shipped: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const r of allWithGifts) {
    if (r.status in tabCounts) tabCounts[r.status] = (tabCounts[r.status] ?? 0) + 1;
  }

  const sharedProps = {
    rows: mergedRows,
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
