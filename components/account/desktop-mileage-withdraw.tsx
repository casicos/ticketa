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

export type WithdrawHistoryRow = {
  id: number;
  amount: number;
  fee: number;
  bank_code: string;
  account_number_last4: string;
  account_holder: string;
  status: 'requested' | 'processing' | 'completed' | 'rejected';
  requested_at: string;
  completed_at: string | null;
  admin_memo: string | null;
};

export interface DesktopMileageWithdrawProps {
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
  history: WithdrawHistoryRow[];
  className?: string;
}

export function DesktopMileageWithdraw({
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
  history,
  className,
}: DesktopMileageWithdrawProps) {
  const [tab, setTab] = useState<'bank' | 'history'>('bank');
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
                  <span className="font-bold tabular-nums">
                    {(totalBalance + inFlightWithdraw).toLocaleString('ko-KR')} M
                  </span>
                  <span className="text-muted-foreground">출금 가능 마일리지</span>
                  <span className="text-destructive font-extrabold tabular-nums">
                    {withdrawable.toLocaleString('ko-KR')} M
                  </span>
                  {inFlightWithdraw > 0 && (
                    <>
                      <span className="text-muted-foreground">출금 진행 중</span>
                      <span
                        className="font-semibold tabular-nums"
                        style={{ color: 'var(--ticketa-blue-700)' }}
                      >
                        {inFlightWithdraw.toLocaleString('ko-KR')} M
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Withdraw form */}
              {hasWithdrawable ? (
                <form id="withdraw-form" action={formAction} className="surface-card p-5">
                  <div className="mb-3.5 text-[15px] font-bold tracking-[-0.01em]">출금 신청</div>

                  <div className="space-y-3.5">
                    {/* Account selector */}
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="block text-[14px] font-semibold">입금 받을 계좌</label>
                        <button
                          type="button"
                          onClick={() => setShowAddDialog(true)}
                          className="text-ticketa-blue-700 text-[13px] font-bold hover:underline"
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
                                'flex w-full items-center gap-3 rounded-[10px] border-[1.5px] px-3.5 py-2.5 text-left transition-colors',
                                selected
                                  ? 'border-ticketa-blue-500 bg-ticketa-blue-50'
                                  : 'border-border hover:bg-warm-50 bg-white',
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
                                  <span className="text-muted-foreground font-mono text-[13px]">
                                    ****{a.account_number_last4}
                                  </span>
                                </div>
                                <div className="text-muted-foreground text-[13px]">
                                  예금주 {a.account_holder}
                                </div>
                              </div>
                              {selected && (
                                <span className="text-ticketa-blue-700 text-[13px] font-extrabold">
                                  선택됨
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[14px] font-semibold">출금 금액</label>
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
                              className="border-ticketa-blue-500 focus:ring-ticketa-blue-50 h-[50px] flex-1 rounded-[10px] border bg-white px-3.5 text-right text-[16px] font-extrabold tabular-nums outline-none focus:ring-3"
                            />
                            <span className="text-muted-foreground text-[15px] font-semibold">
                              원
                            </span>
                          </div>
                          <div
                            className="text-muted-foreground mt-1 min-h-[18px] pr-[22px] text-right text-[14px]"
                            aria-live="polite"
                          >
                            {!amountFocused && requested > 0
                              ? `${koreanNumberWord(requested)}원`
                              : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRequested(withdrawable)}
                          className="bg-ticketa-blue-500 h-[50px] shrink-0 rounded-[10px] px-[18px] text-[15px] font-bold text-white"
                        >
                          전액
                        </button>
                      </div>
                      <div className="bg-ticketa-blue-50 mt-2 flex items-center justify-between rounded-[10px] px-3.5 py-2.5">
                        <span className="text-ticketa-blue-700 text-[15px] font-bold">
                          실 출금액
                        </span>
                        <span className="text-ticketa-blue-700 text-[16px] font-extrabold tabular-nums">
                          {net.toLocaleString('ko-KR')} 원
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1.5 text-right text-[15px]">
                        출금 수수료 {formatKRW(withdrawFee)} 차감 후 입금
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

        {tab === 'history' && <WithdrawHistoryList rows={history} />}
      </div>

      {showAddDialog && (
        <WithdrawAccountDialog
          defaultHolder={defaultHolder}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
}

const HISTORY_STATUS: Record<WithdrawHistoryRow['status'], { l: string; bg: string; fg: string }> =
  {
    requested: { l: '처리 중', bg: 'rgba(91,163,208,0.15)', fg: 'var(--ticketa-blue-700)' },
    processing: { l: '처리 중', bg: 'rgba(91,163,208,0.15)', fg: 'var(--ticketa-blue-700)' },
    completed: { l: '완료', bg: 'rgba(31,107,67,0.12)', fg: '#1F6B43' },
    rejected: { l: '반려', bg: 'rgba(190,42,42,0.12)', fg: '#BE2A2A' },
  };

function WithdrawHistoryList({ rows }: { rows: WithdrawHistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="surface-card text-muted-foreground p-5 text-center text-[15px]">
        출금 내역이 없어요.
      </div>
    );
  }
  return (
    <div className="surface-card overflow-hidden">
      <ul className="divide-warm-100 divide-y">
        {rows.map((r) => {
          const s = HISTORY_STATUS[r.status];
          return (
            <li key={r.id} className="flex items-start gap-3 px-5 py-3.5">
              <span
                className="mt-0.5 inline-flex h-6 items-center rounded-full px-2 text-[12px] font-extrabold"
                style={{ background: s.bg, color: s.fg }}
              >
                {s.l}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[15px] font-bold tabular-nums">
                  {r.amount.toLocaleString('ko-KR')}원
                  <span className="text-muted-foreground text-[13px] font-normal">
                    · 수수료 {r.fee.toLocaleString('ko-KR')}원
                  </span>
                </div>
                <div className="text-muted-foreground mt-0.5 text-[13px]">
                  {bankNameByCode(r.bank_code)} ****{r.account_number_last4} · 예금주{' '}
                  {r.account_holder}
                </div>
                {r.status === 'rejected' && r.admin_memo && (
                  <div className="text-destructive mt-0.5 text-[13px]">
                    반려 사유: {r.admin_memo}
                  </div>
                )}
              </div>
              <div className="text-muted-foreground shrink-0 text-[12px] tabular-nums">
                {new Date(r.completed_at ?? r.requested_at).toLocaleString('ko-KR', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
