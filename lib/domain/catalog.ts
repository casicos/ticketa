/**
 * catalog 도메인 헬퍼.
 * 공개 카탈로그 조회용 2-step 쿼리 (sku + listing 집계 후 JS merge).
 * 참조: .omc/plans/b2c-giftcard-broker-mvp.md Section 7.2 Phase 3 step 24-26
 *
 * ESLint boundaries: lib/supabase/admin.ts, transaction.ts import 금지.
 * createSupabaseServerClient (anon SSR) 만 사용.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CatalogSort = 'popular' | 'price-asc' | 'stock-desc';

export type CatalogFilter = {
  q?: string;
  brands?: string[];
  minDenom?: number;
  maxDenom?: number;
  sort?: CatalogSort;
};

export type CatalogSku = {
  id: string;
  brand: string;
  denomination: number;
  display_name: string;
  display_order: number;
  /** 최저 판매가 (listed 매물 없으면 null) */
  min_price: number | null;
  /** 전체 잔여 재고 (listed 매물 없으면 0) */
  total_stock: number;
};

// ---------------------------------------------------------------------------
// Step 1: SKU 조회 (active + 필터)
// ---------------------------------------------------------------------------

/**
 * PostgREST ilike 패턴에서 사용되는 특수 문자를 escape.
 * `%`, `_`, `\` 세 가지가 와일드카드/이스케이프이므로, 사용자 입력을 그대로
 * `%...%` 안에 박으면 예기치 않은 매칭이 발생 가능.
 */
function escapeLikePattern(s: string): string {
  return s.replace(/[%_\\]/g, '\\$&');
}

async function fetchSkus(
  supabase: SupabaseClient,
  filter: CatalogFilter,
): Promise<
  { id: string; brand: string; denomination: number; display_name: string; display_order: number }[]
> {
  let query = supabase
    .from('sku')
    .select('id,brand,denomination,display_name,display_order')
    .eq('is_active', true);

  if (filter.q) {
    query = query.ilike('brand', `%${escapeLikePattern(filter.q)}%`);
  }

  if (filter.brands && filter.brands.length > 0) {
    query = query.in('brand', filter.brands);
  }

  if (filter.minDenom !== undefined) {
    query = query.gte('denomination', filter.minDenom);
  }

  if (filter.maxDenom !== undefined) {
    query = query.lte('denomination', filter.maxDenom);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Step 2: listing 집계 (status=listed, sku_id IN [...])
// ---------------------------------------------------------------------------

type ListingAgg = {
  sku_id: string;
  min_price: number;
  total_stock: number;
};

async function fetchListingAgg(supabase: SupabaseClient, skuIds: string[]): Promise<ListingAgg[]> {
  if (skuIds.length === 0) return [];

  // Supabase JS client 로는 GROUP BY 집계를 직접 표현할 수 없으므로
  // listed 매물 전체를 가져온 뒤 JS 에서 집계한다.
  // SKU 100 × listing 수천 규모에서 쿼리 2회, 네트워크 한 번으로 충분하다.
  const { data, error } = await supabase
    .from('listing')
    .select('sku_id,unit_price,quantity_remaining')
    .eq('status', 'listed')
    .in('sku_id', skuIds);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // JS 집계
  const map = new Map<string, ListingAgg>();
  for (const row of data) {
    const existing = map.get(row.sku_id);
    if (!existing) {
      map.set(row.sku_id, {
        sku_id: row.sku_id,
        min_price: row.unit_price,
        total_stock: row.quantity_remaining,
      });
    } else {
      existing.min_price = Math.min(existing.min_price, row.unit_price);
      existing.total_stock += row.quantity_remaining;
    }
  }
  return Array.from(map.values());
}

// ---------------------------------------------------------------------------
// Public: fetchCatalog
// ---------------------------------------------------------------------------

export async function fetchCatalog(
  supabase: SupabaseClient,
  filter: CatalogFilter,
): Promise<CatalogSku[]> {
  const skus = await fetchSkus(supabase, filter);
  if (skus.length === 0) return [];

  const skuIds = skus.map((s) => s.id);
  const agg = await fetchListingAgg(supabase, skuIds);

  // merge
  const aggMap = new Map(agg.map((a) => [a.sku_id, a]));
  const merged: CatalogSku[] = skus.map((s) => {
    const a = aggMap.get(s.id);
    return {
      ...s,
      min_price: a?.min_price ?? null,
      total_stock: a?.total_stock ?? 0,
    };
  });

  // 정렬
  const sort = filter.sort ?? 'popular';
  if (sort === 'popular') {
    merged.sort((a, b) => {
      if (b.display_order !== a.display_order) return b.display_order - a.display_order;
      return a.denomination - b.denomination;
    });
  } else if (sort === 'price-asc') {
    merged.sort((a, b) => {
      // null last
      if (a.min_price === null && b.min_price === null) return a.denomination - b.denomination;
      if (a.min_price === null) return 1;
      if (b.min_price === null) return -1;
      if (a.min_price !== b.min_price) return a.min_price - b.min_price;
      return a.denomination - b.denomination;
    });
  } else {
    // stock-desc
    merged.sort((a, b) => b.total_stock - a.total_stock);
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Public: fetchDistinctBrands — 필터 사이드바용
// ---------------------------------------------------------------------------

export async function fetchDistinctBrands(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from('sku')
    .select('brand')
    .eq('is_active', true)
    .order('brand');
  if (error) throw error;
  const brands = [...new Set((data ?? []).map((r) => r.brand as string))];
  return brands;
}
