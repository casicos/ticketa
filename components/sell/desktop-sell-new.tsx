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

export interface DesktopSellNewProps {
  skus: SkuOption[];
  className?: string;
}

export function DesktopSellNew({ skus, className }: DesktopSellNewProps) {
  const [selectedSku, setSelectedSku] = useState<SkuOption | null>(null);

  return (
    <div className={cn('hidden md:block', className)}>
      <div className="mb-[22px]">
        <h1 className="text-[24px] font-bold tracking-[-0.022em]">매물 등록</h1>
        <p className="text-muted-foreground mt-1 text-[15px]">
          검수 통과 후 즉시 판매 등록됩니다. 평균 검수 시간 12분.
        </p>
      </div>

      <div className="grid grid-cols-[1.6fr_1fr] gap-4">
        {/* Form card */}
        <div className="surface-card p-6">
          {/* Step indicator */}
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="bg-ticketa-blue-500 flex size-[22px] items-center justify-center rounded-full text-[13px] font-extrabold text-white">
                1
              </span>
              <span className="text-[15px] font-bold">상품권 정보</span>
            </div>
            <div className="bg-border h-px flex-1" />
            <div className="flex items-center gap-2 opacity-50">
              <span className="bg-warm-200 text-warm-700 flex size-[22px] items-center justify-center rounded-full text-[13px] font-extrabold">
                2
              </span>
              <span className="text-[15px] font-semibold">카드 정보 입력</span>
            </div>
            <div className="bg-border h-px flex-1" />
            <div className="flex items-center gap-2 opacity-50">
              <span className="bg-warm-200 text-warm-700 flex size-[22px] items-center justify-center rounded-full text-[13px] font-extrabold">
                3
              </span>
              <span className="text-[15px] font-semibold">검수 대기</span>
            </div>
          </div>

          {/* Department picker visual */}
          <div className="mb-5">
            <label className="mb-2 block text-[15px] font-bold">
              백화점 선택 <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {DEPT_KEYS.map((d) => (
                <div
                  key={d}
                  className="border-border hover:border-ticketa-blue-300 hover:bg-ticketa-blue-50/50 flex cursor-pointer flex-col items-center gap-1.5 rounded-[10px] border bg-white p-3.5 transition-colors"
                >
                  <DeptMark dept={d as Department} size={28} />
                  <span className="text-[15px] font-bold">{DEPT_LABELS[d]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actual form with react-hook-form */}
          <NewListingForm skus={skus} onSkuChange={setSelectedSku} />
        </div>

        {/* Right column: live preview + checklist + fee */}
        <div className="flex flex-col gap-3">
          {/* Live preview card */}
          <div
            className="relative overflow-hidden rounded-[14px] text-white"
            style={{ background: 'linear-gradient(135deg, #11161E 0%, #2A3341 100%)' }}
          >
            {selectedSku?.thumbnail_url && (
              <div className="relative w-full" style={{ aspectRatio: '1.6 / 1' }}>
                <Image
                  src={selectedSku.thumbnail_url}
                  alt={selectedSku.display_name}
                  fill
                  sizes="(min-width: 1024px) 480px, 100vw"
                  className="object-contain p-1 opacity-80"
                />
              </div>
            )}
            <div className="p-[22px]">
              <div
                className="pointer-events-none absolute right-[-40px] bottom-[-40px] size-[180px] rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(212,162,76,0.25), transparent 70%)',
                }}
              />
              <div className="text-ticketa-gold-500 text-[13px] font-bold tracking-[0.08em] uppercase">
                실시간 미리보기
              </div>
              <div className="mt-3.5 flex items-center gap-2.5">
                <DeptMark dept={(selectedSku?.brand ?? 'lotte') as Department} size={36} />
                <div>
                  <div className="text-[15px] font-semibold text-white/60">
                    {selectedSku?.brand ?? '롯데백화점'}
                  </div>
                  <div className="text-[16px] font-extrabold tracking-[-0.018em]">
                    {selectedSku
                      ? `${selectedSku.denomination.toLocaleString('ko-KR')}원권`
                      : '100,000원권'}
                  </div>
                </div>
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <span
                  className="text-ticketa-gold-500 rounded-full px-2 py-0.5 text-[13px] font-bold"
                  style={{ background: 'rgba(212,162,76,0.18)' }}
                >
                  ~6분 매칭
                </span>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="surface-card p-[18px]">
            <div className="mb-3 text-[15px] font-extrabold tracking-[-0.012em]">등록 전 확인</div>
            <div className="flex flex-col gap-2.5 text-[15px]">
              {[
                { ok: true, l: '본인인증 완료' },
                { ok: true, l: '판매 한도 없음' },
                { ok: true, l: '평균 검수 시간 12분 (영업시간 09–22시)' },
                { ok: false, l: '카드 정보는 다음 단계에서 안전하게 입력합니다' },
              ].map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span
                    className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
                    style={{
                      background: c.ok ? 'var(--ticketa-blue-500)' : 'var(--warm-200)',
                      color: c.ok ? '#fff' : 'var(--warm-700)',
                    }}
                  >
                    {c.ok ? '✓' : 'i'}
                  </span>
                  <span
                    className={cn(
                      'leading-snug',
                      c.ok ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {c.l}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Fee notice */}
          <div className="border-ticketa-blue-200 bg-ticketa-blue-50 rounded-xl border p-3.5 text-[15px]">
            <div className="text-ticketa-blue-700 mb-1 font-bold">판매 수수료 안내</div>
            <div className="text-warm-700 leading-relaxed">
              판매 성사 시 거래액의 <b className="text-ticketa-blue-700">2.5%</b> + 정산 출금 시{' '}
              <b>1,000원</b>. 판매가 기준 예상 정산은 <b className="tabular-nums">83,825원</b>
              입니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
