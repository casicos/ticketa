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
  // params + auth + supabase 병렬화. listing/gifts 쿼리는 user.id 의존이라 그 다음 단계.
  const [params, current, supabase] = await Promise.all([
    searchParams,
    getCurrentUser(),
    createSupabaseServerClient(),
  ]);
  if (!current) redirect('/login?next=/buy/orders');

  const activeTab = (params.tab ?? 'all') as BuyListingStatus | 'all';

  // ALL listings 를 한 번에 가져와서 탭 필터 + KPI 계산을 모두 in-memory 로 처리.
  // 기존: status=activeTab 쿼리 + 별도 ALL 쿼리 = 2 round-trip → 1 round-trip 으로 평탄화.
  // 트레이드오프: 사용자당 listing row 수 (MVP <100) 작아서 over-fetch 비용 미미.
  const listingQuery = supabase
    .from('listing')
    .select(
      'id, status, quantity_offered, unit_price, gross_amount, purchased_at, handed_over_at, completed_at, cancelled_at, sku:sku_id(brand, denomination, display_name, thumbnail_url)',
    )
    .eq('buyer_id', current.auth.id)
    .order('purchased_at', { ascending: false });

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

  const [listingRes, giftsRes] = await Promise.all([listingQuery, giftsQuery]);
  const allListings = (listingRes.data ?? []) as unknown as BuyOrderRow[];
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

  // 탭 필터링은 in-memory 로 (활성 탭이 'all' 이 아닐 때 listing 만 필터).
  const filteredListings =
    activeTab === 'all' ? allListings : allListings.filter((r) => r.status === activeTab);

  const mergedRows =
    activeTab === 'all' || activeTab === 'completed'
      ? [...filteredListings, ...giftAsBuyRows].sort((a, b) => {
          const ad = a.purchased_at ?? '';
          const bd = b.purchased_at ?? '';
          return bd.localeCompare(ad);
        })
      : filteredListings;

  // KPI 계산용 슬림 뷰 (denomination 만 필요).
  const allWithGifts = [
    ...allListings.map((r) => ({
      id: r.id,
      status: r.status,
      quantity_offered: r.quantity_offered,
      unit_price: r.unit_price,
      gross_amount: r.gross_amount,
      sku: r.sku ? { denomination: r.sku.denomination } : null,
    })),
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
