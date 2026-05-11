import Image from 'next/image';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AdminPageHead } from '@/components/admin/admin-shell';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';
import { fetchSkuTxStats } from '@/lib/domain/admin/catalog';
import { SkuActiveToggle } from './sku-toggle';
import { SkuEditButton } from './sku-edit-button';
import { SkuCreateButton } from '@/components/admin/sku-create-button';

// NOTE: SKU 추가/수정 — SkuFormModal 재사용. 신규 디자인 dialog 전달 후 교체 예정.

type SkuRow = {
  id: string;
  brand: string;
  denomination: number;
  display_name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  thumbnail_url: string | null;
  commission_type: 'fixed' | 'percent';
  commission_amount: number;
  commission_charged_to: 'seller' | 'buyer' | 'both';
};

// DB brand("AK백화점") → DeptMark 키("ak"). 썸네일 없을 때 폴백용.
const BRAND_TO_DEPT: Record<string, Department> = {
  롯데백화점: 'lotte',
  현대백화점: 'hyundai',
  신세계백화점: 'shinsegae',
  갤러리아백화점: 'galleria',
  AK백화점: 'ak',
};

function shortBrandLabel(brand: string): string {
  const stripped = brand.replace(/백화점$/, '').trim();
  return stripped || brand;
}

const CHARGED_TO_LABEL: Record<string, string> = {
  seller: '/seller',
  buyer: '/buyer',
  both: '/both',
};

function feeLabel(s: SkuRow): string {
  if (s.commission_type === 'fixed') {
    return `고정 ${s.commission_amount.toLocaleString('ko-KR')}원${CHARGED_TO_LABEL[s.commission_charged_to] ?? ''}`;
  }
  return `${s.commission_amount}%${CHARGED_TO_LABEL[s.commission_charged_to] ?? ''}`;
}

// id: URL slug, db: DB 컬럼 값
const BRAND_FILTERS: { id: string; label: string; db: string | null }[] = [
  { id: 'all', label: '전체', db: null },
  { id: 'lotte', label: '롯데', db: '롯데백화점' },
  { id: 'hyundai', label: '현대', db: '현대백화점' },
  { id: 'shinsegae', label: '신세계', db: '신세계백화점' },
  { id: 'galleria', label: '갤러리아', db: '갤러리아백화점' },
  { id: 'ak', label: 'AK', db: 'AK백화점' },
];

