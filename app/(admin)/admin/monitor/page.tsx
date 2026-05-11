import { Fragment } from 'react';
import Link from 'next/link';
import { AdminPageHead, AdminKpi } from '@/components/admin/admin-shell';
import { R2Pill } from '@/components/admin/r2';
import { shortId } from '@/lib/format';
import type { ListingStatus } from '@/lib/domain/listings';
import {
  fetchActiveListings,
  fetchTodayCounts,
  type MonitorListing,
} from '@/lib/domain/admin/monitor';
import { DashboardRefreshButton } from '../dashboard-refresh-button';

// NOTE: '알림 발송' 액션은 state machine 진행 시 자동 발송과 중복 위험 → "지원 예정".
//       '개입' = 단계별 transition → /admin/intake?tab=<status> 로 이동.
//       실시간 자동 갱신은 수동 새로고침 버튼으로 대체.

type StuckRow = MonitorListing;

const STAGE_DEFS: {
  key: string;
  label: string;
  statuses: ListingStatus[];
  stuckHours: number;
  stuckAnchor: keyof StuckRow;
}[] = [
  {
    key: 'submitted',
    label: '결제 대기',
    statuses: ['submitted'],
    stuckHours: 48,
    stuckAnchor: 'purchased_at',
  },
  {
    key: 'handover',
    label: '인계 진행',
    statuses: ['purchased', 'handed_over'],
    stuckHours: 24,
    stuckAnchor: 'handed_over_at',
  },
  {
    key: 'inspect',
    label: '검수 진행',
    statuses: ['received'],
    stuckHours: 12,
    stuckAnchor: 'received_at',
  },
  {
    key: 'ship',
    label: '발송 대기',
    statuses: ['verified'],
    stuckHours: 12,
    stuckAnchor: 'verified_at',
  },
  {
    key: 'shipped',
    label: '배송 중',
    statuses: ['shipped'],
    stuckHours: 72,
    stuckAnchor: 'shipped_at',
  },
];

