'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';
import { NewListingForm, type SkuOption } from '@/app/(verified)/sell/new/new-listing-form';

const DEPT_LABELS: Record<string, string> = {
  lotte: '롯데',
  hyundai: '현대',
  shinsegae: '신세계',
  galleria: '갤러리아',
  ak: 'AK',
};
const DEPT_KEYS = ['lotte', 'hyundai', 'shinsegae', 'galleria', 'ak'] as const;

export interface MobileSellNewProps {
  skus: SkuOption[];
  className?: string;
}

export function MobileSellNew({ skus, className }: MobileSellNewProps) {
  const [selectedSku, setSelectedSku] = useState<SkuOption | null>(null);

  return (
    <div className={cn('md:hidden', className)}>
      {/* Step bar */}
      <div className="flex gap-1 px-4 pt-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-sm"
            style={{
              background: i === 1 ? 'var(--ticketa-blue-500)' : 'var(--warm-200)',
            }}
          />
        ))}
      </div>

      <div className="px-4 pt-3 pb-2">
        <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">상품권 정보</h2>
        <p className="text-muted-foreground mt-0.5 text-[14px]">
          검수 통과 후 즉시 판매 등록 · 평균 12분
        </p>
      </div>

      {/* Department picker visual */}
      <div className="px-4 pb-3">
        <label className="mb-2 block text-[14px] font-bold">
          백화점 <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {DEPT_KEYS.map((d) => (
            <div
              key={d}
              className="border-border flex flex-col items-center gap-1 rounded-[10px] border bg-white p-2.5"
            >
              <DeptMark dept={d as Department} size={22} />
              <span className="text-[13px] font-bold">{DEPT_LABELS[d]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Live preview card */}
      <div
        className="relative mx-4 mb-3.5 overflow-hidden rounded-xl text-white"
        style={{ background: 'linear-gradient(135deg, #11161E 0%, #2A3341 100%)' }}
      >
        {selectedSku?.thumbnail_url && (
          <div className="relative w-full" style={{ aspectRatio: '2.4 / 1' }}>
            <Image
              src={selectedSku.thumbnail_url}
              alt={selectedSku.display_name}
              fill
              sizes="100vw"
              className="object-contain p-1 opacity-80"
            />
          </div>
        )}
        <div className="p-3.5">
          <div
            className="pointer-events-none absolute right-[-30px] bottom-[-30px] size-[120px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(212,162,76,0.22), transparent 70%)',
            }}
          />
          <div className="text-ticketa-gold-500 text-[13px] font-bold tracking-[0.08em] uppercase">
            미리보기
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DeptMark dept={(selectedSku?.brand ?? 'lotte') as Department} size={28} />
              <div>
                <div className="text-[14px] text-white/60">
                  {selectedSku
                    ? `${selectedSku.brand} ${selectedSku.denomination.toLocaleString('ko-KR')}원권`
                    : '롯데 100,000원권'}
                </div>
              </div>
            </div>
            <span
              className="text-ticketa-gold-500 rounded-full px-2 py-0.5 text-[14px] font-bold"
              style={{ background: 'rgba(212,162,76,0.18)' }}
            >
              ~6분 매칭
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="px-4 pb-24">
        <NewListingForm skus={skus} onSkuChange={setSelectedSku} />
        <div className="text-muted-foreground mt-3 text-center text-[14px]">
          판매 성사 시 수수료 2.5% · 정산 출금 1,000원
        </div>
      </div>
    </div>
  );
}
