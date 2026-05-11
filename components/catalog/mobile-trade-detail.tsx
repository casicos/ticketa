'use client';

import Image from 'next/image';
import { DeptMark, DEPARTMENT_LABEL, type Department } from '@/components/ticketa/dept-mark';
import { MoneyDisplay } from '@/components/ticketa/money-display';
import { formatKRW } from '@/lib/format';
import { cn } from '@/lib/utils';
import { VerifiedBadge, StoreNameLabel } from './listing-badges';

export interface MobileTradeDetailProps {
  listingId: string;
  dept: Department;
  displayName: string;
  denomination: number;
  thumbnailUrl?: string | null;
  unitPrice: number;
  quantity: number;
  gross: number;
  canBuy: boolean;
  hasEnough: boolean;
  shortage: number;
  actionSlot: React.ReactNode;
  verified?: boolean;
  storeName?: string | null;
  partialAllowed: boolean;
  viewerIsAgent: boolean;
  /** 본인이 등록한 매물 — 구매/선물 비활성, 안내문(actionSlot)만 노출. */
  viewerIsOwner?: boolean;
  className?: string;
}

export function MobileTradeDetail({
  listingId,
  dept,
  displayName,
  denomination,
  thumbnailUrl,
  unitPrice,
  quantity,
  gross,
  canBuy,
  hasEnough,
  shortage,
  actionSlot,
  verified,
  storeName,
  partialAllowed,
  viewerIsAgent,
  viewerIsOwner,
  className,
}: MobileTradeDetailProps) {
  const verb = viewerIsAgent ? '매입' : '구매';
  return (
    <div className={cn('md:hidden', className)}>
      {/* Header card */}
      <div className="border-border border-b bg-white px-5 py-5">
        <div className="mb-3 flex items-center gap-2.5">
          {thumbnailUrl ? (
            <div className="border-warm-200 relative size-12 shrink-0 overflow-hidden rounded-[10px] border bg-white">
              <Image
                src={thumbnailUrl}
                alt={`${DEPARTMENT_LABEL[dept]}백화점 ${denomination.toLocaleString('ko-KR')}원권`}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
          ) : (
            <DeptMark dept={dept} size={40} />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-muted-foreground text-[12px] font-bold">
              {DEPARTMENT_LABEL[dept]}백화점 상품권
            </div>
            <div className="text-[15px] font-bold tracking-[-0.015em]">{displayName}</div>
          </div>
          {verified && <VerifiedBadge size="sm" />}
        </div>
        {storeName && (
          <div
            className="mb-3.5 flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5"
            style={{
              background: 'linear-gradient(180deg, #FBF6EA, #FFFFFF)',
              borderColor: '#ECDDB8',
            }}
          >
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[14px] font-black text-white"
              style={{ background: 'linear-gradient(135deg, #D4A24C, #8C6321)' }}
            >
              {storeName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <StoreNameLabel name={storeName} size="sm" />
              <div className="text-warm-700 mt-0.5 text-[12px]">에이전트 직영 매물</div>
            </div>
          </div>
        )}
        <div className="border-border flex items-baseline gap-2 border-t pt-3">
          <MoneyDisplay value={unitPrice} size="lg" />
          <span className="text-muted-foreground text-[14px] font-semibold">
            / 매 · 남은 {quantity.toLocaleString('ko-KR')}장
            {!partialAllowed && quantity > 1 && (
              <span className="text-warm-700"> · 전량 {formatKRW(gross)}</span>
            )}
          </span>
        </div>
        {partialAllowed && (
          <p className="text-warm-700 mt-1.5 text-[12px]">에이전트 매물 — 1매부터 {verb} 가능</p>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="border-border fixed right-0 bottom-0 left-0 border-t bg-white px-4 pt-3 pb-4">
        <div className="mb-2.5 flex justify-between text-[14px]">
          <span className="text-muted-foreground">
            {partialAllowed ? `최소 ${verb}가 (1매)` : `전량 ${verb}가`}
          </span>
          <span className="font-bold tabular-nums">
            {formatKRW(partialAllowed ? unitPrice : gross)}
          </span>
        </div>
        {viewerIsOwner ? (
          actionSlot
        ) : canBuy ? (
          !hasEnough ? (
            <div className="bg-warning/10 rounded-lg p-3 text-[14px]">
              <p className="font-semibold">
                {partialAllowed
                  ? `1매 단가 ${formatKRW(unitPrice)} 도 부족해요`
                  : `마일리지가 ${formatKRW(shortage)} 부족해요`}
              </p>
            </div>
          ) : (
            actionSlot
          )
        ) : (
          <button
            disabled
            className="bg-muted text-muted-foreground h-[50px] w-full cursor-not-allowed rounded-xl text-[14px] font-bold"
          >
            휴대폰 인증 후 {verb} 가능
          </button>
        )}
      </div>
    </div>
  );
}
