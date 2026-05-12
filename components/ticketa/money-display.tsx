/**
 * MoneyDisplay — 금액 표기 컴포넌트
 *  - tabular-nums (숫자 정렬)
 *  - 700 weight, -0.015em letter-spacing
 *  - "원" 접미사는 0.72em / muted-fg
 *  - 음수일 때 자동 destructive 색
 *
 *  <MoneyDisplay value={1280000} />
 *  <MoneyDisplay value={1280000} size="lg" />
 *  <MoneyDisplay value={-50000} />
 *  <MoneyDisplay value={1280000} unit="KRW" />
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface MoneyDisplayProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  /** sm 13px / md 16px(default) / lg 24px / xl 30px */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  unit?: '원' | 'KRW' | 'M';
  /** 음수일 때 자동으로 destructive 색 적용. 끄려면 false. */
  signColor?: boolean;
}

const SIZE_MAP = {
  sm: 'text-sm',
  md: 'text-md',
  lg: 'text-2xl',
  xl: 'text-3xl',
} as const;

export function MoneyDisplay({
  value,
  size = 'md',
  unit = '원',
  signColor = true,
  className,
  ...rest
}: MoneyDisplayProps) {
  const formatted = new Intl.NumberFormat('ko-KR').format(value);
  const negative = value < 0;
  return (
    <span
      className={cn(
        't-money inline-flex items-baseline gap-0.5',
        SIZE_MAP[size],
        signColor && negative && 'text-destructive',
        className,
      )}
      {...rest}
    >
      <span>{formatted}</span>
      <span className="text-muted-foreground text-[0.72em] font-normal">{unit}</span>
    </span>
  );
}
