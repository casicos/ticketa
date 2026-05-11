import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';
import { StageBadge, type StageNumber } from '@/components/ticketa/stage-badge';
import { formatDateTime } from '@/lib/format';
import type { BuyListingStatus } from '@/app/(verified)/buy/orders/order-status';
import {
  BUY_LISTING_STATUS_LABELS,
  BUY_LISTING_TABS,
} from '@/app/(verified)/buy/orders/order-status';

function StageDotBar({ stage, total = 7 }: { stage: number; total?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1 w-4 rounded-sm"
          style={{
            background: i < stage ? 'var(--ticketa-blue-500)' : 'var(--warm-200)',
          }}
        />
      ))}
    </div>
  );
}

function buyStatusToStage(s: BuyListingStatus): number {
  switch (s) {
    case 'purchased':
      return 2;
    case 'handed_over':
      return 3;
    case 'received':
      return 4;
    case 'verified':
      return 5;
    case 'shipped':
      return 6;
    case 'completed':
      return 7;
    default:
      return 0;
  }
}

function buyStatusToStageNumber(s: BuyListingStatus): StageNumber | null {
  switch (s) {
    case 'purchased':
      return 4;
    case 'handed_over':
      return 2;
    case 'received':
      return 3;
    case 'verified':
      return 5;
    case 'shipped':
      return 6;
    case 'completed':
      return 7;
    default:
      return null;
  }
}

export type BuyOrderRow = {
  id: string;
  status: BuyListingStatus;
  quantity_offered: number;
  unit_price: number;
  gross_amount: number | null;
  purchased_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  sku: {
    brand: string;
    denomination: number;
    display_name: string;
    thumbnail_url?: string | null;
  } | null;
};

export interface DesktopBuyOrdersProps {
  rows: BuyOrderRow[];
  activeTab: BuyListingStatus | 'all';
  tabCounts: Record<string, number>;
  totalSaved: number;
  pendingCount: number;
  completedCount: number;
  className?: string;
}

