import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export type BankMarkProps = {
  name: string;
  brandColor?: string | null;
  thumbnailUrl?: string | null;
  /** sm=24, md=32, lg=44, 또는 픽셀 직접 지정. */
  size?: 'sm' | 'md' | 'lg' | number;
  className?: string;
};

const SIZE_PX: Record<'sm' | 'md' | 'lg', number> = { sm: 24, md: 32, lg: 44 };

function pickInitial(name: string): string {
  // "KB국민" → "국" / "신한" → "신" / "카카오뱅크" → "카"
  const stripped = name.replace(/[A-Za-z]+/g, '').trim();
  return (stripped || name).charAt(0).toUpperCase();
}

/**
 * 은행 로고 마크. thumbnail_url 이 있으면 이미지, 없으면 brand_color 배경 + 한글자 폴백.
 */
export function BankMark({
  name,
  brandColor,
  thumbnailUrl,
  size = 'md',
  className,
}: BankMarkProps) {
  const dim = typeof size === 'number' ? size : SIZE_PX[size];

  if (thumbnailUrl) {
    return (
      <div
        className={cn(
          'border-warm-200 relative shrink-0 overflow-hidden rounded-full border bg-white',
          className,
        )}
        style={{ width: dim, height: dim }}
        aria-label={name}
      >
        <Image src={thumbnailUrl} alt={name} fill sizes={`${dim}px`} className="object-cover" />
      </div>
    );
  }

  const bg = brandColor || '#6B7280';
  const fontSize = Math.round(dim * 0.45);
  const initial = pickInitial(name);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-extrabold tracking-tight text-white',
        className,
      )}
      style={{
        width: dim,
        height: dim,
        background: bg,
        fontSize,
        // 노란색 배경(카카오뱅크 등)은 흰 글자 대비가 약함 → 어두운 글자로
        color: isLightColor(bg) ? '#11161E' : '#fff',
      }}
      aria-label={name}
    >
      {initial}
    </span>
  );
}

/** 휘도 기반 라이트 배경 감지 (대략적). */
function isLightColor(hex: string): boolean {
  const m = hex.replace('#', '').match(/^([0-9a-f]{6})$/i);
  if (!m) return false;
  const raw = m[1]!;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.7;
}
