import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/guards';
import { DesktopCatalog } from '@/components/catalog/desktop-catalog';
import { MobileCatalog } from '@/components/catalog/mobile-catalog';
import type { ListingCardData } from '@/components/catalog/listing-card';

type CatalogSort = 'recent' | 'price-asc' | 'qty-desc';

type CatalogRow = {
  id: string;
  unit_price: number;
  quantity_offered: number;
  quantity_remaining: number;
  submitted_at: string;
  seller_id: string;
  pre_verified: boolean;
  verified_at: string | null;
  sku: {
    id: string;
    brand: string;
    denomination: number;
    display_name: string;
    thumbnail_url: string | null;
  } | null;
  seller: { store_name: string | null } | null;
};

function parseSearchParams(params: Record<string, string | string[] | undefined>): {
  q: string;
  brand: string;
  min: number | null;
  max: number | null;
  sort: CatalogSort;
} {
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const brand = typeof params.brand === 'string' ? params.brand.trim() : '';
  const min = typeof params.min === 'string' ? Number(params.min) || null : null;
  const max = typeof params.max === 'string' ? Number(params.max) || null : null;
  const rawSort = typeof params.sort === 'string' ? params.sort : 'recent';
  const sort: CatalogSort = rawSort === 'price-asc' || rawSort === 'qty-desc' ? rawSort : 'recent';
  return { q, brand, min, max, sort };
}

function escapeLikePattern(s: string): string {
  return s.replace(/[%_\\]/g, '\\$&');
}

function buildHref(
  base: { q: string; brand: string; min: number | null; max: number | null; sort: CatalogSort },
  override: Partial<{ brand: string }>,
): string {
  const merged = { ...base, ...override };
  const params = new URLSearchParams();
  if (merged.q) params.set('q', merged.q);
  if (merged.brand) params.set('brand', merged.brand);
  if (merged.min !== null) params.set('min', String(merged.min));
  if (merged.max !== null) params.set('max', String(merged.max));
  if (merged.sort !== 'recent') params.set('sort', merged.sort);
  const qs = params.toString();
  return qs ? `/catalog?${qs}` : '/catalog';
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = parseSearchParams(params);
  const { q, brand, min, max, sort } = parsed;

  const supabase = await createSupabaseServerClient();

  const [current, { data: listingsRaw, error: listingsError }] = await Promise.all([
    getCurrentUser(),
    supabase
      .from('listing')
      .select(
        'id, unit_price, quantity_offered, quantity_remaining, submitted_at, seller_id, pre_verified, verified_at, sku:sku_id(id, brand, denomination, display_name, thumbnail_url), seller:seller_id(store_name)',
      )
      .eq('status', 'submitted')
      .is('parent_listing_id', null)
      .gt('quantity_remaining', 0)
      // pre_verified 매물은 검수가 끝나야(verified_at 세팅) 카탈로그 노출
      .or('pre_verified.eq.false,verified_at.not.is.null'),
  ]);
  if (listingsError) throw listingsError;

  // 모든 phone_verified 사용자가 직접 매입 가능 (P2P + 에이전트 매물 공통)
  const canBuy = !!current && (current.profile?.phone_verified ?? false);

  let listings = ((listingsRaw ?? []) as unknown as CatalogRow[]).filter((r) => r.sku !== null);

  if (q) {
    const needle = escapeLikePattern(q).toLowerCase();
    listings = listings.filter(
      (r) =>
        r.sku!.brand.toLowerCase().includes(needle) ||
        r.sku!.display_name.toLowerCase().includes(needle),
    );
  }
  // URL 의 brand 는 영문 키('ak', 'lotte', ...) — DB 의 sku.brand 는 한글 풀네임("AK백화점") 이라
  // 직접 비교하면 항상 매치 안 됨. 매핑 후 비교.
  const DEPT_TO_BRAND: Record<string, string> = {
    lotte: '롯데백화점',
    hyundai: '현대백화점',
    shinsegae: '신세계백화점',
    galleria: '갤러리아백화점',
    ak: 'AK백화점',
  };
  if (brand) {
    const target = DEPT_TO_BRAND[brand] ?? brand;
    listings = listings.filter((r) => r.sku!.brand === target);
  }
  if (min !== null) listings = listings.filter((r) => r.sku!.denomination >= min);
  if (max !== null) listings = listings.filter((r) => r.sku!.denomination <= max);

  listings.sort((a, b) => {
    if (sort === 'price-asc') {
      if (a.unit_price !== b.unit_price) return a.unit_price - b.unit_price;
      return a.submitted_at.localeCompare(b.submitted_at);
    }
    if (sort === 'qty-desc') {
      if (a.quantity_remaining !== b.quantity_remaining)
        return b.quantity_remaining - a.quantity_remaining;
      return b.submitted_at.localeCompare(a.submitted_at);
    }
    return b.submitted_at.localeCompare(a.submitted_at);
  });

  const cardData: ListingCardData[] = listings.map((r) => ({
    id: r.id,
    unit_price: r.unit_price,
    quantity_offered: r.quantity_remaining,
    submitted_at: r.submitted_at,
    seller_id: r.seller_id,
    pre_verified: r.pre_verified,
    verified_at: r.verified_at,
    store_name: r.seller?.store_name ?? null,
    sku: {
      brand: r.sku!.brand,
      denomination: r.sku!.denomination,
      thumbnail_url: r.sku!.thumbnail_url,
    },
  }));

  const buildBrandHref = (b: string) => buildHref(parsed, { brand: b });

  return (
    <>
      <MobileCatalog
        className="md:hidden"
        listings={cardData}
        parsed={{ q, brand }}
        buildBrandHref={buildBrandHref}
      />
      <DesktopCatalog
        className="hidden md:block"
        listings={cardData}
        parsed={{ q, brand, sort }}
        buildBrandHref={buildBrandHref}
        canBuy={canBuy}
      />
    </>
  );
}
