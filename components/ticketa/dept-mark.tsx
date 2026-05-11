/**
 * DeptMark — 백화점 브랜드 모노그램
 * 저작권상 공식 로고 사용 불가 → 2글자 약어 + 브랜드 컬러 배경 SVG.
 * 자산: public/department-marks/{lotte,hyundai,shinsegae,galleria,ak}.svg
 */
import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export type Department = 'lotte' | 'hyundai' | 'shinsegae' | 'galleria' | 'ak';

export const DEPARTMENT_LABEL: Record<Department, string> = {
  lotte: '롯데',
  hyundai: '현대',
  shinsegae: '신세계',
  galleria: '갤러리아',
  ak: 'AK',
};

const KNOWN_DEPTS = new Set<string>(['lotte', 'hyundai', 'shinsegae', 'galleria', 'ak']);

const SIZE_PX: Record<'sm' | 'md' | 'lg', number> = {
  sm: 20,
  md: 28,
  lg: 40,
};

export interface DeptMarkProps {
  dept: Department | string;
  /** 프리셋 sm/md/lg 또는 픽셀 수치 직접 지정. */
  size?: 'sm' | 'md' | 'lg' | number;
  className?: string;
}

export function DeptMark({ dept, size = 'md', className }: DeptMarkProps) {
  const dim = typeof size === 'number' ? size : SIZE_PX[size];
  const known = KNOWN_DEPTS.has(dept);
  const label = known ? DEPARTMENT_LABEL[dept as Department] : dept || '백화점';

  if (!known) {
    // 알 수 없는 brand — neutral placeholder
    return (
      <span
        className={cn(
          'bg-muted text-muted-foreground inline-flex shrink-0 items-center justify-center rounded-md font-bold',
          className,
        )}
        style={{ width: dim, height: dim, fontSize: dim * 0.4 }}
        aria-label={label}
      >
        ?
      </span>
    );
  }

  return (
    <span
      className={cn(
        'border-border inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white',
        className,
      )}
      style={{ width: dim, height: dim }}
    >
      <Image
        src={`/department-marks/${dept}.webp`}
        alt={label}
        width={dim}
        height={dim}
        className="object-contain"
      />
    </span>
  );
}
