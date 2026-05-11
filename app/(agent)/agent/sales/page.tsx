import Link from 'next/link';
import { ChevronLeft, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth/guards';

// TODO: Real sales data requires agent_sales_summary view or query on
// listing table filtered by buyer_id (agent) with status='completed'.
// Stub data used until that query is built.

const MONTHS = ['12월', '1월', '2월', '3월', '4월'] as const;

const AGENT_VALS = [62, 71, 78, 89, 142] as const;
const P2P_VALS = [38, 41, 39, 44, 48] as const;
const BAR_MAX = 160;

const SKU_CONTRIB = [
  { dept: '신세계', face: 100000, vol: 41200000, pct: 29.0 },
  { dept: '롯데', face: 100000, vol: 17800000, pct: 12.5 },
  { dept: '롯데', face: 50000, vol: 15600000, pct: 11.0 },
  { dept: '현대', face: 50000, vol: 13400000, pct: 9.4 },
  { dept: '신세계', face: 200000, vol: 18400000, pct: 13.0 },
  { dept: '현대', face: 100000, vol: 6400000, pct: 4.5 },
] as const;

const ADVANTAGES = [
  { label: '회전 속도', agent: '6.4일', p2p: '18.2일', diff: '2.8×' },
  { label: '검수 시간', agent: '0분', p2p: '8분', diff: '−100%' },
  { label: '취소율', agent: '0.4%', p2p: '3.2%', diff: '−87.5%' },
  { label: '재구매율', agent: '38%', p2p: '22%', diff: '+72.7%' },
] as const;

export default async function AgentSalesPage() {
  const user = await getCurrentUser();
  const agentName = user?.profile?.full_name ?? '에이전트';

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-6 sm:px-8 sm:py-8">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/agent/inventory">
          <ChevronLeft className="size-4" strokeWidth={1.75} />
          에이전트
        </Link>
      </Button>

      <header className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">매출 분석</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">{agentName} — P2P 평균 대비 성과</p>
        <div className="bg-warning/10 text-warning mt-2 inline-flex items-center rounded-md px-3 py-1.5 text-xs font-semibold">
          스텁 데이터 · 실제 연동은 에이전트 판매 집계 쿼리 구현 후 활성화
        </div>
      </header>

      {/* KPI */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: '이번 달 매출', value: '142,000,000원', sub: '+59.6% MoM' },
          { label: '판매 매수', value: '1,340매', sub: '평균 객단가 105,970원' },
          { label: '회전율', value: '6.4일', sub: 'P2P 18.2일 대비 2.8×' },
          { label: '검수 생략 시간', value: '1,820분', sub: '평균 8분 × 거래수' },
        ].map((k) => (
          <div key={k.label} className="surface-card p-4">
            <div className="text-muted-foreground text-[10.5px] font-bold tracking-[0.06em] uppercase">
              {k.label}
            </div>
            <div className="mt-1.5 text-xl font-extrabold tracking-tight tabular-nums sm:text-2xl">
              {k.value}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="surface-card mb-5 p-5">
        <div className="mb-5 flex items-start gap-3">
          <div>
            <div className="font-bold">월별 매출 추이</div>
            <div className="text-muted-foreground text-xs">단위: 백만원</div>
          </div>
          <div className="ml-auto flex gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="bg-ticketa-gold-700 inline-block size-3 rounded-sm" />
              에이전트 매출
            </span>
            <span className="flex items-center gap-1.5">
              <span className="bg-ticketa-blue-200 inline-block size-3 rounded-sm" />
              P2P 평균
            </span>
          </div>
        </div>

        {/* Grouped bar chart — Tailwind-only */}
        <div className="relative">
          {/* Y-axis gridlines */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-6 pl-9">
            {[160, 120, 80, 40, 0].map((v) => (
              <div key={v} className="relative">
                <span className="text-muted-foreground absolute -top-2 -left-9 w-8 text-right text-[10px] tabular-nums">
                  {v}
                </span>
                <div className="border-border border-t" />
              </div>
            ))}
          </div>

          {/* Bars */}
          <div className="flex items-end gap-3 pb-6 pl-10" style={{ height: 200 }}>
            {MONTHS.map((month, i) => (
              <div key={month} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full items-end justify-center gap-1" style={{ height: 160 }}>
                  {/* Agent bar */}
                  <div
                    className="bg-ticketa-gold-700 w-5 rounded-t-sm transition-all"
                    style={{ height: `${((AGENT_VALS[i] ?? 0) / BAR_MAX) * 100}%` }}
                  />
                  {/* P2P bar */}
                  <div
                    className="bg-ticketa-blue-200 w-5 rounded-t-sm transition-all"
                    style={{ height: `${((P2P_VALS[i] ?? 0) / BAR_MAX) * 100}%` }}
                  />
                </div>
                <span className="text-muted-foreground text-[11px] font-semibold">{month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two-column: SKU contrib + advantages */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* SKU contribution */}
        <div className="surface-card p-5">
          <h2 className="mb-4 font-bold">SKU 매출 기여도</h2>
          <div className="divide-border space-y-0 divide-y">
            {SKU_CONTRIB.map((r, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <div className="w-16 text-sm font-semibold">{r.dept}</div>
                <div className="text-muted-foreground w-16 text-sm tabular-nums">
                  {r.face / 10000}만원
                </div>
                <div className="flex-1">
                  <div className="bg-warm-100 h-2 overflow-hidden rounded-full">
                    <div
                      className="from-ticketa-gold-700 to-ticketa-gold-200 h-full rounded-full bg-gradient-to-r"
                      style={{ width: `${r.pct * 3}%` }}
                    />
                  </div>
                </div>
                <div className="w-24 text-right text-sm font-semibold tabular-nums">
                  {(r.vol / 10000).toLocaleString('ko-KR')}만원
                </div>
                <div className="text-muted-foreground w-10 text-right text-xs tabular-nums">
                  {r.pct}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* P2P advantage panel */}
        <div className="rounded-xl bg-[#11161E] p-5 text-white">
          <div className="text-ticketa-gold-200 mb-4 text-[10.5px] font-bold tracking-widest uppercase">
            P2P 대비 우위
          </div>
          <div className="space-y-4">
            {ADVANTAGES.map((r) => (
              <div key={r.label}>
                <div className="flex items-baseline gap-2">
                  <span className="flex-1 text-sm text-white/60">{r.label}</span>
                  <span className="text-base font-bold tabular-nums">{r.agent}</span>
                  <span className="text-sm text-white/40 tabular-nums line-through">{r.p2p}</span>
                </div>
                <div className="text-ticketa-gold-200 mt-0.5 text-sm font-bold">{r.diff}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily drill-down entry point */}
      <div className="surface-card mt-5 flex items-center justify-between p-4">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="text-muted-foreground size-4" strokeWidth={1.75} />
          <div>
            <div className="text-sm font-bold">일별 드릴다운</div>
            <div className="text-muted-foreground mt-0.5 text-xs">
              특정 월을 선택해 일자별 거래 상세를 확인하세요
            </div>
          </div>
        </div>
        {/* TODO: use current month from real data once agent_sales_daily view exists */}
        <Link
          href="/agent/sales/2026-11/15"
          className="hover:bg-muted inline-flex h-9 items-center rounded-lg border bg-white px-3.5 text-sm font-bold"
        >
          이번 달 일별 보기 →
        </Link>
      </div>
    </div>
  );
}
