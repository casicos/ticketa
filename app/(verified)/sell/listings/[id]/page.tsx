import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type StageNumber } from '@/components/ticketa/stage-badge';
import { getCurrentUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  LISTING_STATUS_LABELS,
  canSellerHandover,
  canRequestCancel,
  type ListingStatus,
} from '@/lib/domain/listings';
import { fetchBusinessAddress } from '@/lib/domain/platform-settings';
import { DesktopSellerListing } from '@/components/sell/desktop-seller-listing';
import { MobileSellerListing } from '@/components/sell/mobile-seller-listing';
import { SellerListingActions } from './listing-actions';

type ListingRow = {
  id: string;
  status: ListingStatus;
  seller_id: string;
  quantity_offered: number;
  quantity_remaining: number;
  unit_price: number;
  gross_amount: number | null;
  commission_total: number | null;
  seller_net_amount: number | null;
  submitted_at: string;
  purchased_at: string | null;
  handed_over_at: string | null;
  received_at: string | null;
  verified_at: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  admin_memo: string | null;
  pre_verified: boolean;
  sku: {
    brand: string;
    denomination: number;
    display_name: string;
    thumbnail_url: string | null;
  } | null;
};

type CancellationRequestRow = {
  id: number;
  status: string;
  reason: string;
  requested_at: string;
  role_at_request: string;
};

function statusToStage(s: ListingStatus): StageNumber | null {
  switch (s) {
    case 'submitted':
      return 1;
    case 'handed_over':
      return 2;
    case 'received':
      return 3;
    case 'purchased':
      return 4;
    case 'verified':
      return 5;
    case 'shipped':
      return 6;
    case 'completed':
      return 7;
    case 'cancelled':
      return null;
  }
}

export default async function SellListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const current = await getCurrentUser();
  if (!current) {
    redirect(`/login?next=${encodeURIComponent(`/sell/listings/${id}`)}`);
  }
  if (!current.profile?.phone_verified) {
    redirect(`/verify-phone?next=${encodeURIComponent(`/sell/listings/${id}`)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('listing')
    .select(
      'id, status, seller_id, quantity_offered, quantity_remaining, unit_price, gross_amount, commission_total, seller_net_amount, submitted_at, purchased_at, handed_over_at, received_at, verified_at, shipped_at, completed_at, cancelled_at, cancel_reason, admin_memo, pre_verified, sku:sku_id(brand, denomination, display_name, thumbnail_url)',
    )
    .eq('id', id)
    .eq('seller_id', current.auth.id)
    .maybeSingle();

  if (!data) notFound();

  const listing = data as unknown as ListingRow;

  const { data: cancelReqRaw } = await supabase
    .from('cancellation_requests')
    .select('id, status, reason, requested_at, role_at_request')
    .eq('listing_id', listing.id)
    .eq('requested_by', current.auth.id)
    .eq('role_at_request', 'seller')
    .order('requested_at', { ascending: false });
  const cancellationRequests = (cancelReqRaw ?? []) as CancellationRequestRow[];
  const pendingCancelReq = cancellationRequests.find((r) => r.status === 'pending') ?? null;

  const total = listing.gross_amount ?? listing.quantity_offered * listing.unit_price;
  const stage = statusToStage(listing.status);

  // 사전 송부 (pre_verified=true) 매물이 어드민 수령 전 상태(verified_at 미생성) 일 때
  // 판매자에게 사업장 주소 안내. 그 외 케이스는 안내 카드 미노출.
  const preSendPending =
    listing.pre_verified && listing.status === 'submitted' && listing.verified_at === null;
  const businessAddress = preSendPending ? await fetchBusinessAddress(supabase) : null;

  const timestamps = {
    submittedAt: listing.submitted_at,
    purchasedAt: listing.purchased_at,
    handedOverAt: listing.handed_over_at,
    receivedAt: listing.received_at,
    verifiedAt: listing.verified_at,
    shippedAt: listing.shipped_at,
    completedAt: listing.completed_at,
    cancelledAt: listing.cancelled_at,
  };

  const actionsSlot = (
    <SellerListingActions
      listingId={listing.id}
      canHandover={canSellerHandover(listing.status)}
      canRequestCancel={!pendingCancelReq && canRequestCancel(listing.status)}
      pendingCancelRequest={pendingCancelReq}
    />
  );

  const sharedProps = {
    listingId: listing.id,
    status: listing.status,
    stage,
    statusLabel: LISTING_STATUS_LABELS[listing.status],
    skuName: listing.sku?.display_name ?? '알 수 없는 상품',
    brand: listing.sku?.brand ?? 'unknown',
    denomination: listing.sku?.denomination ?? 0,
    thumbnailUrl: listing.sku?.thumbnail_url ?? null,
    unitPrice: listing.unit_price,
    quantityOffered: listing.quantity_offered,
    quantityRemaining: listing.quantity_remaining,
    grossAmount: total,
    sellerNetAmount: listing.seller_net_amount,
    commissionTotal: listing.commission_total,
    adminMemo: listing.admin_memo,
    preVerified: listing.pre_verified,
    preSendInfo: businessAddress
      ? { address: businessAddress, listingShortId: listing.id.slice(0, 4).toUpperCase() }
      : null,
    timestamps,
    actionsSlot,
  };

  return (
    <>
      <div className="mx-auto w-full max-w-4xl px-6 pt-4 sm:px-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/sell/listings">
            <ChevronLeft className="size-4" strokeWidth={1.75} />내 매물
          </Link>
        </Button>
      </div>
      <div className="hidden md:block">
        <DesktopSellerListing {...sharedProps} />
      </div>
      <div className="md:hidden">
        <MobileSellerListing {...sharedProps} />
      </div>
    </>
  );
}
