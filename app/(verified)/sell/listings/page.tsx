import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isTerminal } from '@/lib/domain/listings';
import {
  DesktopSellListings,
  type SellListingRow,
  type SellTab,
} from '@/components/sell/desktop-sell-listings';
import { MobileSellListings } from '@/components/sell/mobile-sell-listings';
import { MyRoomShell } from '@/components/account/my-room-shell';

const VALID_TABS: SellTab[] = ['all', 'live', 'settle', 'done'];

export default async function SellListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  // params, supabase, current 를 병렬화. listing 쿼리는 user.id 가 필요해서 current 뒤로.
  const [current, params, supabase] = await Promise.all([
    getCurrentUser(),
    searchParams,
    createSupabaseServerClient(),
  ]);

  if (!current) {
    redirect(`/login?next=${encodeURIComponent('/sell/listings')}`);
  }
  if (!current.profile?.phone_verified) {
    redirect(`/verify-phone?next=${encodeURIComponent('/sell/listings')}`);
  }

  const activeTab: SellTab = VALID_TABS.includes(params.tab as SellTab)
    ? (params.tab as SellTab)
    : 'all';

  const { data: rowsRaw } = await supabase
    .from('listing')
    .select(
      'id, status, quantity_offered, quantity_remaining, unit_price, submitted_at, sku:sku_id(display_name, brand, thumbnail_url)',
    )
    .eq('seller_id', current.auth.id)
    // 분할 매입 자식 listing 은 부모(원본)만 노출 — 개별 구매자 단위는 어드민 발송 큐에서 처리
    .is('parent_listing_id', null)
    .order('submitted_at', { ascending: false });

  const rows = (rowsRaw ?? []) as unknown as SellListingRow[];
  const active = rows.filter((r) => !isTerminal(r.status));
  const completed = rows.filter((r) => r.status === 'completed');
  const cancelled = rows.filter((r) => r.status === 'cancelled');

  const sharedProps = { rows, active, completed, cancelled, activeTab };

  return (
    <MyRoomShell active="sales">
      <DesktopSellListings {...sharedProps} />
      <MobileSellListings {...sharedProps} />
    </MyRoomShell>
  );
}
