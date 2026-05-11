'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { DeptMark, DEPARTMENT_LABEL, type Department } from '@/components/ticketa/dept-mark';
import { MoneyDisplay } from '@/components/ticketa/money-display';
import { formatKRW } from '@/lib/format';
import { cn } from '@/lib/utils';
import { VerifiedBadge, StoreNameLabel } from './listing-badges';

export interface DesktopTradeDetailProps {
  listingId: string;
  dept: Department;
  displayName: string;
  /** SKU 액면가 — breadcrumb 마지막 항목용. */
  denomination: number;
  thumbnailUrl?: string | null;
  unitPrice: number;
  quantity: number;
  gross: number;
  submittedAt: string;
  sellerId: string;
  status: string;
  canBuy: boolean;
  balance: { total: number; withdrawable: number; pgLocked: number } | null;
  hasEnough: boolean;
  shortage: number;
  ratio: number;
  actionSlot: React.ReactNode;
  /** 사전검수 완료된 매물이면 true ([인증] 배지). */
  verified?: boolean;
  /** 에이전트 매물의 상점명. */
  storeName?: string | null;
  /** true: 에이전트 매물 — 낱개 매입 가능. false: P2P — 전량 매입만. */
  partialAllowed: boolean;
  /** 보는 사람이 에이전트면 '매입' 용어, 아니면 '구매' 용어 사용. */
  viewerIsAgent: boolean;
  className?: string;
}

