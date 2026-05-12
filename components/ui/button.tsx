import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md font-medium',
    'transition-[background,box-shadow,transform,color] duration-150',
    'outline-none select-none',
    'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:not-aria-[haspopup]:translate-y-px',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
    'dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
  ].join(' '),
  {
    variants: {
      variant: {
        /* 메인 CTA — 결제, 검수 승인, 등록 */
        primary:
          'bg-primary text-primary-foreground shadow-sm hover:bg-ticketa-blue-600 active:bg-ticketa-blue-700',
        /* 보조 액션 — 다이얼로그 보조 */
        secondary:
          'bg-secondary text-secondary-foreground border border-border hover:bg-muted aria-expanded:bg-muted',
        /* 외곽선 — 필터, 보기 토글 */
        outline:
          'border border-border bg-card text-foreground hover:bg-muted aria-expanded:bg-muted dark:bg-input/30 dark:hover:bg-input/50',
        /* 텍스트 전용 — 인라인 액션 */
        ghost: 'text-foreground hover:bg-muted aria-expanded:bg-muted dark:hover:bg-muted/50',
        /* 링크 스타일 */
        link: 'text-primary underline-offset-4 hover:underline px-0',
        /* 위험 액션 — 삭제, 거절, 환불 */
        destructive: 'bg-destructive text-white shadow-sm hover:opacity-90 active:opacity-80',
        /* 프리미엄 — VIP / 골드 카드 / 추천 강조 */
        gold: 'bg-ticketa-gold-500 text-white shadow-sm hover:bg-ticketa-gold-600 active:bg-ticketa-gold-700',
      },
      size: {
        sm: 'h-8 gap-1.5 px-3 text-sm',
        md: 'h-9 px-4 text-sm',
        lg: 'h-11 px-6 text-base',
        xl: 'h-14 px-8 text-md',
        icon: 'h-9 w-9 px-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

function Button({
  className,
  variant = 'primary',
  size = 'md',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
