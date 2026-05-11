import Link from 'next/link';
import { DeptMark, DEPARTMENT_LABEL, type Department } from '@/components/ticketa/dept-mark';
import { shortId } from '@/lib/format';
import { cn } from '@/lib/utils';
import { VerifiedBadge, StoreNameLabel, AnonSellerLabel } from './listing-badges';

export type ListingCardData = {
  id: string;
  unit_price: number;
  quantity_offered: number;
  submitted_at: string;
  seller_id: string;
  pre_verified?: boolean;
  verified_at?: string | null;
  store_name?: string | null;
  /** SKU 액면가 (예: 50000). 우선순위 표기에 사용. */
  sku: {
    brand: string;
    denomination: number;
    thumbnail_url?: string | null;
  };
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

/**
 * 데스크탑 카탈로그 카드.
 * 디자인: screens-p0-additions::ListingCardP0
 */
export function DesktopListingCard({ listing }: { listing: ListingCardData }) {
  const dept = listing.sku.brand as Department;
  const isAgent = Boolean(listing.store_name);
  const isVerified = Boolean(listing.pre_verified && listing.verified_at);
  const diff = listing.unit_price - listing.sku.denomination;
  const diffPct = listing.sku.denomination
    ? Math.round((diff / listing.sku.denomination) * 1000) / 10
    : 0;
  const diffColor =
    diff < 0
      ? 'var(--semantic-success)'
      : diff > 0
        ? 'var(--semantic-error)'
        : 'var(--muted-foreground)';
  const diffLabel =
    diff === 0
      ? '액면가 동일'
      : `${diff < 0 ? '↓' : '↑'} 액면 ${diff < 0 ? '-' : '+'}${Math.abs(diffPct).toFixed(1)}%`;

  return (
    <Link
      href={`/catalog/${listing.id}`}
      className={cn(
        'relative flex flex-col gap-2.5 rounded-xl bg-white p-4 transition-shadow hover:shadow-md',
        isAgent ? 'border border-[#E0BD7A]' : 'border-border border',
      )}
      style={
        isAgent
          ? {
              boxShadow: '0 1px 0 rgba(212,162,76,0.08), 0 0 0 1px rgba(212,162,76,0.04)',
            }
          : undefined
      }
    >
      {isAgent && (
        <div
          className="pointer-events-none absolute top-0 right-3 left-3 h-[2px] rounded-b-[2px]"
          style={{
            background:
              'linear-gradient(90deg, transparent, #D4A24C 40%, #D4A24C 60%, transparent)',
          }}
        />
      )}

      {/* 1. Top meta row */}
      <div className="flex min-h-[22px] items-center gap-2">
        <DeptMark dept={dept} size={26} />
        <span className="text-muted-foreground text-[13px] font-semibold">
          {DEPARTMENT_LABEL[dept] ?? dept}
        </span>
        <span className="bg-border h-2.5 w-px" />
        {isAgent ? (
          <StoreNameLabel name={listing.store_name!} size="sm" />
        ) : (
          <AnonSellerLabel code={shortId(listing.seller_id)} size="sm" />
        )}
      </div>

      {/* 2. Face value */}
      <div className="text-foreground text-[16px] font-bold tracking-[-0.015em]">
        {listing.sku.denomination.toLocaleString('ko-KR')}원권
      </div>

      {/* 3. Price */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-[22px] font-extrabold tracking-[-0.018em] tabular-nums">
          {listing.unit_price.toLocaleString('ko-KR')}
          <span className="text-muted-foreground ml-0.5 text-[14px] font-bold">원</span>
        </span>
      </div>
      <div className="text-[12px] font-semibold tabular-nums" style={{ color: diffColor }}>
        {diffLabel}
      </div>

      {/* 4. Bottom strip */}
      <div className="border-border mt-auto flex items-center justify-between gap-2 border-t border-dashed pt-2.5">
        <div>{isVerified && <VerifiedBadge size="sm" />}</div>
        <span className="text-muted-foreground text-[12px]">
          수량 {listing.quantity_offered.toLocaleString('ko-KR')}장 ·{' '}
          {relativeTime(listing.submitted_at)}
        </span>
      </div>
    </Link>
  );
}

/**
 * 모바일 카탈로그 카드. (1열 리스트)
 * 디자인: screens-p0-additions::MobileListingCardP0
 */
export function MobileListingCard({ listing }: { listing: ListingCardData }) {
  const dept = listing.sku.brand as Department;
  const isAgent = Boolean(listing.store_name);
  const isVerified = Boolean(listing.pre_verified && listing.verified_at);
  const diff = listing.unit_price - listing.sku.denomination;
  const diffPct = listing.sku.denomination
    ? Math.round((diff / listing.sku.denomination) * 1000) / 10
    : 0;
  const diffColor =
    diff < 0
      ? 'var(--semantic-success)'
      : diff > 0
        ? 'var(--semantic-error)'
        : 'var(--muted-foreground)';

  return (
    <Link
      href={`/catalog/${listing.id}`}
      className={cn(
        'relative flex flex-col gap-2 rounded-xl bg-white p-3.5',
        isAgent ? 'border border-[#E0BD7A]' : 'border-border border',
      )}
    >
      {isAgent && (
        <div
          className="pointer-events-none absolute top-0 right-3 left-3 h-[2px] rounded-b-[2px]"
          style={{
            background:
              'linear-gradient(90deg, transparent, #D4A24C 40%, #D4A24C 60%, transparent)',
          }}
        />
      )}
      <div className="flex items-center gap-2">
        <DeptMark dept={dept} size={24} />
        <span className="text-muted-foreground text-[12px] font-semibold">
          {DEPARTMENT_LABEL[dept] ?? dept}
        </span>
        <div className="ml-auto">
          {isAgent ? (
            <StoreNameLabel name={listing.store_name!} size="sm" />
          ) : (
            <AnonSellerLabel code={shortId(listing.seller_id)} size="sm" />
          )}
        </div>
      </div>
      <div className="text-[14px] font-bold">
        {listing.sku.denomination.toLocaleString('ko-KR')}원권
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-[19px] font-extrabold tracking-[-0.018em] tabular-nums">
          {listing.unit_price.toLocaleString('ko-KR')}
          <span className="text-muted-foreground ml-0.5 text-[13px] font-bold">원</span>
        </span>
        {isVerified && <VerifiedBadge size="sm" />}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold tabular-nums" style={{ color: diffColor }}>
          {diff === 0
            ? '액면가 동일'
            : `${diff < 0 ? '↓' : '↑'} 액면 ${diff < 0 ? '-' : '+'}${Math.abs(diffPct).toFixed(1)}%`}
        </span>
        <span className="text-muted-foreground text-[11px]">
          수량 {listing.quantity_offered.toLocaleString('ko-KR')}장 ·{' '}
          {relativeTime(listing.submitted_at)}
        </span>
      </div>
    </Link>
  );
}
