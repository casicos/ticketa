import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';
import { MoneyDisplay } from '@/components/ticketa/money-display';
import { DesktopTopNav } from './desktop-top-nav';
import { TrustStripCard } from './trust-strip-card';
import { Sparkline } from './sparkline';
import { DesktopLandingFooter } from './landing-footer';

const HERO_BG = 'linear-gradient(180deg, #11161E 0%, #1A2230 100%)';
const PROMO_BG = 'linear-gradient(110deg, #11161E 0%, #1A2230 60%, #2A3344 100%)';
const PROMO_RADIAL = 'radial-gradient(circle, rgba(212,162,76,0.18), transparent 70%)';
const HERO_CARD_SHADOW = '0 30px 80px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.2)';

// 가격은 lib/domain/market-rate.ts 의 BRAND_PRICE_RATIO 기준으로 계산.
// 시세 알고리즘 도입 시 이 placeholder 데이터는 RPC 호출 결과로 교체될 예정.
const DEPT_PARTNERS: Array<{
  dept: Department | string;
  name: string;
  v: number;
  low: string;
  diff: number;
  hot?: boolean;
}> = [
  { dept: 'lotte', name: '롯데백화점', v: 38420, low: '49,250', diff: -1.5, hot: true },
  { dept: 'hyundai', name: '현대백화점', v: 29180, low: '98,600', diff: 0 },
  { dept: 'shinsegae', name: '신세계백화점', v: 24960, low: '197,200', diff: -1.2 },
  { dept: 'galleria', name: '갤러리아', v: 11420, low: '48,750', diff: 0.8 },
  { dept: 'ak', name: 'AK플라자', v: 8240, low: '97,800', diff: -2.1 },
];

const PRICE_TRENDS = [
  {
    dept: 'lotte',
    face: 50000,
    name: '롯데 5만원권',
    price: 49250, // 50,000 × 98.5%
    diff: -1.5,
    points: [50, 48, 46, 44, 45, 42, 40, 38, 40, 36, 32, 30],
  },
  {
    dept: 'hyundai',
    face: 100000,
    name: '현대 10만원권',
    price: 98600, // 100,000 × 98.6%
    diff: 0,
    points: [42, 40, 42, 38, 40, 42, 38, 40, 42, 40, 38, 40],
  },
  {
    dept: 'shinsegae',
    face: 200000,
    name: '신세계 20만원권',
    price: 197200, // 200,000 × 98.6%
    diff: -1.2,
    points: [54, 52, 50, 48, 46, 42, 44, 38, 36, 32, 28, 30],
  },
  {
    dept: 'galleria',
    face: 50000,
    name: '갤러리아 5만원권',
    price: 48750, // 50,000 × 97.5%
    diff: 0.8,
    points: [22, 24, 26, 28, 26, 30, 32, 30, 34, 36, 38, 40],
  },
  {
    dept: 'ak',
    face: 100000,
    name: 'AK 10만원권',
    price: 97800, // 100,000 × 97.8%
    diff: -2.1,
    points: [50, 48, 46, 42, 40, 36, 38, 32, 28, 26, 22, 20],
  },
  {
    dept: 'lotte',
    face: 100000,
    name: '롯데 10만원권',
    price: 98500, // 100,000 × 98.5%
    diff: -0.7,
    points: [40, 42, 38, 40, 36, 38, 34, 32, 30, 28, 30, 26],
  },
] as const;

