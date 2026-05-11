import Image from 'next/image';
import { StageBadge, type StageNumber } from '@/components/ticketa/stage-badge';
import { MoneyDisplay } from '@/components/ticketa/money-display';
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

export function DesktopSellerListing({
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
  grossAmount,
  sellerNetAmount,
  commissionTotal,
  adminMemo,
  timestamps,
  actionsSlot,
}: Props) {
  const discountPct =
    denomination > 0 ? (((denomination - unitPrice) / denomination) * 100).toFixed(1) : '0';

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-6 sm:px-8 sm:py-8">
      {/* Breadcrumb */}
      <div className="text-muted-foreground mb-3 text-[15px]">
        <span>마이룸</span>
        {' › '}
        <span>판매 내역</span>
        {' › '}
        <span className="text-foreground font-mono font-bold">{listingId.slice(0, 12)}</span>
      </div>

      {/* Status hero */}
      <div className="border-border mb-4 overflow-hidden rounded-2xl border bg-white">
        <div className="flex items-center gap-5 p-6">
          {thumbnailUrl ? (
            <div className="bg-muted/40 relative size-[80px] shrink-0 overflow-hidden rounded-lg">
              <Image
                src={thumbnailUrl}
                alt={skuName}
                fill
                sizes="80px"
                className="object-contain p-1.5"
              />
            </div>
          ) : (
            <DeptMark dept={brand.toLowerCase()} size={64} />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {stage !== null ? (
                <StageBadge stage={stage} variant="soft" label={statusLabel} />
              ) : (
                <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs font-bold">
                  {statusLabel}
                </span>
              )}
            </div>
            <h1 className="mt-1 text-xl font-extrabold tracking-tight">{skuName}</h1>
            <div className="text-muted-foreground mt-1 flex gap-4 text-[15px]">
              <span>
                매물번호{' '}
                <span className="text-foreground font-mono font-bold">
                  {listingId.slice(0, 12)}
                </span>
              </span>
              <span>등록 {formatDateTime(timestamps.submittedAt)}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
              판매가
            </div>
            <div className="mt-1 text-3xl font-black tracking-tight tabular-nums">
              {unitPrice.toLocaleString('ko-KR')}
              <span className="text-muted-foreground ml-1 text-base font-bold">원</span>
            </div>
            <div className="text-success mt-0.5 text-sm font-bold">액면 −{discountPct}%</div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="divide-border border-border grid grid-cols-4 divide-x border-t">
          {[
            ['노출', '—'],
            ['클릭', '—'],
            ['찜', '—'],
            ['수량', `${quantityRemaining} / ${quantityOffered}장`],
          ].map(([l, v]) => (
            <div key={l} className="px-5 py-3 text-center">
              <div className="text-sm font-extrabold tabular-nums">{v}</div>
              <div className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                {l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        {/* Left: timeline + details */}
        <div className="flex flex-col gap-4">
          <div className="surface-card p-5 sm:p-6">
            <h2 className="mb-4 text-[15px] font-extrabold tracking-tight">진행 상태</h2>
            <ListingTimeline status={status} timestamps={timestamps} cancelReason={null} />
          </div>

          <div className="surface-card p-5 sm:p-6">
            <h2 className="mb-4 text-[15px] font-extrabold tracking-tight">거래 정보</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-[15px]">
              <dt className="text-muted-foreground">수량</dt>
              <dd className="tabular-nums">
                {quantityRemaining} / {quantityOffered}장
              </dd>

              <dt className="text-muted-foreground">장당 판매가</dt>
              <dd className="tabular-nums">{formatKRW(unitPrice)}</dd>

              <dt className="text-muted-foreground">총액</dt>
              <dd>
                <MoneyDisplay value={grossAmount} size="md" />
              </dd>

              {sellerNetAmount !== null && (
                <>
                  <dt className="text-muted-foreground">정산 예정액</dt>
                  <dd>
                    <MoneyDisplay value={sellerNetAmount} size="md" />
                  </dd>
                </>
              )}

              {commissionTotal !== null && (
                <>
                  <dt className="text-muted-foreground">수수료</dt>
                  <dd className="tabular-nums">{formatKRW(commissionTotal)}</dd>
                </>
              )}

              <dt className="text-muted-foreground">등록일시</dt>
              <dd className="tabular-nums">{formatDateTime(timestamps.submittedAt)}</dd>

              {timestamps.purchasedAt && (
                <>
                  <dt className="text-muted-foreground">구매일시</dt>
                  <dd className="tabular-nums">{formatDateTime(timestamps.purchasedAt)}</dd>
                </>
              )}
              {timestamps.completedAt && (
                <>
                  <dt className="text-muted-foreground">완료일시</dt>
                  <dd className="tabular-nums">{formatDateTime(timestamps.completedAt)}</dd>
                </>
              )}
              {timestamps.cancelledAt && (
                <>
                  <dt className="text-muted-foreground">취소일시</dt>
                  <dd className="tabular-nums">{formatDateTime(timestamps.cancelledAt)}</dd>
                </>
              )}
            </dl>

            {adminMemo && (
              <div className="border-border bg-muted/40 mt-5 rounded-lg border p-3.5">
                <p className="text-muted-foreground text-[13px] font-bold tracking-wider uppercase">
                  어드민 메모
                </p>
                <pre className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-wrap">
                  {adminMemo}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Right: settlement + actions */}
        <div className="flex flex-col gap-4">
          {sellerNetAmount !== null && (
            <div className="bg-ticketa-blue-50 rounded-2xl p-5">
              <div className="text-ticketa-blue-700 flex items-center justify-between text-[15px] font-bold">
                <span>실수령 마일리지</span>
                <span>거래 완료 +24h</span>
              </div>
              <div className="text-ticketa-blue-700 mt-2 text-2xl font-black tracking-tight tabular-nums">
                {sellerNetAmount.toLocaleString('ko-KR')}
                <span className="ml-1 text-sm font-bold">M</span>
              </div>
              {commissionTotal !== null && (
                <div className="text-muted-foreground mt-1 text-[15px]">
                  수수료 {formatKRW(commissionTotal)} 차감
                </div>
              )}
            </div>
          )}

          <div className="surface-card p-5">
            <h2 className="mb-3 text-[15px] font-extrabold tracking-tight">매물 관리</h2>
            {actionsSlot}
          </div>
        </div>
      </div>
    </div>
  );
}
