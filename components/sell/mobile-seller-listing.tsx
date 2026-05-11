import Image from 'next/image';
import { StageBadge, type StageNumber } from '@/components/ticketa/stage-badge';
import { DeptMark } from '@/components/ticketa/dept-mark';
import { ListingTimeline } from '@/components/listing-timeline';
import { formatKRW, formatDateTime } from '@/lib/format';
import type { ListingStatus } from '@/lib/domain/listings';

type Timestamps = {
  submittedAt: string;
  purchasedAt: string | null;
  handedOverAt: string | null;
  receivedAt: string | null;
  verifiedAt: string | null;
  shippedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
};

type Props = {
  listingId: string;
  status: ListingStatus;
  stage: StageNumber | null;
  statusLabel: string;
  skuName: string;
  brand: string;
  denomination: number;
  thumbnailUrl?: string | null;
  unitPrice: number;
  quantityOffered: number;
  quantityRemaining: number;
  grossAmount: number;
  sellerNetAmount: number | null;
  commissionTotal: number | null;
  adminMemo: string | null;
  timestamps: Timestamps;
  actionsSlot: React.ReactNode;
};

export function MobileSellerListing({
  listingId,
  status,
  stage,
  statusLabel,
  skuName,
  brand,
  denomination,
  thumbnailUrl,
  unitPrice,
  quantityOffered,
  quantityRemaining,
  sellerNetAmount,
  commissionTotal,
  adminMemo,
  timestamps,
  actionsSlot,
}: Props) {
  const discountPct =
    denomination > 0 ? (((denomination - unitPrice) / denomination) * 100).toFixed(1) : '0';

  return (
    <div className="flex flex-col pb-6">
      {/* Hero */}
      <div className="border-border border-b bg-white px-4 py-4">
        <div className="flex items-center gap-3">
          {thumbnailUrl ? (
            <div className="bg-muted/40 relative size-[56px] shrink-0 overflow-hidden rounded-lg">
              <Image
                src={thumbnailUrl}
                alt={skuName}
                fill
                sizes="56px"
                className="object-contain p-1.5"
              />
            </div>
          ) : (
            <DeptMark dept={brand.toLowerCase()} size={48} />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-base font-extrabold tracking-tight">{skuName}</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {stage !== null ? (
                <StageBadge stage={stage} variant="soft" label={statusLabel} />
              ) : (
                <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs font-bold">
                  {statusLabel}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <div className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
              판매가
            </div>
            <div className="text-2xl font-black tracking-tight tabular-nums">
              {unitPrice.toLocaleString('ko-KR')}
              <span className="text-muted-foreground ml-0.5 text-sm font-bold">원</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-success text-sm font-bold">액면 −{discountPct}%</div>
            <div className="text-muted-foreground text-xs">
              {quantityRemaining}/{quantityOffered}장
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="mx-4 mt-3">
        <div className="border-border grid grid-cols-4 overflow-hidden rounded-xl border bg-white">
          {[
            ['노출', '—'],
            ['클릭', '—'],
            ['찜', '—'],
            ['수량', `${quantityRemaining}장`],
          ].map(([l, v], i, arr) => (
            <div
              key={l}
              className={`py-3 text-center ${i < arr.length - 1 ? 'border-border border-r' : ''}`}
            >
              <div className="text-sm font-extrabold tabular-nums">{v}</div>
              <div className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                {l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settlement card */}
      {sellerNetAmount !== null && (
        <div className="mx-4 mt-3">
          <div className="bg-ticketa-blue-50 rounded-xl px-4 py-4">
            <div className="text-ticketa-blue-700 flex items-center justify-between text-xs font-bold">
              <span>실수령 마일리지</span>
              <span>거래 완료 +24h</span>
            </div>
            <div className="text-ticketa-blue-700 mt-1 text-xl font-black tracking-tight tabular-nums">
              {sellerNetAmount.toLocaleString('ko-KR')}
              <span className="ml-0.5 text-sm font-bold">M</span>
            </div>
            {commissionTotal !== null && (
              <div className="text-muted-foreground mt-0.5 text-xs">
                수수료 {formatKRW(commissionTotal)} 차감
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="surface-card mx-4 mt-3 p-4">
        <div className="mb-3 text-sm font-extrabold">진행 상태</div>
        <ListingTimeline status={status} timestamps={timestamps} cancelReason={null} />
      </div>

      {/* Details */}
      <div className="surface-card mx-4 mt-3 p-4">
        <div className="mb-3 text-sm font-extrabold">거래 정보</div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
          <dt className="text-muted-foreground">매물번호</dt>
          <dd className="truncate font-mono text-xs">{listingId.slice(0, 16)}</dd>
          <dt className="text-muted-foreground">등록일시</dt>
          <dd className="text-xs tabular-nums">{formatDateTime(timestamps.submittedAt)}</dd>
          {timestamps.purchasedAt && (
            <>
              <dt className="text-muted-foreground">구매일시</dt>
              <dd className="text-xs tabular-nums">{formatDateTime(timestamps.purchasedAt)}</dd>
            </>
          )}
        </dl>
        {adminMemo && (
          <div className="border-border bg-muted/40 mt-4 rounded-lg border p-3">
            <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
              어드민 메모
            </p>
            <pre className="mt-1 text-xs leading-relaxed whitespace-pre-wrap">{adminMemo}</pre>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mx-4 mt-3">{actionsSlot}</div>
    </div>
  );
}
