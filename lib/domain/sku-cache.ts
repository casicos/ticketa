import 'server-only';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

/**
 * SKU 활성 목록을 unstable_cache 로 캐싱.
 *
 * - SKU 목록은 사용자별로 다르지 않은 글로벌 데이터 → 모든 요청이 동일 캐시 키 공유.
 * - RLS: SKU 테이블은 is_active=true 공개 SELECT 허용 (0013_listing_rls_mvp 정책).
 *   anon publishable 키로 충분. service_role 불필요.
 * - 무효화: 어드민 SKU CRUD (`createSku`, `updateSku`, `toggleSkuActive`) 가
 *   `updateTag('sku-active')` 호출 → Server Action 내부에서 read-your-own-writes 보장.
 *   (Next 16: `revalidateTag` 는 profile 인자 필수라 Server Action 권장 API 가 updateTag)
 * - revalidate 5분: 어드민 invalidation 누락 안전망 (5분 안에 자동 재로딩).
 *
 * 사용 위치:
 *   - app/(verified)/sell/new/page.tsx (매물 등록 폼의 SKU 선택지)
 *   - 향후 /catalog 도 마이그레이션 검토 — 현재 /catalog 는 filter 의존이라 별도 캐시 키 전략 필요.
 */
export type ActiveSkuRow = {
  id: string;
  brand: string;
  denomination: number;
  display_name: string;
  thumbnail_url: string | null;
  display_order: number;
  commission_type: 'fixed' | 'percent';
  commission_amount: number;
  commission_charged_to: 'seller' | 'buyer' | 'both';
};

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

export const getActiveSkus = unstable_cache(
  async (): Promise<ActiveSkuRow[]> => {
    const { data } = await anonClient()
      .from('sku')
      .select(
        'id, brand, denomination, display_name, thumbnail_url, display_order, commission_type, commission_amount, commission_charged_to',
      )
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('brand', { ascending: true })
      .order('denomination', { ascending: true });
    return (data ?? []) as ActiveSkuRow[];
  },
  ['sku-active'],
  { tags: ['sku-active'], revalidate: 300 },
);
