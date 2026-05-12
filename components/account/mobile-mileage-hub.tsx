import Link from 'next/link';
import { formatLedgerMemo } from '@/lib/format';

type LedgerRow = {
  id: number;
  type: string;
  amount: number;
  memo: string | null;
  created_at: string;
  sku_label?: string | null;
};

type Props = {
  /** cash_balance + pg_locked (출금 진행 중 제외) */
  total: number;
  /** 출금 가능 = cash_balance */
  withdrawable: number;
  /** 출금 신청 후 어드민 처리 대기 합계 — 보유 합산에만 반영 */
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

export function MobileMileageHub({ total, withdrawable, inFlightWithdraw, ledger }: Props) {
  const heldTotal = total + inFlightWithdraw;
  const spendable = total;
  return (
    <div className="flex flex-col pb-6">
      {/* Balance hero */}
      <div className="mx-4 mt-4">
        <div
          className="relative overflow-hidden rounded-2xl p-5 text-white"
          style={{ background: 'linear-gradient(125deg, #11161E 0%, #1A2230 60%, #2A2238 100%)' }}
        >
          <div
            className="pointer-events-none absolute -top-12 -right-10 size-44 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0,102,255,0.22), transparent 65%)' }}
          />
          <div className="relative">
            <div className="text-[12px] font-bold tracking-[0.12em] text-[#A8C0FF]">
              MILEAGE BALANCE
            </div>
            <div className="text-[13px] text-white/55">보유 마일리지</div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-4xl leading-none font-black tracking-tight tabular-nums">
                {heldTotal.toLocaleString('ko-KR')}
              </span>
              <span className="text-base font-extrabold text-[#D4A24C]">M</span>
            </div>
            <div className="mt-1.5 text-[12px] text-white/60">
              사용 가능{' '}
              <strong className="text-white tabular-nums">
                {spendable.toLocaleString('ko-KR')}원
              </strong>
              <span className="ml-2">
                · 출금 가능{' '}
                <strong className="text-white tabular-nums">
                  {withdrawable.toLocaleString('ko-KR')}원
                </strong>
              </span>
            </div>
            <div className="mt-3.5 grid grid-cols-3 gap-1.5">
              {[
                {
                  l: '+ 충전',
                  bg: '#fff',
                  fg: '#11161E',
                  href: '/account/mileage/charge',
                  solid: true,
                },
                {
                  l: '출금',
                  bg: 'rgba(255,255,255,0.10)',
                  fg: '#fff',
                  href: '/account/mileage/withdraw',
                  solid: false,
                },
                {
                  l: '선물',
                  bg: 'rgba(255,255,255,0.10)',
                  fg: '#fff',
                  href: '/account/gift',
                  solid: false,
                },
              ].map((b) => (
                <Link
                  key={b.l}
                  href={b.href}
                  className="flex h-11 items-center justify-center rounded-xl text-sm font-extrabold"
                  style={{
                    background: b.bg,
                    color: b.fg,
                    border: b.solid ? 'none' : '1px solid rgba(255,255,255,0.20)',
                  }}
                >
                  {b.l}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick tiles 2×2 */}
      <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
        {[
          {
            l: '거래 한도',
            d: '한도 없음',
            bg: 'var(--ticketa-blue-50)',
            fg: 'var(--ticketa-blue-700)',
            href: '#',
          },
          { l: '거래 내역', d: '전체 기록', bg: 'rgba(46,124,82,0.10)', fg: '#1F6B43', href: '#' },
          {
            l: '출금 계좌',
            d: '등록된 계좌',
            bg: 'rgba(212,162,76,0.16)',
            fg: 'var(--ticketa-gold-700)',
            href: '#',
          },
          { l: '명세서', d: '이번 달', bg: '#F4EAF8', fg: '#5A2168', href: '#' },
        ].map((t) => (
          <Link
            key={t.l}
            href={t.href}
            className="border-border flex items-center gap-3 rounded-xl border bg-white p-3"
          >
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold"
              style={{ background: t.bg, color: t.fg }}
            >
              ›
            </div>
            <div className="min-w-0">
              <div className="text-sm font-extrabold tracking-tight">{t.l}</div>
              <div className="text-muted-foreground text-xs">{t.d}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent transactions */}
      <div className="mx-4 mt-4">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-sm font-extrabold tracking-tight">최근 거래</span>
          <span className="text-ticketa-blue-700 text-sm font-bold">전체 ›</span>
        </div>
        <div className="border-border overflow-hidden rounded-xl border bg-white">
          {ledger.length === 0 ? (
            <div className="text-muted-foreground py-6 text-center text-sm">
              아직 거래 내역이 없어요.
            </div>
          ) : (
            ledger.slice(0, 4).map((r, i, arr) => {
              const style = ledgerStyle(r.type);
              return (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? 'border-warm-100 border-b' : ''}`}
                >
                  <div
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold"
                    style={style}
                  >
                    {ledgerIcon(r.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">
                      {formatLedgerMemo(r.memo, r.type, r.sku_label)}
                    </div>
                    <div className="text-muted-foreground font-mono text-xs">
                      {new Date(r.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  <span
                    className="shrink-0 text-sm font-extrabold tabular-nums"
                    style={{ color: r.amount > 0 ? '#1F6B43' : 'var(--foreground)' }}
                  >
                    {r.amount > 0 ? '+' : ''}
                    {r.amount.toLocaleString('ko-KR')}
                    <span className="text-muted-foreground ml-0.5 text-xs">M</span>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
