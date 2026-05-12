/**
 * SkuMark — SKU 식별 아이콘. 썸네일 우선, 없으면 DeptMark fallback.
 *
 * 사용처 전반에서 반복되던 패턴을 통합한 컴포넌트.
 * 어떤 페이지에서 쓰든 동일한 fallback 로직 + brand 정규화를 보장.
 *
 *   <SkuMark thumbnailUrl={sku.thumbnail_url} brand={sku.brand} size={40} />
 */
import * as React from 'react';
import Image from 'next/image';
import { DeptMark } from './dept-mark';
import { cn } from '@/lib/utils';

export interface SkuMarkProps {
  /** SKU 썸네일 URL — 있으면 우선 표시. */
  thumbnailUrl: string | null | undefined;
  /** brand 문자열 (영문 dept 키 또는 DB 한글 풀네임 둘 다 허용). */
  brand: string | null | undefined;
  /** 픽셀 사이즈. 기본 40. */
  size?: number;
  /** alt 텍스트 (썸네일용). */
  alt?: string;
  className?: string;
}

export function SkuMark({ thumbnailUrl, brand, size = 40, alt, className }: SkuMarkProps) {
  if (thumbnailUrl) {
    return (
      <div
        className={cn(
          'border-warm-200 relative shrink-0 overflow-hidden rounded-[8px] border bg-white',
          className,
        )}
        style={{ width: size, height: size }}
      >
        <Image
          src={thumbnailUrl}
          alt={alt ?? brand ?? '상품권'}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      </div>
    );
  }
  return <DeptMark dept={brand ?? ''} size={size} className={className} />;
}
