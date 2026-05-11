import Link from 'next/link';
import { formatLedgerMemo } from '@/lib/format';

type LedgerRow = {
  id: number;
  type: string;
  amount: number;
  memo: string | null;
  created_at: string;
};

type Props = {
  userName: string;
  /** cash_balance + pg_locked (출금 진행 중 제외, 실제 차감된 후의 보유) */
  total: number;
  /** 출금 가능 = cash_balance */
  withdrawable: number;
  /** 출금 신청 후 어드민 처리 대기 중인 합계 — 보유 합산에만 반영 */
  inFlightWithdraw: number;
  ledger: LedgerRow[];
};

function ledgerIcon(type: string): string {
  switch (type) {
    case 'charge':
      return '↓';
    case 'settle':
      return '↑';
    case 'gift':
      return '🎁';
    default:
      return '−';
  }
}

function ledgerStyle(type: string): { bg: string; color: string } {
  switch (type) {
    case 'charge':
      return { bg: 'var(--ticketa-blue-50)', color: 'var(--ticketa-blue-700)' };
    case 'settle':
      return { bg: 'rgba(46,124,82,0.10)', color: '#1F6B43' };
    case 'gift':
      return { bg: 'rgba(212,162,76,0.16)', color: 'var(--ticketa-gold-700)' };
    default:
      return { bg: 'var(--warm-100)', color: 'var(--warm-700)' };
  }
}

