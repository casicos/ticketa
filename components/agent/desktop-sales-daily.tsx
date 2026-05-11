import Link from 'next/link';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';

// TODO: backend wiring — needs agent_sales_daily view or query:
//   SELECT date, COUNT(*) as tx_count, SUM(quantity_offered) as units,
//     SUM(gross_amount) as sales, SUM(commission) as fee,
//     (SUM(gross_amount) - SUM(commission)) as net_revenue
//   FROM listings
//   WHERE buyer_id = <agent_id> AND status = 'completed'
//     AND date_trunc('month', completed_at) = <month>
//   GROUP BY date ORDER BY date DESC
// TODO: backend wiring — needs top_sku_by_day sub-query or materialized view
// TODO: backend wiring — needs avg_fulfillment_time_seconds per day
// All data below is static stub placeholder.

type DayBar = {
  d: number;
  dow: string;
  sales: number; // millions
  units: number;
  peak?: boolean;
  today?: boolean;
};

type DayRow = {
  label: string;
  tx: number;
  units: number;
  sales: string;
  fee: string;
  net: string;
  topSku: string;
  topDept: Department;
  avgTime: string;
  today?: boolean;
};

const BARS: DayBar[] = [
  { d: 1, dow: '월', sales: 4.2, units: 38 },
  { d: 2, dow: '화', sales: 5.1, units: 47 },
  { d: 3, dow: '수', sales: 4.8, units: 42 },
  { d: 4, dow: '목', sales: 6.2, units: 56 },
  { d: 5, dow: '금', sales: 8.4, units: 79 },
  { d: 6, dow: '토', sales: 9.1, units: 84, peak: true },
  { d: 7, dow: '일', sales: 6.8, units: 61 },
  { d: 8, dow: '월', sales: 4.6, units: 41 },
  { d: 9, dow: '화', sales: 5.4, units: 50 },
  { d: 10, dow: '수', sales: 5.9, units: 54 },
  { d: 11, dow: '목', sales: 6.4, units: 58 },
  { d: 12, dow: '금', sales: 7.8, units: 71 },
  { d: 13, dow: '토', sales: 8.6, units: 80 },
  { d: 14, dow: '일', sales: 7.2, units: 65 },
  { d: 15, dow: '월', sales: 5.0, units: 45, today: true },
];

const ROWS: DayRow[] = [
  {
    label: '11.15 (월) 오늘',
    tx: 32,
    units: 45,
    sales: '5,000,000',
    fee: '−75,000',
    net: '4,925,000',
    topSku: '신세계 10만',
    topDept: 'shinsegae',
    avgTime: '4분 32초',
    today: true,
  },
  {
    label: '11.14 (일)',
    tx: 47,
    units: 65,
    sales: '7,200,000',
    fee: '−108,000',
    net: '7,092,000',
    topSku: '롯데 5만',
    topDept: 'lotte',
    avgTime: '5분 18초',
  },
  {
    label: '11.13 (토)',
    tx: 58,
    units: 80,
    sales: '8,600,000',
    fee: '−129,000',
    net: '8,471,000',
    topSku: '현대 10만',
    topDept: 'hyundai',
    avgTime: '6분 02초',
  },
  {
    label: '11.12 (금)',
    tx: 51,
    units: 71,
    sales: '7,800,000',
    fee: '−117,000',
    net: '7,683,000',
    topSku: '신세계 10만',
    topDept: 'shinsegae',
    avgTime: '4분 51초',
  },
  {
    label: '11.11 (목)',
    tx: 42,
    units: 58,
    sales: '6,400,000',
    fee: '−96,000',
    net: '6,304,000',
    topSku: '롯데 10만',
    topDept: 'lotte',
    avgTime: '5분 42초',
  },
  {
    label: '11.10 (수)',
    tx: 39,
    units: 54,
    sales: '5,900,000',
    fee: '−88,500',
    net: '5,811,500',
    topSku: '신세계 10만',
    topDept: 'shinsegae',
    avgTime: '6분 11초',
  },
  {
    label: '11.09 (화)',
    tx: 37,
    units: 50,
    sales: '5,400,000',
    fee: '−81,000',
    net: '5,319,000',
    topSku: '현대 5만',
    topDept: 'hyundai',
    avgTime: '7분 02초',
  },
];

