'use client';

import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Gift, AtSign, X } from 'lucide-react';
import {
  lookupGiftRecipientAction,
  sendGiftFromListingAction,
} from '@/app/(public)/catalog/[id]/actions';

export function GiftSendModal({
  listingId,
  unitPrice,
  maxQty,
  skuLabel,
  storeName,
  myBalance,
}: {
  listingId: string;
  unitPrice: number;
  maxQty: number;
  skuLabel: string;
  storeName: string | null;
  myBalance: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] px-4 text-[15px] font-extrabold tracking-[-0.012em] text-white"
        style={{ background: 'linear-gradient(135deg, #D4A24C, #B6862E)' }}
      >
        <Gift className="size-4" strokeWidth={2.25} />
        선물하기
      </button>
      {open && (
        <GiftSendDialog
          listingId={listingId}
          unitPrice={unitPrice}
          maxQty={maxQty}
          skuLabel={skuLabel}
          storeName={storeName}
          myBalance={myBalance}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function GiftSendDialog({
  listingId,
  unitPrice,
  maxQty,
  skuLabel,
  storeName,
  myBalance,
  onClose,
}: {
  listingId: string;
  unitPrice: number;
  maxQty: number;
  skuLabel: string;
  storeName: string | null;
  myBalance: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  type UsernameStatus = 'idle' | 'checking' | 'valid' | 'not_found' | 'self';
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');

  async function validateUsername() {
    const trimmed = username.trim().replace(/^@/, '');
    if (!trimmed) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    const fd = new FormData();
    fd.set('username', trimmed);
    const r = await lookupGiftRecipientAction(fd);
    if (!r.ok) {
      setUsernameStatus('idle');
      return;
    }
    if (r.data.isSelf) setUsernameStatus('self');
    else if (r.data.found) setUsernameStatus('valid');
    else setUsernameStatus('not_found');
  }

  const total = qty * unitPrice;
  const shortage = Math.max(total - myBalance, 0);
  const canSubmit =
    !pending && usernameStatus === 'valid' && qty >= 1 && qty <= maxQty && shortage === 0;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    const trimmedUsername = username.trim().replace(/^@/, '');
    const fd = new FormData();
    fd.set('listing_id', listingId);
    fd.set('recipient_username', trimmedUsername);
    fd.set('qty', String(qty));
    fd.set('message', message);
    start(async () => {
      const r = await sendGiftFromListingAction(fd);
      if (r.ok) {
        toast.success(`@${trimmedUsername}에게 선물이 발송됐어요`);
        onClose();
        router.refresh();
      } else {
        toast.error(r.message ?? '선물 발송 실패');
      }
    });
  }

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="relative w-full max-w-[520px] overflow-hidden rounded-[16px] bg-white shadow-2xl"
      >
        {/* hero */}
        <div
          className="relative px-6 py-5 text-white"
          style={{ background: 'linear-gradient(135deg, #1A2332 0%, #2A1F1A 100%)' }}
        >
          <div
            className="pointer-events-none absolute -top-12 -right-12 size-44 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(212,162,76,0.30), transparent 70%)',
            }}
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-10 inline-flex size-7 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            aria-label="닫기"
          >
            <X className="size-4" strokeWidth={2.25} />
          </button>
          <div className="relative">
            <div
              className="text-[13px] font-extrabold tracking-[0.10em] uppercase"
              style={{ color: '#D4A24C' }}
            >
              선물하기
            </div>
            <h2 className="mt-1 text-[20px] font-extrabold tracking-[-0.018em]">{skuLabel}</h2>
            {storeName && (
              <div className="mt-0.5 text-[14px] text-white/65">
                {storeName} · 에이전트 직영 매물
              </div>
            )}
          </div>
        </div>

        {/* body */}
        <div className="grid gap-4 px-6 py-5">
          <Field label="받는 사람 아이디" required>
            <div className="relative">
              <AtSign
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                strokeWidth={2}
              />
              <input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (usernameStatus !== 'idle') setUsernameStatus('idle');
                }}
                onBlur={validateUsername}
                placeholder="아이디를 입력하세요"
                required
                maxLength={40}
                autoFocus
                className="border-border focus:border-ticketa-blue-500 h-11 w-full rounded-[10px] border bg-white pr-3 pl-9 text-[14px] font-semibold outline-none"
                style={
                  usernameStatus === 'not_found' || usernameStatus === 'self'
                    ? { borderColor: 'var(--destructive)' }
                    : usernameStatus === 'valid'
                      ? { borderColor: '#1F6B43' }
                      : undefined
                }
              />
            </div>
            {usernameStatus === 'checking' && (
              <p className="text-muted-foreground mt-1 text-[13px]">아이디 확인 중…</p>
            )}
            {usernameStatus === 'valid' && (
              <p className="mt-1 text-[13px] font-bold" style={{ color: '#1F6B43' }}>
                ✓ 받는 사람 확인됐어요
              </p>
            )}
            {usernameStatus === 'not_found' && (
              <p className="text-destructive mt-1 text-[13px] font-bold">
                해당 아이디의 회원을 찾을 수 없어요
              </p>
            )}
            {usernameStatus === 'self' && (
              <p className="text-destructive mt-1 text-[13px] font-bold">
                본인에게는 선물할 수 없어요
              </p>
            )}
            {usernameStatus === 'idle' && (
              <p className="text-muted-foreground mt-1 text-[13px]">
                상대방의 아이디(@username)를 정확히 입력하세요. 본인에게는 보낼 수 없어요.
              </p>
            )}
          </Field>

          <Field label="수량" required>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="border-border hover:bg-warm-50 inline-flex size-11 cursor-pointer items-center justify-center rounded-[10px] border bg-white text-[18px] font-bold"
                aria-label="감소"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={maxQty}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))}
                className="border-border focus:border-ticketa-blue-500 h-11 flex-1 rounded-[10px] border bg-white px-3 text-center text-[16px] font-extrabold tabular-nums outline-none"
              />
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                className="border-border hover:bg-warm-50 inline-flex size-11 cursor-pointer items-center justify-center rounded-[10px] border bg-white text-[18px] font-bold"
                aria-label="증가"
              >
                +
              </button>
            </div>
            <p className="text-muted-foreground mt-1 text-[13px] tabular-nums">
              최대 {Math.min(maxQty, 100).toLocaleString('ko-KR')}매 · 액면{' '}
              {unitPrice.toLocaleString('ko-KR')}원/매
            </p>
          </Field>

          <Field label="메시지 (선택)">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="짧은 인사말을 남겨보세요 (최대 200자)"
              maxLength={200}
              rows={2}
              className="border-border focus:border-ticketa-blue-500 w-full rounded-[10px] border bg-white px-3 py-2.5 text-[14px] outline-none"
            />
            <div className="text-muted-foreground mt-1 text-right text-[12px] tabular-nums">
              {message.length}/200
            </div>
          </Field>

          {/* payment summary */}
          <div
            className="rounded-[12px] p-4"
            style={{
              background: 'linear-gradient(180deg, #11161E 0%, #1F1A12 100%)',
              color: 'white',
            }}
          >
            <div className="text-[13px] font-bold tracking-[0.08em] text-white/55 uppercase">
              결제 요약
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-[14px] text-white/70 tabular-nums">
                {unitPrice.toLocaleString('ko-KR')}원 × {qty.toLocaleString('ko-KR')}매
              </span>
              <span
                className="text-[22px] font-extrabold tabular-nums"
                style={{ color: '#D4A24C' }}
              >
                {total.toLocaleString('ko-KR')}원
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-[13px] tabular-nums">
              <span className="text-white/55">내 잔액</span>
              <span className="text-white/85">{myBalance.toLocaleString('ko-KR')}원</span>
            </div>
            {shortage > 0 && (
              <div className="bg-destructive/15 text-destructive mt-2 rounded-[8px] px-3 py-2 text-[13px] font-bold">
                마일리지가 부족해요 ·{' '}
                <span className="tabular-nums">{shortage.toLocaleString('ko-KR')}원</span> 필요
              </div>
            )}
          </div>
        </div>

        {/* footer */}
        <div className="border-border bg-warm-50/40 flex items-center justify-between border-t px-6 py-3.5">
          <p className="text-muted-foreground text-[12px]">발송 후에도 수령 전이면 환불 가능</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="border-border text-foreground hover:bg-warm-50 h-11 cursor-pointer rounded-[10px] border bg-white px-4 text-[14px] font-bold"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="h-11 cursor-pointer rounded-[10px] px-5 text-[14px] font-extrabold text-[#11161E] disabled:opacity-50"
              style={{ background: 'linear-gradient(180deg, #D4A24C 0%, #B6862E 100%)' }}
            >
              {pending ? '발송 중…' : `${total.toLocaleString('ko-KR')}원 선물 →`}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[14px] font-bold">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
