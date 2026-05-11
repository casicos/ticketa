import { z } from 'zod';

/**
 * 판매 등록 (listing 생성) 폼 입력.
 * 정산 계좌는 마일리지 출금 시 등록하므로 listing 생성 단계에선 받지 않는다.
 */
export const submitListingSchema = z.object({
  sku_id: z.string().uuid('SKU 를 선택해주세요'),
  quantity: z.coerce
    .number()
    .int('정수 수량을 입력해주세요')
    .min(1, '수량은 1 이상이어야 합니다')
    .max(10_000, '수량은 10,000 이하여야 합니다'),
  unit_price: z.coerce
    .number()
    .int('정수 금액을 입력해주세요')
    .min(1000, '장당 판매가는 1,000원 이상이어야 합니다')
    .max(10_000_000, '장당 판매가는 10,000,000원 이하여야 합니다'),
  pre_verified: z.coerce.boolean().optional().default(false),
});

export type SubmitListingInput = z.infer<typeof submitListingSchema>;
