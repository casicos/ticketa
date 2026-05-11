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
    kind: '무통장입금',
    recommend: true,
    disabled: false,
  },
  { id: 'kakao', name: '카카오페이', bg: '#FEE500', fg: '#111', kind: '간편결제', disabled: true },
  { id: 'naver', name: '네이버페이', bg: '#03C75A', fg: '#fff', kind: '간편결제', disabled: true },
  { id: 'toss', name: '토스페이', bg: '#0064FF', fg: '#fff', kind: '간편결제', disabled: true },
  { id: 'card', name: '신용카드', bg: '#11161E', fg: '#fff', kind: '카드 결제', disabled: true },
  {
    id: 'phone',
    name: '휴대폰 결제',
    bg: '#fff',
    fg: '#11161E',
    kind: 'ARS / SMS',
    border: true,
    disabled: true,
  },
];

const PRESETS = [10000, 30000, 50000, 100000, 300000, 500000];

export interface MobileMileageChargeProps {
  currentBalance: number;
  defaultHolder: string;
  returnTo: string;
  bankInfo: { bankName: string; account: string; holder: string } | null;
  hasError?: boolean;
  errorMessage?: string;
  formAction: string;
  className?: string;
}

export function MobileMileageCharge({
  currentBalance,
  defaultHolder,
  returnTo,
  bankInfo,
  hasError,
  errorMessage,
  formAction,
  className,
}: MobileMileageChargeProps) {
  const [selectedMethod] = useState<string>('bank_transfer');
  const [amount, setAmount] = useState<number>(50000);

  const net = amount;

  return (
    <div className={cn('md:hidden', className)}>
      {/* Balance pill */}
      <div className="px-4 pt-4">
        <div className="border-border flex items-center rounded-xl border bg-white px-4 py-3">
          <span className="text-muted-foreground text-[14px]">보유 마일리지</span>
          <span className="text-ticketa-blue-700 ml-auto text-[15px] font-extrabold tabular-nums">
            {currentBalance.toLocaleString()}
            <span className="ml-0.5 text-[14px] opacity-70">M</span>
          </span>
        </div>
      </div>

      {hasError && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive mx-4 mt-3 rounded-lg border px-3.5 py-2.5 text-[14px]">
          {errorMessage}
        </div>
      )}

      {/* Payment methods grid 2-col */}
      <div className="px-4 pt-4">
        <div className="mb-2 text-[14px] font-bold">결제수단</div>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((m) => {
            const isSelected = m.id === selectedMethod;
            const isDisabled = m.disabled;
            return (
              <div
                key={m.id}
                aria-disabled={isDisabled}
                className={cn(
                  'relative flex min-h-[60px] flex-col justify-between rounded-xl px-3 py-3.5 transition-all',
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
                  boxShadow: isSelected ? '0 0 0 3px var(--ticketa-blue-50)' : 'none',
                }}
              >
                {m.recommend && (
                  <span className="absolute top-[-7px] right-2 rounded-full bg-[#D4A24C] px-1.5 py-0.5 text-[12px] font-extrabold text-[#11161E]">
                    추천
                  </span>
                )}
                {isDisabled && (
                  <span className="border-warm-300 text-warm-600 absolute top-[-7px] right-2 rounded-full border bg-white px-1.5 py-0.5 text-[11px] font-bold">
                    준비중
                  </span>
                )}
                <div
                  className="text-[12px] font-bold tracking-[0.04em]"
                  style={{ opacity: isDisabled ? 0.6 : 0.75 }}
                >
                  {m.kind}
                </div>
                <div className="text-[14px] font-extrabold tracking-[-0.015em]">{m.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Amount presets */}
      <div className="px-4 pt-4">
        <div className="mb-2 text-[14px] font-bold">충전 금액</div>
        <div className="grid grid-cols-3 gap-1.5">
          {PRESETS.map((a) => {
            const sel = a === amount;
            return (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(a)}
                className={cn(
                  'flex h-[42px] items-center justify-center rounded-lg text-[14px] font-bold tabular-nums transition-colors',
                  sel
                    ? 'border-ticketa-blue-500 bg-ticketa-blue-50 text-ticketa-blue-700 border-[1.5px]'
                    : 'border-border text-foreground border bg-white',
                )}
              >
                {a.toLocaleString()}원
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary box */}
      <div className="px-4 pt-4">
        <div className="border-border flex flex-col gap-2 rounded-xl border bg-white p-3.5 text-[14px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">마일리지 종류</span>
            <span className="font-semibold">즉시 출금 가능</span>
          </div>
          <div className="border-border flex justify-between border-t border-dashed pt-2">
            <span className="text-muted-foreground">실 충전액</span>
            <span className="font-extrabold tabular-nums">{net.toLocaleString()} M</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">충전 후 마일리지</span>
            <span className="text-ticketa-blue-700 font-extrabold tabular-nums">
              {(currentBalance + net).toLocaleString()} M
            </span>
          </div>
        </div>
      </div>

      {/* Bank info for bank_transfer */}
      {bankInfo && (
        <div className="border-border bg-muted/40 mx-4 mt-3 rounded-xl border p-3">
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

      <div className="h-24" />

      {/* Sticky CTA */}
      <form action={formAction}>
        <input type="hidden" name="method" value={selectedMethod} />
        <input type="hidden" name="amount" value={amount} />
        <input type="hidden" name="depositor_name" value={defaultHolder} />
        <input type="hidden" name="return_to" value={returnTo} />
        <div className="border-border fixed right-0 bottom-0 left-0 border-t bg-white px-4 pt-2.5 pb-4">
          <button
            type="submit"
            className="bg-ticketa-blue-500 h-[50px] w-full rounded-xl text-[14px] font-extrabold text-white"
          >
            {amount.toLocaleString()}원 충전하기
          </button>
        </div>
      </form>
    </div>
  );
}
