import Link from 'next/link';
import { Search } from 'lucide-react';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';
import { MoneyDisplay } from '@/components/ticketa/money-display';
import { LogoLockup } from './logo';
import { TrustStripCard } from './trust-strip-card';
import { Sparkline } from './sparkline';
import { MobileTabBar } from './mobile-tab-bar';
import { MobileLandingFooter } from './landing-footer';

const HERO_BG = 'linear-gradient(180deg, #11161E 0%, #1A2230 100%)';
const PROMO_BG = 'linear-gradient(110deg, #11161E, #2A2238)';
const PROMO_RADIAL = 'radial-gradient(circle, rgba(212,162,76,0.22), transparent 70%)';

const MOBILE_DEPT_GRID = [
  { dept: 'lotte', name: '롯데', v: '3.8만' },
  { dept: 'hyundai', name: '현대', v: '2.9만' },
  { dept: 'shinsegae', name: '신세계', v: '2.5만' },
  { dept: 'galleria', name: '갤러리아', v: '1.1만' },
  { dept: 'ak', name: 'AK', v: '8,240' },
] as const;

// 가격은 lib/domain/market-rate.ts 의 BRAND_PRICE_RATIO 기준으로 계산.
// 시세 알고리즘 도입 시 placeholder 교체.
const MOBILE_PRICE_TRENDS = [
  {
    dept: 'lotte',
    name: '롯데 5만원권',
    price: 49250, // 50,000 × 98.5%
    diff: -1.5,
    points: [50, 48, 46, 44, 45, 42, 40, 38, 40, 36, 32, 30],
  },
  {
    dept: 'hyundai',
    name: '현대 10만원권',
    price: 98600, // 100,000 × 98.6%
    diff: 0,
    points: [42, 40, 42, 38, 40, 42, 38, 40, 42, 40, 38, 40],
  },
  {
    dept: 'shinsegae',
    name: '신세계 20만원권',
    price: 197200, // 200,000 × 98.6%
    diff: -1.2,
    points: [54, 52, 50, 48, 46, 42, 44, 38, 36, 32, 28, 30],
  },
] as const;

export function MobileLanding({
  className = '',
  user = null,
}: {
  className?: string;
  user?: { name: string } | null;
}) {
  return (
    <div className={`bg-background flex min-h-svh flex-col ${className}`}>
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Hero — 어두운 그라디언트 + 로고 + 검색바 */}
        <section
          className="relative overflow-hidden text-white"
          style={{ background: HERO_BG, padding: '12px 24px 32px' }}
        >
          <div
            aria-hidden
            className="absolute top-3.5 right-8 size-1.5 rounded-full"
            style={{ background: '#D4A24C', boxShadow: '0 0 18px rgba(212,162,76,0.6)' }}
          />
          <LogoLockup symbolSize={26} wordmarkHeight={16} color="#fff" />
          <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#D4A24C]/15 px-2.5 py-1 text-sm font-semibold text-[#E5C387]">
            <span className="size-1 rounded-full bg-[#D4A24C]" />
            에이전트가 검수한 매물만
          </span>
          <h1
            className="mt-3 font-extrabold tracking-tight"
            style={{ fontSize: 28, letterSpacing: '-0.025em', lineHeight: 1.15 }}
          >
            상품권 거래,
            <br />
            이제 안전하게.
          </h1>

          {/* Search hero */}
          <Link
            href="/catalog"
            className="mt-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5"
          >
            <Search className="text-muted-foreground size-4" strokeWidth={1.75} />
            <span className="text-muted-foreground flex-1 text-sm">백화점·권종으로 검색</span>
            <span className="bg-ticketa-blue-500 inline-flex h-8 items-center rounded-md px-3 text-sm font-bold text-white">
              검색
            </span>
          </Link>
        </section>

        {/* Trust strip 2x2 */}
        <section className="px-4 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <TrustStripCard kicker="검수 통과율" value="99.6%" sub="평균 12분" accent="gold" />
            <TrustStripCard kicker="누적 거래" value="184만 건" sub="2024.7~" accent="blue" />
            <TrustStripCard kicker="분쟁률" value="0.4%" sub="24h 중재" accent="blue" />
            <TrustStripCard kicker="에스크로" value="자동" sub="수령 후 정산" accent="gold" />
          </div>
        </section>

        {/* Promo banner — 로그인 사용자에게는 숨김 */}
        {!user && (
          <section className="px-4 pt-4">
            <Link
              href="/signup"
              className="relative block overflow-hidden rounded-2xl px-4 py-4 text-white"
              style={{ background: PROMO_BG }}
            >
              <div
                className="pointer-events-none absolute -top-7 -right-7 size-30 rounded-full"
                style={{
                  background: PROMO_RADIAL,
                  width: 120,
                  height: 120,
                }}
              />
              <span className="relative inline-block text-xs font-extrabold tracking-[0.06em] text-[#E5C387]">
                FIRST TRADE
              </span>
              <div
                className="relative mt-1 font-extrabold tracking-tight"
                style={{ fontSize: 15, letterSpacing: '-0.018em' }}
              >
                첫 거래 수수료 0원
              </div>
              <div className="relative mt-0.5 text-sm text-white/65">
                본인인증 후 첫 거래 안전거래 수수료 면제
              </div>
            </Link>
          </section>
        )}

        {/* 백화점 brand grid — 5 partners */}
        <section className="px-4 pt-5">
          <div
            className="mb-2.5 font-bold tracking-tight"
            style={{ fontSize: 14, letterSpacing: '-0.012em' }}
          >
            거래되는 5개 백화점
          </div>
          <div className="grid grid-cols-5 gap-2">
            {MOBILE_DEPT_GRID.map((b, i) => (
              <Link
                key={i}
                href={`/catalog?brand=${encodeURIComponent(b.dept)}`}
                className="border-border rounded-[10px] border bg-white px-1 pt-3 pb-2.5 text-center"
              >
                <DeptMark dept={b.dept as Department} size={36} />
                <div className="mt-1.5 text-[13px] font-bold">{b.name}</div>
                <div className="text-ticketa-blue-700 mt-0.5 text-[11px] font-semibold tabular-nums">
                  {b.v}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 시세 트렌드 가로 스크롤 */}
        <section className="pt-5 pb-4">
          <div
            className="mb-2.5 px-4 font-bold tracking-tight"
            style={{ fontSize: 14, letterSpacing: '-0.012em' }}
          >
            인기 시세 트렌드
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 pb-1">
            {MOBILE_PRICE_TRENDS.map((t, i) => {
              const diffColor =
                t.diff < 0 ? 'text-success' : t.diff > 0 ? 'text-error' : 'text-muted-foreground';
              const lineColor = t.diff >= 0 ? 'var(--semantic-error)' : 'var(--ticketa-blue-500)';
              return (
                <Link
                  key={i}
                  href={`/catalog?brand=${encodeURIComponent(t.dept)}`}
                  className="border-border shrink-0 rounded-xl border bg-white p-3"
                  style={{ minWidth: 200 }}
                >
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <DeptMark dept={t.dept as Department} size={20} />
                    <span className="text-sm font-bold">{t.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <MoneyDisplay value={t.price} size="sm" />
                    <span className={`text-sm font-bold ${diffColor}`}>
                      {t.diff === 0
                        ? '0%'
                        : `${t.diff > 0 ? '↑' : '↓'} ${Math.abs(t.diff).toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <Sparkline points={[...t.points]} width={170} height={32} color={lineColor} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <MobileLandingFooter />
      </div>

      <MobileTabBar active="home" />
    </div>
  );
}