const BAR_MAX = 10;

interface Props {
  month: string; // e.g. "2026-11"
  day: string; // e.g. "15"
  className?: string;
}

export function DesktopAgentSalesDaily({ month, day, className }: Props) {
  const parts = month.split('-');
  const year = parts[0] ?? '2026';
  const mon = parts[1] ?? '01';

  return (
    <div className={`w-full ${className ?? ''}`}>
      {/* Page header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">일별 매출 드릴다운</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {year}년 {parseInt(mon, 10)}월 · 컬쳐에이전시
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/agent/sales/${year}-${String(parseInt(mon, 10) - 1).padStart(2, '0')}`}
            className="hover:bg-muted flex h-9 items-center rounded-lg border bg-white px-3 text-sm font-bold"
          >
            ‹ {parseInt(mon, 10) - 1}월
          </Link>
          <span className="flex h-9 items-center rounded-lg border bg-white px-4 text-sm font-extrabold">
            {year}.{mon}
          </span>
          <Link
            href={`/agent/sales/${year}-${String(parseInt(mon, 10) + 1).padStart(2, '0')}`}
            className="text-muted-foreground hover:bg-muted flex h-9 items-center rounded-lg border bg-white px-3 text-sm font-bold"
          >
            {parseInt(mon, 10) + 1}월 ›
          </Link>
          <button
            className="h-9 rounded-lg bg-[#11161E] px-3.5 text-sm font-bold text-white"
            style={{ border: 0 }}
          >
            {/* TODO: generate CSV from agent_sales_daily view */}
            CSV 내보내기
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        {[
          {
            label: `${parseInt(mon, 10)}월 누적 매출 (${day}일)`,
            value: '95,500,000원',
            sub: 'MTD · +12% YoY',
          },
          {
            label: '일 평균 매출',
            value: '6,367,000원',
            sub: '목표 6,500,000원의 98%',
            warn: true,
          },
          { label: '피크 일자', value: `${parseInt(mon, 10)}.06 토`, sub: '9,100,000원 (84매)' },
          {
            label: '저조 일자',
            value: `${parseInt(mon, 10)}.01 월`,
            sub: '4,200,000원 (38매)',
            warn: true,
          },
        ].map((k) => (
          <div key={k.label} className="surface-card p-4">
            <div className="text-muted-foreground text-[15px] font-bold">{k.label}</div>
            <div
              className={`mt-1.5 text-xl font-extrabold tracking-tight tabular-nums ${k.warn ? 'text-warning' : ''}`}
            >
              {k.value}
            </div>
            <div className="text-muted-foreground mt-0.5 text-xs">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="surface-card mb-4 p-6">
        <div className="mb-4 flex items-start">
          <div>
            <div className="font-bold">일별 매출 (단위 백만원)</div>
            <div className="text-muted-foreground mt-0.5 text-sm">
              주말 평균 8.4M · 평일 평균 5.5M
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4 text-[13px] font-semibold">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block size-3 rounded-sm"
                style={{ background: 'linear-gradient(180deg, #E8C896, #D4A24C)' }}
              />
              일별 매출
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block size-3 rounded-sm"
                style={{ background: 'linear-gradient(180deg, #11161E, #1A2230)' }}
              />
              오늘
            </span>
          </div>
        </div>

        <div className="relative flex items-end gap-1 pl-8" style={{ height: 240 }}>
          {/* Y-axis labels */}
          <div className="text-muted-foreground absolute top-0 bottom-6 left-0 flex flex-col justify-between text-[11px] tabular-nums">
            <span>10M</span>
            <span>5M</span>
            <span>0</span>
          </div>

          {BARS.map((b) => {
            const heightPct = (b.sales / BAR_MAX) * 100;
            const barBg = b.today
              ? 'linear-gradient(180deg, #11161E, #1A2230)'
              : b.peak
                ? 'linear-gradient(180deg, #D4A24C, #B6862E)'
                : 'linear-gradient(180deg, #E8C896, #D4A24C)';
            const todayRing = b.today ? '0 0 0 2px #fff, 0 0 0 4px #D4A24C' : undefined;
            const isWeekend = b.dow === '토' || b.dow === '일';
            return (
              <div key={b.d} className="flex flex-1 flex-col items-center gap-1.5">
                <span
                  className="text-[11px] font-bold tabular-nums"
                  style={{ color: b.peak ? 'var(--destructive)' : 'var(--muted-foreground)' }}
                >
                  {b.sales.toFixed(1)}M
                </span>
                <div
                  className="relative flex w-full max-w-[36px] flex-1 items-end justify-center"
                  style={{ height: 180 }}
                >
                  <div
                    className="w-full rounded-t-sm"
                    style={{ height: `${heightPct}%`, background: barBg, boxShadow: todayRing }}
                  />
                </div>
                <span
                  className="text-xs font-bold"
                  style={{ color: isWeekend ? 'var(--destructive)' : 'var(--muted-foreground)' }}
                >
                  {b.dow}
                </span>
                <span className="text-muted-foreground text-[11px] tabular-nums">
                  {parseInt(mon, 10)}.{String(b.d).padStart(2, '0')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail table */}
      <div className="surface-card overflow-hidden p-0">
        <div className="flex items-center gap-2.5 border-b px-4 py-3">
          <div className="text-[15px] font-bold">일별 상세</div>
          <span className="text-muted-foreground text-sm">· 클릭하면 거래 내역</span>
          <select className="ml-auto h-7 rounded-md border px-2 text-sm font-semibold">
            <option>SKU별 분해</option>
            <option>전체</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-warm-50">
              <tr>
                {[
                  '일자',
                  '거래 수',
                  '판매 매수',
                  '매출',
                  '수수료',
                  '순수익',
                  'TOP SKU',
                  '회전 시간',
                  '',
                ].map((h) => (
                  <th
                    key={h}
                    className="text-muted-foreground px-3.5 py-2.5 text-left text-xs font-bold tracking-wider uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-warm-100 divide-y">
              {ROWS.map((r, i) => (
                <tr
                  key={i}
                  className="hover:bg-warm-50 cursor-pointer"
                  style={{ background: r.today ? 'rgba(212,162,76,0.06)' : undefined }}
                >
                  <td
                    className="px-3.5 py-3 tabular-nums"
                    style={{ fontWeight: r.today ? 800 : 600 }}
                  >
                    {r.label}
                  </td>
                  <td className="px-3.5 py-3 font-semibold tabular-nums">{r.tx}</td>
                  <td className="px-3.5 py-3 font-semibold tabular-nums">{r.units}매</td>
                  <td className="px-3.5 py-3 font-bold tabular-nums">{r.sales}원</td>
                  <td className="text-destructive px-3.5 py-3 tabular-nums">{r.fee}원</td>
                  <td className="text-ticketa-gold-700 px-3.5 py-3 font-extrabold tabular-nums">
                    {r.net}원
                  </td>
                  <td className="px-3.5 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <DeptMark dept={r.topDept} size={20} />
                      <span className="text-[13px]">{r.topSku}</span>
                    </span>
                  </td>
                  <td className="text-muted-foreground px-3.5 py-3 text-[13px] tabular-nums">
                    {r.avgTime}
                  </td>
                  <td className="text-muted-foreground px-3.5 py-3 text-right text-sm">›</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-border bg-warm-50 border-t-2">
              <tr>
                <td className="px-3.5 py-3 font-extrabold">{day}일 합계</td>
                <td className="px-3.5 py-3 font-extrabold tabular-nums">686</td>
                <td className="px-3.5 py-3 font-extrabold tabular-nums">953매</td>
                <td className="px-3.5 py-3 font-extrabold tabular-nums">95,500,000원</td>
                <td className="text-destructive px-3.5 py-3 font-extrabold tabular-nums">
                  −1,432,500원
                </td>
                <td className="text-ticketa-gold-700 px-3.5 py-3 font-black tabular-nums">
                  94,067,500원
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
