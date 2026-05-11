import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SkuOption } from './new-listing-form';
import { DesktopSellNew } from '@/components/sell/desktop-sell-new';
import { MobileSellNew } from '@/components/sell/mobile-sell-new';
import { MyRoomShell } from '@/components/account/my-room-shell';

export default async function SellNewPage() {
  const current = await getCurrentUser();
  if (!current) {
    redirect(`/login?next=${encodeURIComponent('/sell/new')}`);
  }
  if (!current.profile?.phone_verified) {
    redirect(`/verify-phone?next=${encodeURIComponent('/sell/new')}`);
  }

  const supabase = await createSupabaseServerClient();

  const { data: skuRows } = await supabase
    .from('sku')
    .select('id, brand, denomination, display_name, thumbnail_url, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('brand', { ascending: true })
    .order('denomination', { ascending: true });

  const skus: SkuOption[] = (skuRows ?? []).map((r) => ({
    id: r.id as string,
    brand: r.brand as string,
    denomination: r.denomination as number,
    display_name: r.display_name as string,
    thumbnail_url: (r.thumbnail_url as string | null) ?? null,
  }));

  return (
    <MyRoomShell active="list">
      <DesktopSellNew skus={skus} />
      <MobileSellNew skus={skus} />
    </MyRoomShell>
  );
}