export function DesktopLanding({
  className = '',
  user = null,
}: {
  className?: string;
  user?: { name: string } | null;
}) {
  return (
    <div className={`bg-background ${className}`} style={{ minWidth: 1280 }}>
      <DesktopTopNav tone="dark" activeNav="" user={user} />

      {/* Hero — 어두운 그라디언트 + 4컬럼 카드 */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: HERO_BG, marginTop: -64, paddingTop: 64 }}
      >
        <div
          className="mx-auto grid items-center gap-14 px-8 py-24"
          style={{
            maxWidth: 1180,
            gridTemplateColumns: '1.1fr 1fr',
          }}
        >
          <div>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#D4A24C]/15 px-3 py-1.5 text-[15px] font-semibold text-[#E5C387]">
              <span className="size-1.5 rounded-full bg-[#D4A24C]" />
              에이전트가 검수한 매물만
            </span>
            <h1
              className="leading-[1.1] font-extrabold tracking-tight"
              style={{ fontSize: 56, letterSpacing: '-0.028em' }}
            >
              상품권 거래,
              <br />
              이제 안전하게.
            </h1>
            <p className="mt-5 max-w-[480px] text-[17px] leading-[1.6] text-white/70">
              번개장터·당근에 흩어진 상품권 시장을 한 곳에. 본인인증 + 검수 통과한 매물만 노출하고,
              분쟁은 어드민이 중재해요.
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                href="/catalog"
                className="inline-flex h-[52px] items-center rounded-xl bg-white px-7 text-[15px] font-bold text-[#11161E] hover:bg-white/90"
              >
                지금 매물 보기
              </Link>
              <Link
                href="/sell/new"
                className="inline-flex h-[52px] items-center rounded-xl border border-white/20 bg-transparent px-7 text-[15px] font-semibold text-white hover:bg-white/10"
              >
                판매 시작하기 →
              </Link>
            </div>
            <div className="mt-10 flex gap-8 text-[15px] text-white/60">
              {[
                { v: '12', unit: '분', label: '평균 검수 시간' },
                { v: '0.4', unit: '%', label: '분쟁률' },
                { v: '2,400', unit: '건/일', label: '거래량' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-[22px] font-bold text-white tabular-nums">
                    {s.v}
                    <span className="ml-0.5 text-[15px] opacity-60">{s.unit}</span>
                  </div>
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          {/* Hero card preview — 살짝 기울어진 검수완료 카드 */}
          <div className="relative">
            <div
              className="text-foreground rounded-2xl bg-white p-6"
              style={{
                boxShadow: HERO_CARD_SHADOW,
                transform: 'rotate(-1.5deg)',
              }}
            >
              <div className="mb-3.5 flex items-center gap-3">
                <DeptMark dept="lotte" size={52} />
                <div>
                  <div className="text-base font-bold tracking-[-0.012em]">롯데백화점 상품권</div>
                  <div className="text-muted-foreground text-sm">50,000원권 · 12건 매물</div>
                </div>
                <span className="bg-ticketa-gold-500/20 text-ticketa-gold-700 ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-semibold">
                  <span className="bg-ticketa-gold-700 size-1.5 rounded-full" />
                  검수완료
                </span>
              </div>
              <div className="mb-1.5 flex items-baseline gap-2">
                <MoneyDisplay value={49000} size="xl" />
                <span className="text-success text-[15px] font-semibold">
                  ↓ 250원 시세보다 낮음
                </span>
              </div>
              <div className="from-ticketa-blue-50 relative mt-3.5 h-14 overflow-hidden rounded-md bg-gradient-to-b to-transparent">
                <Sparkline
                  points={[38, 32, 40, 28, 30, 22, 28, 18, 24, 20, 16, 18]}
                  width={320}
                  height={56}
                  fill={false}
                  color="var(--ticketa-blue-500)"
                />
              </div>
              <div className="bg-warm-50 text-muted-foreground mt-3.5 flex items-center gap-2 rounded-md px-3 py-2.5 text-[15px]">
                <ShieldCheck className="text-ticketa-blue-500 size-4" strokeWidth={1.5} />
                에이전트 검수 완료 · 본인인증 판매자
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip — 4 cards */}
      <section className="mx-auto px-8 pt-10" style={{ maxWidth: 1180 }}>
        <div className="grid grid-cols-4 gap-3">
          <TrustStripCard
            kicker="검수 통과율"
            value="99.6%"
            sub="에이전트가 직접 검수 · 평균 12분"
            accent="gold"
          />
          <TrustStripCard
            kicker="누적 거래"
            value="184만 건"
            sub="2024년 7월 베타 오픈 이후"
            accent="blue"
          />
          <TrustStripCard
            kicker="분쟁률"
            value="0.4%"
            sub="발생 시 어드민 24시간 내 중재"
            accent="blue"
          />
          <TrustStripCard
            kicker="에스크로"
            value="자동 보관"
            sub="결제 즉시 어드민 보관 · 수령 후 정산"
            accent="gold"
          />
        </div>
      </section>

      {/* 백화점 brand grid TOP 7 */}
      <section className="mx-auto px-8 pt-16" style={{ maxWidth: 1180 }}>
        <div className="mb-4 flex items-baseline">
          <h2
            className="font-bold tracking-tight"
            style={{ fontSize: 22, letterSpacing: '-0.02em' }}
          >
            거래되는 5개 백화점
          </h2>
          <span className="text-muted-foreground ml-2.5 text-[15px]">
            지난 7일 거래량 · 시세 변동
          </span>
          <Link
            href="/catalog"
            className="text-ticketa-blue-700 ml-auto text-[15px] font-semibold hover:underline"
          >
            전체 보기 →
          </Link>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {DEPT_PARTNERS.map((b, i) => {
            const diffColor =
              b.diff < 0 ? 'text-success' : b.diff > 0 ? 'text-error' : 'text-muted-foreground';
            const diffLabel =
              b.diff === 0
                ? '시세 동일'
                : `${b.diff > 0 ? '↑' : '↓'} ${Math.abs(b.diff).toFixed(1)}%`;
            return (
              <Link
                key={i}
                href={`/catalog?brand=${encodeURIComponent(b.dept)}`}
                className="border-border relative cursor-pointer rounded-2xl border bg-white px-[18px] pt-[18px] pb-4 transition-shadow hover:shadow-md"
              >
                {b.hot && (
                  <span className="bg-error absolute top-3 right-3 rounded-sm px-1.5 py-0.5 text-[13px] font-extrabold tracking-[0.04em] text-white">
                    HOT
                  </span>
                )}
                <div className="flex items-center gap-2.5">
                  <DeptMark dept={b.dept as Department} size={44} />
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold tracking-tight">{b.name}</div>
                    <div className="text-muted-foreground mt-0.5 text-[14px] font-semibold tabular-nums">
                      {b.v.toLocaleString('ko-KR')}건
                    </div>
                  </div>
                </div>
                <div className="border-warm-200 mt-3.5 flex items-baseline justify-between border-t border-dashed pt-3">
                  <div>
                    <div className="text-muted-foreground text-[13px] font-semibold tracking-[0.02em]">
                      최저가
                    </div>
                    <div className="text-[15px] font-extrabold tracking-tight tabular-nums">
                      {b.low}
                      <span className="text-muted-foreground ml-0.5 text-[13px] font-semibold">
                        원
                      </span>
                    </div>
                  </div>
                  <span className={`text-[14px] font-bold tabular-nums ${diffColor}`}>
                    {diffLabel}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 인기 시세 트렌드 — 6 sparkline cards */}
      <section className="mx-auto px-8 pt-16" style={{ maxWidth: 1180 }}>
        <div className="mb-4 flex items-baseline">
          <h2
            className="font-bold tracking-tight"
            style={{ fontSize: 22, letterSpacing: '-0.02em' }}
          >
            인기 시세 트렌드
          </h2>
          <span className="text-muted-foreground ml-2.5 text-[15px]">실시간 — 1분 전 갱신</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {PRICE_TRENDS.map((t, i) => {
            const diffColor =
              t.diff < 0 ? 'text-success' : t.diff > 0 ? 'text-error' : 'text-muted-foreground';
            const diffLabel =
              t.diff === 0
                ? '시세 동일'
                : `${t.diff > 0 ? '↑' : '↓'} ${Math.abs(t.diff).toFixed(1)}%`;
            const lineColor = t.diff >= 0 ? 'var(--semantic-error)' : 'var(--ticketa-blue-500)';
            return (
              <Link
                key={i}
                href={`/catalog?brand=${encodeURIComponent(t.dept)}&min=${t.face}&max=${t.face}`}
                className="border-border rounded-2xl border bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-center gap-2">
                  <DeptMark dept={t.dept as Department} size={26} />
                  <span className="text-[15px] font-bold tracking-tight">{t.name}</span>
                  <span className="bg-warm-100 text-warm-700 ml-auto rounded-sm px-1.5 py-0.5 text-[15px] font-semibold">
                    {t.face.toLocaleString('ko-KR')}원
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <MoneyDisplay value={t.price} size="md" />
                  <span className={`text-[15px] font-bold ${diffColor}`}>{diffLabel}</span>
                </div>
                <div className="mt-2.5">
                  <Sparkline points={[...t.points]} width={320} height={48} color={lineColor} />
                </div>
                <button
                  type="button"
                  className="border-border bg-warm-50 text-foreground hover:bg-warm-100 mt-2.5 h-[34px] w-full rounded-md border text-[15px] font-semibold"
                >
                  시세 더보기 →
                </button>
              </Link>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto px-8 py-20" style={{ maxWidth: 1180 }}>
        <div className="mb-14 text-center">
          <span className="text-ticketa-blue-700 text-[14px] font-bold tracking-[0.06em] uppercase">
            HOW IT WORKS
          </span>
          <h2
            className="mt-2 font-bold tracking-tight"
            style={{ fontSize: 36, letterSpacing: '-0.024em' }}
          >
            3단계로 끝나는 안전 거래
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-5">
          {[
            {
              n: '01',
              t: '매물 등록 + 검수',
              d: '판매자가 매물을 등록하면 에이전트가 평균 12분 내에 직접 검수해요.',
            },
            {
              n: '02',
              t: '안전결제 + 보증',
              d: '구매자 결제는 어드민이 보관. 분쟁 시 마일리지로 자동 환불.',
            },
            {
              n: '03',
              t: '거래 완료 + 정산',
              d: '구매자 수령 확인 후 판매자에게 마일리지 즉시 입금.',
            },
          ].map((s) => (
            <div key={s.n} className="border-border rounded-2xl border bg-white p-7">
              <div className="text-ticketa-gold-700 mb-3 text-[14px] font-bold tracking-[0.06em] uppercase">
                {s.n}
              </div>
              <div
                className="mb-2 font-bold tracking-tight"
                style={{ fontSize: 18, letterSpacing: '-0.018em' }}
              >
                {s.t}
              </div>
              <div className="text-muted-foreground text-base leading-[1.6]">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Promo banner — 로그인 사용자에게는 숨김 (첫거래 면제 혜택은 신규 가입자 대상) */}
      {!user && (
        <section className="mx-auto px-8 pb-20" style={{ maxWidth: 1180 }}>
          <div
            className="relative flex items-center gap-8 overflow-hidden rounded-3xl px-10 py-9 text-white"
            style={{ background: PROMO_BG }}
          >
            <div
              className="pointer-events-none absolute -top-10 -right-10 size-56 rounded-full"
              style={{ background: PROMO_RADIAL }}
            />
            <div className="relative flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D4A24C]/20 px-2.5 py-1 text-[14px] font-bold tracking-[0.04em] text-[#E5C387] uppercase">
                <span className="size-1.5 rounded-full bg-[#D4A24C]" />
                FIRST TRADE
              </span>
              <h3
                className="mt-3 font-extrabold tracking-tight"
                style={{ fontSize: 28, letterSpacing: '-0.024em' }}
              >
                첫 거래 수수료 0원
              </h3>
              <p className="mt-2 text-base leading-snug text-white/70">
                본인인증 후 첫 거래 시 안전거래 수수료를 면제해드려요.
              </p>
            </div>
            <Link
              href="/signup"
              className="inline-flex h-12 items-center rounded-[10px] bg-white px-6 text-sm font-bold whitespace-nowrap text-[#11161E] hover:bg-white/90"
            >
              지금 시작하기 →
            </Link>
          </div>
        </section>
      )}

      <DesktopLandingFooter />
    </div>
  );
}
