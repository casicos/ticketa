import Link from 'next/link';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';

// TODO: backend wiring — needs agent_sales_daily view (see desktop-sales-daily.tsx for schema notes)
// All data below is static stub placeholder.

type DayRow = {
  label: string;
  sales: string;
  units: number;
  dept: Department;
  today?: boolean;
};

const ROWS: DayRow[] = [
  { label: '11.15 월', sales: '5.00M', units: 45, dept: 'shinsegae', today: true },
  { label: '11.14 일', sales: '7.20M', units: 65, dept: 'lotte' },
  { label: '11.13 토', sales: '8.60M', units: 80, dept: 'hyundai' },
  { label: '11.12 금', sales: '7.80M', units: 71, dept: 'shinsegae' },
  { label: '11.11 목', sales: '6.40M', units: 58, dept: 'lotte' },
  { label: '11.10 수', sales: '5.90M', units: 54, dept: 'shinsegae' },
];

interface Props {
  month: string; // e.g. "2026-11"
  day: string; // e.g. "15"
  className?: string;
}

export function MobileAgentSalesDaily({ month, day, className }: Props) {
  const parts = month.split('-');
  const mon = parts[1] ?? '01';
  const monNum = parseInt(mon, 10);

  return (
    <div className={`flex min-h-svh flex-col ${className ?? ''}`}>
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b bg-white px-4 py-3">
        <Link
          href="/agent/sales"
          className="text-muted-foreground hover:bg-muted flex items-center justify-center rounded-lg p-1"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M12.5 5L7.5 10L12.5 15"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <span className="flex-1 text-center text-sm font-extrabold tracking-tight">
          일별 매출 · {monNum}월
        </span>
        <button className="text-ticketa-blue-700 text-xs font-bold">CSV</button>
      </div>

      {/* Scrollable body */}
      <div className="bg-background flex-1 overflow-y-auto">
        {/* MTD hero */}
        <div
          className="mx-3.5 mt-3.5 rounded-2xl border p-5"
          style={{
            background: 'linear-gradient(135deg, #FFF6E2, #FAD08A)',
            borderColor: 'rgba(212,162,76,0.30)',
          }}
        >
          <div className="text-ticketa-gold-700 text-xs font-extrabold tracking-widest uppercase">
            {monNum}월 누적 ({day}일)
          </div>
          <div className="mt-1.5 text-3xl font-black tracking-tight text-[#3F2A0A] tabular-nums">
            95.5M원
          </div>
          <div className="text-warm-700 mt-1 text-[14px]">일 평균 6.37M · 목표 대비 98%</div>
          {/* Progress bar */}
          <div
            className="mt-2.5 h-1.5 overflow-hidden rounded-full"
            style={{ background: 'rgba(255,255,255,0.6)' }}
          >
            <div
              className="h-full w-[98%] rounded-full"
              style={{ background: 'linear-gradient(90deg, #D4A24C, #B6862E)' }}
            />
          </div>
        </div>

        {/* Stat chips */}
        <div className="flex gap-2 overflow-x-auto px-3.5 pt-3.5 pb-0">
          {[
            { l: '주말 평균', v: '8.4M' },
            { l: '평일 평균', v: '5.5M' },
            { l: '피크', v: `${monNum}.06` },
          ].map((s) => (
            <div key={s.l} className="min-w-[100px] shrink-0 rounded-xl border bg-white p-2.5">
              <div className="text-muted-foreground text-[12px] font-bold tracking-wider uppercase">
                {s.l}
              </div>
              <div className="mt-0.5 text-base font-black tabular-nums">{s.v}</div>
            </div>
          ))}
        </div>

        {/* Daily list */}
        <div className="p-3.5">
          <div className="mb-2 text-[14px] font-extrabold tracking-tight">일별 상세</div>
          <div className="overflow-hidden rounded-xl border bg-white">
            {ROWS.map((r, i, arr) => (
              <div
                key={i}
                className="flex cursor-pointer items-center gap-2.5 px-3.5 py-3"
                style={{
                  borderBottom: i < arr.length - 1 ? '1px solid var(--warm-100)' : undefined,
                  background: r.today ? 'rgba(212,162,76,0.06)' : undefined,
                }}
              >
                <DeptMark dept={r.dept} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px]" style={{ fontWeight: r.today ? 800 : 700 }}>
                    {r.label}
                    {r.today && (
                      <span
                        className="ml-1.5 inline-flex items-center rounded px-1 py-0.5 text-[12px] font-bold text-white"
                        style={{ background: 'var(--ticketa-gold-700)' }}
                      >
                        오늘
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">{r.units}매 판매</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black tabular-nums">{r.sales}</div>
                </div>
                <span className="text-muted-foreground text-sm">›</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