export function DesktopMileageHub({
  userName,
  total,
  withdrawable,
  inFlightWithdraw,
  ledger,
}: Props) {
  // 보유 마일리지 = 실잔액 + 출금 진행 중 (정산되기 전까지는 보유로 카운트)
  const heldTotal = total + inFlightWithdraw;
  // 사용 가능 (매물 매입에 쓸 수 있는) = 실잔액 = cash + pg_locked
  const spendable = total;
  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">마일리지</h1>
        <p className="text-muted-foreground mt-1 text-[15px]">
          충전·출금·선물 모두 여기서 시작해요 · 1M = 1원
        </p>
      </div>

      {/* Balance hero */}
      <div
        className="relative mb-4 overflow-hidden rounded-3xl p-8 text-white"
        style={{ background: 'linear-gradient(125deg, #11161E 0%, #1A2230 55%, #2A2238 100%)' }}
      >
        <div
          className="pointer-events-none absolute -top-20 -right-16 size-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,102,255,0.20), transparent 65%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-28 -left-10 size-72 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(212,162,76,0.16), transparent 65%)' }}
        />
        <div className="relative flex items-end justify-between gap-6">
          <div>
            <div className="text-[14px] font-bold tracking-[0.12em] text-[#A8C0FF]">
              MILEAGE BALANCE
            </div>
            <div className="mt-2 text-[15px] font-semibold text-white/60">
              {userName}님의 보유 마일리지
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-5xl leading-none font-black tracking-tight tabular-nums sm:text-6xl">
                {heldTotal.toLocaleString('ko-KR')}
              </span>
              <span className="text-xl font-extrabold text-[#D4A24C]">M</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[14px] text-white/60">
              <span>
                사용 가능{' '}
                <strong className="ml-1 font-bold text-white tabular-nums">
                  {spendable.toLocaleString('ko-KR')}원
                </strong>
              </span>
              <span>
                출금 가능{' '}
                <strong className="ml-1 font-bold text-white tabular-nums">
                  {withdrawable.toLocaleString('ko-KR')}원
                </strong>
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href="/account/mileage/charge"
              className="flex h-11 items-center rounded-xl bg-white px-6 text-[15px] font-extrabold text-[#11161E] hover:bg-white/90"
            >
              + 충전하기
            </Link>
            <Link
              href="/account/mileage/withdraw"
              className="flex h-11 items-center rounded-xl border border-white/20 bg-white/10 px-5 text-[15px] font-bold text-white hover:bg-white/20"
            >
              출금
            </Link>
            <Link
              href="/account/gift"
              className="flex h-11 items-center rounded-xl border border-white/20 bg-white/10 px-5 text-[15px] font-bold text-white hover:bg-white/20"
            >
              선물
            </Link>
          </div>
        </div>
      </div>

      {/* Quick action tiles */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        {[
          {
            l: '충전',
            d: '5분 내 즉시',
            icon: '↓',
            bg: 'var(--ticketa-blue-50)',
            fg: 'var(--ticketa-blue-700)',
            href: '/account/mileage/charge',
          },
          {
            l: '출금',
            d: '12시간 내 입금',
            icon: '↑',
            bg: '#F4EAF8',
            fg: '#5A2168',
            href: '/account/mileage/withdraw',
          },
          {
            l: '선물',
            d: '백화점 상품권',
            icon: '🎁',
            bg: 'rgba(212,162,76,0.10)',
            fg: 'var(--ticketa-gold-700)',
            href: '/account/gift',
          },
          {
            l: '내역',
            d: '전체 거래 기록',
            icon: '⇄',
            bg: 'rgba(46,124,82,0.10)',
            fg: '#1F6B43',
            href: '#',
          },
        ].map((t) => (
          <Link
            key={t.l}
            href={t.href}
            className="surface-card relative flex flex-col gap-3 p-5 transition-shadow hover:shadow-md"
          >
            <div
              className="flex size-10 items-center justify-center rounded-xl text-lg font-extrabold"
              style={{ background: t.bg, color: t.fg }}
            >
              {t.icon}
            </div>
            <div>
              <div className="text-[15px] font-extrabold tracking-tight">{t.l}</div>
              <div className="text-muted-foreground mt-0.5 text-[15px]">{t.d}</div>
            </div>
            <span className="text-muted-foreground absolute top-5 right-4">›</span>
          </Link>
        ))}
      </div>

      {/* Two-column: limits + recent */}
      <div className="grid grid-cols-[1fr_1.2fr] gap-4">
        <div className="surface-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold tracking-tight">이번 달 사용 한도</h2>
          </div>
          <div className="flex flex-col gap-5">
            {[{ l: '일일 충전' }, { l: '월 충전' }, { l: '월 출금' }].map((t) => (
              <div key={t.l}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[15px] font-bold">{t.l}</span>
                  <span className="text-ticketa-blue-700 inline-flex items-center gap-1 text-[15px] font-extrabold">
                    <span className="text-[17px] leading-none font-black">∞</span>
                    한도 없음
                  </span>
                </div>
                <div
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                  style={{
                    background:
                      'repeating-linear-gradient(135deg, var(--warm-200) 0 6px, var(--warm-100) 6px 12px)',
                  }}
                  aria-label="한도 없음"
                />
                <div className="text-muted-foreground mt-1 text-[15px]">
                  별도 지정된 한도가 없어요
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold tracking-tight">최근 마일리지 거래</h2>
            <button type="button" className="text-ticketa-blue-700 text-[15px] font-bold">
              전체보기 →
            </button>
          </div>
          {ledger.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-[15px]">
              아직 거래 내역이 없어요.
            </p>
          ) : (
            <div className="flex flex-col">
              {ledger.slice(0, 5).map((r, i, arr) => {
                const style = ledgerStyle(r.type);
                return (
                  <div
                    key={r.id}
                    className={`flex items-center gap-3 py-3 ${i < arr.length - 1 ? 'border-warm-100 border-b' : ''}`}
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold"
                      style={style}
                    >
                      {ledgerIcon(r.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-bold tracking-tight">
                        {formatLedgerMemo(r.memo, r.type)}
                      </div>
                      <div className="text-muted-foreground mt-0.5 font-mono text-[14px]">
                        {new Date(r.created_at).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                    <span
                      className="text-[15px] font-extrabold tracking-tight tabular-nums"
                      style={{ color: r.amount > 0 ? '#1F6B43' : 'var(--foreground)' }}
                    >
                      {r.amount > 0 ? '+' : ''}
                      {r.amount.toLocaleString('ko-KR')}
                      <span className="text-muted-foreground ml-0.5 text-[14px] font-semibold">
                        M
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
