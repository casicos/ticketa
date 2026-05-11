'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAYMENT_METHODS = [
  {
    id: 'bank_transfer',
    name: '전용계좌',
    bg: 'var(--ticketa-blue-700)',
    fg: '#fff',
    kind: '무통장입금 · 무수수료',
    recommend: true,
    disabled: false,
  },
  { id: 'kakao', name: '카카오페이', bg: '#FEE500', fg: '#111', kind: '간편결제', disabled: true },
  { id: 'naver', name: '네이버페이', bg: '#03C75A', fg: '#fff', kind: '간편결제', disabled: true },
  { id: 'toss', name: '토스페이', bg: '#0064FF', fg: '#fff', kind: '간편결제', disabled: true },
  { id: 'card', name: '신용카드', bg: '#11161E', fg: '#fff', kind: '카드 결제', disabled: true },
  {
    id: 'bank',
    name: '계좌이체',
    bg: '#fff',
    fg: '#11161E',
    kind: '실시간 계좌',
    border: true,
    disabled: true,
  },
  {
    id: 'phone',
    name: '휴대폰 결제',
    bg: '#fff',
    fg: '#11161E',
    kind: 'ARS / SMS',
    border: true,
    disabled: true,
  },
  {
    id: 'voucher',
    name: '문화상품권',
    bg: '#fff',
    fg: '#11161E',
    kind: '핀번호',
    border: true,
    disabled: true,
  },
];

const PRESETS = [5000, 10000, 20000, 30000, 50000, 100000];

export interface DesktopMileageChargeProps {
  currentBalance: number;
  defaultHolder: string;
  returnTo: string;
  bankInfo: { bankName: string; account: string; holder: string } | null;
  hasError?: boolean;
  errorMessage?: string;
  /** The actual form action (server action) — passed as prop so this stays client */
  formAction: string;
  className?: string;
}

