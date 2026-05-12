'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { DeptMark, type Department, brandToDept } from '@/components/ticketa/dept-mark';
import { NewListingForm, type SkuOption } from '@/app/(verified)/sell/new/new-listing-form';

export interface DesktopSellNewProps {
  skus: SkuOption[];
  className?: string;
}

export function DesktopSellNew({ skus, className }: DesktopSellNewProps) {
  const [selectedSku, setSelectedSku] = useState<SkuOption | null>(null);

  const dept: Department | null = useMemo(
    () => (selectedSku ? brandToDept(selectedSku.brand) : null),
    [selectedSku],
  );

  return (
    <div className={cn('hidden md:block', className)}>
      <div className="mb-[22px]">
        <h1 className="text-[26px] font-extrabold tracking-[-0.022em]">매물 등록</h1>
        <p className="text-muted-foreground mt-1 text-[15px]">
          판매가는 액면가 이하로. 등록 후 어드민 수령·검수가 끝나면 판매 가능 상태로 전환돼요.
        </p>
      </div>

      <div className="grid grid-cols-[1.5fr_1fr] gap-5">
        {/* Form card */}
        <div className="surface-card p-7">
          <NewListingForm skus={skus} onSkuChange={setSelectedSku} />
        </div>

        {/* Right column: live preview + checklist */}
        <div className="flex flex-col gap-3">
          {/* Live preview card */}
          <div
            className="relative overflow-hidden rounded-[14px] text-white"
            style={{ background: 'linear-gradient(135deg, #11161E 0%, #2A3341 100%)' }}
          >
            {selectedSku?.thumbnail_url && (
              <div className="px-4 pt-4">
                <div
                  className="relative w-full overflow-hidden rounded-[14px] ring-1 ring-white/10"
                  style={{ aspectRatio: '1.6 / 1' }}
                >
                  <Image
                    src={selectedSku.thumbnail_url}
                    alt={selectedSku.display_name}
                    fill
                    sizes="(min-width: 1024px) 480px, 100vw"
                    className="object-cover"
                  />
                </div>
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
                {dept ? (
                  <DeptMark dept={dept} size={36} />
                ) : (
                  <div className="border-warm-200/30 size-[36px] rounded-full border bg-white/10" />
                )}
                <div>
                  <div className="text-[14px] font-semibold text-white/60">
                    {selectedSku?.brand ?? '백화점을 선택하세요'}
                  </div>
                  <div className="text-[17px] font-extrabold tracking-[-0.018em]">
                    {selectedSku
                      ? `${selectedSku.denomination.toLocaleString('ko-KR')}원권`
                      : '액면가 미선택'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="surface-card p-[18px]">
            <div className="mb-3 text-[15px] font-extrabold tracking-[-0.012em]">등록 전 확인</div>
            <div className="flex flex-col gap-2.5 text-[14px]">
              {[
                { ok: true, l: '본인인증 완료' },
                { ok: true, l: '판매 한도 없음 (수량 10,000장)' },
                { ok: true, l: '평균 검수 시간 12분 (영업시간 09–22시)' },
                { ok: true, l: '판매가는 액면가 이하만 가능' },
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
                  <span className="text-foreground leading-snug">{c.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Process notice */}
          <div className="border-warm-200 bg-warm-50 rounded-xl border p-3.5 text-[14px] leading-[1.55]">
            <div className="text-foreground mb-1 font-bold">등록 후 흐름</div>
            <ol className="text-warm-700 list-inside list-decimal space-y-0.5">
              <li>매물이 시세 카탈로그에 노출돼요.</li>
              <li>매입자가 잡히면 실물 송부 안내를 받아요.</li>
              <li>어드민 수령·검수 완료 후 정산이 진행돼요.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
