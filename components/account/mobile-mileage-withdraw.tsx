'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatKRW, koreanNumberWord } from '@/lib/format';
import { BankMark } from '@/components/ticketa/bank-mark';
import { bankNameByCode, bankBrandColor } from '@/lib/domain/banks';
import { WithdrawAccountDialog } from '@/components/account/withdraw-account-dialog';

export type WithdrawAccountOption = {
  id: string;
  bank_code: string;
  account_number_last4: string;
  account_holder: string;
};

type AnyHistoryRow = unknown;

export interface MobileMileageWithdrawProps {
  totalBalance: number;
  withdrawable: number;
  pgLocked: number;
  inFlightWithdraw: number;
  defaultHolder: string;
  formAction: string;
  hasError?: boolean;
  errorMessage?: string;
  accounts: WithdrawAccountOption[];
  withdrawFee: number;
  /** 모바일은 별도 history 탭이 없어 마이룸 허브에서 노출 — prop 은 인터페이스 호환용. */
  history?: AnyHistoryRow[];
  className?: string;
}

export function MobileMileageWithdraw({
  totalBalance,
  withdrawable,
  pgLocked: _pgLocked,
  inFlightWithdraw,
  defaultHolder,
  formAction,
  hasError,
  errorMessage,
  accounts,
  withdrawFee,
  className,
}: MobileMileageWithdrawProps) {
  const [tab, setTab] = useState<'bank' | 'phone'>('bank');
  const [requested, setRequested] = useState<number>(Math.min(withdrawable, 500000));
  const [amountFocused, setAmountFocused] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id ?? '');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const net = Math.max(requested - withdrawFee, 0);
  const hasWithdrawable = withdrawable > 0;
  const amountDisplay = amountFocused
    ? requested === 0
      ? ''
      : String(requested)
    : requested.toLocaleString('ko-KR');

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
            <span className="font-bold tabular-nums">
              {(totalBalance + inFlightWithdraw).toLocaleString('ko-KR')} M
            </span>
          </div>
          <div className="border-border mt-2 flex justify-between border-t border-dashed pt-2">
            <span className="text-muted-foreground">출금가능 마일리지</span>
            <span className="text-destructive font-extrabold tabular-nums">
              {withdrawable.toLocaleString('ko-KR')} M
            </span>
          </div>
          {inFlightWithdraw > 0 && (
            <div className="mt-1 flex justify-between text-[14px]">
              <span className="text-muted-foreground">출금 진행 중</span>
              <span
                className="font-semibold tabular-nums"
                style={{ color: 'var(--ticketa-blue-700)' }}
              >
                {inFlightWithdraw.toLocaleString('ko-KR')} M
              </span>
            </div>
          )}
        </div>
      </div>

      {tab === 'bank' &&
        (hasWithdrawable ? (
          <form action={formAction}>
            {/* Account selector */}
            <div className="space-y-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-[14px] font-bold">입금 받을 계좌</label>
                <button
                  type="button"
                  onClick={() => setShowAddDialog(true)}
                  className="text-ticketa-blue-700 text-[13px] font-bold"
                >
                  + 새 계좌 등록
                </button>
              </div>
              <input type="hidden" name="account_id" value={selectedAccountId} />
              <div className="space-y-1.5">
                {accounts.map((a) => {
                  const selected = a.id === selectedAccountId;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAccountId(a.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-[10px] border-[1.5px] px-3 py-2.5 text-left transition-colors',
                        selected
                          ? 'border-ticketa-blue-500 bg-ticketa-blue-50'
                          : 'border-border bg-white',
                      )}
                    >
                      <BankMark
                        name={bankNameByCode(a.bank_code)}
                        brandColor={bankBrandColor(a.bank_code)}
                        size="md"
                      />
                      <div className="flex-1">
                        <div className="text-[14px] font-bold">
                          {bankNameByCode(a.bank_code)}{' '}
                          <span className="text-muted-foreground font-mono text-[12px]">
                            ****{a.account_number_last4}
                          </span>
                        </div>
                        <div className="text-muted-foreground text-[12px]">
                          예금주 {a.account_holder}
                        </div>
                      </div>
                      {selected && (
                        <span className="text-ticketa-blue-700 text-[12px] font-extrabold">
                          선택됨
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount input */}
            <div className="px-4 pt-4">
              <div className="flex items-start gap-2">
                <input type="hidden" name="amount" value={String(requested)} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={amountDisplay}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^\d]/g, '');
                        setRequested(cleaned === '' ? 0 : Number(cleaned));
                      }}
                      onFocus={() => setAmountFocused(true)}
                      onBlur={() => {
                        setAmountFocused(false);
                        if (requested > withdrawable) setRequested(withdrawable);
                      }}
                      className="border-ticketa-blue-500 h-11 flex-1 rounded-[10px] border bg-white px-3 text-right text-[14px] font-extrabold tabular-nums outline-none"
                    />
                    <span className="text-muted-foreground text-[14px]">원</span>
                  </div>
                  <div
                    className="text-muted-foreground mt-1 min-h-[16px] pr-[18px] text-right text-[13px]"
                    aria-live="polite"
                  >
                    {!amountFocused && requested > 0 ? `${koreanNumberWord(requested)}원` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRequested(withdrawable)}
                  className="bg-ticketa-blue-500 h-11 shrink-0 rounded-[10px] px-3.5 text-[14px] font-bold text-white"
                >
                  전액
                </button>
              </div>
              <div className="bg-ticketa-blue-50 mt-2 flex items-center justify-between rounded-[10px] px-3 py-2.5">
                <span className="text-ticketa-blue-700 text-[14px] font-bold">실 출금액</span>
                <span className="text-ticketa-blue-700 text-[14px] font-extrabold tabular-nums">
                  {net.toLocaleString('ko-KR')} 원
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-right text-[14px]">
                출금 수수료 {formatKRW(withdrawFee)}
              </p>
            </div>

            {/* 알아두기 */}
            <div className="bg-warm-50 mx-4 mt-4 rounded-xl p-3.5">
              <div className="text-warm-700 mb-2 flex items-center gap-1.5 text-[14px] font-bold">
                <Shield className="text-ticketa-blue-500 size-3.5" strokeWidth={1.75} />
                알아두기
              </div>
              <ul className="text-muted-foreground list-disc space-y-1 pl-3.5 text-[14px] leading-relaxed">
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

      {showAddDialog && (
        <WithdrawAccountDialog
          defaultHolder={defaultHolder}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
}
