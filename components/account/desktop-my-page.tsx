import Link from 'next/link';
import { cn } from '@/lib/utils';
import { MoneyDisplay } from '@/components/ticketa/money-display';

// ─── Sidebar ───────────────────────────────────────────────────────────────

const SIDEBAR_NAV = [
  {
    group: '거래 관련',
    items: [
      { id: 'sales', l: '판매 내역', href: '/sell/listings' },
      { id: 'buys', l: '구매 내역', href: '/buy/orders' },
      { id: 'list', l: '매물 등록', href: '/sell/new' },
    ],
  },
  {
    group: '마일리지',
    items: [
      { id: 'wallet', l: '내 지갑', href: '/account/mileage' },
      { id: 'charge', l: '충전', href: '/account/mileage/charge' },
      { id: 'withdraw', l: '출금', href: '/account/mileage/withdraw' },
    ],
  },
  {
    group: '계정',
    items: [{ id: 'profile', l: '개인정보', href: '/account' }],
  },
];

export function MyPageSidebar({ active }: { active: string }) {
  return (
    <aside className="border-border w-[220px] self-start rounded-[14px] border bg-white px-4 py-5">
      <div className="border-border border-b px-1 pb-3.5 text-[15px] font-extrabold tracking-[-0.018em]">
        마이룸
      </div>
      {SIDEBAR_NAV.map((g, i) => (
        <div key={i} className={i === 0 ? 'mt-3.5' : 'mt-4.5'}>
          <div className="text-muted-foreground px-1 pb-1.5 text-[13px] font-bold tracking-[0.04em] uppercase">
            {g.group}
          </div>
          {g.items.map((it) => (
            <Link
              key={it.id}
              href={it.href}
              className={cn(
                'block rounded-lg px-2.5 py-2 text-[15px] font-semibold transition-colors',
                it.id === active
                  ? 'bg-ticketa-blue-50 text-ticketa-blue-700 font-bold'
                  : 'text-foreground hover:bg-warm-50',
              )}
            >
              {it.l}
            </Link>
          ))}
        </div>
      ))}
    </aside>
  );
}

// ─── Desktop My Page ────────────────────────────────────────────────────────

export interface DesktopMyPageProps {
  displayName: string;
  balance: { total: number; withdrawable: number; pgLocked: number };
  sellCounts: { active: number; completed: number; cancelled: number };
  buyCounts: { active: number; awaitingAccept: number; completed: number } | null;
  canBuy: boolean;
  className?: string;
}

