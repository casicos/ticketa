import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';
import { StageBadge, type StageNumber } from '@/components/ticketa/stage-badge';
import { formatKRW } from '@/lib/format';
import { LISTING_STATUS_LABELS, type ListingStatus } from '@/lib/domain/listings';

function StageDotBar({ stage, total = 7 }: { stage: number; total?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1 w-3.5 rounded-sm"
          style={{
            background: i < stage ? 'var(--ticketa-blue-500)' : 'var(--warm-200)',
          }}
        />
      ))}
    </div>
  );
}

function statusToStage(s: ListingStatus): number {
  switch (s) {
    case 'submitted':
      return 1;
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

function statusToStageNumber(s: ListingStatus): StageNumber | null {
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
    default:
      return null;
  }
}

export type MobileSellListingRow = {
  id: string;
  status: ListingStatus;
  quantity_offered: number;
  unit_price: number;
  submitted_at: string;
  sku: { display_name: string; brand: string; thumbnail_url?: string | null } | null;
};

export interface MobileSellListingsProps {
  rows: MobileSellListingRow[];
  active: MobileSellListingRow[];
  completed: MobileSellListingRow[];
  className?: string;
}

export function MobileSellListings({
  rows,
  active,
  completed,
  className,
}: MobileSellListingsProps) {
  return (
    <div className={cn('md:hidden', className)}>
      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-2 px-4 py-4">
        <div className="surface-card px-3.5 py-3">
          <div className="text-muted-foreground text-[13px] font-bold tracking-[0.04em] uppercase">
            판매중
          </div>
          <div className="mt-0.5 text-[22px] font-extrabold tracking-[-0.022em] tabular-nums">
            {active.length}
            <span className="ml-0.5 text-[14px] font-bold opacity-60">건</span>
          </div>
        </div>
        <div className="surface-card px-3.5 py-3">
          <div className="text-ticketa-gold-700 text-[13px] font-bold tracking-[0.04em] uppercase">
            거래 완료
          </div>
          <div className="mt-0.5 text-[22px] font-extrabold tracking-[-0.022em] tabular-nums">
            {completed.length}
            <span className="ml-0.5 text-[14px] font-bold opacity-60">건</span>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2 px-4 pb-20">
        {rows.length === 0 ? (
          <div className="surface-card text-muted-foreground py-8 text-center text-[15px]">
            아직 등록한 매물이 없어요.
          </div>
        ) : (
          rows.map((r) => {
            const stage = statusToStage(r.status);
            const stageNum = statusToStageNumber(r.status);
            const isActive = !(['completed', 'cancelled'] as ListingStatus[]).includes(r.status);
            return (
              <Link
                key={r.id}
                href={`/sell/listings/${r.id}`}
                className={cn(
                  'block rounded-xl border p-3.5',
                  isActive && r.status !== 'submitted'
                    ? 'border-ticketa-blue-200 bg-ticketa-blue-50'
                    : 'border-border bg-white',
                )}
              >
                <div className="mb-2 flex items-center gap-2.5">
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
                    <DeptMark dept={(r.sku?.brand ?? 'lotte') as Department} size={32} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold tracking-[-0.012em]">
                      {r.sku?.display_name ?? '알 수 없는 상품'}
                    </div>
                    <div className="text-muted-foreground font-mono text-[14px] tabular-nums">
                      {r.id.slice(0, 12).toUpperCase()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-extrabold tracking-[-0.014em] tabular-nums">
                      {formatKRW(r.unit_price)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <StageDotBar stage={r.status === 'cancelled' ? 0 : stage} />
                  {stageNum !== null ? (
                    <StageBadge stage={stageNum} label={LISTING_STATUS_LABELS[r.status]} />
                  ) : (
                    <span className="bg-muted text-muted-foreground inline-flex items-center rounded-sm px-2 py-0.5 text-[13px] font-medium">
                      {LISTING_STATUS_LABELS[r.status]}
                    </span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* FAB */}
      <div className="fixed right-4 bottom-20 z-10">
        <Link
          href="/sell/new"
          className="flex h-12 items-center rounded-full bg-[#11161E] px-5 text-[14px] font-extrabold text-white shadow-lg"
          style={{ boxShadow: '0 8px 24px rgba(17,22,30,0.32)' }}
        >
          + 매물 등록
        </Link>
      </div>
    </div>
  );
}
