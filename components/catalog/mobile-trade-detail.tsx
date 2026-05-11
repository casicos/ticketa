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
  className?: string;
}

export function MobileTradeDetail({
  listingId,
  dept,
  displayName,
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
  className,
}: MobileTradeDetailProps) {
  return (
    <div className={cn('md:hidden', className)}>
      {/* Thumbnail */}
      {thumbnailUrl && (
        <div className="bg-muted/40 relative w-full px-6 py-4" style={{ aspectRatio: '1.6 / 1' }}>
          <Image
            src={thumbnailUrl}
            alt={`${DEPARTMENT_LABEL[dept]} ${unitPrice.toLocaleString('ko-KR')}원권`}
            fill
            sizes="100vw"
            className="object-contain p-2"
          />
        </div>
      )}
      {/* Header card */}
      <div className="border-border border-b bg-white px-5 py-5">
        <div className="mb-3 flex items-center gap-2.5">
          <DeptMark dept={dept} size={36} />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold tracking-[-0.015em]">{displayName}</div>
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
              <div className="text-warm-700 mt-0.5 text-[11px]">에이전트 직영 매물</div>
            </div>
          </div>
        )}
        <div className="border-border flex items-baseline gap-2 border-t pt-3">
          <MoneyDisplay value={unitPrice} size="lg" />
          {quantity > 1 && (
            <span className="text-muted-foreground text-[14px] font-semibold">
              × {quantity}장 = {formatKRW(gross)}
            </span>
          )}
        </div>
      </div>

      {/* Dept label */}
      <div className="text-muted-foreground px-5 py-3 text-[13px]">
        {DEPARTMENT_LABEL[dept]} 백화점 상품권
      </div>

      {/* Bottom action bar */}
      <div className="border-border fixed right-0 bottom-0 left-0 border-t bg-white px-4 pt-3 pb-4">
        <div className="mb-2.5 flex justify-between text-[14px]">
          <span className="text-muted-foreground">총 결제 (수수료 포함)</span>
          <span className="font-bold tabular-nums">{formatKRW(gross)}</span>
        </div>
        {canBuy ? (
          !hasEnough ? (
            <div className="bg-warning/10 rounded-lg p-3 text-[14px]">
              <p className="font-semibold">마일리지가 {formatKRW(shortage)} 부족해요.</p>
            </div>
          ) : (
            actionSlot
          )
        ) : (
          <button
            disabled
            className="bg-muted text-muted-foreground h-[50px] w-full cursor-not-allowed rounded-xl text-[14px] font-bold"
          >
            에이전트 권한 필요
          </button>
        )}
      </div>
    </div>
  );
}