export function DesktopBuyOrders({
  rows,
  activeTab,
  tabCounts,
  totalSaved,
  pendingCount,
  completedCount,
  className,
}: DesktopBuyOrdersProps) {
  return (
    <div className={cn('hidden md:block', className)}>
      <div className="mb-[22px]">
        <h1 className="text-[24px] font-bold tracking-[-0.022em]">구매 내역</h1>
        <p className="text-muted-foreground mt-1 text-[15px]">
          결제부터 카드 수령까지의 전체 거래 이력.
        </p>
      </div>

      <div>
        {/* Hero KPI */}
        <div className="mb-4 grid grid-cols-[1.4fr_1fr_1fr] gap-3">
          <div
            className="relative overflow-hidden rounded-[14px] px-[22px] py-[18px] text-white"
            style={{ background: 'linear-gradient(135deg, #11161E 0%, #1A2332 100%)' }}
          >
            <div
              className="pointer-events-none absolute top-[-30px] right-[-30px] size-[140px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(212,162,76,0.20), transparent 70%)',
              }}
            />
            <div className="text-ticketa-gold-500 text-[13px] font-bold tracking-[0.06em] uppercase">
              누적 절약 금액
            </div>
            <div className="mt-1.5 text-[28px] font-extrabold tracking-[-0.022em] tabular-nums">
              {totalSaved.toLocaleString()}
              <span className="ml-1 text-[15px] opacity-70">원</span>
            </div>
            <div className="mt-1 text-[15px] text-white/70">액면가 대비 {rows.length}건 누적</div>
          </div>

          {[
            { k: '진행 중', v: pendingCount, sub: '처리 대기', tone: 'gold' as const },
            {
              k: '구매완료',
              v: completedCount,
              sub: '카드 수령 완료',
              tone: 'foreground' as const,
            },
          ].map((s, i) => (
            <div key={i} className="surface-card px-5 py-[18px]">
              <div className="text-muted-foreground text-[13px] font-bold tracking-[0.04em] uppercase">
                {s.k}
              </div>
              <div
                className={cn(
                  'mt-1.5 text-[28px] font-extrabold tracking-[-0.022em] tabular-nums',
                  s.tone === 'gold' ? 'text-ticketa-gold-700' : 'text-foreground',
                )}
              >
                {s.v}
                <span className="ml-0.5 text-[15px] font-bold opacity-70">건</span>
              </div>
              <div className="text-muted-foreground mt-1 text-[15px]">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* List */}
        <div className="surface-card overflow-hidden p-0">
          {/* Tabs */}
          <div className="border-border border-b px-[18px] pt-3.5">
            <div className="flex gap-1">
              {BUY_LISTING_TABS.map((tab) => {
                const isActive = tab.key === activeTab;
                const href = tab.key === 'all' ? '/buy/orders' : `/buy/orders?tab=${tab.key}`;
                const count = tabCounts[tab.key] ?? 0;
                return (
                  <Link
                    key={tab.key}
                    href={href}
                    className={cn(
                      'mb-[-1px] flex items-center gap-1.5 px-[18px] py-2.5 text-[15px] font-bold transition-colors',
                      isActive
                        ? 'border-ticketa-blue-500 text-foreground border-b-2'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {tab.label}
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[12px] font-bold tabular-nums',
                        isActive
                          ? 'bg-ticketa-blue-500/15 text-ticketa-blue-700'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {count}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="text-muted-foreground px-5 py-10 text-center text-[15px]">
              해당 상태의 매물이 없어요.
            </div>
          ) : (
            <div className="flex flex-col">
              {rows.map((r, i) => {
                const total = r.gross_amount ?? r.quantity_offered * r.unit_price;
                const face = r.sku?.denomination ?? 0;
                const discount = face > 0 ? Math.round((1 - total / face) * 1000) / 10 : 0;
                const stage = buyStatusToStage(r.status);
                const stageNum = buyStatusToStageNumber(r.status);
                const isHighlight = r.status !== 'completed' && r.status !== 'cancelled';

                return (
                  <div
                    key={r.id}
                    className={cn(
                      'grid grid-cols-[40px_1fr_auto_auto] items-center gap-4 px-[18px] py-4',
                      i > 0 && 'border-border border-t',
                      isHighlight ? 'bg-ticketa-gold-50/50' : 'bg-transparent',
                    )}
                  >
                    {r.sku?.thumbnail_url ? (
                      <div className="bg-muted/40 relative size-[48px] shrink-0 overflow-hidden rounded-md">
                        <Image
                          src={r.sku.thumbnail_url}
                          alt={r.sku.display_name ?? ''}
                          fill
                          sizes="48px"
                          className="object-contain p-1"
                        />
                      </div>
                    ) : (
                      <DeptMark dept={(r.sku?.brand ?? 'lotte') as Department} size={40} />
                    )}
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-bold tracking-[-0.014em]">
                          {r.sku?.display_name ?? '알 수 없는 상품'}
                        </span>
                        {stageNum !== null ? (
                          <StageBadge
                            stage={stageNum}
                            label={BUY_LISTING_STATUS_LABELS[r.status]}
                          />
                        ) : (
                          <span className="bg-muted text-muted-foreground inline-flex items-center rounded-sm px-2 py-0.5 text-[13px] font-medium">
                            {BUY_LISTING_STATUS_LABELS[r.status]}
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground flex gap-3 text-[15px] tabular-nums">
                        {r.purchased_at && <span>구매 {formatDateTime(r.purchased_at)}</span>}
                      </div>
                      <div className="mt-1.5">
                        <StageDotBar stage={r.status === 'cancelled' ? 0 : stage} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-muted-foreground text-[15px] font-semibold">
                        결제금액
                      </div>
                      <div className="text-[17px] font-extrabold tracking-[-0.018em] tabular-nums">
                        {total.toLocaleString()}
                        <span className="ml-0.5 text-[15px] font-bold opacity-60">원</span>
                      </div>
                      {discount > 0 && (
                        <div className="text-ticketa-gold-700 mt-0.5 text-[15px] font-bold">
                          ↓ {discount}% 할인
                        </div>
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/buy/orders/${r.id}`}
                        className={cn(
                          'flex h-9 items-center rounded-lg px-3.5 text-[15px] font-bold transition-colors',
                          r.status === 'completed'
                            ? 'border-ticketa-blue-500 text-ticketa-blue-700 border bg-white'
                            : 'bg-ticketa-blue-500 text-white',
                        )}
                      >
                        {r.status === 'completed' ? '상세 보기' : '상세 보기'}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
