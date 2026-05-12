'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';
import { VerifiedBadge } from '@/components/catalog/listing-badges';
import { createAgentListingAction } from './actions';

type Props = {
  inventoryId: string;
  available: number;
  reserved?: number;
  unitCost: number;
  skuLabel: string;
  skuBrand: string;
  skuDenomination: number;
  skuThumbnailUrl?: string | null;
};

const BRAND_TO_DEPT: Record<string, Department> = {
  롯데백화점: 'lotte',
  현대백화점: 'hyundai',
  신세계백화점: 'shinsegae',
  갤러리아백화점: 'galleria',
  AK백화점: 'ak',
};

const QUICK_QTY = [10, 30, 50] as const;

export function ListListingButton({
  inventoryId,
  available,
  reserved = 0,
  unitCost,
  skuLabel,
  skuBrand,
  skuDenomination,
  skuThumbnailUrl = null,
}: Props) {
  const dept = BRAND_TO_DEPT[skuBrand];
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(Math.min(10, available || 1));
  const [price, setPrice] = useState(Math.max(unitCost + 1000, 1000));
  const [pending, start] = useTransition();

  const minPrice = Math.max(1000, unitCost);
  const qtyValid = qty >= 1 && qty <= available;
  const priceValid = price >= minPrice;
  const canSubmit = qtyValid && priceValid && !pending;

  // 정산 단가 대비 마진 (판매가 - 정산 단가, 매당)
  const margin = price - unitCost;
  const total = qty * price;
  const facePct = skuDenomination
    ? Math.abs(((skuDenomination - unitCost) / skuDenomination) * 100)
    : 0;

  function close() {
    setOpen(false);
    setQty(Math.min(10, available || 1));
    setPrice(Math.max(unitCost + 1000, 1000));
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    start(async () => {
      const fd = new FormData();
      fd.set('inventory_id', inventoryId);
      fd.set('qty', String(qty));
      fd.set('unit_price', String(price));
      const r = await createAgentListingAction(fd);
      if (r.ok) {
        toast.success('판매 등록 완료 — 카탈로그에 노출됩니다');
        close();
        router.refresh();
      } else {
        toast.error(r.message ?? '판매 등록에 실패했어요');
      }
    });
  }

  if (available <= 0) {
    return (
      <button
        type="button"
        disabled
        className="border-border bg-warm-50 text-muted-foreground h-9 cursor-not-allowed rounded-lg border px-3 text-[14px] font-bold"
      >
        재고 없음
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 cursor-pointer rounded-lg px-3 text-[14px] font-extrabold text-white"
        style={{ background: 'linear-gradient(135deg, #D4A24C, #B6862E)' }}
      >
        판매 등록
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          style={{ background: 'rgba(15,21,30,0.55)' }}
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={submit}
            className="border-border flex w-full max-w-[720px] flex-col overflow-hidden rounded-[16px] border bg-white"
            style={{
              boxShadow: '0 20px 50px -10px rgba(0,0,0,0.2), 0 8px 20px -8px rgba(0,0,0,0.1)',
            }}
          >
            {/* Header */}
            <div className="border-border border-b px-6 pt-5 pb-4">
              <span
                className="inline-flex items-center rounded-[4px] px-2 py-0.5 text-[12px] font-extrabold tracking-[0.06em]"
                style={{ background: 'rgba(212,162,76,0.12)', color: '#8C6321' }}
              >
                INVENTORY → LISTING
              </span>
              <h2 className="mt-2 text-[20px] font-extrabold tracking-[-0.022em]">판매 등록</h2>
              <p className="text-muted-foreground mt-1 text-[14px]">
                위탁 재고에서 판매 매물로 — 등록 즉시 카탈로그에 인증 배지로 노출돼요
              </p>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-[18px] px-6 py-5">
              {/* 상품권 summary */}
              <div className="border-border bg-warm-50 grid grid-cols-3 gap-4 rounded-[10px] border p-4">
                <div>
                  <div className="text-muted-foreground mb-1 text-[12px] font-bold tracking-[0.06em] uppercase">
                    상품권
                  </div>
                  <div className="flex items-center gap-2">
                    {skuThumbnailUrl ? (
                      <div className="border-warm-200 relative size-7 shrink-0 overflow-hidden rounded-[6px] border bg-white">
                        <Image
                          src={skuThumbnailUrl}
                          alt={skuLabel}
                          fill
                          sizes="28px"
                          className="object-cover"
                        />
                      </div>
                    ) : dept ? (
                      <DeptMark dept={dept} size={28} />
                    ) : (
                      <DeptMark dept={skuBrand} size={28} />
                    )}
                    <div>
                      <div className="text-[14px] font-extrabold tracking-[-0.012em]">
                        {skuLabel}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div
                    className="text-muted-foreground mb-1 text-[12px] font-bold tracking-[0.06em] uppercase"
                    title="에이전트가 매당 받는 정산 단가. 판매 완료 후 자동 정산"
                  >
                    정산 단가
                  </div>
                  <div className="text-[17px] font-extrabold tracking-[-0.016em] tabular-nums">
                    {unitCost.toLocaleString('ko-KR')}
                    <span className="text-muted-foreground ml-0.5 text-[13px] font-bold">원</span>
                  </div>
                  {skuDenomination > 0 && (
                    <div className="text-muted-foreground mt-0.5 text-[12px]">
                      액면 -{facePct.toFixed(1)}%
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-muted-foreground mb-1 text-[12px] font-bold tracking-[0.06em] uppercase">
                    보유 수량
                  </div>
                  <div className="text-[17px] font-extrabold tabular-nums">
                    {available}
                    <span className="text-muted-foreground ml-0.5 text-[13px] font-bold">매</span>
                  </div>
                  {reserved > 0 && (
                    <div className="text-muted-foreground mt-0.5 text-[12px]">
                      판매중 {reserved}매
                    </div>
                  )}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[14px] font-bold">
                    판매 수량 <span className="text-destructive">*</span>
                  </span>
                  <span className="text-muted-foreground text-[13px]">최대 {available}매</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="border-border flex h-11 flex-1 items-center rounded-[9px] border bg-white">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="text-muted-foreground h-full w-11 cursor-pointer text-[18px] font-bold"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={available}
                      value={qty}
                      onChange={(e) =>
                        setQty(Math.max(1, Math.min(available, Number(e.target.value) || 1)))
                      }
                      className="h-full flex-1 bg-transparent text-center text-[18px] font-extrabold tabular-nums outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.min(available, q + 1))}
                      className="text-muted-foreground h-full w-11 cursor-pointer text-[18px] font-bold"
                    >
                      +
                    </button>
                  </div>
                  {QUICK_QTY.map((q) => {
                    const active = qty === q;
                    return (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQty(Math.min(available, q))}
                        disabled={q > available}
                        className="h-9 cursor-pointer rounded-lg px-3 text-[14px] font-bold tabular-nums disabled:cursor-not-allowed disabled:opacity-40"
                        style={{
                          border: active ? '1.5px solid #D4A24C' : '1px solid var(--border)',
                          background: active ? 'rgba(212,162,76,0.08)' : '#fff',
                          color: active ? '#8C6321' : 'var(--warm-700)',
                        }}
                      >
                        {q}매
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setQty(available)}
                    className="border-border text-warm-700 h-9 cursor-pointer rounded-lg border bg-white px-3 text-[14px] font-bold"
                  >
                    전체
                  </button>
                </div>
              </div>

              {/* Price */}
              <div
                className="rounded-[12px] border p-[18px]"
                style={{
                  background: 'linear-gradient(180deg, #F8F4ED 0%, #FFFFFF 80%)',
                  borderColor: '#ECDDB8',
                }}
              >
                <div className="flex items-center gap-4 text-[14px]">
                  <span
                    className="text-warm-700 inline-flex items-center gap-1.5"
                    title="에이전트가 매당 받는 정산 단가. 판매 완료 후 자동 정산"
                  >
                    <span className="size-1.5 rounded-full bg-[#8C6321]" />
                    정산 단가
                    <b className="text-foreground tabular-nums">
                      {unitCost.toLocaleString('ko-KR')}원
                    </b>
                  </span>
                </div>

                <div className="mt-3.5">
                  <div className="mb-1.5 text-[13px] font-extrabold tracking-[0.08em] text-[#8C6321] uppercase">
                    판매가 *
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-16 flex-1 items-center gap-2 rounded-[12px] bg-white px-[18px]"
                      style={{
                        border: '2px solid #D4A24C',
                        boxShadow: '0 0 0 4px rgba(212,162,76,0.18)',
                      }}
                    >
                      <input
                        type="number"
                        min={minPrice}
                        step={100}
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value) || 0)}
                        onBlur={() => {
                          if (price < minPrice) setPrice(minPrice);
                        }}
                        className="h-full flex-1 bg-transparent text-[32px] font-black tracking-[-0.025em] tabular-nums outline-none"
                      />
                      <span className="text-warm-700 text-[18px] font-extrabold">원</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => setPrice(Math.max(minPrice, price - 100))}
                        className="border-border h-7 cursor-pointer rounded-md border bg-white px-2.5 text-[12px] font-bold"
                      >
                        −100원
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrice(unitCost)}
                        className="border-border h-7 cursor-pointer rounded-md border bg-white px-2.5 text-[12px] font-bold"
                        title="정산 단가로 설정 (마진 0)"
                      >
                        정산가
                      </button>
                    </div>
                  </div>
                  <div className="text-warm-700 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                    <span
                      className="inline-flex items-center gap-1 font-bold"
                      style={{ color: margin >= 0 ? '#1F6B43' : 'var(--semantic-error)' }}
                    >
                      정산 단가 대비 마진{' '}
                      <b className="text-foreground tabular-nums">
                        {margin >= 0 ? '+' : ''}
                        {margin.toLocaleString('ko-KR')}원
                      </b>{' '}
                      / 매
                    </span>
                    {!priceValid && (
                      <span
                        className="inline-flex items-center gap-1 font-bold"
                        style={{ color: 'var(--semantic-error)' }}
                      >
                        판매가는 정산 단가 {unitCost.toLocaleString('ko-KR')}원 이상이어야 해요
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Total summary */}
              <div
                className="flex items-center justify-between rounded-[10px] px-4 py-3.5 text-white"
                style={{
                  background: 'linear-gradient(180deg, #11161E 0%, #1F1A12 100%)',
                }}
              >
                <div>
                  <div className="text-[12px] font-bold tracking-[0.08em] text-white/55 uppercase">
                    예상 매출 (전량 판매 시)
                  </div>
                  <div className="mt-1 text-[14px] text-white/70 tabular-nums">
                    {price.toLocaleString('ko-KR')}원 × {qty}매 = 마진{' '}
                    {(margin * qty).toLocaleString('ko-KR')}원
                  </div>
                </div>
                <div className="text-[24px] font-black tracking-[-0.022em] tabular-nums">
                  {total.toLocaleString('ko-KR')}
                  <span className="ml-1 text-[14px] text-[#FCE9C8]">원</span>
                </div>
              </div>
            </div>

            <div className="border-border bg-warm-50 flex items-center justify-between border-t px-6 py-3.5">
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[13px]">
                <VerifiedBadge size="sm" /> 등록 즉시 카탈로그에 노출됨
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="border-border h-10 cursor-pointer rounded-lg border bg-white px-4 text-[14px] font-bold"
                  disabled={pending}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="h-10 cursor-pointer rounded-lg px-5 text-[14px] font-extrabold tracking-[-0.01em] text-white disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #D4A24C, #B6862E)',
                  }}
                >
                  {pending ? '등록 중…' : '판매 등록 →'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
