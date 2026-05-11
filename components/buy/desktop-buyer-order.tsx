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

const STEP_LABELS = [
  '결제대기',
  '결제완료',
  '검수완료',
  '입금확인',
  '배송중',
  '수령확인',
  '거래완료',
];

export function DesktopBuyerOrder({
  // listingId and sellerId kept in Props for API compatibility but not displayed (Policy 1)
  status,
  stage,
  statusLabel,
  skuName,
  brand,
  denomination,
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
    <div className="mx-auto w-full max-w-4xl px-6 py-6 sm:px-8 sm:py-8">
      {/* Breadcrumb */}
      <div className="text-muted-foreground mb-3 text-[15px]">
        <span>마이룸</span>
        {' › '}
        <span>구매 내역</span>
        {' › '}
        <span className="text-foreground font-bold">상세 보기</span>
      </div>

      {/* Status hero */}
      <div
        className="relative mb-4 overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, #0E2547 0%, #1A3F70 60%, #14304F 100%)' }}
      >
        <div
          className="pointer-events-none absolute -top-20 -right-16 size-72 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(168,192,255,0.25), transparent 65%)' }}
        />
        <div className="relative flex items-center gap-5">
          {thumbnailUrl ? (
            <div className="relative size-[80px] shrink-0 overflow-hidden rounded-xl border border-white/20 bg-white/10">
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
            <div className="flex flex-wrap items-center gap-2.5">
              {stage !== null ? (
                <StageBadge stage={stage} variant="soft" label={statusLabel} />
              ) : (
                <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs font-extrabold tracking-wider text-[#A8C0FF]">
                  {statusLabel}
                </span>
              )}
              <span className="text-sm text-white/60">{skuName}</span>
            </div>
            <h1 className="mt-2 text-xl font-extrabold tracking-tight">{skuName}</h1>
            <div className="mt-1 text-sm text-white/65">
              {formatDateTime(timestamps.purchasedAt ?? timestamps.submittedAt)}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs font-bold tracking-widest text-white/50 uppercase">
              결제 금액
            </div>
            <div className="mt-1 text-2xl font-black tracking-tight tabular-nums">
              {grossAmount.toLocaleString('ko-KR')}
              <span className="ml-1 text-sm font-bold text-white/60">M</span>
            </div>
            <div className="mt-0.5 text-xs text-white/55">마일리지 결제</div>
          </div>
        </div>

        {/* Step progress */}
        <div className="relative mt-5 flex">
          <div className="absolute top-3 right-3 left-3 h-0.5 bg-white/10" />
          <div
            className="absolute top-3 left-3 h-0.5 transition-all"
            style={{
              width: currentStep > 1 ? `calc((100% - 24px) * ${(currentStep - 1) / 6})` : '0%',
              background: 'linear-gradient(90deg, #5BA476, #A8C0FF)',
            }}
          />
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const state = n < currentStep ? 'done' : n === currentStep ? 'active' : 'todo';
            return (
              <div key={label} className="relative z-10 flex flex-1 flex-col items-center gap-1.5">
                <div
                  className="flex size-6 items-center justify-center rounded-full text-xs font-extrabold"
                  style={{
                    background:
                      state === 'done'
                        ? '#5BA476'
                        : state === 'active'
                          ? 'var(--ticketa-blue-500)'
                          : 'rgba(255,255,255,0.18)',
                    color: '#fff',
                    boxShadow: state === 'active' ? '0 0 0 4px rgba(0,102,255,0.20)' : 'none',
                  }}
                >
                  {state === 'done' ? '✓' : n}
                </div>
                <span
                  className="text-[10px] font-bold"
                  style={{ color: state === 'active' ? '#A8C0FF' : 'rgba(255,255,255,0.50)' }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-[1.5fr_1fr] gap-4">
        {/* Left */}
        <div className="flex flex-col gap-4">
          {/* Timeline */}
          <div className="surface-card p-5 sm:p-6">
            <h2 className="mb-4 text-[15px] font-extrabold tracking-tight">진행 상태</h2>
            <ListingTimeline status={status} timestamps={timestamps} cancelReason={cancelReason} />
          </div>

          {/* Order info */}
          <div className="surface-card p-5 sm:p-6">
            <h2 className="mb-4 text-[15px] font-extrabold tracking-tight">주문 정보</h2>
            <dl className="grid grid-cols-[120px_1fr] gap-x-6 gap-y-3 text-[15px]">
              <dt className="text-muted-foreground">상품권</dt>
              <dd className="font-semibold">
                {skuName} (액면가 {formatKRW(denomination)})
              </dd>

              <dt className="text-muted-foreground">수량</dt>
              <dd className="tabular-nums">{quantityOffered}장</dd>

              <dt className="text-muted-foreground">단가</dt>
              <dd className="tabular-nums">{formatKRW(unitPrice)}</dd>

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

            {cancelReason && (
              <div className="border-destructive/30 bg-destructive/5 mt-4 rounded-lg border p-3">
                <p className="text-destructive text-[13px] font-bold">취소 사유</p>
                <p className="mt-1 text-[15px]">{cancelReason}</p>
              </div>
            )}

            {adminMemo && (
              <div className="border-border bg-muted/40 mt-4 rounded-lg border p-3.5">
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

        {/* Right */}
        <div className="flex flex-col gap-4">
          {/* Receipt */}
          <div className="surface-card p-5 sm:p-6">
            <h2 className="mb-4 text-[15px] font-extrabold tracking-tight">결제 영수증</h2>
            <div className="flex flex-col gap-2.5 text-[15px]">
              {[
                ['상품가', grossAmount],
                ['거래 수수료 (구매자)', commissionTotal ?? 0],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-bold tabular-nums">
                    {Number(v).toLocaleString('ko-KR')}M
                  </span>
                </div>
              ))}
              <div className="border-border mt-2 flex justify-between border-t border-dashed pt-3">
                <span className="font-extrabold">최종 결제 금액</span>
                <span className="text-lg font-black tracking-tight tabular-nums">
                  {grossAmount.toLocaleString('ko-KR')}
                  <span className="text-muted-foreground ml-0.5 text-sm font-semibold">M</span>
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="surface-card p-5">
            <h2 className="mb-3 text-[15px] font-extrabold tracking-tight">거래 관리</h2>
            {actionsSlot}
          </div>

          {/* Help */}
          <div className="surface-card p-5">
            <h2 className="mb-3 text-[15px] font-extrabold tracking-tight">
              거래에 문제가 있나요?
            </h2>
            <div className="flex flex-col gap-2">
              {[
                { l: '판매자에게 문의하기', danger: false },
                { l: '카드 잔액을 사용할 수 없어요', danger: false },
              ].map((b) => (
                <button
                  key={b.l}
                  type="button"
                  className="border-border flex h-10 items-center justify-between rounded-lg border bg-white px-4 text-[15px] font-bold"
                >
                  <span>{b.l}</span>
                  <span className="text-muted-foreground">›</span>
                </button>
              ))}
            </div>
            <div className="bg-warm-50 text-muted-foreground mt-3 rounded-lg p-3 text-base leading-relaxed">
              결제 후 30분이 지나도 진행이 없으면 자동으로 환불 절차가 시작돼요.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
