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
  const current = await getCurrentUser();
  if (!current) {
    redirect(`/login?next=${encodeURIComponent('/sell/listings')}`);
  }
  if (!current.profile?.phone_verified) {
    redirect(`/verify-phone?next=${encodeURIComponent('/sell/listings')}`);
  }

  const params = await searchParams;
  const activeTab: SellTab = VALID_TABS.includes(params.tab as SellTab)
    ? (params.tab as SellTab)
    : 'all';

  const supabase = await createSupabaseServerClient();
  const { data: rowsRaw } = await supabase
    .from('listing')
    .select(
      'id, status, quantity_offered, quantity_remaining, unit_price, submitted_at, sku:sku_id(display_name, brand, thumbnail_url)',
    )
    .eq('seller_id', current.auth.id)
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
