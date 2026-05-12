import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';
import { getActiveSkus } from '@/lib/domain/sku-cache';
import type { SkuOption } from './new-listing-form';
import { DesktopSellNew } from '@/components/sell/desktop-sell-new';
import { MobileSellNew } from '@/components/sell/mobile-sell-new';
import { MyRoomShell } from '@/components/account/my-room-shell';

export default async function SellNewPage() {
  // getActiveSkus 는 unstable_cache (tag: 'sku-active'). 어드민 SKU CRUD 가 revalidateTag 호출.
  // getCurrentUser 와 캐시 조회를 병렬로.
  const [current, skuRows] = await Promise.all([getCurrentUser(), getActiveSkus()]);

  if (!current) {
    redirect(`/login?next=${encodeURIComponent('/sell/new')}`);
  }
  if (!current.profile?.phone_verified) {
    redirect(`/verify-phone?next=${encodeURIComponent('/sell/new')}`);
  }

  const skus: SkuOption[] = skuRows.map((r) => ({
    id: r.id,
    brand: r.brand,
    denomination: r.denomination,
    display_name: r.display_name,
    thumbnail_url: r.thumbnail_url,
    commission_type: r.commission_type ?? 'fixed',
    commission_amount: r.commission_amount ?? 400,
    commission_charged_to: r.commission_charged_to ?? 'seller',
  }));

  return (
    <MyRoomShell active="list">
      <DesktopSellNew skus={skus} />
      <MobileSellNew skus={skus} />
    </MyRoomShell>
  );
}
