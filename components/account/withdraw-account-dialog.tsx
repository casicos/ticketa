'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { KOREAN_BANKS } from '@/lib/domain/banks';
import { updateBankAccountAction } from '@/app/(verified)/account/actions';

const PRIMARY_BANKS = [
  { code: '090', name: '카카오뱅크', bg: '#FFE812', fg: '#3B1E1E' },
  { code: '092', name: '토스뱅크', bg: '#0064FF', fg: '#fff' },
  { code: '088', name: '신한', bg: '#0046FF', fg: '#fff' },
  { code: '004', name: '국민', bg: '#FFB300', fg: '#3B2E00' },
  { code: '020', name: '우리', bg: '#0067AC', fg: '#fff' },
  { code: '081', name: '하나', bg: '#008C95', fg: '#fff' },
  { code: '011', name: '농협', bg: '#02A33A', fg: '#fff' },
  { code: '003', name: '기업', bg: '#0080C8', fg: '#fff' },
] as const;

export function WithdrawAccountDialog({
  defaultHolder,
  onClose,
}: {
  defaultHolder: string;
  /** 제공되면 우측 상단 X 버튼 노출 + 등록 성공 후 자동 호출. */
  onClose?: () => void;
}) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const [bankCode, setBankCode] = useState<string>(PRIMARY_BANKS[0].code);
  const [accountNumber, setAccountNumber] = useState('');
  const [pending, start] = useTransition();

  const cleanedAccount = accountNumber.replace(/\D/g, '');
  const accountValid = /^\d{10,16}$/.test(cleanedAccount);
  const matchedBankName = KOREAN_BANKS.find((b) => b.code === bankCode)?.name ?? '';
  const showAutoMatch = accountValid && defaultHolder.length > 0;

  const banks = showAll
    ? KOREAN_BANKS.map((b) => ({
        code: b.code,
        name: b.name,
        bg: 'var(--warm-100)',
        fg: 'var(--foreground)',
      }))
    : PRIMARY_BANKS;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!accountValid) {
      toast.error('계좌번호를 정확히 입력해주세요 (10~16자리 숫자)');
      return;
    }
    if (!defaultHolder) {
      toast.error('본인인증 정보가 확인되지 않아요. 본인인증 후 다시 시도해주세요.');
      return;
    }
    start(async () => {
      const fd = new FormData();
      fd.set('bank_code', bankCode);
      fd.set('account_number', cleanedAccount);
      fd.set('account_holder', defaultHolder);
      const result = await updateBankAccountAction(fd);
      if (result.ok) {
        toast.success('출금 계좌가 등록됐어요');
        router.refresh();
        onClose?.();
      } else {
        toast.error(result.message ?? '계좌 등록에 실패했어요');
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8 sm:py-[120px]"
      style={{ background: 'rgba(15,21,30,0.55)' }}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-[520px] flex-col rounded-[18px] bg-white p-6 sm:p-7"
        style={{ boxShadow: '0 30px 80px rgba(15,21,30,0.35)' }}
      >
        {/* Header — X 버튼은 onClose 가 있을 때만 (= 등록 후에도 진입 가능한 경우) */}
        <div className="mb-4 flex items-start gap-3">
          <div className="bg-ticketa-blue-50 text-ticketa-blue-700 flex size-11 shrink-0 items-center justify-center rounded-xl">
            <span className="text-[22px] font-black">↑</span>
          </div>
          <div className="flex-1">
            <div className="text-ticketa-blue-700 text-[13px] font-bold tracking-[0.1em] uppercase">
              WITHDRAW · {onClose ? '계좌 추가' : '1단계'}
            </div>
            <div className="mt-0.5 text-[19px] font-extrabold tracking-[-0.018em]">
              {onClose ? '새 출금 계좌 등록' : '출금 계좌를 먼저 등록해주세요'}
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="border-border text-muted-foreground hover:bg-warm-50 inline-flex size-8 cursor-pointer items-center justify-center rounded-[8px] border bg-white text-[16px] font-bold"
            >
              ×
            </button>
          )}
        </div>

        <div className="border-border bg-warm-50 text-warm-700 mb-[18px] rounded-[10px] border px-3.5 py-3 text-[14px] leading-[1.55]">
          출금하려면 본인 명의 계좌 등록이 필요해요. 등록하지 않으면 출금 신청을 진행할 수 없습니다.
        </div>

        {/* Bank picker */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[14px] font-bold">1. 은행 선택</span>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-muted-foreground hover:text-foreground cursor-pointer text-[14px] font-semibold"
          >
            {showAll ? '주요은행만 보기' : '+ 더보기'}
          </button>
        </div>
        <div className="mb-[18px] grid grid-cols-3 gap-[7px]">
          {banks.map((b) => {
            const isSelected = b.code === bankCode;
            return (
              <button
                key={b.code}
                type="button"
                onClick={() => setBankCode(b.code)}
                className={cn(
                  'hover:bg-warm-50 flex h-11 cursor-pointer items-center gap-2 rounded-[9px] bg-white px-2.5 text-[14px] font-bold tracking-[-0.01em] transition-colors',
                  isSelected
                    ? 'border-ticketa-blue-500 text-ticketa-blue-700 border-[1.5px]'
                    : 'border-border text-foreground border',
                )}
              >
                <span
                  className="inline-flex size-[22px] items-center justify-center rounded-[5px] text-[12px] font-extrabold"
                  style={{ background: b.bg, color: b.fg }}
                >
                  {b.name.charAt(0)}
                </span>
                <span className="truncate">{b.name}</span>
              </button>
            );
          })}
        </div>

        {/* Account number */}
        <div className="mb-2 text-[14px] font-bold">2. 계좌번호</div>
        <div className="mb-1 grid grid-cols-1 gap-2">
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d-]/g, ''))}
            inputMode="numeric"
            placeholder="숫자만 입력 (10~16자리)"
            className={cn(
              'h-12 rounded-[10px] border bg-white px-3.5 text-[16px] font-bold tracking-[0.01em] tabular-nums outline-none',
              accountValid ? 'border-ticketa-blue-500 border-[1.5px]' : 'border-border',
            )}
          />
        </div>

        {/* Auto-match result */}
        {showAutoMatch ? (
          <div
            className="mt-2 mb-[18px] flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5"
            style={{ background: 'rgba(46,124,82,0.08)' }}
          >
            <span className="inline-flex size-[22px] items-center justify-center rounded-full bg-[#1F6B43] text-[14px] font-black text-white">
              ✓
            </span>
            <div className="flex-1">
              <div className="text-[14px] font-bold text-[#1F6B43]">
                예금주 {defaultHolder} · {matchedBankName}
              </div>
              <div className="text-muted-foreground text-[14px]">본인인증 정보와 일치해요</div>
            </div>
          </div>
        ) : (
          <div className="mt-2 mb-[18px]" />
        )}

        {/* Disabled holder verification note */}
        <div className="bg-warm-50 text-muted-foreground mb-[18px] rounded-[10px] px-3.5 py-2.5 text-[14px] leading-[1.55]">
          <b className="text-warm-700">예금주 1원 인증</b>은 현재 비활성화 상태로, 입력하신
          계좌번호와 본인인증 명의를 자동 매칭합니다.
        </div>

        {/* CTAs */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push('/account/mileage')}
            className="border-border text-muted-foreground hover:bg-warm-50 h-[50px] flex-1 cursor-pointer rounded-[11px] border bg-white text-[14px] font-bold transition-colors"
          >
            나중에 (출금 불가)
          </button>
          <button
            type="submit"
            disabled={pending || !accountValid}
            className="bg-ticketa-blue-500 h-[50px] flex-[2] cursor-pointer rounded-[11px] text-[15px] font-extrabold tracking-[-0.012em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? '등록 중…' : '이 계좌로 등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
}
