import Link from 'next/link';

const BRAND_CHIPS: { id: string; label: string }[] = [
  { id: '', label: '전체' },
  { id: 'lotte', label: '롯데' },
  { id: 'hyundai', label: '현대' },
  { id: 'shinsegae', label: '신세계' },
  { id: 'galleria', label: '갤러리아' },
  { id: 'ak', label: 'AK' },
];

/**
 * 카탈로그 브랜드 필터 — pill style chips.
 * size="sm" 은 모바일용 (12.5px), default 은 데스크톱용 (13px).
 */
export function BrandFilter({
  activeBrand,
  buildHref,
  size = 'md',
  className = '',
}: {
  activeBrand: string;
  buildHref: (brand: string) => string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const padding = size === 'sm' ? 'px-3 py-1' : 'px-3.5 py-1.5';
  const fontSize = size === 'sm' ? 'text-sm' : 'text-[15px]';

  return (
    <nav
      className={`flex flex-nowrap gap-1.5 sm:flex-wrap sm:gap-2 ${className}`}
      aria-label="브랜드 필터"
    >
      {BRAND_CHIPS.map((chip) => {
        const active = activeBrand === chip.id;
        return (
          <Link
            key={chip.id || 'all'}
            href={buildHref(chip.id)}
            className={[
              'rounded-full border font-semibold whitespace-nowrap transition-colors',
              padding,
              fontSize,
              active
                ? 'border-ticketa-blue-500 bg-ticketa-blue-50 text-ticketa-blue-700'
                : 'border-border text-foreground hover:bg-muted bg-white',
            ].join(' ')}
          >
            {chip.label}
          </Link>
        );
      })}
    </nav>
  );
}
