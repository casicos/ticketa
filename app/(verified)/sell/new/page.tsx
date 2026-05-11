import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SkuOption } from './new-listing-form';
import { DesktopSellNew } from '@/components/sell/desktop-sell-new';
import { MobileSellNew } from '@/components/sell/mobile-sell-new';
import { MyRoomShell } from '@/components/account/my-room-shell';

export default async function SellNewPage() {
  // getCurrentUser 와 SKU 페치를 병렬로. SKU 는 public RLS 라 인증과 무관하게 시작 가능.
  // getCurrentUser 는 React.cache 로 페이지 내 중복 호출 안전.
  const supabase = await createSupabaseServerClient();
  const skuQuery = supabase
    .from('sku')
    .select(
      'id, brand, denomination, display_name, thumbnail_url, display_order, commission_type, commission_amount, commission_charged_to',
    )
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('brand', { ascending: true })
    .order('denomination', { ascending: true });

  const [current, { data: skuRows }] = await Promise.all([getCurrentUser(), skuQuery]);

  if (!current) {
    redirect(`/login?next=${encodeURIComponent('/sell/new')}`);
  }
  if (!current.profile?.phone_verified) {
    redirect(`/verify-phone?next=${encodeURIComponent('/sell/new')}`);
  }

  const skus: SkuOption[] = (skuRows ?? []).map((r) => ({
    id: r.id as string,
    brand: r.brand as string,
    denomination: r.denomination as number,
    display_name: r.display_name as string,
    thumbnail_url: (r.thumbnail_url as string | null) ?? null,
    commission_type: (r.commission_type as 'fixed' | 'percent') ?? 'fixed',
    commission_amount: (r.commission_amount as number) ?? 400,
    commission_charged_to: (r.commission_charged_to as 'seller' | 'buyer' | 'both') ?? 'seller',
  }));

  return (
    <MyRoomShell active="list">
      <DesktopSellNew skus={skus} />
      <MobileSellNew skus={skus} />
    </MyRoomShell>
  );
}
