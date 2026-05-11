'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatKRW } from '@/lib/format';

const WITHDRAW_FEE = 1000;

const BANKS = [
  { code: '004', name: '국민은행' },
  { code: '088', name: '신한은행' },
  { code: '020', name: '우리은행' },
  { code: '081', name: '하나은행' },
  { code: '003', name: '기업은행' },
  { code: '032', name: '부산은행' },
  { code: '034', name: '광주은행' },
  { code: '045', name: '새마을금고' },
  { code: '007', name: '수협' },
  { code: '011', name: '농협' },
  { code: '071', name: '우체국' },
  { code: '089', name: '케이뱅크' },
  { code: '090', name: '카카오뱅크' },
  { code: '092', name: '토스뱅크' },
];

export interface MobileMileageWithdrawProps {
  totalBalance: number;
  withdrawable: number;
  pgLocked: number;
  defaultHolder: string;
  formAction: string;
  hasError?: boolean;
  errorMessage?: string;
  className?: string;
}

export function MobileMileageWithdraw({
  totalBalance,
  withdrawable,
  pgLocked,
  defaultHolder,
  formAction,
  hasError,
  errorMessage,
  className,
}: MobileMileageWithdrawProps) {
  const [tab, setTab] = useState<'bank' | 'phone'>('bank');
  const [requested, setRequested] = useState<number>(Math.min(withdrawable, 500000));
  const net = Math.max(requested - WITHDRAW_FEE, 0);
  const hasWithdrawable = withdrawable > 0;

  return (
    <div className={cn('md:hidden', className)}>
      {/* Tab switcher pill */}
      <div className="px-4 pt-4">
        <div className="border-border flex gap-0 rounded-full border bg-white p-1">
          {[
            { id: 'bank', l: '은행계좌 출금' },
            { id: 'phone', l: '휴대폰번호 출금' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as 'bank' | 'phone')}
              className={cn(
                'flex h-9 flex-1 items-center justify-center rounded-full text-[14px] font-bold transition-colors',
                tab === t.id ? 'bg-ticketa-blue-500 text-white' : 'text-muted-foreground',
              )}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {hasError && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive mx-4 mt-3 rounded-lg border px-3.5 py-2.5 text-[14px]">
          {errorMessage}
        </div>
      )}

      {/* Balance info */}
      <div className="px-4 pt-4">
        <div className="border-border rounded-xl border bg-white p-3.5 text-[14px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">총 마일리지</span>
            <span className="font-bold tabular-nums">{totalBalance.toLocaleString()} M</span>
          </div>
          <div className="border-border mt-2 flex justify-between border-t border-dashed pt-2">
            <span className="text-muted-foreground">출금가능 마일리지</span>
            <span className="text-destructive font-extrabold tabular-nums">
              {withdrawable.toLocaleString()} M
            </span>
          </div>
          {pgLocked > 0 && (
            <div className="mt-1 flex justify-between text-[13px]">
              <span className="text-muted-foreground">거래 대기 (출금 불가)</span>
              <span className="text-muted-foreground tabular-nums">
                {pgLocked.toLocaleString()} M
              </span>
            </div>
          )}
        </div>
      </div>

      {tab === 'bank' &&
        (hasWithdrawable ? (
          <form action={formAction}>
            {/* Bank / account fields */}
            <div className="space-y-3 px-4 pt-4">
              <div>
                <label className="mb-1.5 block text-[14px] font-bold">은행</label>
                <select
                  name="bank_code"
                  required
                  defaultValue=""
                  className="border-border focus:border-ticketa-blue-500 h-10 w-full rounded-[10px] border bg-white px-3 text-[15px] outline-none"
                >
                  <option value="" disabled>
                    은행을 선택해주세요
                  </option>
                  {BANKS.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[14px] font-bold">계좌번호</label>
                <input
                  name="account_number"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{10,16}"
                  maxLength={16}
                  placeholder="숫자만 입력 (10~16자리)"
                  required
                  className="border-border focus:border-ticketa-blue-500 h-10 w-full rounded-[10px] border bg-white px-3 text-[15px] tabular-nums outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[14px] font-bold">예금주</label>
                <input
                  name="account_holder"
                  type="text"
                  defaultValue={defaultHolder}
                  maxLength={40}
                  required
                  className="border-border focus:border-ticketa-blue-500 h-10 w-full rounded-[10px] border bg-white px-3 text-[15px] outline-none"
                />
              </div>
            </div>

            {/* Amount input */}
            <div className="px-4 pt-4">
              <div className="flex items-center gap-2">
                <input
                  name="amount"
                  type="number"
                  min={1000}
                  max={withdrawable}
                  value={requested}
                  onChange={(e) => setRequested(Number(e.target.value))}
                  className="border-ticketa-blue-500 h-11 flex-1 rounded-[10px] border bg-white px-3 text-right text-[14px] font-extrabold tabular-nums outline-none"
                />
                <span className="text-muted-foreground text-[14px]">원</span>
                <button
                  type="button"
                  onClick={() => setRequested(withdrawable)}
                  className="bg-ticketa-blue-500 h-11 rounded-[10px] px-3.5 text-[14px] font-bold text-white"
                >
                  전액
                </button>
              </div>
              <div className="bg-ticketa-blue-50 mt-3 flex items-center justify-between rounded-[10px] px-3 py-2.5">
                <span className="text-ticketa-blue-700 text-[14px] font-bold">실 출금액</span>
                <span className="text-ticketa-blue-700 text-[14px] font-extrabold tabular-nums">
                  {net.toLocaleString()} 원
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-right text-[14px]">
                출금 수수료 {formatKRW(WITHDRAW_FEE)}
              </p>
            </div>

            {/* 알아두기 */}
            <div className="bg-warm-50 mx-4 mt-4 rounded-xl p-3.5">
              <div className="text-warm-700 mb-2 flex items-center gap-1.5 text-[14px] font-bold">
                <Shield className="text-ticketa-blue-500 size-3.5" strokeWidth={1.75} />
                알아두기
              </div>
              <ul className="text-muted-foreground list-disc space-y-1 pl-3.5 text-[13px] leading-relaxed">
                <li>본인 명의 계좌가 아니면 출금 불가</li>
                <li>출금은 평일 01:00 ~ 22:50 (우체국은 05:00 ~)</li>
                <li>일반 회원은 출금 시 1,000원 수수료 부과</li>
                <li>VIP 회원은 무료 출금권 월 12회 발급 가능</li>
              </ul>
            </div>

            <div className="h-24" />

            {/* Sticky CTA */}
            <div className="border-border fixed right-0 bottom-0 left-0 border-t bg-white px-4 pt-2.5 pb-4">
              <button
                type="submit"
                className="bg-ticketa-blue-500 h-[50px] w-full rounded-xl text-[14px] font-extrabold text-white"
              >
                마일리지 출금하기
              </button>
            </div>
          </form>
        ) : (
          <div className="border-border mx-4 mt-4 rounded-xl border bg-white p-5 text-center">
            <p className="text-[15px] font-bold">출금 가능 잔액이 없어요</p>
            <p className="text-muted-foreground mt-1 text-[14px]">판매·거래 정산을 기다려주세요.</p>
          </div>
        ))}

      {tab === 'phone' && (
        <div className="border-border text-muted-foreground mx-4 mt-4 rounded-xl border bg-white p-5 text-center text-[15px]">
          휴대폰번호 출금 준비 중이에요.
        </div>
      )}
    </div>
  );
}
