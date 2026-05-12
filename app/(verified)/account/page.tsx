import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/guards';
import { fetchMyMileageBalance } from '@/lib/domain/mileage';
import { fetchMyListingCounts } from '@/lib/domain/listing-counts';
import { MyRoomShell } from '@/components/account/my-room-shell';
import { formatKRW } from '@/lib/format';

export default async function AccountPage() {
  // current + supabase 병렬화. 이후 RPC/mileage 는 인증 필요.
  const [current, supabase] = await Promise.all([getCurrentUser(), createSupabaseServerClient()]);
  if (!current) redirect('/login?next=/account');

  // 0048 RPC: 기존 getSellCounts(3) + getBuyCounts(3) = 6 round-trip → 1 RPC.
  const [listingCounts, mileage] = await Promise.all([
    fetchMyListingCounts(supabase),
    fetchMyMileageBalance(supabase, current.auth.id),
  ]);
  const sellCounts = {
    submitted: listingCounts.sellSubmitted,
    in_progress: listingCounts.sellInProgress,
    completed: listingCounts.sellCompleted,
  };
  const buyCounts = {
    purchased: listingCounts.buyPurchased,
    in_progress: listingCounts.buyInProgress,
    completed: listingCounts.buyCompleted,
  };

  const displayName =
    current.profile?.full_name?.trim() ||
    current.profile?.username ||
    current.profile?.nickname ||
    '회원';

  const totalSell = sellCounts.submitted + sellCounts.in_progress + sellCounts.completed;
  const totalBuy = buyCounts.purchased + buyCounts.in_progress + buyCounts.completed;

  const sidebarCounts = {
    sellSubmitted: listingCounts.sellSubmitted,
    sellInProgress: listingCounts.sellInProgress,
    buyPurchased: listingCounts.buyPurchased,
    buyInProgress: listingCounts.buyInProgress,
  };

  return (
    <MyRoomShell active="wallet" counts={sidebarCounts}>
      {/* Membership / balance hero */}
      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white sm:p-8"
        style={{
          background: 'linear-gradient(125deg, #11161E 0%, #1A2230 50%, #2A2238 100%)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-12 size-60 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(212,162,76,0.22), transparent 70%)' }}
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          {/* Tier badge */}
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-[22px] font-extrabold tracking-[-0.02em]"
            style={{
              background: 'linear-gradient(135deg, #D4A24C, #B6862E)',
              color: '#11161E',
              boxShadow: '0 8px 20px rgba(212,162,76,0.32)',
            }}
          >
            TK
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-[14px] font-bold tracking-[0.08em]"
                style={{ color: '#E5C387' }}
              >
                MEMBER
              </span>
              <span
                className="rounded px-2 py-0.5 text-[14px] font-bold"
                style={{
                  background: 'rgba(255,255,255,0.10)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                일반 회원
              </span>
            </div>
            <div className="mt-1 text-[18px] font-bold tracking-[-0.015em]">
              <span className="font-extrabold">{displayName}</span>님 안녕하세요
            </div>
            <div className="mt-1 text-[15px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
              회원 등급·포인트 시스템은{' '}
              <span style={{ color: '#E5C387', fontWeight: 700 }}>준비 중</span>
              이에요
            </div>
          </div>
        </div>

        {/* Balance row */}
        <div
          className="relative mt-6 grid items-end gap-5 border-t pt-5 sm:grid-cols-[1fr_auto]"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
              사용 가능 마일리지
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5 font-extrabold tracking-[-0.025em] tabular-nums">
              <span className="text-[34px] sm:text-[38px]">
                {(mileage?.total ?? 0).toLocaleString('ko-KR')}
              </span>
              <span className="text-base opacity-70">M</span>
            </div>
            {mileage && mileage.pgLocked > 0 && (
              <div className="mt-1 text-[14px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                · 출금 가능 {formatKRW(mileage.withdrawable)} · 거래 후 정산{' '}
                {formatKRW(mileage.pgLocked)}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href="/account/mileage/charge"
              className="flex h-11 cursor-pointer items-center rounded-[10px] bg-white px-5 text-[15px] font-extrabold text-[#11161E] transition-transform active:translate-y-px"
            >
              충전하기
            </Link>
            <Link
              href="/account/mileage/withdraw"
              className="flex h-11 cursor-pointer items-center rounded-[10px] px-5 text-[15px] font-bold text-white transition-colors hover:bg-white/[0.18]"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.24)',
              }}
            >
              출금하기
            </Link>
          </div>
        </div>
      </section>

      {/* Trade status banners */}
      <section className="mt-6">
        <h2 className="mb-2.5 text-[15px] font-bold tracking-[-0.012em]">나의 거래 현황</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <TradeBanner
            href="/sell/listings"
            kicker="판매"
            tone="blue"
            total={totalSell}
            cols={[
              ['등록 대기', sellCounts.submitted],
              ['판매중', sellCounts.in_progress],
              ['완료', sellCounts.completed],
            ]}
          />
          <TradeBanner
            href="/buy/orders"
            kicker="구매"
            tone="gold"
            total={totalBuy}
            cols={[
              ['결제 완료', buyCounts.purchased],
              ['배송중', buyCounts.in_progress],
              ['완료', buyCounts.completed],
            ]}
          />
        </div>
      </section>

      {/* Hint card */}
      <section className="border-border mt-6 rounded-2xl border bg-white p-5">
        <div className="text-[15px] font-bold tracking-[-0.012em]">최근 거래내역</div>
        <p className="text-muted-foreground mt-2 text-[14px]">
          상세 내역은{' '}
          <Link
            href="/account/mileage"
            className="text-ticketa-blue-700 font-semibold hover:underline"
          >
            마일리지 페이지
          </Link>{' '}
          에서 확인할 수 있어요.
        </p>
      </section>
    </MyRoomShell>
  );
}

function TradeBanner({
  href,
  kicker,
  tone,
  total,
  cols,
}: {
  href: string;
  kicker: string;
  tone: 'blue' | 'gold';
  total: number;
  cols: [string, number][];
}) {
  const accentBg = tone === 'blue' ? 'var(--ticketa-blue-50)' : 'rgba(212,162,76,0.10)';
  const accentFg = tone === 'blue' ? 'var(--ticketa-blue-700)' : 'var(--ticketa-gold-700)';

  return (
    <Link
      href={href}
      className="border-border flex flex-col overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-md"
    >
      <div
        className="flex items-center px-5 py-3 text-[15px] font-extrabold tracking-[-0.012em]"
        style={{ background: accentBg, color: accentFg }}
      >
        <span>{kicker}</span>
        {total > 0 && (
          <span className="ml-2 text-[14px] font-semibold tabular-nums opacity-80">
            누적 {total}건
          </span>
        )}
        <span className="ml-auto text-[15px] font-semibold opacity-80">자세히 →</span>
      </div>
      <div className="grid grid-cols-3 px-2 py-4">
        {cols.map(([label, value], i) => (
          <div key={label} className="relative text-center">
            {i > 0 && <div className="bg-border absolute inset-y-1.5 left-0 w-px" />}
            <div className="text-muted-foreground text-[14px]">{label}</div>
            <div
              className={`mt-1 text-[22px] font-extrabold tracking-[-0.018em] tabular-nums ${
                value > 0 ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}
