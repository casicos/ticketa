/**
 * Listing 카드/상세에서 재사용되는 라벨 배지 모음.
 * 디자인 출처: page-mockups/screens-p0-additions.jsx
 */
import { cn } from '@/lib/utils';

type BadgeSize = 'sm' | 'md' | 'lg';

/**
 * [인증] 배지 — 사전검수 끝난 매물에 노출 (녹색 fill).
 */
export function VerifiedBadge({
  size = 'md',
  label = '인증',
  className,
}: {
  size?: BadgeSize;
  label?: string;
  className?: string;
}) {
  const dims =
    size === 'sm'
      ? { h: 20, padX: 8, gap: 4, fs: 12, ic: 12 }
      : size === 'lg'
        ? { h: 28, padX: 12, gap: 6, fs: 14, ic: 16 }
        : { h: 24, padX: 10, gap: 5, fs: 13, ic: 14 };
  return (
    <span
      className={cn(
        'inline-flex items-center font-extrabold tracking-[-0.005em] whitespace-nowrap text-white',
        className,
      )}
      style={{
        gap: dims.gap,
        height: dims.h,
        padding: `0 ${dims.padX}px`,
        borderRadius: 6,
        background: '#1F6B43',
        fontSize: dims.fs,
      }}
    >
      <svg width={dims.ic} height={dims.ic} viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 1.5 13.5 4v4c0 3.2-2 5.7-5.5 6.5C4.5 13.7 2.5 11.2 2.5 8V4z"
          fill="rgba(255,255,255,0.2)"
          stroke="#fff"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="m5.5 8 1.8 1.8L11 5.8"
          stroke="#fff"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>[{label}]</span>
    </span>
  );
}

/**
 * 에이전트 매물의 상점명 라벨 — 골드 그라데이션 "공식" 배지 + 상점명.
 */
export function StoreNameLabel({
  name,
  size = 'md',
  linkable = false,
  className,
}: {
  name: string;
  size?: 'sm' | 'md';
  linkable?: boolean;
  className?: string;
}) {
  const dims =
    size === 'sm'
      ? { h: 18, padX: 6, fs: 12, gapInner: 4 }
      : { h: 20, padX: 7, fs: 13, gapInner: 5 };
  const nameFs = size === 'sm' ? 13 : 14;
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap', className)}>
      <span
        className="inline-flex items-center font-extrabold text-white"
        style={{
          gap: dims.gapInner,
          height: dims.h,
          padding: `0 ${dims.padX}px`,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #D4A24C, #B6862E)',
          fontSize: dims.fs,
          letterSpacing: '0.04em',
        }}
      >
        <svg width={dims.fs - 1} height={dims.fs - 1} viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M2 4.5h8v5a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5z"
            fill="rgba(255,255,255,0.25)"
            stroke="#fff"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path d="M1 3.5h10l-.6 1.5h-8.8z" fill="#fff" />
        </svg>
        공식
      </span>
      <span
        className={cn(
          'font-bold tracking-[-0.012em]',
          linkable && 'decoration-foreground/20 cursor-pointer underline underline-offset-[3px]',
        )}
        style={{ fontSize: nameFs }}
      >
        {name}
      </span>
    </span>
  );
}

/**
 * P2P 익명 판매자 라벨 — 회색 톤 사용자 아이콘 + 판매자 코드.
 */
export function AnonSellerLabel({
  code,
  size = 'md',
  className,
}: {
  code: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const fs = size === 'sm' ? 13 : 14;
  const codeFs = size === 'sm' ? 12 : 13;
  return (
    <span
      className={cn(
        'text-muted-foreground inline-flex items-center gap-1 font-semibold tracking-[-0.005em]',
        className,
      )}
      style={{ fontSize: fs }}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
        <circle cx="6" cy="4.5" r="1.8" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M2.5 10.5a3.5 3.5 0 0 1 7 0"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
      판매자 <span style={{ fontFamily: 'var(--font-mono)', fontSize: codeFs }}>{code}</span>
    </span>
  );
}
