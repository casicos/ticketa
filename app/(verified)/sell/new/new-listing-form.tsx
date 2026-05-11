'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitListingSchema } from '@/lib/domain/schemas/listing';
import { submitListingAndRedirect } from '../actions';

export type SkuOption = {
  id: string;
  brand: string;
  denomination: number;
  display_name: string;
  thumbnail_url?: string | null;
};

type FormValues = z.input<typeof submitListingSchema>;

export function NewListingForm({
  skus,
  onSkuChange,
}: {
  skus: SkuOption[];
  onSkuChange?: (sku: SkuOption | null) => void;
}) {
  const [submitting, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [brand, setBrand] = useState<string>('');

  const brands = useMemo(() => {
    const set = new Set<string>();
    for (const s of skus) set.add(s.brand);
    return Array.from(set);
  }, [skus]);

  const filteredSkus = useMemo(
    () => (brand ? skus.filter((s) => s.brand === brand) : []),
    [skus, brand],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(submitListingSchema),
    defaultValues: {
      sku_id: '',
      quantity: 1,
      unit_price: 1000,
      pre_verified: false,
    },
    mode: 'onTouched',
  });

  const errors = form.formState.errors;
  const [selectedSkuId, setSelectedSkuId] = useState<string>('');

  const selectedSku = useMemo(
    () => skus.find((s) => s.id === selectedSkuId) ?? null,
    [skus, selectedSkuId],
  );

  useEffect(() => {
    onSkuChange?.(selectedSku);
  }, [selectedSku, onSkuChange]);

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('sku_id', values.sku_id);
      fd.set('quantity', String(values.quantity));
      fd.set('unit_price', String(values.unit_price));
      if (values.pre_verified) fd.set('pre_verified', 'on');

      const result = await submitListingAndRedirect(fd);
      // 성공 시 Server Action 내부에서 redirect. 여기 도달하면 실패.
      if (result && !result.ok) {
        const msg = result.message ?? '판매 등록에 실패했습니다';
        setServerError(msg);
        toast.error(msg);
      } else if (result && result.ok) {
        toast.success('판매 등록 완료');
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {/* 브랜드 */}
      <div className="space-y-1.5">
        <Label htmlFor="brand">브랜드</Label>
        <select
          id="brand"
          className={selectClass}
          value={brand}
          onChange={(e) => {
            setBrand(e.target.value);
            form.setValue('sku_id', '', { shouldValidate: false });
            setSelectedSkuId('');
          }}
          disabled={skus.length === 0}
        >
          <option value="">브랜드를 선택하세요</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        {skus.length === 0 && (
          <p className="text-muted-foreground text-xs">
            현재 등록 가능한 상품이 없습니다. 관리자에게 문의해주세요.
          </p>
        )}
      </div>

      {/* 액면가 (SKU) */}
      <div className="space-y-1.5">
        <Label htmlFor="sku_id">액면가</Label>
        <select
          id="sku_id"
          className={selectClass}
          aria-invalid={!!errors.sku_id}
          disabled={!brand}
          {...form.register('sku_id', {
            onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSkuId(e.target.value),
          })}
        >
          <option value="">{brand ? '액면가를 선택하세요' : '먼저 브랜드를 선택하세요'}</option>
          {filteredSkus.map((s) => (
            <option key={s.id} value={s.id}>
              {s.denomination.toLocaleString('ko-KR')}원권
            </option>
          ))}
        </select>
        {errors.sku_id && <p className="text-destructive text-xs">{errors.sku_id.message}</p>}
      </div>

      {/* 수량 */}
      <div className="space-y-1.5">
        <Label htmlFor="quantity">수량</Label>
        <Input
          id="quantity"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          aria-invalid={!!errors.quantity}
          {...form.register('quantity')}
        />
        {errors.quantity && <p className="text-destructive text-xs">{errors.quantity.message}</p>}
      </div>

      {/* 장당 희망 판매가 */}
      <div className="space-y-1.5">
        <Label htmlFor="unit_price">장당 희망 판매가 (원)</Label>
        <Input
          id="unit_price"
          type="number"
          inputMode="numeric"
          min={1000}
          step={100}
          aria-invalid={!!errors.unit_price}
          {...form.register('unit_price')}
        />
        <p className="text-muted-foreground text-xs">1,000원 이상. 수수료는 별도로 차감됩니다.</p>
        {errors.unit_price && (
          <p className="text-destructive text-xs">{errors.unit_price.message}</p>
        )}
      </div>

      {/* 사전 송부 옵션 */}
      <div className="border-border bg-warm-50 rounded-[10px] border p-3.5">
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            className="accent-ticketa-blue-500 mt-0.5 size-4 cursor-pointer"
            {...form.register('pre_verified')}
          />
          <span className="text-[14px] leading-[1.55]">
            <span className="text-foreground font-bold">사전 송부 (검수 후 인증 노출)</span>
            <span className="text-muted-foreground mt-0.5 block">
              체크 시 어드민 검수가 끝나야 카탈로그에 노출돼요. 매입되면 검수 단계가 생략돼서
              구매자에게 빠르게 발송돼요.
            </span>
          </span>
        </label>
      </div>

      {serverError && (
        <p className="text-destructive text-sm" role="alert">
          {serverError}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? '등록 중...' : '판매 등록'}
      </Button>

      <p className="text-muted-foreground text-xs">
        정산 계좌는 마일리지 출금 시 등록합니다. 등록 후 실물 상품권을 어드민 주소로 보내주시면
        수령·검수 뒤 자동으로 판매중 상태로 전환됩니다.
      </p>
    </form>
  );
}

const selectClass =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30';