export function DesktopMileageCharge({
  currentBalance,
  defaultHolder,
  returnTo,
  bankInfo,
  hasError,
  errorMessage,
  formAction,
  className,
}: DesktopMileageChargeProps) {
  const [selectedMethod] = useState<string>('bank_transfer');
  const [amount, setAmount] = useState<number>(50000);
  const [customAmount, setCustomAmount] = useState<string>('50,000');

  const net = amount;

  function handlePreset(a: number) {
    setAmount(a);
    setCustomAmount(a.toLocaleString('ko-KR'));
  }

  function handleCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/,/g, '');
    const num = parseInt(raw, 10);
    setCustomAmount(e.target.value);
    if (!isNaN(num)) setAmount(num);
  }

  return (
    <div className={cn('hidden md:block', className)}>
      <div className="mb-[22px]">
        <h1 className="text-[24px] font-bold tracking-[-0.022em]">마일리지 충전</h1>
        <p className="text-muted-foreground mt-1 text-[15px]">
          충전한 마일리지로 매물 결제 · 출금 · 선물하기 모두 가능해요.{' '}
          <span className="text-ticketa-blue-700 font-semibold">전용계좌 충전은 수수료 0%</span>
        </p>
      </div>

      <div>
        {hasError && (
          <div className="border-destructive/40 bg-destructive/10 text-destructive mb-4 flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-[15px]">
            {errorMessage}
          </div>
        )}

        {/* Step 1 — payment method */}
        <div className="surface-card p-5">
          <div className="mb-3 text-[15px] font-bold tracking-[-0.01em]">1. 결제수단 선택</div>
          <div className="grid grid-cols-4 gap-2.5">
            {PAYMENT_METHODS.map((m) => {
              const isSelected = m.id === selectedMethod;
              const isDisabled = m.disabled;
              return (
                <div
                  key={m.id}
                  aria-disabled={isDisabled}
                  className={cn(
                    'relative flex min-h-[76px] flex-col justify-between rounded-xl px-3.5 py-4 transition-all',
                    isDisabled ? 'pointer-events-none cursor-not-allowed' : 'cursor-default',
                  )}
                  style={{
                    background: isDisabled ? 'var(--warm-50)' : m.bg,
                    color: isDisabled ? 'var(--warm-400)' : m.fg,
                    border: isSelected
                      ? '2px solid var(--ticketa-blue-500)'
                      : isDisabled
                        ? '1px dashed var(--warm-300)'
                        : m.border
                          ? '1px solid var(--border)'
                          : '2px solid transparent',
                    boxShadow: isSelected ? '0 0 0 4px var(--ticketa-blue-50)' : 'none',
                  }}
                >
                  {m.recommend && (
                    <span className="absolute top-[-8px] right-2.5 rounded-full bg-[#D4A24C] px-2 py-0.5 text-[13px] font-extrabold tracking-[0.04em] text-[#11161E]">
                      추천
                    </span>
                  )}
                  {isDisabled && (
                    <span className="border-warm-300 text-warm-600 absolute top-[-8px] right-2.5 rounded-full border bg-white px-2 py-0.5 text-[12px] font-bold tracking-[0.04em]">
                      준비중
                    </span>
                  )}
                  <div
                    className="text-[13px] font-bold tracking-[0.04em]"
                    style={{ opacity: isDisabled ? 0.6 : 0.75 }}
                  >
                    {m.kind}
                  </div>
                  <div className="text-[15px] font-extrabold tracking-[-0.015em]">{m.name}</div>
                </div>
              );
            })}
          </div>

          {/* Limits row */}
          <div
            className="text-warm-700 mt-[18px] grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-[10px] px-3.5 py-3 text-[15px] leading-relaxed"
            style={{ background: 'var(--warm-50)' }}
          >
            <span className="font-bold">충전 한도</span>
            <span>1회 10,000원 ~ 5,000,000원 · 1일 한도 없음</span>
            <span className="font-bold">수수료</span>
            <span>전용계좌 무수수료 · 입금 확인 후 1~3분 내 자동 충전</span>
            <span className="font-bold">마일리지 유형</span>
            <span>즉시 출금 가능</span>
          </div>
        </div>

        {/* Step 2 — amount + summary */}
        <form action={formAction} className="mt-4 grid grid-cols-[1.5fr_1fr] gap-4">
          <input type="hidden" name="method" value={selectedMethod} />
          <input type="hidden" name="return_to" value={returnTo} />

          {/* Amount presets */}
          <div className="surface-card p-5">
            <div className="mb-3 text-[15px] font-bold tracking-[-0.01em]">2. 충전 금액</div>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {PRESETS.map((a) => {
                const sel = a === amount;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => handlePreset(a)}
                    className={cn(
                      'flex h-[50px] items-center justify-center rounded-[10px] text-[15px] font-bold tabular-nums transition-colors',
                      sel
                        ? 'border-ticketa-blue-500 bg-ticketa-blue-50 text-ticketa-blue-700 border-[1.5px]'
                        : 'border-border text-foreground hover:bg-warm-50 border bg-white',
                    )}
                  >
                    {a.toLocaleString()}원
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <input
                name="amount"
                value={customAmount}
                onChange={handleCustomChange}
                className="border-border focus:border-ticketa-blue-500 focus:ring-ticketa-blue-50 h-12 flex-1 rounded-[10px] border bg-white px-3.5 text-right text-[15px] font-bold tabular-nums outline-none focus:ring-3"
              />
              <span className="text-muted-foreground text-[15px] font-semibold">원</span>
              <button
                type="button"
                onClick={() => handlePreset(100000)}
                className="bg-warm-100 h-12 rounded-[10px] px-3.5 text-[15px] font-bold whitespace-nowrap"
              >
                최대 한도
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="surface-card flex flex-col p-5">
            <div className="mb-3.5 text-[15px] font-bold tracking-[-0.01em]">실시간 계산</div>

            <div className="border-border flex justify-between border-b border-dashed py-2 text-[15px]">
              <span className="text-muted-foreground">보유 마일리지</span>
              <span className="font-semibold tabular-nums">
                {currentBalance.toLocaleString()} M
              </span>
            </div>
            <div className="border-border flex justify-between border-b border-dashed py-2 text-[15px]">
              <span className="text-muted-foreground">충전 금액</span>
              <span className="font-semibold tabular-nums">{amount.toLocaleString()} 원</span>
            </div>
            <div className="border-border flex justify-between border-b border-dashed py-2.5 text-[15px]">
              <span className="font-bold">실 충전액</span>
              <span className="text-ticketa-blue-700 font-extrabold tabular-nums">
                {net.toLocaleString()} M
              </span>
            </div>
            <div className="flex justify-between py-2.5 text-[15px]">
              <span className="font-bold">충전 후 마일리지</span>
              <span className="text-ticketa-blue-700 font-extrabold tabular-nums">
                {(currentBalance + net).toLocaleString()} M
              </span>
            </div>

            {/* Bank info box for bank_transfer */}
            {bankInfo && (
              <div className="border-border bg-muted/40 mt-3 rounded-lg border p-3">
                <div className="text-ticketa-blue-700 mb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.06em] uppercase">
                  <Building2 className="size-3.5" strokeWidth={1.75} />
                  플랫폼 입금 계좌
                </div>
                <div className="text-[14px] font-bold">
                  {bankInfo.bankName} · <span className="font-mono">{bankInfo.account}</span>
                </div>
                <div className="text-muted-foreground text-[13px]">예금주 {bankInfo.holder}</div>
              </div>
            )}

            {/* depositor_name hidden for bank_transfer */}
            <input type="hidden" name="depositor_name" value={defaultHolder} />

            <button
              type="submit"
              className="bg-ticketa-blue-500 mt-4 h-[50px] rounded-[10px] text-[15px] font-extrabold text-white transition-opacity hover:opacity-90"
            >
              {amount.toLocaleString()}원 충전하기
            </button>
            <div className="text-muted-foreground mt-2 text-center text-[15px]">
              전용계좌로 안전하게 결제됩니다.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
