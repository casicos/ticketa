import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft, Info, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type StageNumber } from '@/components/ticketa/stage-badge';
import { getCurrentUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  BUY_LISTING_STATUS_LABELS,
  BUY_LISTING_STATUS_GUIDES,
  type BuyListingStatus,
} from '../order-status';
import { canBuyerAccept, canRequestCancel, type ListingStatus } from '@/lib/domain/listings';
import { DesktopBuyerOrder } from '@/components/buy/desktop-buyer-order';
import { MobileBuyerOrder } from '@/components/buy/mobile-buyer-order';
import { OrderDetailClient } from './order-detail-client';
import { ShipmentInfoCard } from '@/components/catalog/shipment-info-card';
import { formatKRW } from '@/lib/format';

type ListingRow = {
  id: string;
  status: BuyListingStatus;
  seller_id: string;
  pre_verified: boolean;
  quantity_offered: number;
  unit_price: number;
  gross_amount: number | null;
  commission_total: number | null;
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
  shipping_carrier: string | null;
  tracking_no: string | null;
  sku: {
    brand: string;
    denomination: number;
    display_name: string;
    thumbnail_url: string | null;
  } | null;
  seller: {
    store_name: string | null;
    username: string | null;
    full_name: string | null;
  } | null;
};

type CancellationRequestRow = {
  id: number;
  status: string;
  reason: string;
  requested_at: string;
};

// 구매자 관점 6단계 (submitted 이전이라 1~6)
//   1. 결제 완료 (purchased)
//   2. 판매자 인계 (handed_over) — P2P 만
//   3. 어드민 수령 (received)   — P2P 만
//   4. 검수 완료 (verified)     — agent 매물은 여기로 직행
//   5. 발송 (shipped)
//   6. 거래 완료 (completed)
function buyStatusToStage(s: BuyListingStatus): StageNumber | null {
  switch (s) {
    case 'purchased':
      return 1;
    case 'handed_over':
      return 2;
    case 'received':
      return 3;
    case 'verified':
      return 4;
    case 'shipped':
      return 5;
    case 'completed':
      return 6;
    case 'cancelled':
      return null;
  }
}

export default async function BuyOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const current = await getCurrentUser();
  if (!current) {
    redirect(`/login?next=${encodeURIComponent(`/buy/orders/${id}`)}`);
  }

  const supabase = await createSupabaseServerClient();

  const { data: row } = await supabase
    .from('listing')
    .select(
      'id, status, seller_id, pre_verified, quantity_offered, unit_price, gross_amount, commission_total, submitted_at, purchased_at, handed_over_at, received_at, verified_at, shipped_at, completed_at, cancelled_at, cancel_reason, admin_memo, shipping_carrier, tracking_no, sku:sku_id(brand, denomination, display_name, thumbnail_url), seller:seller_id(store_name, username, full_name)',
    )
    .eq('id', id)
    .eq('buyer_id', current.auth.id)
    .maybeSingle();

  if (!row) notFound();
  const listing = row as unknown as ListingRow;

  const { data: cancelReqRaw } = await supabase
    .from('cancellation_requests')
    .select('id, status, reason, requested_at')
    .eq('listing_id', listing.id)
    .eq('requested_by', current.auth.id)
    .eq('role_at_request', 'buyer')
    .order('requested_at', { ascending: false });

  const cancellationRequests = (cancelReqRaw ?? []) as CancellationRequestRow[];
  const pendingCancelReq = cancellationRequests.find((r) => r.status === 'pending') ?? null;

  const total = listing.gross_amount ?? listing.quantity_offered * listing.unit_price;
  const canAccept = canBuyerAccept(listing.status as ListingStatus);
  const cancelAllowed = !pendingCancelReq && canRequestCancel(listing.status as ListingStatus);
  const stage = buyStatusToStage(listing.status);

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
    <>
      <StatusGuide
        status={listing.status}
        cancelReason={listing.cancel_reason}
        refundAmount={listing.gross_amount}
      />
      {listing.shipping_carrier && listing.tracking_no && (
        <ShipmentInfoCard
          className="mt-3"
          carrier={listing.shipping_carrier}
          trackingNo={listing.tracking_no}
          shippedAt={listing.shipped_at}
        />
      )}
      <div className="mt-3">
        <OrderDetailClient
          listingId={listing.id}
          canAccept={canAccept}
          canRequestCancel={cancelAllowed}
          pendingRequest={pendingCancelReq}
        />
      </div>
    </>
  );

  const sellerLabel =
    listing.seller?.store_name ||
    listing.seller?.full_name ||
    (listing.seller?.username ? `@${listing.seller.username}` : null) ||
    (listing.pre_verified ? '에이전트 매물' : '개인 판매자');

  const sharedProps = {
    listingId: listing.id,
    sellerId: listing.seller_id,
    sellerLabel,
    isAgentListing: listing.pre_verified,
    status: listing.status as ListingStatus,
    stage,
    statusLabel: BUY_LISTING_STATUS_LABELS[listing.status],
    skuName: listing.sku?.display_name ?? '알 수 없는 상품',
    brand: listing.sku?.brand ?? 'unknown',
    denomination: listing.sku?.denomination ?? 0,
    thumbnailUrl: listing.sku?.thumbnail_url ?? null,
    unitPrice: listing.unit_price,
    quantityOffered: listing.quantity_offered,
    grossAmount: total,
    commissionTotal: listing.commission_total,
    cancelReason: listing.cancel_reason,
    adminMemo: listing.admin_memo,
    timestamps,
    actionsSlot,
  };

  return (
    <>
      <div className="mx-auto w-full max-w-4xl px-6 pt-4 sm:px-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/buy/orders">
            <ChevronLeft className="size-4" strokeWidth={1.75} />
            구매 내역
          </Link>
        </Button>
      </div>
      <div className="hidden md:block">
        <DesktopBuyerOrder {...sharedProps} />
      </div>
      <div className="md:hidden">
        <MobileBuyerOrder {...sharedProps} />
      </div>
    </>
  );
}

function StatusGuide({
  status,
  cancelReason,
  refundAmount,
}: {
  status: BuyListingStatus;
  cancelReason: string | null;
  refundAmount: number | null;
}) {
  const guide = BUY_LISTING_STATUS_GUIDES[status];

  if (status === 'cancelled') {
    return (
      <div className="border-destructive/40 bg-destructive/10 flex items-start gap-2.5 rounded-xl border p-4 text-sm">
        <XCircle className="text-destructive mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
        <div className="space-y-1">
          <p className="text-destructive font-bold tracking-tight">{guide}</p>
          {cancelReason && <p className="text-muted-foreground text-xs">사유: {cancelReason}</p>}
          {refundAmount !== null && refundAmount > 0 && (
            <p className="text-muted-foreground text-xs">
              환불 마일리지: {formatKRW(refundAmount)}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="border-success/40 bg-success/10 flex items-start gap-2.5 rounded-xl border p-4 text-sm">
        <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
        <p className="text-success font-bold tracking-tight">{guide}</p>
      </div>
    );
  }

  return (
    <div className="border-border bg-muted/40 flex items-start gap-2.5 rounded-xl border p-4 text-sm">
      <Info className="text-ticketa-blue-600 mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
      <p>{guide}</p>
    </div>
  );
}
