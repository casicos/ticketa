import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchMyMileageBalance } from '@/lib/domain/mileage';
import { getCurrentUser } from '@/lib/auth/guards';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DEPARTMENT_LABEL, type Department } from '@/components/ticketa/dept-mark';
import { DesktopTradeDetail } from '@/components/catalog/desktop-trade-detail';
import { MobileTradeDetail } from '@/components/catalog/mobile-trade-detail';
import { GiftSendModal } from '@/components/buy/gift-send-modal';
import { PurchaseConfirm } from './purchase-confirm';

type ListingRow = {
  id: string;
  status: string;
  unit_price: number;
  quantity_offered: number;
  submitted_at: string;
  seller_id: string;
  pre_verified: boolean;
  verified_at: string | null;
  sku: {
    id: string;
    brand: string;
    denomination: number;
    display_name: string;
    thumbnail_url: string | null;
  } | null;
  seller: { store_name: string | null } | null;
};

const STATUS_TO_STAGE: Record<string, number> = {
  submitted: 0,
  purchased: 1,
  handed_over: 2,
  received: 3,
  verified: 4,
  shipped: 5,
  completed: 6,
  cancelled: -1,
};

export default async function CatalogListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const [current, { data: listingRaw }] = await Promise.all([
    getCurrentUser(),
    supabase
      .from('listing')
      .select(
        'id, status, unit_price, quantity_offered, submitted_at, seller_id, pre_verified, verified_at, sku:sku_id(id, brand, denomination, display_name, thumbnail_url), seller:seller_id(store_name)',
      )
      .eq('id', id)
      .eq('status', 'submitted')
      .maybeSingle(),
  ]);

  if (!listingRaw) notFound();
  const listing = listingRaw as unknown as ListingRow;
  // pre_verified 매물은 admin 검수 끝나야 공개. 그 전 직접 URL 접근도 차단.
  if (listing.pre_verified && !listing.verified_at) notFound();
  const sku = listing.sku!;
  const dept = sku.brand as Department;

  // 에이전트 매물 여부 — 선물하기 버튼 노출 조건
  const { data: agentRoleRow } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', listing.seller_id)
    .eq('role', 'agent')
    .is('revoked_at', null)
    .maybeSingle();
  const isAgentListing = !!agentRoleRow;

  // 일반 phone_verified 회원도 직접 구매 가능 (P2P 마켓플레이스 모델).
  // 본인이 등록한 매물은 RPC 단계에서 SELF_PURCHASE_FORBIDDEN 으로 차단.
  const canBuy = !!current && (current.profile?.phone_verified ?? false);
  const balance = current && canBuy ? await fetchMyMileageBalance(supabase) : null;

  const gross = listing.unit_price * listing.quantity_offered;
  const hasEnough = balance ? balance.total >= gross : false;
  const shortage = balance ? Math.max(gross - balance.total, 0) : gross;
  const ratio = balance && gross > 0 ? Math.min(1, balance.total / gross) : 0;

  const stageIndex = STATUS_TO_STAGE[listing.status] ?? 0;
  const allDone = listing.status === 'completed';

  const displayName =
    sku.display_name ??
    `${DEPARTMENT_LABEL[dept]}백화점 상품권 ${sku.denomination.toLocaleString('ko-KR')}원권`;

  const giftButton =
    canBuy && isAgentListing && balance ? (
      <GiftSendModal
        listingId={listing.id}
        unitPrice={listing.unit_price}
        maxQty={Math.min(listing.quantity_offered, 100)}
        skuLabel={displayName}
        storeName={listing.seller?.store_name ?? null}
        myBalance={balance.total}
      />
    ) : null;

  const purchaseAction =
    canBuy && balance && hasEnough ? (
      <div className="grid gap-2">
        <PurchaseConfirm listingId={listing.id} gross={gross} />
        {giftButton}
      </div>
    ) : canBuy && balance && !hasEnough ? (
      <div className="grid gap-2">
        <Button asChild size="sm" className="mt-3 w-full">
          <Link href={`/account/mileage/charge?amount=${shortage}&returnTo=/catalog/${listing.id}`}>
            마일리지 충전하러 가기
          </Link>
        </Button>
        {giftButton}
      </div>
    ) : null;

  const mobileActionSlot =
    canBuy && balance && hasEnough ? (
      <div className="grid gap-2">
        <PurchaseConfirm listingId={listing.id} gross={gross} />
        {giftButton}
      </div>
    ) : (
      giftButton
    );

  return (
    <div className="mx-auto w-full max-w-[1216px] px-6 py-6 sm:px-8 sm:py-8">
      {/* Desktop layout */}
      <DesktopTradeDetail
        listingId={listing.id}
        dept={dept}
        displayName={displayName}
        thumbnailUrl={sku.thumbnail_url}
        unitPrice={listing.unit_price}
        quantity={listing.quantity_offered}
        gross={gross}
        submittedAt={listing.submitted_at}
        sellerId={listing.seller_id}
        status={listing.status}
        stageIndex={stageIndex}
        allDone={allDone}
        canBuy={canBuy}
        balance={balance}
        hasEnough={hasEnough}
        shortage={shortage}
        ratio={ratio}
        actionSlot={purchaseAction}
        verified={Boolean(listing.pre_verified && listing.verified_at)}
        storeName={listing.seller?.store_name ?? null}
      />

      {/* Mobile layout */}
      <MobileTradeDetail
        listingId={listing.id}
        dept={dept}
        displayName={displayName}
        thumbnailUrl={sku.thumbnail_url}
        unitPrice={listing.unit_price}
        quantity={listing.quantity_offered}
        gross={gross}
        canBuy={canBuy}
        hasEnough={hasEnough}
        shortage={shortage}
        actionSlot={mobileActionSlot}
        verified={Boolean(listing.pre_verified && listing.verified_at)}
        storeName={listing.seller?.store_name ?? null}
      />
    </div>
  );
}
