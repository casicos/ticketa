'use client';

import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatKRW } from '@/lib/format';
import { purchaseListingAction } from './actions';

type Props = {
  listingId: string;
  unitPrice: number;
  maxQty: number;
  balanceTotal: number;
  /** true 면 에이전트(사전검수) 매물 — 부분 매입 허용. false 면 P2P 매물 — 전량 매입만. */
  partialAllowed: boolean;
  /** 보는 사람이 에이전트면 '매입' 용어, 아니면 '구매' 용어 사용. */
  viewerIsAgent: boolean;
};

const QUICK_QTY = [1, 5, 10] as const;

export function PurchaseConfirm({
  listingId,
  unitPrice,
  maxQty,
  balanceTotal,
  partialAllowed,
  viewerIsAgent,
}: Props) {
  const verb = viewerIsAgent ? '매입' : '구매';
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(partialAllowed ? 1 : maxQty);
  const [pending, startTransition] = useTransition();

  const gross = qty * unitPrice;
  const enough = balanceTotal >= gross;
  const qtyValid = qty >= 1 && qty <= maxQty;

  function openModal() {
    setQty(partialAllowed ? 1 : maxQty);
    setOpen(true);
  }

  function handleConfirm() {
    if (!qtyValid || !enough) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('listing_id', listingId);
      fd.set('qty', String(qty));
      const result = await purchaseListingAction(fd);
      // 성공 시 내부 redirect 로 여기 도달하지 않음. 도달 = 실패 경로.
      if (!result) return;
      if (result.ok) return;
      if (result.code === 'FORBIDDEN') {
        toast.error('구매 권한이 없습니다');
      } else if (result.code === 'UNAUTHENTICATED') {
        toast.error('로그인이 만료됐습니다');
      } else if (result.code === 'PHONE_UNVERIFIED') {
        toast.error('휴대폰 인증이 필요합니다');
      } else if (result.code === 'SELF_PURCHASE_FORBIDDEN') {
        toast.error('본인이 등록한 매물은 구매할 수 없어요');
      } else if (result.code === 'INVALID_STATE') {
        toast.error('이미 매진됐거나 상태가 바뀌었어요');
      } else if (result.code === 'LISTING_NOT_FOUND') {
        toast.error('매물을 찾을 수 없어요');
      } else if (result.code?.startsWith('INSUFFICIENT_QUANTITY')) {
        toast.error('남은 수량보다 많이 요청했어요');
      } else if (result.code?.startsWith('P2P_WHOLE_ONLY')) {
        toast.error(`일반 회원 매물은 전량 ${verb}만 가능해요`);
      } else {
        toast.error(result.message ?? '구매에 실패했어요');
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="bg-ticketa-blue-500 hover:bg-ticketa-blue-600 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] text-[15px] font-extrabold tracking-[-0.012em] text-white"
      >
        <ShoppingBag className="size-4" strokeWidth={2.25} />
        {partialAllowed
          ? `${verb} · ${formatKRW(unitPrice)}/매부터`
          : `${verb} · ${formatKRW(unitPrice * maxQty)}`}
      </button>

      {open &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !pending) setOpen(false);
            }}
          >
            <div className="bg-background ring-foreground/10 w-full max-w-md rounded-lg p-5 ring-1">
              <h2 className="text-base font-medium">{verb} 확정</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                매당 {formatKRW(unitPrice)} ·{' '}
                {partialAllowed
                  ? `남은 수량 ${maxQty.toLocaleString('ko-KR')}매`
                  : `${maxQty.toLocaleString('ko-KR')}매 전량 ${verb}`}
              </p>

              {partialAllowed ? (
                <div className="mt-4">
                  <label className="text-muted-foreground mb-1.5 block text-[13px] font-bold">
                    {verb} 수량 (최대 {maxQty.toLocaleString('ko-KR')}매)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="border-border h-11 w-11 rounded-[10px] border bg-white text-[18px] font-bold"
                      aria-label="감소"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={maxQty}
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value) || 0)}
                      onBlur={() => {
                        if (qty < 1) setQty(1);
                        if (qty > maxQty) setQty(maxQty);
                      }}
                      className="border-border h-11 flex-1 rounded-[10px] border bg-white text-center text-[18px] font-extrabold tabular-nums outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                      className="border-border h-11 w-11 rounded-[10px] border bg-white text-[18px] font-bold"
                      aria-label="증가"
                    >
                      ＋
                    </button>
                  </div>
                  <div className="mt-1.5 flex gap-1.5">
                    {QUICK_QTY.map((q) => {
                      const disabled = q > maxQty;
                      const active = qty === q;
                      return (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setQty(Math.min(maxQty, q))}
                          disabled={disabled}
                          className="border-border h-8 flex-1 rounded-[7px] border text-[13px] font-bold tabular-nums disabled:opacity-40"
                          style={{
                            background: active ? 'rgba(91,163,208,0.08)' : 'white',
                            borderColor: active ? 'var(--ticketa-blue-500)' : 'var(--border)',
                            color: active ? 'var(--ticketa-blue-500)' : 'var(--foreground)',
                          }}
                        >
                          {q}매
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setQty(maxQty)}
                      className="border-border h-8 flex-1 rounded-[7px] border bg-white text-[13px] font-bold"
                    >
                      전체
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  className="bg-warm-50 mt-4 rounded-[10px] px-3 py-2.5 text-[13px]"
                  style={{ color: 'var(--warm-700)' }}
                >
                  이 매물은 일반 회원 매물이라 통째로만 {verb}할 수 있어요. 낱개 {verb}는 에이전트
                  매물만 지원돼요.
                </p>
              )}

              <div className="mt-4 flex items-center justify-between rounded-[10px] bg-[#11161E] px-4 py-3 text-white">
                <span className="text-[12px] font-bold tracking-[0.06em] text-white/60 uppercase">
                  총액
                </span>
                <span className="text-[20px] font-black tabular-nums">{formatKRW(gross)}</span>
              </div>

              {!enough && (
                <p className="mt-2 text-[13px] font-bold" style={{ color: 'var(--destructive)' }}>
                  마일리지가 {formatKRW(gross - balanceTotal)} 부족해요
                </p>
              )}

              <p className="text-muted-foreground mt-3 text-sm">
                구매 후 취소는 어드민 승인이 필요해요.
              </p>

              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  닫기
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirm}
                  disabled={pending || !qtyValid || !enough}
                >
                  {pending ? '처리 중…' : `${formatKRW(gross)} ${verb}`}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
