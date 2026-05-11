'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatKRW } from '@/lib/format';

const WITHDRAW_FEE = 1000;

export interface DesktopMileageWithdrawProps {
  totalBalance: number;
  withdrawable: number;
  pgLocked: number;
  defaultHolder: string;
  formAction: string;
  hasError?: boolean;
  errorMessage?: string;
  className?: string;
}

export function DesktopMileageWithdraw({
  totalBalance,
  withdrawable,
  pgLocked,
  defaultHolder,
  formAction,
  hasError,
  errorMessage,
  className,
}: DesktopMileageWithdrawProps) {
  const [tab, setTab] = useState<'bank' | 'history'>('bank');
  const [requested, setRequested] = useState<number>(Math.min(withdrawable, 500000));
  const net = Math.max(requested - WITHDRAW_FEE, 0);

  const hasWithdrawable = withdrawable > 0;

  return (
    <div className={cn('hidden md:block', className)}>
      <div className="mb-[22px]">
        <h1 className="text-[24px] font-bold tracking-[-0.022em]">마일리지 출금</h1>
        <p className="text-muted-foreground mt-1 text-[15px]">
          거래 정산으로 받은 마일리지를 등록 계좌로 출금합니다.
        </p>
      </div>

      <div>
        {hasError && (
          <div className="border-destructive/40 bg-destructive/10 text-destructive mb-4 flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-[15px]">
            {errorMessage}
          </div>
        )}

        {/* Tabs */}
        <div className="border-border mb-[18px] flex border-b">
          {[
            { id: 'bank', l: '은행계좌 출금' },
            { id: 'history', l: '출금내역' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as 'bank' | 'history')}
              className={cn(
                'mb-[-1px] px-[18px] py-3 text-[15px] font-bold transition-colors',
                tab === t.id
                  ? 'border-ticketa-blue-500 text-ticketa-blue-700 border-b-2'
                  : 'text-muted-foreground',
              )}
            >
              {t.l}
            </button>
          ))}
        </div>

        {tab === 'bank' && (
          <div className="grid grid-cols-[1.4fr_1fr] gap-4">
            <div className="flex flex-col gap-4">
              {/* Balance info */}
              <div className="surface-card p-5">
                <div className="mb-3 text-[15px] font-bold tracking-[-0.01em]">출금 가능 금액</div>
                <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2.5 text-[15px]">
                  <span className="text-muted-foreground">총 마일리지</span>
                  <span className="font-bold tabular-nums">{totalBalance.toLocaleString()} M</span>
                  <span className="text-muted-foreground">출금 가능 마일리지</span>
                  <span className="text-destructive font-extrabold tabular-nums">
                    {withdrawable.toLocaleString()} M
                  </span>
                  {pgLocked > 0 && (
                    <>
                      <span className="text-muted-foreground">거래 대기 (출금 불가)</span>
                      <span className="text-muted-foreground font-semibold tabular-nums">
                        {pgLocked.toLocaleString()} M
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Withdraw form */}
              {hasWithdrawable ? (
                <form action={formAction} className="surface-card p-5">
                  <div className="mb-3.5 text-[15px] font-bold tracking-[-0.01em]">출금 신청</div>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-[14px] font-semibold">은행</label>
                      <select
                        name="bank_code"
                        required
                        className="border-border focus:border-ticketa-blue-500 h-10 w-full rounded-[10px] border bg-white px-3 text-[15px] outline-none"
                        defaultValue=""
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
                      <label className="mb-1.5 block text-[14px] font-semibold">계좌번호</label>
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
                      <label className="mb-1.5 block text-[14px] font-semibold">예금주</label>
                      <input
                        name="account_holder"
                        type="text"
                        defaultValue={defaultHolder}
                        maxLength={40}
                        required
                        className="border-border focus:border-ticketa-blue-500 h-10 w-full rounded-[10px] border bg-white px-3 text-[15px] outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[14px] font-semibold">출금 금액</label>
                      <div className="flex items-center gap-2">
                        <input
                          name="amount"
                          type="number"
                          min={1000}
                          max={withdrawable}
                          value={requested}
                          onChange={(e) => setRequested(Number(e.target.value))}
                          className="border-ticketa-blue-500 focus:ring-ticketa-blue-50 h-[50px] flex-1 rounded-[10px] border bg-white px-3.5 text-right text-[16px] font-extrabold tabular-nums outline-none focus:ring-3"
                        />
                        <span className="text-muted-foreground text-[15px] font-semibold">원</span>
                        <button
                          type="button"
                          onClick={() => setRequested(withdrawable)}
                          className="bg-ticketa-blue-500 h-[50px] rounded-[10px] px-[18px] text-[15px] font-bold text-white"
                        >
                          전액
                        </button>
                      </div>
                      <div className="bg-ticketa-blue-50 mt-3 flex items-center justify-between rounded-[10px] px-3.5 py-2.5">
                        <span className="text-ticketa-blue-700 text-[15px] font-bold">
                          실 출금액
                        </span>
                        <span className="text-ticketa-blue-700 text-[16px] font-extrabold tabular-nums">
                          {net.toLocaleString()} 원
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1.5 text-right text-[15px]">
                        출금 수수료 {formatKRW(WITHDRAW_FEE)} 차감 후 입금
                      </p>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="surface-card flex flex-col items-center gap-3 p-6 text-center">
                  <p className="text-[15px] font-bold">출금 가능 잔액이 없어요</p>
                  <p className="text-muted-foreground text-[15px]">
                    판매·거래 정산을 기다려주세요.
                  </p>
                </div>
              )}
            </div>

            {/* Right: CTA + 알아두기 */}
            <div className="flex flex-col gap-4">
              {hasWithdrawable && (
                <button
                  form="withdraw-form"
                  type="submit"
                  className="bg-ticketa-blue-500 h-14 w-full rounded-xl text-[16px] font-extrabold text-white transition-opacity hover:opacity-90"
                >
                  마일리지 출금하기
                </button>
              )}

              <div className="surface-card p-5">
                <div className="mb-2.5 flex items-center gap-1.5 text-[15px] font-bold">
                  <Shield className="text-ticketa-blue-500 size-4" strokeWidth={1.75} />
                  알아두기
                </div>
                <ul className="text-muted-foreground list-disc space-y-1.5 pl-4 text-[15px] leading-relaxed">
                  <li>본인 명의 계좌가 아니면 출금이 불가합니다.</li>
                  <li>출금은 평일 01:00 ~ 22:50까지 가능합니다. 우체국은 05:00 ~ 22:50.</li>
                  <li>일반 회원은 출금 시 1,000원 수수료가 부과됩니다.</li>
                  <li>VIP 회원은 마이룸에서 무료 출금권 월 12회 발급 가능합니다.</li>
                  <li>모바일에서도 동일하게 이용 가능합니다.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="surface-card text-muted-foreground p-5 text-center text-[15px]">
            출금 내역이 없어요.
          </div>
        )}
      </div>
    </div>
  );
}

// Minimal bank list for the form (full list in lib/domain/banks.ts — but we need it client-side)
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
