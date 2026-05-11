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
  quantity_remaining: number;
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
        'id, status, unit_price, quantity_offered, quantity_remaining, submitted_at, seller_id, pre_verified, verified_at, sku:sku_id(id, brand, denomination, display_name, thumbnail_url), seller:seller_id(store_name)',
      )
      .eq('id', id)
      .eq('status', 'submitted')
      .is('parent_listing_id', null)
      .maybeSingle(),
  ]);

  if (!listingRaw) notFound();
  const listing = listingRaw as unknown as ListingRow;
  // pre_verified 매물은 admin 검수 끝나야 공개. 그 전 직접 URL 접근도 차단.
  if (listing.pre_verified && !listing.verified_at) notFound();
  const sku = listing.sku!;
  // DB 의 sku.brand 는 한글 풀네임("AK백화점"). DeptMark/DEPARTMENT_LABEL 은 영문 키 사용.
  const BRAND_TO_DEPT: Record<string, Department> = {
    롯데백화점: 'lotte',
    현대백화점: 'hyundai',
    신세계백화점: 'shinsegae',
    갤러리아백화점: 'galleria',
    AK백화점: 'ak',
  };
  const dept = BRAND_TO_DEPT[sku.brand] ?? 'lotte';

  // 에이전트 매물 여부 — create_agent_listing 이 pre_verified=true 로 세팅하므로 그걸로 판정.
  // (예전엔 user_roles 조회했는데 composite PK 라 `id` 컬럼이 없어 항상 null 이 떨어짐 — 가격 표시 버그 원인)
  const isAgentListing = listing.pre_verified;

  // 본인 매물은 프론트에서 미리 차단 — RPC 의 SELF_PURCHASE_FORBIDDEN 까지 가지 않게.
  const isOwner = !!current && current.auth.id === listing.seller_id;
  // 일반 phone_verified 회원도 직접 구매 가능 (P2P 마켓플레이스 모델).
  const canBuy = !!current && (current.profile?.phone_verified ?? false) && !isOwner;
  const balance =
    current && (current.profile?.phone_verified ?? false)
      ? await fetchMyMileageBalance(supabase, current.auth.id)
      : null;
  // 보는 사람이 에이전트면 "매입" 용어, 일반 회원이면 "구매" 용어로 표기
  const viewerIsAgent = current?.roles.includes('agent') ?? false;

  // 남은 수량(quantity_remaining) 기준. 에이전트 매물은 1매부터, P2P 는 전량만.
  const remaining = listing.quantity_remaining;
  const maxGross = listing.unit_price * remaining; // 전량
  const requiredGross = isAgentListing ? listing.unit_price : maxGross;
  const hasEnough = balance ? balance.total >= requiredGross : false;
  const shortage = balance ? Math.max(requiredGross - balance.total, 0) : requiredGross;
  const ratio = balance && maxGross > 0 ? Math.min(1, balance.total / maxGross) : 0;

  const displayName =
    sku.display_name ??
    `${DEPARTMENT_LABEL[dept]}백화점 상품권 ${sku.denomination.toLocaleString('ko-KR')}원권`;

  const giftButton =
    canBuy && isAgentListing && balance ? (
      <GiftSendModal
        listingId={listing.id}
        unitPrice={listing.unit_price}
        maxQty={Math.min(remaining, 100)}
        skuLabel={displayName}
        storeName={listing.seller?.store_name ?? null}
        myBalance={balance.total}
      />
    ) : null;

  const ownerHint = isOwner ? (
    <div className="border-warm-200 bg-warm-50 text-foreground rounded-[10px] border px-3.5 py-3 text-[13px] leading-[1.55]">
      <div className="text-foreground mb-0.5 font-extrabold">내가 등록한 매물이에요</div>
      <div className="text-muted-foreground">
        본인이 올린 매물은 직접 구매하거나 선물할 수 없어요. 매물 상세는{' '}
        <Link
          href={`/sell/listings/${listing.id}`}
          className="text-ticketa-blue-700 font-bold underline-offset-2 hover:underline"
        >
          판매 내역
        </Link>{' '}
        에서 확인해주세요.
      </div>
    </div>
  ) : null;

  const purchaseAction = isOwner ? (
    ownerHint
  ) : canBuy && balance && hasEnough ? (
    <div className="grid gap-2">
      <PurchaseConfirm
        listingId={listing.id}
        unitPrice={listing.unit_price}
        maxQty={remaining}
        balanceTotal={balance.total}
        partialAllowed={isAgentListing}
        viewerIsAgent={viewerIsAgent}
      />
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

  const mobileActionSlot = isOwner ? (
    ownerHint
  ) : canBuy && balance && hasEnough ? (
    <div className="grid gap-2">
      <PurchaseConfirm
        listingId={listing.id}
        unitPrice={listing.unit_price}
        maxQty={remaining}
        balanceTotal={balance.total}
        partialAllowed={isAgentListing}
        viewerIsAgent={viewerIsAgent}
      />
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
        denomination={sku.denomination}
        thumbnailUrl={sku.thumbnail_url}
        unitPrice={listing.unit_price}
        quantity={remaining}
        gross={maxGross}
        submittedAt={listing.submitted_at}
        sellerId={listing.seller_id}
        status={listing.status}
        canBuy={canBuy}
        balance={balance}
        hasEnough={hasEnough}
        shortage={shortage}
        ratio={ratio}
        actionSlot={purchaseAction}
        verified={Boolean(listing.pre_verified && listing.verified_at)}
        storeName={listing.seller?.store_name ?? null}
        partialAllowed={isAgentListing}
        viewerIsAgent={viewerIsAgent}
        viewerIsOwner={isOwner}
      />

      {/* Mobile layout */}
      <MobileTradeDetail
        listingId={listing.id}
        dept={dept}
        displayName={displayName}
        denomination={sku.denomination}
        thumbnailUrl={sku.thumbnail_url}
        unitPrice={listing.unit_price}
        quantity={remaining}
        gross={maxGross}
        canBuy={canBuy}
        hasEnough={hasEnough}
        shortage={shortage}
        actionSlot={mobileActionSlot}
        verified={Boolean(listing.pre_verified && listing.verified_at)}
        storeName={listing.seller?.store_name ?? null}
        partialAllowed={isAgentListing}
        viewerIsAgent={viewerIsAgent}
        viewerIsOwner={isOwner}
      />
    </div>
  );
}
