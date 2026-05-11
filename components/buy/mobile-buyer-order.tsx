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
  sellerId: string;
  status: ListingStatus;
  stage: StageNumber | null;
  statusLabel: string;
  skuName: string;
  brand: string;
  denomination: number;
  thumbnailUrl?: string | null;
  unitPrice: number;
  quantityOffered: number;
  grossAmount: number;
  commissionTotal: number | null;
  cancelReason: string | null;
  adminMemo: string | null;
  timestamps: Timestamps;
  actionsSlot: React.ReactNode;
};

export function MobileBuyerOrder({
  // listingId and sellerId kept in Props for API compatibility but not displayed (Policy 1)
  status,
  stage,
  statusLabel,
  skuName,
  brand,
  thumbnailUrl,
  unitPrice,
  quantityOffered,
  grossAmount,
  commissionTotal,
  cancelReason,
  adminMemo,
  timestamps,
  actionsSlot,
}: Props) {
  const currentStep = stage ?? 0;

  return (
    <div className="flex flex-col pb-6">
      {/* Status hero */}
      <div className="mx-4 mt-4">
        <div
          className="relative overflow-hidden rounded-2xl p-5 text-white"
          style={{ background: 'linear-gradient(135deg, #0E2547 0%, #1A3F70 100%)' }}
        >
          <div
            className="pointer-events-none absolute -top-12 -right-10 size-44 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(168,192,255,0.25), transparent 65%)',
            }}
          />
          <div className="relative flex items-center gap-3">
            {thumbnailUrl ? (
              <div className="relative size-[52px] shrink-0 overflow-hidden rounded-xl border border-white/20 bg-white/10">
                <Image
                  src={thumbnailUrl}
                  alt={skuName}
                  fill
                  sizes="52px"
                  className="object-contain p-1.5"
                />
              </div>
            ) : (
              <DeptMark dept={brand.toLowerCase()} size={44} />
            )}
            <div className="min-w-0 flex-1">
              {stage !== null ? (
                <StageBadge stage={stage} variant="soft" label={statusLabel} />
              ) : (
                <span className="text-xs font-extrabold tracking-wider text-[#A8C0FF]">
                  {statusLabel}
                </span>
              )}
              <div className="mt-1.5 truncate text-sm font-extrabold">{skuName}</div>
            </div>
          </div>

          {/* Mini step bar */}
          <div className="relative mt-4 flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div
                key={n}
                className="h-1 flex-1 rounded-full"
                style={{
                  background:
                    n < currentStep
                      ? '#5BA476'
                      : n === currentStep
                        ? 'linear-gradient(90deg, #5BA476, #A8C0FF)'
                        : 'rgba(255,255,255,0.18)',
                }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[9px] font-bold text-white/50">
            {['결제', '완료', '검수', '입금', '배송', '수령', '완료'].map((l, i) => (
              <span
                key={l + i}
                style={{
                  color: i + 1 === currentStep ? '#A8C0FF' : undefined,
                  fontWeight: i + 1 === currentStep ? 800 : undefined,
                }}
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="surface-card mx-4 mt-3 p-4">
        <div className="mb-3 text-sm font-extrabold">진행 상태</div>
        <ListingTimeline status={status} timestamps={timestamps} cancelReason={cancelReason} />
      </div>

      {/* Receipt */}
      <div className="surface-card mx-4 mt-3 p-4">
        <div className="mb-3 text-sm font-extrabold">결제 영수증</div>
        {[
          ['상품가', grossAmount],
          ['수수료', commissionTotal ?? 0],
        ].map(([k, v]) => (
          <div key={String(k)} className="flex justify-between py-1 text-sm">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-bold tabular-nums">{Number(v).toLocaleString('ko-KR')}M</span>
          </div>
        ))}
        <div className="border-border mt-2 flex items-baseline justify-between border-t border-dashed pt-2.5">
          <span className="text-sm font-extrabold">최종 결제</span>
          <span className="text-lg font-black tabular-nums">
            {grossAmount.toLocaleString('ko-KR')}
            <span className="text-muted-foreground ml-0.5 text-sm font-semibold">M</span>
          </span>
        </div>
      </div>

      {/* Order info */}
      <div className="surface-card mx-4 mt-3 p-4">
        <div className="mb-3 text-sm font-extrabold">주문 정보</div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">수량</dt>
          <dd className="tabular-nums">{quantityOffered}장</dd>
          <dt className="text-muted-foreground">단가</dt>
          <dd className="tabular-nums">{formatKRW(unitPrice)}</dd>
          <dt className="text-muted-foreground">판매자</dt>
          <dd className="text-muted-foreground text-xs">개인 판매자</dd>
          {timestamps.purchasedAt && (
            <>
              <dt className="text-muted-foreground">구매일시</dt>
              <dd className="text-xs tabular-nums">{formatDateTime(timestamps.purchasedAt)}</dd>
            </>
          )}
        </dl>
        {cancelReason && (
          <div className="border-destructive/30 bg-destructive/5 mt-3 rounded-lg border p-2.5">
            <p className="text-destructive text-[10px] font-bold">취소 사유</p>
            <p className="mt-0.5 text-xs">{cancelReason}</p>
          </div>
        )}
        {adminMemo && (
          <div className="border-border bg-muted/40 mt-3 rounded-lg border p-2.5">
            <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
              어드민 메모
            </p>
            <pre className="mt-1 text-xs whitespace-pre-wrap">{adminMemo}</pre>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mx-4 mt-3">{actionsSlot}</div>
    </div>
  );
}
