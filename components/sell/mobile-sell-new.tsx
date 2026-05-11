'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { DeptMark, type Department, brandToDept } from '@/components/ticketa/dept-mark';
import { NewListingForm, type SkuOption } from '@/app/(verified)/sell/new/new-listing-form';

export interface MobileSellNewProps {
  skus: SkuOption[];
  className?: string;
}

export function MobileSellNew({ skus, className }: MobileSellNewProps) {
  const [selectedSku, setSelectedSku] = useState<SkuOption | null>(null);

  const dept: Department | null = useMemo(
    () => (selectedSku ? brandToDept(selectedSku.brand) : null),
    [selectedSku],
  );

  return (
    <div className={cn('md:hidden', className)}>
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">매물 등록</h1>
        <p className="text-muted-foreground mt-1 text-[14px]">
          판매가는 액면가 이하로. 검수 평균 12분.
        </p>
      </div>

      {selectedSku && (
        <div
          className="relative mx-4 mb-3.5 overflow-hidden rounded-xl text-white"
          style={{ background: 'linear-gradient(135deg, #11161E 0%, #2A3341 100%)' }}
        >
          {selectedSku.thumbnail_url && (
            <div className="px-3 pt-3">
              <div
                className="relative w-full overflow-hidden rounded-[12px] ring-1 ring-white/10"
                style={{ aspectRatio: '2.4 / 1' }}
              >
                <Image
                  src={selectedSku.thumbnail_url}
                  alt={selectedSku.display_name}
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
              </div>
            </div>
          )}
          <div className="p-3.5">
            <div
              className="pointer-events-none absolute right-[-30px] bottom-[-30px] size-[120px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(212,162,76,0.22), transparent 70%)',
              }}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {dept ? (
                  <DeptMark dept={dept} size={28} />
                ) : (
                  <div className="size-[28px] rounded-full bg-white/10" />
                )}
                <div>
                  <div className="text-[13px] text-white/60">{selectedSku.brand}</div>
                  <div className="text-[14px] font-extrabold tracking-[-0.018em]">
                    {selectedSku.denomination.toLocaleString('ko-KR')}원권
                  </div>
                </div>
              </div>
              <span
                className="text-ticketa-gold-500 rounded-full px-2 py-0.5 text-[13px] font-bold"
                style={{ background: 'rgba(212,162,76,0.18)' }}
              >
                미리보기
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="px-4 pb-24">
        <NewListingForm skus={skus} onSkuChange={setSelectedSku} />
        <div className="text-muted-foreground mt-4 text-center text-[13px] leading-[1.55]">
          등록 후 실물을 어드민 주소로 보내주세요. 수령·검수 완료 시 자동으로 판매중 전환.
        </div>
      </div>
    </div>
  );
}
