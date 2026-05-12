import Link from 'next/link';
import { BrandFilter } from './brand-filter';
import { MobileListingCard, type ListingCardData } from './listing-card';
import { VerifiedBadge, StoreNameLabel } from './listing-badges';

export function MobileCatalog({
  listings,
  parsed,
  buildBrandHref,
  className = '',
}: {
  listings: ListingCardData[];
  parsed: { q: string; brand: string };
  buildBrandHref: (brand: string) => string;
  className?: string;
}) {
  const { q, brand } = parsed;

  return (
    <div className={`bg-background flex flex-col ${className}`}>
      {/* Brand chips — 가로 스크롤 */}
      <div className="overflow-x-auto px-4 pt-3.5 pb-2">
        <BrandFilter activeBrand={brand} buildHref={buildBrandHref} size="sm" />
      </div>

      <div className="border-border mx-4 mt-2 mb-3 flex flex-col gap-1.5 rounded-[10px] border bg-white px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <VerifiedBadge size="sm" />
          <span className="text-warm-700 text-[13px]">관리자 검수 — 결제 즉시 발송</span>
        </div>
        <div className="flex items-center gap-1.5">
          <StoreNameLabel name="공식 상점" size="sm" />
          <span className="text-warm-700 text-[13px]">에이전트 직영 매물</span>
        </div>
      </div>

      <p className="text-muted-foreground mb-2 px-4 text-xs">
        총 <span className="text-foreground font-semibold">{listings.length}</span>건
      </p>

      {listings.length === 0 ? (
        <MobileEmptyState hasFilter={!!(q || brand)} />
      ) : (
        <ul className="flex flex-col gap-2.5 px-4 pb-6">
          {listings.map((listing) => (
            <li key={listing.id}>
              <MobileListingCard listing={listing} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MobileEmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="border-border mx-4 flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-12 text-center">
      <p className="text-sm font-semibold">구매 가능한 매물이 없어요.</p>
      <p className="text-muted-foreground mt-1.5 text-xs">새 매물이 등록되면 여기에 노출됩니다.</p>
      {hasFilter && (
        <Link
          href="/catalog"
          className="text-ticketa-blue-700 mt-3 text-xs font-semibold hover:underline"
        >
          전체 목록 보기
        </Link>
      )}
    </div>
  );
}
