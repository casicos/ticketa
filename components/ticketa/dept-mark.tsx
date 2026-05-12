/**
 * DeptMark — 백화점 브랜드 모노그램
 * 저작권상 공식 로고 사용 불가 → 2글자 약어 + 브랜드 컬러 배경 SVG.
 * 자산: public/department-marks/{lotte,hyundai,shinsegae,galleria,ak}.webp
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

/** DB sku.brand 한글 풀네임 ↔ 영문 dept key 매핑. */
const BRAND_KO_TO_DEPT: Record<string, Department> = {
  롯데백화점: 'lotte',
  현대백화점: 'hyundai',
  신세계백화점: 'shinsegae',
  갤러리아백화점: 'galleria',
  AK백화점: 'ak',
};

const KNOWN_DEPTS = new Set<string>(['lotte', 'hyundai', 'shinsegae', 'galleria', 'ak']);

/**
 * 어떤 형태의 brand 문자열(영문 dept 키, 또는 DB 의 한글 풀네임)이 와도
 * 영문 dept 키로 정규화. 매칭 안 되면 null.
 */
export function brandToDept(brand: string | null | undefined): Department | null {
  if (!brand) return null;
  if (KNOWN_DEPTS.has(brand)) return brand as Department;
  return BRAND_KO_TO_DEPT[brand] ?? null;
}

/** "롯데백화점" → "롯데", "ak" → "AK". 매칭 안되면 백화점 suffix 만 떼서 반환. */
export function brandShortLabel(brand: string | null | undefined): string {
  if (!brand) return '';
  const dept = brandToDept(brand);
  if (dept) return DEPARTMENT_LABEL[dept];
  return brand.replace(/백화점$/, '').trim() || brand;
}

const SIZE_PX: Record<'sm' | 'md' | 'lg', number> = {
  sm: 20,
  md: 28,
  lg: 40,
};

export interface DeptMarkProps {
  /** 영문 dept 키('lotte') 또는 DB 한글 풀네임('롯데백화점') 둘 다 허용. */
  dept: Department | string;
  /** 프리셋 sm/md/lg 또는 픽셀 수치 직접 지정. */
  size?: 'sm' | 'md' | 'lg' | number;
  className?: string;
}

export function DeptMark({ dept, size = 'md', className }: DeptMarkProps) {
  const dim = typeof size === 'number' ? size : SIZE_PX[size];
  const resolved = brandToDept(dept);
  const label = resolved ? DEPARTMENT_LABEL[resolved] : dept || '백화점';

  if (!resolved) {
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
        src={`/department-marks/${resolved}.webp`}
        alt={label}
        width={dim}
        height={dim}
        className="object-contain"
      />
    </span>
  );
}
