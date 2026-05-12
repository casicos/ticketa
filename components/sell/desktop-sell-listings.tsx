import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';
import { StageBadge, type StageNumber } from '@/components/ticketa/stage-badge';
import { formatKRW, formatDate } from '@/lib/format';
import type { ListingStatus } from '@/lib/domain/listings';
import { LISTING_STATUS_LABELS } from '@/lib/domain/listings';

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

export type SellListingRow = {
  id: string;
  status: ListingStatus;
  quantity_offered: number;
  quantity_remaining: number;
  unit_price: number;
  submitted_at: string;
  sku: { display_name: string; brand: string; thumbnail_url?: string | null } | null;
};

export type SellTab = 'all' | 'live' | 'settle' | 'done';

const TAB_LABELS: Record<SellTab, string> = {
  all: '전체',
  live: '판매중',
  settle: '정산',
  done: '완료',
};

export interface DesktopSellListingsProps {
  rows: SellListingRow[];
  active: SellListingRow[];
  completed: SellListingRow[];
  cancelled: SellListingRow[];
  activeTab: SellTab;
  className?: string;
}

export function DesktopSellListings({
  rows,
  active,
  completed,
  cancelled,
  activeTab,
  className,
}: DesktopSellListingsProps) {
  const liveCount = active.length;
  const settleCount = active.filter((r) =>
    (['verified', 'shipped'] as ListingStatus[]).includes(r.status),
  ).length;
  const doneCount = completed.length;
  const allCount = rows.length;

  const filteredRows = rows.filter((r) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'live')
      return (['submitted', 'purchased', 'handed_over', 'received'] as ListingStatus[]).includes(
        r.status,
      );
    if (activeTab === 'settle')
      return (['verified', 'shipped'] as ListingStatus[]).includes(r.status);
    if (activeTab === 'done') return r.status === 'completed';
    return true;
  });

  const tabs: { id: SellTab; label: string; count: number }[] = [
    { id: 'all', label: TAB_LABELS.all, count: allCount },
    { id: 'live', label: TAB_LABELS.live, count: liveCount },
    { id: 'settle', label: TAB_LABELS.settle, count: settleCount },
    { id: 'done', label: TAB_LABELS.done, count: doneCount },
  ];

  return (
    <div className={cn('hidden md:block', className)}>
      <div className="mb-[22px]">
        <h1 className="text-[24px] font-bold tracking-[-0.022em]">판매 내역</h1>
        <p className="text-muted-foreground mt-1 text-[15px]">
          등록한 매물의 검수·판매·정산 흐름을 한눈에.
        </p>
      </div>

      {/* KPI strip */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        <KpiCard
          k="판매중"
          v={liveCount}
          unit="건"
          tone="blue"
          sub={`등록 ${active.filter((r) => r.status === 'submitted').length} · 진행 ${liveCount - active.filter((r) => r.status === 'submitted').length}`}
        />
        <KpiCard
          k="정산처리중"
          v={settleCount}
          unit="건"
          tone="gold"
          sub={settleCount > 0 ? '검수 완료 후 정산 대기' : '대기 없음'}
        />
        <KpiCard
          k="거래 완료"
          v={doneCount}
          unit="건"
          tone="foreground"
          sub={`누적 ${doneCount}건 거래 완료`}
        />
        <KpiCard
          k="취소"
          v={cancelled.length}
          unit="건"
          tone="muted"
          sub={cancelled.length > 0 ? '어드민 처리됨' : '없음'}
        />
      </div>

      {/* List card */}
      <div className="surface-card overflow-hidden p-0">
        <div className="border-border flex items-center justify-between border-b px-[18px] py-3.5">
          <div className="flex items-center gap-2">
            {tabs.map((t) => {
              const isActive = t.id === activeTab;
              const href = t.id === 'all' ? '/sell/listings' : `/sell/listings?tab=${t.id}`;
              return (
                <Link
                  key={t.id}
                  href={href}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[14px] font-bold transition-colors',
                    isActive
                      ? 'bg-foreground text-background'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted',
                  )}
                >
                  {t.label}
                  <span className="text-[14px] tabular-nums opacity-80">{t.count}</span>
                </Link>
              );
            })}
          </div>
          <Link
            href="/sell/new"
            className="bg-ticketa-blue-500 flex h-8 items-center rounded-lg px-3 text-[14px] font-bold text-white"
          >
            + 매물 등록
          </Link>
        </div>

        {filteredRows.length === 0 ? (
          <div className="text-muted-foreground px-5 py-12 text-center text-[15px]">
            {activeTab === 'all'
              ? '아직 등록한 매물이 없어요.'
              : `${TAB_LABELS[activeTab]} 매물이 없어요.`}{' '}
            <Link href="/sell/new" className="text-ticketa-blue-700 font-semibold">
              판매 등록하러 가기 →
            </Link>
          </div>
        ) : (
          <table className="w-full border-collapse text-[15px]">
            <thead>
              <tr className="bg-warm-50 text-muted-foreground text-[15px] font-bold tracking-[0.02em]">
                <th className="px-[18px] py-2.5 text-left">매물</th>
                <th className="px-3 py-2.5 text-right">판매가</th>
                <th className="px-3 py-2.5 text-left">등록일</th>
                <th className="min-w-[200px] px-3 py-2.5 text-left">거래 단계</th>
                <th className="px-[18px] py-2.5 text-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => {
                const stage = statusToStage(r.status);
                const isActive = !(['completed', 'cancelled'] as ListingStatus[]).includes(
                  r.status,
                );
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      'border-border border-t',
                      isActive && r.status !== 'submitted'
                        ? 'bg-ticketa-blue-50/40'
                        : 'bg-transparent',
                    )}
                  >
                    <td className="px-[18px] py-3.5">
                      <div className="flex items-center gap-2.5">
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
                          <DeptMark dept={(r.sku?.brand ?? 'lotte') as Department} size={32} />
                        )}
                        <div>
                          <div className="font-bold tracking-[-0.012em]">
                            {r.sku?.display_name ?? '알 수 없는 상품'}
                          </div>
                          <div className="text-muted-foreground font-mono text-[14px] tabular-nums">
                            {r.id.slice(0, 12).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right font-bold tabular-nums">
                      {formatKRW(r.unit_price)}
                    </td>
                    <td className="text-muted-foreground px-3 py-3.5 tabular-nums">
                      {formatDate(r.submitted_at)}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex flex-col gap-1.5">
                        <StageDotBar stage={r.status === 'cancelled' ? 0 : stage} />
                        <div className="flex items-center gap-1.5">
                          {statusToStageNumber(r.status) !== null ? (
                            <StageBadge
                              stage={statusToStageNumber(r.status)!}
                              label={LISTING_STATUS_LABELS[r.status]}
                            />
                          ) : (
                            <span className="bg-muted text-muted-foreground inline-flex items-center rounded-sm px-2 py-0.5 text-[14px] font-medium">
                              {LISTING_STATUS_LABELS[r.status]}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-[18px] py-3.5 text-right">
                      <Link
                        href={`/sell/listings/${r.id}`}
                        className="text-ticketa-blue-700 text-[15px] font-semibold hover:underline"
                      >
                        상세 →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  k,
  v,
  unit,
  sub,
  tone,
}: {
  k: string;
  v: number;
  unit: string;
  sub: string;
  tone: 'blue' | 'gold' | 'foreground' | 'muted';
}) {
  const valueClass =
    tone === 'blue'
      ? 'text-ticketa-blue-700'
      : tone === 'gold'
        ? 'text-ticketa-gold-700'
        : tone === 'muted'
          ? 'text-muted-foreground'
          : 'text-foreground';
  return (
    <div className="surface-card p-3.5">
      <div className="text-muted-foreground text-[14px] font-bold tracking-[0.04em] uppercase">
        {k}
      </div>
      <div
        className={cn(
          'mt-1 text-[22px] font-extrabold tracking-[-0.02em] tabular-nums',
          valueClass,
        )}
      >
        {v}
        <span className="ml-0.5 text-[15px] font-bold opacity-70">{unit}</span>
      </div>
      <div className="text-muted-foreground mt-1 text-[14px]">{sub}</div>
    </div>
  );
}
