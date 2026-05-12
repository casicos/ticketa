'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { submitListingSchema } from '@/lib/domain/schemas/listing';
import { formatDenomination } from '@/lib/format';
import {
  calculateCommissionTotal,
  calculateSellerNet,
  type CommissionConfig,
} from '@/lib/domain/pricing';
import {
  brandShortLabel,
  DEPARTMENT_LABEL,
  DeptMark,
  type Department,
} from '@/components/ticketa/dept-mark';
import { submitListingAndRedirect } from '../actions';

export type SkuOption = {
  id: string;
  brand: string;
  denomination: number;
  display_name: string;
  thumbnail_url?: string | null;
  commission_type: 'fixed' | 'percent';
  commission_amount: number;
  commission_charged_to: 'seller' | 'buyer' | 'both';
};

type FormValues = z.input<typeof submitListingSchema>;

const DEPT_KEYS: Department[] = ['lotte', 'hyundai', 'shinsegae', 'galleria', 'ak'];

/** brand 한글 풀네임 ↔ Department 키 양방향 변환. */
function deptKeyToBrand(key: Department, skus: SkuOption[]): string | null {
  // 매핑 키와 매칭되는 첫 SKU 의 brand 문자열을 그대로 사용. (DB 가 source of truth)
  const match = skus.find((s) => {
    const short = brandShortLabel(s.brand).toLowerCase();
    return short === DEPARTMENT_LABEL[key].toLowerCase();
  });
  return match?.brand ?? null;
}

function formatPriceInput(raw: string): { display: string; numeric: number } {
  const digits = raw.replace(/[^\d]/g, '').slice(0, 8);
  const numeric = digits === '' ? 0 : Number(digits);
  const display = numeric === 0 ? '' : numeric.toLocaleString('ko-KR');
  return { display, numeric };
}

