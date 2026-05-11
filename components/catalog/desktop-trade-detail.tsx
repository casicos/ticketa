'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { DeptMark, DEPARTMENT_LABEL, type Department } from '@/components/ticketa/dept-mark';
import { MoneyDisplay } from '@/components/ticketa/money-display';
import { formatKRW } from '@/lib/format';
import { cn } from '@/lib/utils';
import { VerifiedBadge, StoreNameLabel } from './listing-badges';

const STAGE_LABELS = ['등록', '검수', '매칭', '결제', '전달', '수령', '완료'] as const;

function ProgressStepper({ currentIndex, allDone }: { currentIndex: number; allDone: boolean }) {
  const accent = allDone ? 'var(--semantic-success)' : 'var(--ticketa-blue-500)';
  const accentSoft = allDone ? 'rgba(28,128,80,0.10)' : 'var(--ticketa-blue-50)';
  return (
    <div className="flex items-start gap-0">
      {STAGE_LABELS.map((label, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isFuture = i > currentIndex && !allDone;
        return (
          <div key={label} className="contents">
            <div className="relative z-10 flex shrink-0 flex-col items-center gap-2">
              <div
                className="flex size-[30px] items-center justify-center rounded-full border-[1.5px] text-sm font-bold transition-all"
                style={{
                  background: isFuture ? '#fff' : accent,
                  color: isFuture ? 'var(--muted-foreground)' : '#fff',
                  borderColor: isFuture ? 'var(--warm-200)' : accent,
                  boxShadow: isCurrent ? `0 0 0 4px ${accentSoft}` : 'none',
                }}
              >
                {isDone || allDone ? '✓' : i + 1}
              </div>
              <span
                className={cn(
                  'text-[15px] font-semibold',
                  isFuture ? 'text-muted-foreground' : 'text-foreground',
                  isCurrent && 'font-bold',
                )}
              >
                {label}
              </span>
            </div>
            {i < STAGE_LABELS.length - 1 && (
              <div
                className="mt-[14px] h-0.5 flex-1"
                style={{ background: i < currentIndex ? accent : 'var(--warm-200)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export interface DesktopTradeDetailProps {
  listingId: string;
  dept: Department;
  displayName: string;
  thumbnailUrl?: string | null;
  unitPrice: number;
  quantity: number;
  gross: number;
  submittedAt: string;
  sellerId: string;
  status: string;
  stageIndex: number;
  allDone: boolean;
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
  className?: string;
}

export function DesktopTradeDetail({
  listingId,
  dept,
  displayName,
  thumbnailUrl,
  unitPrice,
  quantity,
  gross,
  stageIndex,
  allDone,
  canBuy,
  balance,
  hasEnough,
  shortage,
  ratio,
  actionSlot,
  verified,
  storeName,
  className,
}: DesktopTradeDetailProps) {
  const statusMsg = allDone
    ? '거래가 완료됐어요.'
    : stageIndex === 0
      ? '매물 등록 완료. 구매자가 결제하면 다음 단계로 진행돼요.'
      : stageIndex === 3
        ? '결제 대기 중. 24시간 내 결제하지 않으면 거래가 자동 취소돼요.'
        : '거래가 진행 중이에요.';

  return (
    <div className={cn('hidden md:block', className)}>
      {/* Breadcrumb */}
      <nav className="text-muted-foreground mb-[18px] flex items-center gap-1.5 text-[15px]">
        <Link href="/catalog" className="hover:text-foreground cursor-pointer">
          시세·매물
        </Link>
        <ChevronRight className="size-3.5" strokeWidth={1.5} />
        <Link href={`/catalog?brand=${dept}`} className="hover:text-foreground cursor-pointer">
          {DEPARTMENT_LABEL[dept]}
        </Link>
        <ChevronRight className="size-3.5" strokeWidth={1.5} />
        <span className="text-foreground font-semibold">
          {unitPrice.toLocaleString('ko-KR')}원권
        </span>
      </nav>

      <div className="grid grid-cols-[1.6fr_1fr] gap-6">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Detail card */}
          <div className="surface-card overflow-hidden p-0">
            {thumbnailUrl && (
              <div
                className="bg-muted/40 relative w-full px-10 py-6"
                style={{ aspectRatio: '1.6 / 1' }}
              >
                <Image
                  src={thumbnailUrl}
                  alt={`${DEPARTMENT_LABEL[dept]} ${unitPrice.toLocaleString('ko-KR')}원권`}
                  fill
                  sizes="(min-width: 1024px) 600px, 100vw"
                  className="object-contain p-4"
                />
              </div>
            )}
            <div className="p-7">
              <div className="mb-4 flex items-center gap-[14px]">
                <DeptMark dept={dept} size={48} />
                <div className="min-w-0 flex-1">
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
                    <div className="text-warm-700 mt-1 text-[13px]">
                      에이전트 직영 매물 · 결제 즉시 검수센터에서 발송돼요
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="h-9 cursor-not-allowed rounded-lg border px-3.5 text-[13px] font-bold"
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
                <span className="text-success text-[15px] font-semibold">
                  ↓ {quantity > 1 ? `${quantity}장 · 총 ${formatKRW(gross)}` : ''}
                </span>
              </div>

              {/* Sparkline */}
              <div
                className="relative mt-5 h-[120px] rounded-xl p-4"
                style={{ background: 'var(--warm-50)' }}
              >
                <div className="text-muted-foreground mb-1 text-[13px] font-bold tracking-[0.04em]">
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

          {/* Stepper card */}
          <div className="surface-card p-6">
            <div className="mb-[18px] flex items-baseline">
              <div className="text-muted-foreground text-[13px] font-bold tracking-[0.04em] uppercase">
                거래 진행 상태
              </div>
              <div className="text-muted-foreground ml-auto text-[15px] font-semibold">
                {Math.max(stageIndex, 0) + 1}/7 · {STAGE_LABELS[Math.max(stageIndex, 0)]}
              </div>
            </div>
            <ProgressStepper currentIndex={stageIndex} allDone={allDone} />
            <div className="bg-ticketa-blue-50 text-ticketa-blue-700 mt-[18px] rounded-lg px-3.5 py-3 text-[15px]">
              {statusMsg}
            </div>
          </div>
        </div>

        {/* Right — action panel */}
        <div>
          <div className="surface-card sticky top-6 p-6">
            <div className="text-muted-foreground mb-3 text-[15px] font-bold">
              {canBuy ? '구매 결제' : '시세 정보'}
            </div>

            <div className="border-border flex justify-between border-b border-dashed py-2 text-[15px]">
              <span className="text-muted-foreground">단가</span>
              <span className="font-semibold tabular-nums">{formatKRW(unitPrice)}</span>
            </div>
            <div className="border-border flex justify-between border-b border-dashed py-2 text-[15px]">
              <span className="text-muted-foreground">수량</span>
              <span className="font-semibold tabular-nums">{quantity.toLocaleString()}장</span>
            </div>
            <div className="flex items-baseline justify-between py-3.5 text-[15px]">
              <span className="font-bold">구매 총액</span>
              <MoneyDisplay value={gross} size="md" />
            </div>

            {canBuy && balance ? (
              <div className="mt-2">
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
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
                <p className="text-muted-foreground mt-1.5 text-[13px]">
                  필요 {formatKRW(gross)} · 보유 {formatKRW(balance.total)}
                </p>
                {!hasEnough ? (
                  <div className="border-warning/40 bg-warning/10 mt-4 rounded-lg border p-3 text-[15px]">
                    <p className="font-semibold">마일리지가 {formatKRW(shortage)} 부족해요.</p>
                    <p className="text-muted-foreground mt-1 text-[13px]">
                      충전 페이지에서 부족한 금액을 채운 뒤 구매을 다시 시도하세요.
                    </p>
                  </div>
                ) : (
                  actionSlot
                )}
                <p className="text-muted-foreground mt-3 flex items-center gap-1.5 text-[13px]">
                  <ShieldCheck className="text-ticketa-blue-500 size-3" strokeWidth={1.5} />
                  결제 즉시 어드민이 보관 → 수령 확인 후 판매자에게 정산
                </p>
              </div>
            ) : (
              <div className="border-border bg-muted/40 mt-2 rounded-lg border border-dashed p-4 text-[15px]">
                <p className="font-semibold">구매은 에이전트 권한 회원만 가능해요.</p>
                <p className="text-muted-foreground mt-1">
                  이 페이지는 시세 참고용입니다. 구매 권한이 필요하면 어드민에 신청해주세요.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