export function DesktopTradeDetail({
  listingId,
  dept,
  displayName,
  denomination,
  thumbnailUrl,
  unitPrice,
  quantity,
  gross,
  canBuy,
  balance,
  hasEnough,
  shortage,
  ratio,
  actionSlot,
  verified,
  storeName,
  partialAllowed,
  viewerIsAgent,
  className,
}: DesktopTradeDetailProps) {
  const verb = viewerIsAgent ? '매입' : '구매';

  return (
    <div className={cn('hidden md:block', className)}>
      {/* Breadcrumb */}
      <nav className="text-muted-foreground mb-[18px] flex items-center gap-1.5 text-[15px]">
        <Link href="/catalog" className="hover:text-foreground cursor-pointer">
          시세·매물
        </Link>
        <ChevronRight className="size-3.5" strokeWidth={1.5} />
        <Link href={`/catalog?brand=${dept}`} className="hover:text-foreground cursor-pointer">
          {DEPARTMENT_LABEL[dept]}백화점
        </Link>
        <ChevronRight className="size-3.5" strokeWidth={1.5} />
        <span className="text-foreground font-semibold">
          {denomination.toLocaleString('ko-KR')}원권
        </span>
      </nav>

      <div className="grid grid-cols-[1.6fr_1fr] gap-6">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Detail card */}
          <div className="surface-card flex-1 overflow-hidden p-0">
            <div className="p-7">
              <div className="mb-4 flex items-center gap-[14px]">
                {thumbnailUrl ? (
                  <div className="border-warm-200 relative size-[72px] shrink-0 overflow-hidden rounded-[12px] border bg-white">
                    <Image
                      src={thumbnailUrl}
                      alt={`${DEPARTMENT_LABEL[dept]} ${unitPrice.toLocaleString('ko-KR')}원권`}
                      fill
                      sizes="72px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <DeptMark dept={dept} size={56} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-muted-foreground text-[13px] font-bold">
                    {DEPARTMENT_LABEL[dept]}백화점 상품권
                  </div>
                  <div className="text-[20px] font-bold tracking-[-0.018em]">{displayName}</div>
                </div>
                {verified && <VerifiedBadge size="lg" className="ml-auto" />}
              </div>

              {/* Agent store row */}
              {storeName && (
                <div
                  className="mb-4 flex items-center gap-3.5 rounded-[10px] border px-4 py-3.5"
                  style={{
                    background: 'linear-gradient(180deg, #FBF6EA, #FFFFFF)',
                    borderColor: '#ECDDB8',
                  }}
                >
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-[10px] text-[16px] font-black tracking-[-0.02em] text-white"
                    style={{ background: 'linear-gradient(135deg, #D4A24C, #8C6321)' }}
                  >
                    {storeName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <StoreNameLabel name={storeName} size="md" />
                    <div className="text-warm-700 mt-1 text-[14px]">
                      에이전트 직영 매물 · 결제 즉시 검수센터에서 발송돼요
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="h-9 cursor-not-allowed rounded-lg border px-3.5 text-[14px] font-bold"
                    style={{
                      borderColor: '#D4A24C',
                      background: '#fff',
                      color: '#8C6321',
                      opacity: 0.6,
                    }}
                    title="곧 제공돼요"
                  >
                    상점 페이지 →
                  </button>
                </div>
              )}

              <div className="border-border flex items-baseline gap-3 border-t pt-4">
                <MoneyDisplay value={unitPrice} size="xl" />
                <span className="text-muted-foreground text-[15px] font-semibold">
                  / 매 · 남은 수량 {quantity.toLocaleString('ko-KR')}장
                  {!partialAllowed && quantity > 1 && (
                    <>
                      <span className="text-warm-700 mx-1.5">·</span>
                      <span className="text-warm-700">
                        전량 {verb} 시 {formatKRW(gross)}
                      </span>
                    </>
                  )}
                </span>
              </div>
              {partialAllowed && (
                <p className="text-warm-700 mt-1.5 text-[13px]">
                  에이전트 매물 — 1매부터 자유롭게 선택해서 {verb}할 수 있어요
                </p>
              )}

              {/* Sparkline */}
              <div
                className="relative mt-5 h-[120px] rounded-xl p-4"
                style={{ background: 'var(--warm-50)' }}
              >
                <div className="text-muted-foreground mb-1 text-[14px] font-bold tracking-[0.04em]">
                  지난 30일 시세
                </div>
                <svg width="100%" height="80" viewBox="0 0 600 80" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="var(--ticketa-blue-500)"
                    strokeWidth="2"
                    points="0,52 50,46 100,58 150,40 200,44 250,30 300,36 350,24 400,32 450,22 500,28 550,18 600,22"
                  />
                  <polyline
                    fill="rgba(0,102,255,0.12)"
                    stroke="none"
                    points="0,52 50,46 100,58 150,40 200,44 250,30 300,36 350,24 400,32 450,22 500,28 550,18 600,22 600,80 0,80"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right — action panel */}
        <div>
          <div className="surface-card sticky top-6 p-6">
            <div className="text-muted-foreground mb-3 text-[15px] font-bold">
              {canBuy ? `${verb} 결제` : '시세 정보'}
            </div>

            <div className="border-border flex justify-between border-b border-dashed py-2 text-[15px]">
              <span className="text-muted-foreground">단가</span>
              <span className="font-semibold tabular-nums">{formatKRW(unitPrice)}</span>
            </div>
            <div className="border-border flex justify-between border-b border-dashed py-2 text-[15px]">
              <span className="text-muted-foreground">남은 수량</span>
              <span className="font-semibold tabular-nums">{quantity.toLocaleString()}장</span>
            </div>
            {partialAllowed ? (
              <div className="flex items-baseline justify-between py-3.5 text-[15px]">
                <span className="font-bold">최소 {verb}가</span>
                <span className="inline-flex items-baseline gap-1">
                  <MoneyDisplay value={unitPrice} size="md" />
                  <span className="text-muted-foreground text-[13px] font-semibold">/ 1매</span>
                </span>
              </div>
            ) : (
              <div className="flex items-baseline justify-between py-3.5 text-[15px]">
                <span className="font-bold">전량 {verb}가</span>
                <MoneyDisplay value={gross} size="md" />
              </div>
            )}

            {canBuy && balance ? (
              <div className="mt-2">
                <div className="mb-1.5 flex items-center justify-between text-[14px]">
                  <span className="text-muted-foreground">내 마일리지</span>
                  <span className="font-semibold tabular-nums">{formatKRW(balance.total)}</span>
                </div>
                <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${Math.round(ratio * 100)}%`,
                      background: hasEnough ? 'var(--semantic-success)' : 'var(--semantic-warning)',
                    }}
                  />
                </div>
                <p className="text-muted-foreground mt-1.5 text-[14px]">
                  {partialAllowed
                    ? `최소 ${formatKRW(unitPrice)} · 보유 ${formatKRW(balance.total)}`
                    : `필요 ${formatKRW(gross)} · 보유 ${formatKRW(balance.total)}`}
                </p>
                {!hasEnough ? (
                  <div className="border-warning/40 bg-warning/10 mt-4 rounded-lg border p-3 text-[15px]">
                    <p className="font-semibold">
                      {partialAllowed
                        ? `1매 단가 ${formatKRW(unitPrice)} 도 부족해요`
                        : `마일리지가 ${formatKRW(shortage)} 부족해요.`}
                    </p>
                    <p className="text-muted-foreground mt-1 text-[14px]">
                      충전 페이지에서 부족한 금액을 채운 뒤 다시 시도해주세요.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5">{actionSlot}</div>
                )}
                <p className="text-muted-foreground mt-3 flex items-center gap-1.5 text-[14px]">
                  <ShieldCheck className="text-ticketa-blue-500 size-3" strokeWidth={1.5} />
                  결제 즉시 어드민이 보관 → 수령 확인 후 판매자에게 정산
                </p>
              </div>
            ) : (
              <div className="border-border bg-muted/40 mt-2 rounded-lg border border-dashed p-4 text-[15px]">
                <p className="font-semibold">{verb}하려면 휴대폰 인증이 필요해요.</p>
                <p className="text-muted-foreground mt-1">
                  이 페이지는 시세 참고용입니다. 인증 후 다시 시도해주세요.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
