import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AdminPageHead, AdminKpi } from '@/components/admin/admin-shell';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';
import { ListListingButton } from './list-listing-button';

type InventoryRow = {
  id: string;
  qty_available: number;
  qty_reserved: number;
  unit_cost: number;
  sku: {
    id: string;
    brand: string;
    denomination: number;
    display_name: string;
    thumbnail_url: string | null;
  } | null;
};

// DB brand("AK백화점") → DeptMark 키 + 짧은 라벨
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

export default async function AgentInventoryPage() {
  const current = await getCurrentUser();
  if (!current) redirect('/login?next=/agent/inventory');

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('agent_inventory')
    .select(
      'id, qty_available, qty_reserved, unit_cost, sku:sku_id(id, brand, denomination, display_name, thumbnail_url)',
    )
    .eq('agent_id', current.auth.id)
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as unknown as InventoryRow[];
  const totalAvailable = rows.reduce((s, r) => s + r.qty_available, 0);
  const totalReserved = rows.reduce((s, r) => s + r.qty_reserved, 0);
  const totalValue = rows.reduce((s, r) => s + (r.qty_available + r.qty_reserved) * r.unit_cost, 0);

  return (
    <>
      <AdminPageHead
        title="위탁 재고"
        sub="에이전트가 위탁한 상품권 재고와 판매 등록 현황 — 판매 등록 후 보유/판매중/보류 로 분할됩니다"
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <AdminKpi
          l="판매 가능"
          v={`${totalAvailable.toLocaleString('ko-KR')}매`}
          d="등록 가능 재고"
        />
        <AdminKpi
          l="판매 등록 중"
          v={`${totalReserved.toLocaleString('ko-KR')}매`}
          d="현재 카탈로그 노출"
        />
        <AdminKpi
          l="총 위탁가"
          v={`${totalValue.toLocaleString('ko-KR')}원`}
          d="위탁 단가 × 보유"
        />
      </div>

      {rows.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-xl border bg-white p-12 text-center text-[15px]">
          위탁된 재고가 없어요. 어드민이 위탁 입고를 처리하면 여기에 나타납니다.
        </div>
      ) : (
        <div className="border-border overflow-hidden rounded-[12px] border bg-white">
          <table className="w-full border-collapse text-[14px]">
            <thead className="bg-warm-50">
              <tr>
                {['상품권', '액면', '보유 · 판매중', '판매 진행률', '액션'].map((h) => (
                  <th
                    key={h}
                    className="text-muted-foreground px-4 py-3 text-left text-[13px] font-extrabold tracking-[0.06em] uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const totalQty = r.qty_available + r.qty_reserved;
                const pctListed = totalQty ? (r.qty_reserved / totalQty) * 100 : 0;
                const brand = r.sku?.brand ?? '';
                const dept = BRAND_TO_DEPT[brand];
                const thumb = r.sku?.thumbnail_url ?? null;
                const denom = r.sku?.denomination ?? 0;
                const skuLabel = r.sku
                  ? `${shortBrandLabel(brand)} ${denom.toLocaleString('ko-KR')}원권`
                  : '알 수 없는 상품권';
                return (
                  <tr key={r.id} className="border-warm-100 border-t">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        {thumb ? (
                          <div className="border-warm-200 relative size-8 shrink-0 overflow-hidden rounded-[8px] border bg-white">
                            <Image
                              src={thumb}
                              alt={skuLabel}
                              fill
                              sizes="32px"
                              className="object-cover"
                            />
                          </div>
                        ) : dept ? (
                          <DeptMark dept={dept} size={32} />
                        ) : (
                          <DeptMark dept={brand} size={32} />
                        )}
                        <div>
                          <div className="text-[14px] font-extrabold">
                            {shortBrandLabel(brand)} 백화점
                          </div>
                          <div className="text-muted-foreground text-[12px]">
                            {denom.toLocaleString('ko-KR')}원권
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-bold tabular-nums">
                      {r.sku?.denomination.toLocaleString('ko-KR') ?? 0}원
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-3.5 text-[14px] tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="size-1.5 rounded-full"
                            style={{ background: '#C9C2B5' }}
                          />
                          보유{' '}
                          <b className="text-foreground">
                            {r.qty_available.toLocaleString('ko-KR')}
                          </b>
                          매
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="size-1.5 rounded-full"
                            style={{ background: '#D4A24C' }}
                          />
                          판매중{' '}
                          <b style={{ color: '#8C6321' }}>
                            {r.qty_reserved.toLocaleString('ko-KR')}
                          </b>
                          매
                        </span>
                      </div>
                      <div className="text-muted-foreground mt-1 text-[12px] tabular-nums">
                        단가 {r.unit_cost.toLocaleString('ko-KR')}원
                      </div>
                    </td>
                    <td className="w-[280px] px-4 py-4">
                      <div className="bg-warm-100 flex h-2 overflow-hidden rounded-full">
                        <div style={{ width: `${pctListed}%`, background: '#D4A24C' }} />
                      </div>
                      <div className="text-muted-foreground mt-1 text-[12px] tabular-nums">
                        {pctListed.toFixed(0)}% 활성
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <ListListingButton
                        inventoryId={r.id}
                        available={r.qty_available}
                        reserved={r.qty_reserved}
                        unitCost={r.unit_cost}
                        skuLabel={skuLabel}
                        skuBrand={brand}
                        skuDenomination={denom}
                        skuThumbnailUrl={thumb}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-muted-foreground mt-4 text-[14px]">
        판매 등록한 매물은 카탈로그에 인증 매물로 즉시 노출돼요. 매입 → 어드민 발송 처리 → 완료 시
        자동으로 정산이 이뤄집니다.
      </p>
    </>
  );
}