export function DesktopMyPage({
  displayName,
  balance,
  sellCounts,
  buyCounts,
  canBuy,
  className,
}: DesktopMyPageProps) {
  // TODO: users.tier column missing — stubbed as 'GOLD'
  const tier = 'GOLD MEMBER';
  // TODO: users.points column missing — stubbed as 0
  const points = 0;
  // TODO: next_tier_gap column missing — stubbed
  const nextTierGap: number | null = null;

  return (
    <div className={cn('hidden md:block', className)}>
      <div className="grid grid-cols-[220px_1fr] gap-5">
        <MyPageSidebar active="wallet" />
        <div>
          {/* Membership hero */}
          <div
            className="relative overflow-hidden rounded-[18px] p-7 text-white"
            style={{ background: 'linear-gradient(125deg, #11161E 0%, #1A2230 50%, #2A2238 100%)' }}
          >
            <div
              className="pointer-events-none absolute top-[-60px] right-[-50px] size-[240px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(212,162,76,0.22), transparent 70%)',
              }}
            />
            <div className="flex items-start gap-[18px]">
              <div
                className="flex size-14 shrink-0 items-center justify-center rounded-[14px] text-[22px] font-black tracking-[-0.02em] text-[#11161E]"
                style={{
                  background: 'linear-gradient(135deg, #D4A24C, #B6862E)',
                  boxShadow: '0 8px 20px rgba(212,162,76,0.32)',
                }}
              >
                TK
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold tracking-[0.08em] text-[#E5C387]">
                    {tier}
                  </span>
                  {points > 0 && (
                    <span
                      className="rounded px-2 py-0.5 text-[13px] font-bold text-[#E5C387]"
                      style={{ background: 'rgba(212,162,76,0.18)' }}
                    >
                      {points.toLocaleString()}P
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[18px] font-bold tracking-[-0.015em]">
                  {displayName}님 환영해요
                </div>
                {nextTierGap != null && (
                  <div className="mt-1 text-[15px] text-white/60">
                    다음 등급까지 누적 거래 {(nextTierGap as number).toLocaleString()}원 남았어요
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Link
                  href="/account"
                  className="flex h-8 items-center rounded-lg border border-white/20 bg-white/12 px-3 text-[15px] font-semibold text-white"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                >
                  프로필 보기 ›
                </Link>
              </div>
            </div>

            {/* Balance row */}
            <div className="mt-[22px] grid grid-cols-[1fr_auto] items-end gap-6 border-t border-white/8 pt-[18px]">
              <div>
                <div className="text-[15px] font-semibold text-white/60">사용 가능 마일리지</div>
                <div className="mt-1.5 text-[38px] font-extrabold tracking-[-0.025em] tabular-nums">
                  {balance.total.toLocaleString()}
                  <span className="ml-1 text-[18px] opacity-70">M</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/account/mileage/charge"
                  className="flex h-11 items-center rounded-[10px] bg-white px-[22px] text-[15px] font-extrabold text-[#11161E]"
                >
                  충전하기
                </Link>
                <Link
                  href="/account/mileage/withdraw"
                  className="flex h-11 items-center rounded-[10px] border border-white/24 px-[22px] text-[15px] font-bold text-white"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                >
                  출금하기
                </Link>
              </div>
            </div>
          </div>

          {/* 나의 거래 현황 */}
          <div className="mt-[22px]">
            <div className="mb-2.5 text-[15px] font-bold tracking-[-0.012em]">나의 거래 현황</div>
            <div className="grid grid-cols-2 gap-3">
              {/* Sell card */}
              <div className="border-border overflow-hidden rounded-[14px] border bg-white">
                <div className="bg-ticketa-blue-50 text-ticketa-blue-700 flex items-center px-[18px] py-3 text-[15px] font-extrabold tracking-[-0.012em]">
                  판매
                  <Link
                    href="/sell/listings"
                    className="ml-auto text-[15px] font-semibold opacity-80"
                  >
                    자세히 보기 ›
                  </Link>
                </div>
                <div className="grid grid-cols-3 px-2 py-3.5">
                  {[
                    ['진행 중', sellCounts.active],
                    ['완료', sellCounts.completed],
                    ['취소', sellCounts.cancelled],
                  ].map(([l, v], j) => (
                    <div key={j} className="relative text-center">
                      {j > 0 && (
                        <div className="bg-border absolute top-1.5 bottom-1.5 left-0 w-px" />
                      )}
                      <div className="text-muted-foreground text-[15px]">{l}</div>
                      <div
                        className={cn(
                          'mt-1 text-[22px] font-extrabold tracking-[-0.018em] tabular-nums',
                          (v as number) > 0 ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {v as number}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buy card */}
              {canBuy && buyCounts ? (
                <div className="border-border overflow-hidden rounded-[14px] border bg-white">
                  <div
                    className="text-ticketa-gold-700 flex items-center px-[18px] py-3 text-[15px] font-extrabold tracking-[-0.012em]"
                    style={{ background: 'rgba(212,162,76,0.10)' }}
                  >
                    구매
                    <Link
                      href="/buy/orders"
                      className="ml-auto text-[15px] font-semibold opacity-80"
                    >
                      자세히 보기 ›
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 px-2 py-3.5">
                    {[
                      ['진행 중', buyCounts.active],
                      ['인수 대기', buyCounts.awaitingAccept],
                      ['완료', buyCounts.completed],
                    ].map(([l, v], j) => (
                      <div key={j} className="relative text-center">
                        {j > 0 && (
                          <div className="bg-border absolute top-1.5 bottom-1.5 left-0 w-px" />
                        )}
                        <div className="text-muted-foreground text-[15px]">{l}</div>
                        <div
                          className={cn(
                            'mt-1 text-[22px] font-extrabold tracking-[-0.018em] tabular-nums',
                            (v as number) > 0 ? 'text-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {v as number}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border-border text-muted-foreground flex items-center justify-center rounded-[14px] border border-dashed bg-white p-5 text-[15px]">
                  에이전트 권한이 있어야 구매이 가능해요.
                </div>
              )}
            </div>
          </div>

          {/* Withdraw available highlight */}
          {balance.withdrawable > 0 && (
            <div className="border-success/30 bg-success/5 mt-5 flex items-center justify-between rounded-xl border px-5 py-4">
              <div>
                <div className="text-success text-[13px] font-bold tracking-[0.06em] uppercase">
                  출금 가능 금액
                </div>
                <MoneyDisplay value={balance.withdrawable} size="lg" className="mt-1" />
              </div>
              <Link
                href="/account/mileage/withdraw"
                className="bg-success flex h-10 items-center rounded-lg px-4 text-[15px] font-bold text-white"
              >
                출금하기
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