export default async function AdminCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawBrand = Array.isArray(params.brand) ? params.brand[0] : params.brand;
  const brandSelected = BRAND_FILTERS.find((b) => b.id === rawBrand) ?? BRAND_FILTERS[0]!;
  const brandFilter = brandSelected.id;

  const supabase = await createSupabaseServerClient();

  let skuQuery = supabase
    .from('sku')
    .select(
      'id, brand, denomination, display_name, display_order, is_active, created_at, thumbnail_url, commission_type, commission_amount, commission_charged_to',
    )
    .order('brand', { ascending: true })
    .order('denomination', { ascending: true });
  if (brandSelected.db) {
    skuQuery = skuQuery.eq('brand', brandSelected.db);
  }

  const [skusRes, statsMap, totalSkuRes] = await Promise.all([
    skuQuery,
    fetchSkuTxStats(),
    supabase.from('sku').select('id, is_active', { count: 'exact' }),
  ]);

  const skus = (skusRes.data ?? []) as SkuRow[];

  const totalSkus = (totalSkuRes.data ?? []) as { is_active: boolean }[];
  const activeCount = totalSkus.filter((s) => s.is_active).length;
  const inactiveCount = totalSkus.length - activeCount;

  return (
    <>
      <AdminPageHead
        title="권종 카탈로그"
        sub="판매 가능 브랜드 × 권종 마스터 — 활성 / 비활성 · 수수료 정책"
        right={<SkuCreateButton />}
      />

      {/* Brand filter chips */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {BRAND_FILTERS.map((b) => {
          const active = b.id === brandFilter;
          return (
            <Link
              key={b.id}
              href={b.id === 'all' ? '/admin/catalog' : `/admin/catalog?brand=${b.id}`}
              className="inline-flex h-8 items-center rounded-full border px-3.5 text-[14px] font-extrabold no-underline"
              style={{
                borderColor: active ? 'var(--ticketa-blue-500)' : 'var(--border)',
                background: active ? 'var(--ticketa-blue-500)' : 'white',
                color: active ? '#fff' : 'var(--foreground)',
              }}
            >
              {b.label}
            </Link>
          );
        })}
        <span className="text-muted-foreground ml-auto text-[13px]">
          {brandFilter === 'all'
            ? `${totalSkus.length} 권종 · 활성 ${activeCount} / 비활성 ${inactiveCount}`
            : `${skus.length} 권종 노출 (전체 ${totalSkus.length})`}
        </span>
      </div>

      {/* SKU card grid */}
      {skus.length === 0 ? (
        <div className="border-border rounded-[14px] border border-dashed bg-white p-12 text-center">
          <p className="text-[15px] font-bold">등록된 권종이 없어요</p>
          <p className="text-muted-foreground mt-1 text-[14px]">
            우측 상단 &ldquo;+ 권종 추가&rdquo; 로 첫 권종을 등록하세요.
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {skus.map((s) => {
            const stats = statsMap.get(s.id);
            const dept = BRAND_TO_DEPT[s.brand];
            return (
              <div
                key={s.id}
                className="border-border relative rounded-[14px] border bg-white p-[18px]"
                style={{ opacity: s.is_active ? 1 : 0.6 }}
              >
                <div className="mb-3.5 flex items-start gap-3.5">
                  {s.thumbnail_url ? (
                    <div className="bg-warm-50 border-warm-200 relative size-14 shrink-0 overflow-hidden rounded-[10px] border">
                      <Image
                        src={s.thumbnail_url}
                        alt={`${s.brand} ${s.denomination.toLocaleString('ko-KR')}원권`}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                  ) : dept ? (
                    <DeptMark dept={dept} size={56} />
                  ) : (
                    <DeptMark dept={s.brand} size={56} />
                  )}
                  <div className="flex-1">
                    <div className="text-[15px] font-extrabold tracking-[-0.014em]">
                      {shortBrandLabel(s.brand)} 백화점
                    </div>
                    <div className="text-[18px] font-extrabold tracking-[-0.018em] tabular-nums">
                      {s.denomination.toLocaleString('ko-KR')}
                      <span className="text-muted-foreground ml-0.5 text-[14px] font-bold">
                        원권
                      </span>
                    </div>
                  </div>
                  <SkuActiveToggle skuId={s.id} active={s.is_active} />
                </div>

                <div className="bg-warm-50 mb-3 rounded-[8px] px-3 py-2.5">
                  <div className="text-muted-foreground mb-0.5 text-[12px] font-extrabold tracking-[0.08em] uppercase">
                    수수료
                  </div>
                  <div className="font-mono text-[14px] font-bold">{feeLabel(s)}</div>
                </div>

                <div className="flex items-center gap-3 text-[13px]">
                  <div>
                    <div className="text-muted-foreground font-semibold">누적 거래</div>
                    <div className="text-[14px] font-extrabold tabular-nums">
                      {(stats?.tx_count ?? 0).toLocaleString('ko-KR')}건
                    </div>
                  </div>
                  <div className="border-warm-200 border-l pl-3">
                    <div className="text-muted-foreground font-semibold">거래액</div>
                    <div className="text-[14px] font-extrabold tabular-nums">
                      {Math.round((stats?.tx_volume ?? 0) / 10000).toLocaleString('ko-KR')}만
                    </div>
                  </div>
                  <div className="ml-auto">
                    <SkuEditButton
                      sku={{
                        id: s.id,
                        brand: s.brand,
                        denomination: s.denomination,
                        display_order: s.display_order,
                        is_active: s.is_active,
                        thumbnail_url: s.thumbnail_url,
                        commission_type: s.commission_type,
                        commission_amount: s.commission_amount,
                        commission_charged_to: s.commission_charged_to,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
