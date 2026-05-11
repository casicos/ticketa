import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface MobileMyPageProps {
  displayName: string;
  balance: { total: number; withdrawable: number; pgLocked: number };
  sellCounts: { active: number; completed: number; cancelled: number };
  buyCounts: { active: number; awaitingAccept: number; completed: number } | null;
  canBuy: boolean;
  className?: string;
}

export function MobileMyPage({
  displayName,
  balance,
  sellCounts,
  buyCounts,
  canBuy,
  className,
}: MobileMyPageProps) {
  // TODO: users.tier column missing — stubbed as 'GOLD'
  const tier = 'GOLD';

  return (
    <div className={cn('md:hidden', className)}>
      <div className="px-4 pt-4 pb-4">
        {/* Membership hero */}
        <div
          className="relative overflow-hidden rounded-[16px] p-[18px] text-white"
          style={{ background: 'linear-gradient(125deg, #11161E 0%, #1A2230 50%, #2A2238 100%)' }}
        >
          <div
            className="pointer-events-none absolute top-[-40px] right-[-40px] size-[160px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(212,162,76,0.22), transparent 70%)',
            }}
          />
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-[12px] text-[15px] font-black text-[#11161E]"
              style={{ background: 'linear-gradient(135deg, #D4A24C, #B6862E)' }}
            >
              TK
            </div>
            <div className="flex-1">
              <div className="text-[12px] font-bold tracking-[0.08em] text-[#E5C387]">
                {tier} · {displayName}님
              </div>
              <div className="mt-0.5 text-[14px] font-bold tracking-[-0.015em]">환영해요</div>
            </div>
          </div>

          <div className="mt-3.5 border-t border-white/8 pt-3">
            <div className="text-[14px] text-white/60">사용 가능 마일리지</div>
            <div className="mt-1 text-[28px] font-extrabold tracking-[-0.022em] tabular-nums">
              {balance.total.toLocaleString()}
              <span className="ml-1 text-[14px] opacity-70">M</span>
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                href="/account/mileage/charge"
                className="flex h-[38px] flex-1 items-center justify-center rounded-lg bg-white text-[14px] font-extrabold text-[#11161E]"
              >
                충전하기
              </Link>
              <Link
                href="/account/mileage/withdraw"
                className="flex h-[38px] flex-1 items-center justify-center rounded-lg border border-white/24 text-[14px] font-bold text-white"
                style={{ background: 'rgba(255,255,255,0.12)' }}
              >
                출금하기
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Trade status */}
      <div className="px-4 pb-2">
        <div className="mb-2 text-[14px] font-bold tracking-[-0.012em]">나의 거래 현황</div>

        {/* Sell */}
        <div className="border-border mb-2 overflow-hidden rounded-[12px] border bg-white">
          <div className="bg-ticketa-blue-50 text-ticketa-blue-700 flex items-center px-3.5 py-2 text-[14px] font-extrabold">
            판매
            <Link href="/sell/listings" className="ml-auto text-[14px] font-semibold opacity-80">
              자세히 ›
            </Link>
          </div>
          <div className="grid grid-cols-3 px-1 py-2.5">
            {[
              ['진행 중', sellCounts.active],
              ['완료', sellCounts.completed],
              ['취소', sellCounts.cancelled],
            ].map(([l, v], j) => (
              <div key={j} className="relative text-center">
                {j > 0 && <div className="bg-border absolute top-1 bottom-1 left-0 w-px" />}
                <div className="text-muted-foreground text-[14px]">{l}</div>
                <div
                  className={cn(
                    'mt-0.5 text-[15px] font-extrabold tabular-nums',
                    (v as number) > 0 ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {v as number}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Buy */}
        {canBuy && buyCounts ? (
          <div className="border-border overflow-hidden rounded-[12px] border bg-white">
            <div
              className="text-ticketa-gold-700 flex items-center px-3.5 py-2 text-[14px] font-extrabold"
              style={{ background: 'rgba(212,162,76,0.10)' }}
            >
              구매
              <Link href="/buy/orders" className="ml-auto text-[14px] font-semibold opacity-80">
                자세히 ›
              </Link>
            </div>
            <div className="grid grid-cols-3 px-1 py-2.5">
              {[
                ['진행 중', buyCounts.active],
                ['인수 대기', buyCounts.awaitingAccept],
                ['완료', buyCounts.completed],
              ].map(([l, v], j) => (
                <div key={j} className="relative text-center">
                  {j > 0 && <div className="bg-border absolute top-1 bottom-1 left-0 w-px" />}
                  <div className="text-muted-foreground text-[14px]">{l}</div>
                  <div
                    className={cn(
                      'mt-0.5 text-[15px] font-extrabold tabular-nums',
                      (v as number) > 0 ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {v as number}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Quick links */}
      <div className="px-4 pt-2 pb-6">
        <div className="grid grid-cols-2 gap-2">
          {[
            { l: '매물 등록', href: '/sell/new' },
            { l: '프로필', href: '/account' },
          ].map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="border-border text-foreground flex h-11 items-center justify-center rounded-xl border bg-white text-[14px] font-semibold"
            >
              {it.l}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