function hoursAgo(iso: string | null): number | null {
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

function formatStuckTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export default async function AdminMonitorPage() {
  const stageStatuses = STAGE_DEFS.flatMap((s) => s.statuses);
  const activeListings = await fetchActiveListings(stageStatuses);

  // 정체 거래 (각 stage stuck threshold 초과)
  const stuck: (StuckRow & {
    stage: string;
    stageLabel: string;
    stuckHours: number;
    risk: 'urgent' | 'high' | 'normal';
  })[] = [];
  for (const l of activeListings) {
    const def = STAGE_DEFS.find((s) => s.statuses.includes(l.status));
    if (!def) continue;
    const anchorIso = (l[def.stuckAnchor] as string | null) ?? null;
    const hrs = hoursAgo(anchorIso);
    if (hrs === null || hrs < def.stuckHours) continue;
    const risk =
      hrs >= def.stuckHours * 2 ? 'urgent' : hrs >= def.stuckHours * 1.5 ? 'high' : 'normal';
    stuck.push({ ...l, stage: def.key, stageLabel: def.label, stuckHours: hrs, risk });
  }
  stuck.sort((a, b) => b.stuckHours - a.stuckHours);

  const stageCounts = STAGE_DEFS.map((def) => {
    const list = activeListings.filter((l) => def.statuses.includes(l.status));
    const stuckInStage = stuck.filter((s) => s.stage === def.key).length;
    return { ...def, count: list.length, stuck: stuckInStage };
  });

  // KPI
  const totalActive = activeListings.length;
  const totalStuck = stuck.length;
  const { completedToday, cancelledToday } = await fetchTodayCounts();
  const successRate =
    completedToday + cancelledToday > 0
      ? ((completedToday / (completedToday + cancelledToday)) * 100).toFixed(1)
      : '—';

  return (
    <>
      <AdminPageHead
        title="거래 모니터링"
        sub="실시간 진행 거래 — 각 단계별 정체 / 자동 알림"
        right={
          <div className="flex items-center gap-2.5">
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[14px]">
              <span
                className="size-1.5 rounded-full"
                style={{
                  background: '#2E7C52',
                  boxShadow: '0 0 0 3px rgba(46,124,82,0.18)',
                }}
              />
              실시간 · 단발 갱신
            </span>
            <DashboardRefreshButton />
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-4 gap-3">
        <AdminKpi l="진행 중" v={totalActive} d="활성 매물" />
        <AdminKpi
          l="오늘 완료"
          v={completedToday}
          d={`성공률 ${successRate}${typeof successRate === 'string' && successRate !== '—' ? '%' : ''}`}
        />
        <AdminKpi
          l="정체 거래"
          v={totalStuck}
          d={totalStuck > 0 ? '단계별 SLA 초과' : 'SLA 정상'}
          tone={totalStuck > 0 ? 'warn' : 'ok'}
        />
        <AdminKpi
          l="오늘 취소"
          v={cancelledToday}
          d={cancelledToday > 0 ? '환불 처리됨' : '없음'}
          tone={cancelledToday > 0 ? 'err' : 'ok'}
        />
      </div>

      {/* Funnel */}
      <div className="border-border mb-4 rounded-[12px] border bg-white p-5">
        <div className="mb-4 flex items-center">
          <div className="text-[15px] font-extrabold">거래 단계별 분포</div>
          <span className="text-muted-foreground ml-auto text-[14px] tabular-nums">
            진행 {totalActive}건 · 정체 {totalStuck}건
          </span>
        </div>
        <div className="flex items-stretch gap-2">
          {stageCounts.map((s, i) => {
            const isHotspot = s.stuck > 0;
            return (
              <Fragment key={s.key}>
                <div
                  className="flex flex-1 flex-col gap-1.5 rounded-[10px] border p-3.5"
                  style={{
                    background: 'var(--warm-50)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div className="text-muted-foreground text-[12px] font-extrabold tracking-[0.06em] uppercase">
                    {i + 1}단계
                  </div>
                  <div className="text-[14px] font-extrabold tracking-[-0.012em]">{s.label}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[22px] font-extrabold tracking-[-0.02em] tabular-nums">
                      {s.count.toLocaleString('ko-KR')}
                    </span>
                    {isHotspot && (
                      <span className="text-destructive text-[13px] font-extrabold">
                        {s.stuck} 정체
                      </span>
                    )}
                  </div>
                  {isHotspot && (
                    <div className="bg-warm-100 h-[3px] overflow-hidden rounded-full">
                      <div
                        className="bg-destructive h-full"
                        style={{
                          width: `${Math.min(100, (s.stuck / Math.max(s.count, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
                {i < stageCounts.length - 1 && (
                  <div className="text-warm-300 flex items-center justify-center text-[16px] font-extrabold">
                    →
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Stuck transactions */}
      <div className="border-border overflow-hidden rounded-[12px] border bg-white">
        <div
          className="border-border flex items-center gap-2.5 border-b px-4 py-3.5"
          style={{ background: 'rgba(199,73,55,0.04)' }}
        >
          <span className="text-[15px] font-extrabold">정체된 거래</span>
          <span
            className="text-destructive inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[13px] font-extrabold"
            style={{ background: 'rgba(199,73,55,0.10)' }}
          >
            <span className="bg-destructive size-1.5 rounded-full" />
            {totalStuck}건
          </span>
          <span className="text-muted-foreground text-[14px]">
            · 단계별 SLA 초과 (12~72시간 기준)
          </span>
          <span className="text-muted-foreground ml-auto inline-flex items-center gap-1.5 text-[13px]">
            전체 알림 발송
            <R2Pill tone="neutral">지원 예정</R2Pill>
          </span>
        </div>
        {stuck.length === 0 ? (
          <div className="text-muted-foreground px-4 py-10 text-center text-[14px]">
            현재 정체된 거래가 없어요 — 모든 매물이 SLA 안에서 흘러가고 있어요.
          </div>
        ) : (
          <table className="w-full border-collapse text-[14px]">
            <thead className="bg-warm-50">
              <tr>
                {['거래 ID', '단계', '정체 시간', '금액', '구매자', '판매자', '리스크', '액션'].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-muted-foreground px-3 py-2.5 text-left text-[13px] font-extrabold tracking-[0.06em] uppercase"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {stuck.slice(0, 20).map((r) => {
                const total = r.unit_price * r.quantity_offered;
                const riskColor =
                  r.risk === 'urgent'
                    ? 'var(--destructive)'
                    : r.risk === 'high'
                      ? '#8C6321'
                      : 'var(--foreground)';
                const isAgent = !!r.seller?.store_name;
                return (
                  <tr key={r.id} className="border-warm-100 border-t">
                    <td className="px-3 py-3 font-mono text-[14px] font-bold">{shortId(r.id)}</td>
                    <td className="px-3 py-3 text-[14px] font-bold">{r.stageLabel}</td>
                    <td className="px-3 py-3">
                      <span
                        className="text-[14px] font-extrabold tabular-nums"
                        style={{ color: riskColor }}
                      >
                        {formatStuckTime(r.stuckHours)}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-bold tabular-nums">
                      {total.toLocaleString('ko-KR')}원
                    </td>
                    <td className="px-3 py-3 text-[14px]">
                      {r.buyer?.full_name || r.buyer?.username || '—'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        {isAgent && (
                          <span
                            className="rounded-[3px] px-1 py-0.5 text-[12px] font-extrabold tracking-[0.06em] text-white"
                            style={{ background: 'linear-gradient(135deg, #D4A24C, #B6862E)' }}
                          >
                            AGENT
                          </span>
                        )}
                        <span className="text-[14px]">
                          {r.seller?.store_name || r.seller?.full_name || r.seller?.username || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-extrabold"
                        style={{
                          color:
                            r.risk === 'urgent'
                              ? 'var(--destructive)'
                              : r.risk === 'high'
                                ? '#8C6321'
                                : '#74695C',
                          background:
                            r.risk === 'urgent'
                              ? 'rgba(199,73,55,0.10)'
                              : r.risk === 'high'
                                ? 'rgba(212,162,76,0.14)'
                                : 'rgba(140,130,120,0.14)',
                        }}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{
                            background:
                              r.risk === 'urgent'
                                ? 'var(--destructive)'
                                : r.risk === 'high'
                                  ? '#8C6321'
                                  : '#74695C',
                          }}
                        />
                        {r.risk === 'urgent' ? '긴급' : r.risk === 'high' ? '주의' : '관찰'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={
                            ['handed_over', 'received', 'verified', 'shipped'].includes(r.status)
                              ? `/admin/intake?tab=${r.status}`
                              : '/admin/intake'
                          }
                          className="bg-ticketa-blue-500 inline-flex h-7 cursor-pointer items-center rounded-[6px] px-2.5 text-[13px] font-extrabold text-white no-underline hover:opacity-90"
                        >
                          개입 →
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
