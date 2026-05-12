/**
 * StageBadge — 거래 7단계 상태 배지
 * Tonal arc: warm gray → blue family deepens to peak at stage 5 (결제완료)
 * → glides through cyan blues → soft mint at completion. Hue 80→260→180.
 *
 * 도메인 상태머신과 라벨이 다를 수 있으므로, 호출부에서 `label` prop으로
 * 우리 도메인 라벨을 넘기는 것을 권장 (lib/domain/listing-stages.ts 참조).
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

export type StageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STAGES: Record<StageNumber, { key: string; label: string; varName: string }> = {
  1: { key: 'pending', label: '대기', varName: '--stage-1-pending' },
  2: { key: 'inspect', label: '검수', varName: '--stage-2-inspect' },
  3: { key: 'verified', label: '검수완료', varName: '--stage-3-verified' },
  4: { key: 'payable', label: '결제대기', varName: '--stage-4-payable' },
  5: { key: 'paid', label: '결제완료', varName: '--stage-5-paid' },
  6: { key: 'shipping', label: '배송', varName: '--stage-6-shipping' },
  7: { key: 'complete', label: '완료', varName: '--stage-7-complete' },
};

export interface StageBadgeProps {
  stage: StageNumber;
  /** soft (default) — tinted bg + colored text. solid — filled. dot — leading dot + label. */
  variant?: 'soft' | 'solid' | 'dot';
  /** 라벨 override (도메인 매핑). 미지정 시 기본 라벨 사용. */
  label?: string;
  className?: string;
}

export function StageBadge({ stage, variant = 'soft', label, className }: StageBadgeProps) {
  const cfg = STAGES[stage];
  const color = `var(${cfg.varName})`;
  const text = label ?? cfg.label;

  if (variant === 'dot') {
    return (
      <span
        className={cn(
          'text-foreground inline-flex items-center gap-1.5 text-xs font-medium',
          className,
        )}
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {text}
      </span>
    );
  }

  if (variant === 'solid') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold text-white',
          className,
        )}
        style={{ background: color }}
      >
        {text}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium',
        className,
      )}
      style={{
        color,
        background: `color-mix(in oklch, ${color} 14%, transparent)`,
      }}
    >
      {text}
    </span>
  );
}
