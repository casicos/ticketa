import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BrandFilter } from './brand-filter';
import { DesktopListingCard, type ListingCardData } from './listing-card';
import { VerifiedBadge, StoreNameLabel, AnonSellerLabel } from './listing-badges';

export function DesktopCatalog({
  listings,
  parsed,
  buildBrandHref,
  canBuy,
  className = '',
}: {
  listings: ListingCardData[];
  parsed: { q: string; brand: string; sort: string };
  buildBrandHref: (brand: string) => string;
  canBuy: boolean;
  className?: string;
}) {
  const { q, brand, sort } = parsed;

  return (
    <div className={`mx-auto w-full px-8 py-8 ${className}`} style={{ maxWidth: 1180 }}>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="font-bold tracking-tight"
            style={{ fontSize: 28, letterSpacing: '-0.022em' }}
          >
            {canBuy ? '구매 가능 매물' : '지금 가장 저렴한 상품권'}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-[15px]">
            {canBuy
              ? '판매자가 등록한 매물을 구매하세요. 구매 확정 즉시 마일리지가 차감됩니다.'
              : '에이전트가 직접 검수한 매물만 보여드려요. 평균 검수 시간 12분.'}
          </p>
        </div>
        {/* 내 마일리지 패널은 /account/mileage 허브에서 보여줌 — 카탈로그 헤더에서는 제거 */}
      </header>

      <BrandFilter activeBrand={brand} buildHref={buildBrandHref} size="md" className="mb-4" />

      {/* Legend bar — 3 sections */}
      <div className="border-border mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <VerifiedBadge size="sm" />
          <span className="text-warm-700 text-[14px]">관리자 검수 완료 — 결제 즉시 발송</span>
        </div>
        <span className="bg-border h-4 w-px" />
        <div className="flex items-center gap-2">
          <StoreNameLabel name="공식 상점" size="sm" />
          <span className="text-warm-700 text-[14px]">에이전트 직영 매물</span>
        </div>
        <span className="bg-border h-4 w-px" />
        <div className="flex items-center gap-2">
          <AnonSellerLabel code="ABC1234" size="sm" />
          <span className="text-warm-700 text-[14px]">P2P 매물 (개인 판매자)</span>
        </div>
      </div>

      <form method="get" action="/catalog" className="mb-5 flex items-center gap-2.5">
        {brand && <input type="hidden" name="brand" value={brand} />}
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="브랜드 또는 SKU 이름으로 검색"
          className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full max-w-sm rounded-md border px-3 text-sm outline-none focus-visible:ring-3"
          aria-label="브랜드/SKU 검색"
        />
        <select
          name="sort"
          defaultValue={sort}
          className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-3"
          aria-label="정렬"
        >
          <option value="recent">최근 등록순</option>
          <option value="price-asc">낮은 가격순</option>
          <option value="qty-desc">수량 많은순</option>
        </select>
        <Button type="submit" size="sm">
          적용
        </Button>
      </form>

      <p className="text-muted-foreground mb-3 text-sm">
        총 <span className="text-foreground font-semibold">{listings.length}</span>건
      </p>

      {listings.length === 0 ? (
        <EmptyState hasFilter={!!(q || brand)} />
      ) : (
        <ul className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {listings.map((listing) => (
            <li key={listing.id}>
              <DesktopListingCard listing={listing} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="border-border flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-16 text-center">
      <p className="text-base font-semibold">구매 가능한 매물이 없어요.</p>
      <p className="text-muted-foreground mt-2 text-sm">새 매물이 등록되면 여기에 노출됩니다.</p>
      {hasFilter && (
        <Link
          href="/catalog"
          className="text-ticketa-blue-700 mt-4 text-sm font-semibold hover:underline"
        >
          전체 목록 보기
        </Link>
      )}
    </div>
  );
}
