import {
  MarkReceivedButton,
  MarkVerifiedButton,
  MarkShippedButton,
  ForceCompleteButton,
  AdminCancelButton,
} from './intake-actions';
import {
  LISTING_STATUS_LABELS,
  canAdminReceive,
  canAdminVerify,
  canAdminShipToBuyer,
  canAdminCancel,
  type ListingStatus,
} from '@/lib/domain/listings';
import { StageBadge, type StageNumber } from '@/components/ticketa/stage-badge';
import { ShipmentInfoCard } from '@/components/catalog/shipment-info-card';
import { formatKRW, formatDateTime, shortId } from '@/lib/format';

export type ListingRow = {
  id: string;
  status: ListingStatus;
  submitted_at: string;
  purchased_at: string | null;
  handed_over_at: string | null;
  received_at: string | null;
  verified_at: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  admin_memo: string | null;
  cancel_reason: string | null;
  shipping_carrier: string | null;
  tracking_no: string | null;
  pre_verified: boolean | null;
  quantity_offered: number;
  quantity_remaining: number;
  unit_price: number;
  gross_amount: number | null;
  seller: {
    id: string;
    full_name: string;
    email: string | null;
  } | null;
  buyer: {
    id: string;
    full_name: string;
    email: string | null;
  } | null;
  sku: {
    brand: string;
    denomination: number;
    display_name: string;
  } | null;
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

function statusEnteredAt(row: ListingRow): string | null {
  switch (row.status) {
    case 'submitted':
      return row.submitted_at;
    case 'purchased':
      return row.purchased_at;
    case 'handed_over':
      return row.handed_over_at;
    case 'received':
      return row.received_at;
    case 'verified':
      return row.verified_at;
    case 'shipped':
      return row.shipped_at;
    case 'completed':
      return row.completed_at;
    case 'cancelled':
      return row.cancelled_at;
    default:
      return null;
  }
}

export function IntakeCard({ row }: { row: ListingRow }) {
  const enteredAt = statusEnteredAt(row);
  const total = row.gross_amount ?? row.quantity_offered * row.unit_price;
  const stage = statusToStage(row.status);

  return (
    <div className="surface-card space-y-3 p-4">
      {/* 헤더: 매물ID + 상태 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground font-mono text-xs">#{shortId(row.id)}</p>
          <p className="text-base font-bold tracking-tight">
            {row.sku?.display_name ?? '(SKU 없음)'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {stage !== null ? (
            <StageBadge stage={stage} label={LISTING_STATUS_LABELS[row.status]} />
          ) : (
            <span className="bg-muted text-muted-foreground inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium">
              {LISTING_STATUS_LABELS[row.status]}
            </span>
          )}
          <span className="text-muted-foreground text-xs tabular-nums">
            {formatDateTime(enteredAt)}
          </span>
        </div>
      </div>

      {/* 판매자/구매자 */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">판매자</p>
          <p className="font-medium">
            {row.seller?.full_name ?? '(이름 없음)'}
            {row.seller?.email && (
              <span className="text-muted-foreground block text-[12px]">{row.seller.email}</span>
            )}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">구매자</p>
          <p className="font-medium">
            {row.buyer?.full_name ?? '—'}
            {row.buyer?.email && (
              <span className="text-muted-foreground block text-[12px]">{row.buyer.email}</span>
            )}
          </p>
        </div>
      </div>

      {/* 수량·금액 */}
      <div className="flex gap-6 text-sm tabular-nums">
        <div>
          <span className="text-muted-foreground">수량: </span>
          <span className="font-medium">{row.quantity_offered}개</span>
        </div>
        <div>
          <span className="text-muted-foreground">단가: </span>
          <span className="font-medium">{formatKRW(row.unit_price)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">총액: </span>
          <span className="font-medium">{formatKRW(total)}</span>
        </div>
      </div>

      {/* 어드민 메모 */}
      {row.admin_memo && (
        <div className="border-border bg-muted/40 rounded-lg border p-2">
          <pre className="text-muted-foreground text-[12px] whitespace-pre-wrap">
            {row.admin_memo}
          </pre>
        </div>
      )}

      {/* 취소 사유 */}
      {row.status === 'cancelled' && row.cancel_reason && (
        <div className="border-destructive/40 bg-destructive/10 flex items-start gap-2 rounded-xl border p-3 text-xs">
          <span className="text-destructive font-medium">취소 사유: </span>
          <span className="text-foreground">{row.cancel_reason}</span>
        </div>
      )}

      {/* 송장 정보 (어드민 메모 포함) */}
      {row.shipping_carrier && row.tracking_no && (
        <ShipmentInfoCard
          carrier={row.shipping_carrier}
          trackingNo={row.tracking_no}
          shippedAt={row.shipped_at}
          adminMemo={row.admin_memo}
          showAdminMemo
        />
      )}

      {/* 액션 버튼 */}
      <div className="flex flex-wrap gap-2 pt-1">
        {canAdminReceive(row.status) && <MarkReceivedButton listingId={row.id} />}
        {canAdminVerify(row.status) && <MarkVerifiedButton listingId={row.id} />}
        {canAdminShipToBuyer(row.status) && <MarkShippedButton listingId={row.id} />}
        {row.status === 'shipped' && (
          <ForceCompleteButton listingId={row.id} shippedAt={row.shipped_at} />
        )}
        {canAdminCancel(row.status) && <AdminCancelButton listingId={row.id} />}
      </div>
    </div>
  );
}
