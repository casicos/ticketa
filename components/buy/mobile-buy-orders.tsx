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

export type MobileBuyOrderRow = {
  id: string;
  status: BuyListingStatus;
  quantity_offered: number;
  unit_price: number;
  gross_amount: number | null;
  purchased_at: string | null;
  sku: {
    brand: string;
    denomination: number;
    display_name: string;
    thumbnail_url?: string | null;
  } | null;
};

export interface MobileBuyOrdersProps {
  rows: MobileBuyOrderRow[];
  activeTab: BuyListingStatus | 'all';
  tabCounts: Record<string, number>;
  totalSaved: number;
  pendingCount?: number;
  completedCount?: number;
  className?: string;
}

export function MobileBuyOrders({
  rows,
  activeTab,
  tabCounts,
  totalSaved,
  className,
}: MobileBuyOrdersProps) {
  return (
    <div className={cn('md:hidden', className)}>
      {/* Hero savings */}
      <div
        className="mx-4 mt-4 overflow-hidden rounded-[14px] px-[18px] py-4 text-white"
        style={{
          background: 'linear-gradient(135deg, #11161E 0%, #1A2332 100%)',
          position: 'relative',
        }}
      >
        <div
          className="pointer-events-none absolute top-[-30px] right-[-30px] size-[130px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(212,162,76,0.22), transparent 70%)' }}
        />
        <div className="text-ticketa-gold-500 text-[13px] font-bold tracking-[0.06em] uppercase">
          누적 절약 금액
        </div>
        <div className="mt-1 text-[26px] font-extrabold tracking-[-0.022em] tabular-nums">
          {totalSaved.toLocaleString()}
          <span className="ml-1 text-[14px] opacity-70">원</span>
        </div>
        <div className="mt-0.5 text-[14px] text-white/65">액면가 대비 {rows.length}건 누적</div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto px-4 py-3 pb-1">
        {BUY_LISTING_TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          const href = tab.key === 'all' ? '/buy/orders' : `/buy/orders?tab=${tab.key}`;
          const count = tabCounts[tab.key] ?? 0;
          return (
            <Link
              key={tab.key}
              href={href}
              className={cn(
                'flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[14px] font-bold transition-colors',
                isActive ? 'bg-[#11161E] text-white' : 'bg-warm-100 text-warm-700',
              )}
            >
              {tab.label}
              <span className="tabular-nums opacity-80">{count}</span>
            </Link>
          );
        })}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2 px-4 pt-2 pb-6">
        {rows.length === 0 ? (
          <div className="surface-card text-muted-foreground py-8 text-center text-[15px]">
            해당 상태의 매물이 없어요.
          </div>
        ) : (
          rows.map((r) => {
            const total = r.gross_amount ?? r.quantity_offered * r.unit_price;
            const face = r.sku?.denomination ?? 0;
            const discount = face > 0 ? Math.round((1 - total / face) * 1000) / 10 : 0;
            const stageNum = buyStatusToStageNumber(r.status);
            const isHighlight = r.status !== 'completed' && r.status !== 'cancelled';

            return (
              <div
                key={r.id}
                className={cn(
                  'rounded-xl border p-3.5',
                  isHighlight
                    ? 'border-ticketa-gold-200/60 bg-ticketa-gold-50/60'
                    : 'border-border bg-white',
                )}
              >
                <div className="mb-2.5 flex items-center gap-2.5">
                  {r.sku?.thumbnail_url ? (
                    <div className="bg-muted/40 relative size-[44px] shrink-0 overflow-hidden rounded-md">
                      <Image
                        src={r.sku.thumbnail_url}
                        alt={r.sku.display_name ?? ''}
                        fill
                        sizes="44px"
                        className="object-contain p-1"
                      />
                    </div>
                  ) : (
                    <DeptMark dept={(r.sku?.brand ?? 'lotte') as Department} size={36} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[14px] font-bold tracking-[-0.012em]">
                        {r.sku?.display_name ?? '알 수 없는 상품'}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-[14px] tabular-nums">
                      {r.purchased_at && formatDateTime(r.purchased_at)}
                    </div>
                  </div>
                  {stageNum !== null ? (
                    <StageBadge stage={stageNum} label={BUY_LISTING_STATUS_LABELS[r.status]} />
                  ) : (
                    <span className="bg-muted text-muted-foreground rounded-sm px-2 py-0.5 text-[13px] font-medium">
                      {BUY_LISTING_STATUS_LABELS[r.status]}
                    </span>
                  )}
                </div>

                <div className="mb-2 flex items-end justify-between">
                  <div>
                    <div className="text-muted-foreground text-[14px] font-semibold">결제금액</div>
                    <div className="text-[18px] font-extrabold tracking-[-0.018em] tabular-nums">
                      {total.toLocaleString()}
                      <span className="ml-0.5 text-[14px] font-bold opacity-60">원</span>
                    </div>
                  </div>
                  {discount > 0 && (
                    <span className="text-ticketa-gold-700 text-[14px] font-bold">
                      ↓ {discount}% 할인
                    </span>
                  )}
                </div>

                <Link
                  href={`/buy/orders/${r.id}`}
                  className={cn(
                    'flex h-[38px] w-full items-center justify-center rounded-lg text-[14px] font-bold transition-colors',
                    r.status === 'completed'
                      ? 'border-border text-foreground border bg-white'
                      : 'bg-ticketa-blue-500 text-white',
                  )}
                >
                  상세 보기
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
