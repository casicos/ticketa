import { z } from 'zod';

const commissionFields = {
  commission_type: z.enum(['fixed', 'percent']).default('fixed'),
  commission_amount: z.coerce
    .number()
    .int('정수 값이어야 합니다')
    .min(0, '0 이상이어야 합니다')
    .max(1_000_000, '너무 큰 값입니다'),
  commission_charged_to: z.enum(['seller', 'buyer', 'both']).default('seller'),
};

export const skuCreateSchema = z.object({
  brand: z.string().min(1, '브랜드를 입력해주세요').max(40, '40자 이내로 입력해주세요'),
  denomination: z.coerce
    .number()
    .int('정수 값이어야 합니다')
    .min(1000, '최소 1,000원 이상이어야 합니다')
    .max(10_000_000, '최대 10,000,000원 이하이어야 합니다')
    .refine((v) => v % 1000 === 0, '1,000원 단위로 입력해주세요'),
  display_order: z.coerce
    .number()
    .int('정수 값이어야 합니다')
    .min(0, '0 이상이어야 합니다')
    .max(10_000, '10,000 이하이어야 합니다')
    .default(0),
  ...commissionFields,
});

export const skuUpdateSchema = skuCreateSchema.partial().extend({
  id: z.string().uuid('유효하지 않은 ID 입니다'),
});

export const skuToggleSchema = z.object({
  id: z.string().uuid('유효하지 않은 ID 입니다'),
  is_active: z.coerce.boolean(),
});

export type SkuCreate = z.infer<typeof skuCreateSchema>;
export type SkuUpdate = z.infer<typeof skuUpdateSchema>;
export type SkuToggle = z.infer<typeof skuToggleSchema>;