export function NewListingForm({
  skus,
  onSkuChange,
}: {
  skus: SkuOption[];
  onSkuChange?: (sku: SkuOption | null) => void;
}) {
  const [submitting, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(submitListingSchema),
    defaultValues: {
      sku_id: '',
      quantity: 1,
      unit_price: 0,
      pre_verified: false,
    },
    mode: 'onTouched',
  });
  const errors = form.formState.errors;

  const [selectedBrand, setSelectedBrand] = useState<string>(''); // DB 한글 풀네임 ('롯데백화점')
  const [selectedSkuId, setSelectedSkuId] = useState<string>('');
  const [priceText, setPriceText] = useState<string>('');

  const filteredSkus = useMemo(
    () =>
      selectedBrand
        ? [...skus.filter((s) => s.brand === selectedBrand)].sort(
            (a, b) => a.denomination - b.denomination,
          )
        : [],
    [skus, selectedBrand],
  );

  const selectedSku = useMemo(
    () => skus.find((s) => s.id === selectedSkuId) ?? null,
    [skus, selectedSkuId],
  );

  useEffect(() => {
    onSkuChange?.(selectedSku);
  }, [selectedSku, onSkuChange]);

  const quantity = Number(form.watch('quantity')) || 0;
  const unitPrice = Number(form.watch('unit_price')) || 0;
  const preVerified = !!form.watch('pre_verified');

  // 라이브 정산 계산
  const { commission, sellerNet, gross } = useMemo(() => {
    if (!selectedSku || quantity <= 0 || unitPrice <= 0) {
      return { commission: 0, sellerNet: 0, gross: 0 };
    }
    const config: CommissionConfig = {
      type: selectedSku.commission_type,
      amount: selectedSku.commission_amount,
      charged_to: selectedSku.commission_charged_to,
    };
    const gross = quantity * unitPrice;
    const commission = calculateCommissionTotal(quantity, unitPrice, config);
    const sellerNet = calculateSellerNet(gross, commission, config.charged_to);
    return { commission, sellerNet, gross };
  }, [selectedSku, quantity, unitPrice]);

  // 추천가 = 액면가의 96/97/98% (100원 단위 반올림).
  // 낮은 액면가에서는 반올림 결과가 겹칠 수 있어 중복 제거.
  const recommendedPrices = useMemo(() => {
    if (!selectedSku) return [] as { label: string; value: number }[];
    const face = selectedSku.denomination;
    const seen = new Set<number>();
    const list: { label: string; value: number }[] = [];
    for (const pct of [96, 97, 98]) {
      const value = Math.round((face * pct) / 100 / 100) * 100;
      if (seen.has(value)) continue;
      seen.add(value);
      list.push({ label: `${pct}% · ${value.toLocaleString('ko-KR')}원`, value });
    }
    return list;
  }, [selectedSku]);

  const handlePickBrand = (key: Department) => {
    const brand = deptKeyToBrand(key, skus);
    if (!brand) return;
    setSelectedBrand(brand);
    form.setValue('sku_id', '', { shouldValidate: false });
    setSelectedSkuId('');
  };

  const handlePickSku = (sku: SkuOption) => {
    setSelectedSkuId(sku.id);
    form.setValue('sku_id', sku.id, { shouldValidate: true });
    // 액면가 선택 시 추천 후보 중 가장 낮은 가격(96%)을 항상 자동 채움.
    const lowest = Math.round((sku.denomination * 96) / 100 / 100) * 100;
    form.setValue('unit_price', lowest, { shouldValidate: true });
    setPriceText(lowest.toLocaleString('ko-KR'));
  };

  const handleQtyDelta = (delta: number) => {
    const next = Math.max(1, Math.min(10_000, quantity + delta));
    form.setValue('quantity', next, { shouldValidate: true });
  };

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('sku_id', values.sku_id);
      fd.set('quantity', String(values.quantity));
      fd.set('unit_price', String(values.unit_price));
      if (values.pre_verified) fd.set('pre_verified', 'on');

      const result = await submitListingAndRedirect(fd);
      // 성공 시 redirect 내부에서 throw → 여기 도달은 실패만.
      if (result && !result.ok) {
        const msg = result.message ?? '판매 등록에 실패했습니다';
        setServerError(msg);
        toast.error(msg);
      } else if (result && result.ok) {
        toast.success('판매 등록 완료');
      }
    });
  });

  const canSubmit = !!selectedSku && quantity >= 1 && unitPrice >= 1000;

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {/* 1. 백화점 */}
      <section className="space-y-2.5">
        <Label className="text-[15px] font-bold">
          백화점 <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-5 gap-2">
          {DEPT_KEYS.map((key) => {
            const brand = deptKeyToBrand(key, skus);
            const disabled = !brand;
            const active = !!brand && brand === selectedBrand;
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => handlePickBrand(key)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-[12px] border p-3.5 transition-colors',
                  active
                    ? 'border-ticketa-blue-500 bg-ticketa-blue-50'
                    : 'border-border hover:border-ticketa-blue-300 bg-white',
                  disabled && 'cursor-not-allowed opacity-40',
                )}
              >
                <DeptMark dept={key} size={32} />
                <span className="text-[14px] font-bold">{DEPARTMENT_LABEL[key]}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. 액면가 */}
      <section className="space-y-2.5">
        <Label className="text-[15px] font-bold">
          액면가 <span className="text-destructive">*</span>
        </Label>
        {!selectedBrand ? (
          <p className="border-border text-muted-foreground rounded-[10px] border border-dashed bg-white px-3 py-3 text-[14px]">
            먼저 백화점을 선택해주세요.
          </p>
        ) : filteredSkus.length === 0 ? (
          <p className="border-border text-muted-foreground rounded-[10px] border border-dashed bg-white px-3 py-3 text-[14px]">
            해당 백화점에 등록 가능한 상품권이 없습니다.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {filteredSkus.map((s) => {
              const active = s.id === selectedSkuId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handlePickSku(s)}
                  className={cn(
                    'rounded-[10px] border px-2 py-3 text-center transition-colors',
                    active
                      ? 'border-ticketa-blue-500 bg-ticketa-blue-50'
                      : 'border-border hover:border-ticketa-blue-300 bg-white',
                  )}
                >
                  <div className="text-[15px] font-extrabold tabular-nums">
                    {formatDenomination(s.denomination)}
                  </div>
                  <div className="text-muted-foreground text-[12px]">권</div>
                </button>
              );
            })}
          </div>
        )}
        {errors.sku_id && <p className="text-destructive text-[13px]">{errors.sku_id.message}</p>}
      </section>

      {/* 3. 수량 */}
      <section className="space-y-2.5">
        <Label htmlFor="quantity" className="text-[15px] font-bold">
          수량
        </Label>
        <div className="flex items-stretch gap-2">
          <button
            type="button"
            onClick={() => handleQtyDelta(-1)}
            disabled={quantity <= 1}
            className="border-border hover:bg-warm-50 flex h-12 w-12 items-center justify-center rounded-[10px] border bg-white text-[20px] font-bold transition-colors disabled:opacity-40"
            aria-label="수량 1 감소"
          >
            −
          </button>
          <input
            id="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={10000}
            step={1}
            aria-invalid={!!errors.quantity}
            {...form.register('quantity', { valueAsNumber: true })}
            className="border-border focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-12 flex-1 rounded-[10px] border bg-white px-3 text-center text-[18px] font-bold tabular-nums transition-colors outline-none focus-visible:ring-3"
          />
          <button
            type="button"
            onClick={() => handleQtyDelta(1)}
            disabled={quantity >= 10000}
            className="border-border hover:bg-warm-50 flex h-12 w-12 items-center justify-center rounded-[10px] border bg-white text-[20px] font-bold transition-colors disabled:opacity-40"
            aria-label="수량 1 증가"
          >
            +
          </button>
        </div>
        {errors.quantity && (
          <p className="text-destructive text-[13px]">{errors.quantity.message}</p>
        )}
      </section>

      {/* 4. 장당 희망가 */}
      <section className="space-y-2.5">
        <Label htmlFor="unit_price" className="text-[15px] font-bold">
          장당 희망 판매가
        </Label>
        <div className="relative">
          <input
            id="unit_price"
            type="text"
            inputMode="numeric"
            aria-invalid={!!errors.unit_price}
            value={priceText}
            onChange={(e) => {
              const { display, numeric } = formatPriceInput(e.target.value);
              setPriceText(display);
              form.setValue('unit_price', numeric, { shouldValidate: true });
            }}
            placeholder={
              selectedSku
                ? `${selectedSku.denomination.toLocaleString('ko-KR')} 이하 입력`
                : '액면가를 먼저 선택'
            }
            className="border-border focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-12 w-full rounded-[10px] border bg-white pr-10 pl-3 text-right text-[18px] font-bold tabular-nums transition-colors outline-none focus-visible:ring-3"
          />
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[15px] font-bold">
            원
          </span>
        </div>
        {recommendedPrices.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recommendedPrices.map((p) => {
              const active = p.value === unitPrice;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    form.setValue('unit_price', p.value, { shouldValidate: true });
                    setPriceText(p.value.toLocaleString('ko-KR'));
                  }}
                  className={cn(
                    'rounded-full border px-3 py-1 text-[13px] font-bold tabular-nums transition-colors',
                    active
                      ? 'border-ticketa-blue-500 bg-ticketa-blue-50 text-ticketa-blue-700'
                      : 'border-border hover:border-ticketa-blue-300 bg-white',
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        )}
        {errors.unit_price && (
          <p className="text-destructive text-[13px]">{errors.unit_price.message}</p>
        )}
        <p className="text-muted-foreground text-[13px]">
          1,000원 이상. 액면가 이하로 책정해야 매물 등록이 가능해요.
        </p>
      </section>

      {/* 5. 사전 송부 */}
      <section className="border-border bg-warm-50 rounded-[12px] border p-3.5">
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            className="accent-ticketa-blue-500 mt-0.5 size-4 cursor-pointer"
            checked={preVerified}
            onChange={(e) => form.setValue('pre_verified', e.target.checked)}
          />
          <span className="text-[14px] leading-[1.55]">
            <span className="text-foreground font-bold">사전 송부 (검수 후 인증 노출)</span>
            <span className="text-muted-foreground mt-0.5 block">
              체크하면 어드민 검수가 끝나야 카탈로그에 노출돼요. 매입되면 검수 단계가 생략되어
              구매자에게 빠르게 발송돼요.
            </span>
          </span>
        </label>
      </section>

      {/* 6. 라이브 정산 요약 */}
      {selectedSku && quantity > 0 && unitPrice >= 1000 && (
        <section className="border-ticketa-blue-200 bg-ticketa-blue-50 rounded-[12px] border p-4">
          <div className="text-ticketa-blue-700 mb-2 text-[14px] font-extrabold tracking-[0.05em] uppercase">
            예상 정산
          </div>
          <dl className="space-y-1.5 text-[15px]">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">판매 총액</dt>
              <dd className="font-bold tabular-nums">{gross.toLocaleString('ko-KR')}원</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">수수료</dt>
              <dd className="font-bold tabular-nums">- {commission.toLocaleString('ko-KR')}원</dd>
            </div>
            <div className="border-ticketa-blue-200 mt-2 flex items-center justify-between border-t pt-2">
              <dt className="text-ticketa-blue-700 font-extrabold">내가 받는 마일리지</dt>
              <dd className="text-ticketa-blue-700 text-[18px] font-extrabold tabular-nums">
                {sellerNet.toLocaleString('ko-KR')}원
              </dd>
            </div>
          </dl>
        </section>
      )}

      {serverError && (
        <p className="text-destructive text-[14px]" role="alert">
          {serverError}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="h-12 w-full text-[16px]"
        disabled={submitting || !canSubmit}
      >
        {submitting ? '등록 중...' : '판매 등록'}
      </Button>

      <p className="text-muted-foreground text-[13px] leading-[1.55]">
        정산 계좌는 마일리지 출금 시 등록합니다. 등록 후 실물 상품권을 어드민 주소로 보내주시면
        수령·검수 뒤 자동으로 판매중 상태로 전환됩니다.
      </p>
    </form>
  );
}
