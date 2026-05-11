import Image from 'next/image';
import { redirect } from 'next/navigation';
import { hasRole } from '@/lib/auth/guards';
import { AdminPageHead, AdminKpi } from '@/components/admin/admin-shell';
import { R2Pill, R2TableHead } from '@/components/admin/r2';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';
import { fetchConsignmentData } from '@/lib/domain/admin/consignments';
import {
  ConsignmentForm,
  type AgentOption,
  type SkuOption,
  type ExistingInventoryRow,
} from './consignment-form';
import { ReleaseConsignmentButton } from './release-button';
import { EditUnitCostButton } from './edit-unit-cost-button';

// "기존 행 합산" 배지 — updated_at vs created_at 차이로 추정 (적재 후 update 이력 있으면 merged)
// 사이드 시트 (행 → 에이전트 inventory drill) — 지원 예정

type AgentRanking = {
  id: string;
  name: string;
  username: string | null;
  pool: number;
  listed: number;
  value: number;
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

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

export default async function AdminConsignmentsPage() {
  const ok = await hasRole('admin');
  if (!ok) redirect('/no-access?reason=admin-required');

  const {
    agentRows,
    skus: skuRows,
    recent: rows,
    monthly,
    allInventory,
  } = await fetchConsignmentData();

  const agents: AgentOption[] = agentRows.map((r) => {
    const u = r.user!;
    const name = u.store_name || u.full_name || u.username || u.id.slice(0, 8);
    const handle = u.username ? `@${u.username}` : u.id.slice(0, 8);
    return {
      id: u.id,
      label: `${name} (${handle})`,
      storeName: u.store_name,
      username: u.username,
    };
  });

  const skus: SkuOption[] = skuRows.map((s) => ({
    id: s.id,
    brand: s.brand,
    denomination: s.denomination,
    display_name: s.display_name,
    thumbnail_url: s.thumbnail_url,
    code: `${shortBrandLabel(s.brand)}-${String(s.denomination / 10000).padStart(2, '0')}`,
  }));

  // 30일 적재 총액 (created_at 기준)
  const monthlyTotal = monthly.reduce(
    (s, r) => s + (r.qty_available + r.qty_reserved) * r.unit_cost,
    0,
  );

  const totalAgents = agents.length;
  const totalSkus = skus.length;

  const existingInventory: ExistingInventoryRow[] = allInventory;

  const agentNameMap = new Map<string, { name: string; username: string | null }>();
  for (const r of agentRows) {
    const u = r.user!;
    agentNameMap.set(u.id, {
      name: u.store_name || u.full_name || u.username || u.id.slice(0, 8),
      username: u.username,
    });
  }
  const agentAggregate = new Map<string, { pool: number; listed: number; value: number }>();
  for (const i of allInventory) {
    const prev = agentAggregate.get(i.agent_id) ?? { pool: 0, listed: 0, value: 0 };
    prev.pool += i.qty_available;
    prev.listed += i.qty_reserved;
    prev.value += (i.qty_available + i.qty_reserved) * i.unit_cost;
    agentAggregate.set(i.agent_id, prev);
  }
  const topAgents: AgentRanking[] = Array.from(agentAggregate.entries())
    .map(([id, agg]) => {
      const meta = agentNameMap.get(id);
      return {
        id,
        name: meta?.name ?? id.slice(0, 8),
        username: meta?.username ?? null,
        ...agg,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <>
      <AdminPageHead
        title="위탁 입고"
        sub="에이전트가 맡긴 상품권을 받아 재고로 등록합니다. 같은 에이전트·권종·정산 단가면 기존 재고에 자동 합산돼요."
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <AdminKpi
          l="활성 에이전트"
          v={`${totalAgents.toLocaleString('ko-KR')}명`}
          d="권한 부여 완료"
        />
        <AdminKpi l="활성 권종" v={`${totalSkus.toLocaleString('ko-KR')}개`} d="권종 × 브랜드" />
        <AdminKpi
          l="30일 적재 총액"
          v={`${monthlyTotal.toLocaleString('ko-KR')}원`}
          d={`평균 ${Math.round(monthlyTotal / 30).toLocaleString('ko-KR')}원/일`}
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Left: 폼 카드 */}
        <ConsignmentForm agents={agents} skus={skus} existingInventory={existingInventory} />

        {/* Right: 상위 에이전트 카드 */}
        <div className="border-border rounded-[12px] border bg-white p-4">
          <div className="mb-3 flex items-center">
            <span className="text-[14px] font-extrabold">에이전트 보유 현황</span>
            <span className="text-muted-foreground ml-auto text-[13px]">상위 5명</span>
          </div>
          {topAgents.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-[14px]">
              아직 적재된 에이전트가 없어요.
            </div>
          ) : (
            <div>
              {topAgents.map((a, i) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2.5 py-3"
                  style={{ borderTop: i > 0 ? '1px solid var(--warm-100)' : 0 }}
                >
                  <div
                    className="flex size-8 items-center justify-center rounded-[8px] text-[14px] font-extrabold text-white"
                    style={{ background: 'linear-gradient(135deg, #D4A24C, #B6862E)' }}
                  >
                    {a.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold tracking-[-0.008em]">
                      {a.name}
                    </div>
                    <div className="text-muted-foreground text-[12px] tabular-nums">
                      보유 <b className="text-foreground">{a.pool.toLocaleString('ko-KR')}</b> ·
                      판매중 <b style={{ color: '#8C6321' }}>{a.listed}</b>
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="text-[14px] font-extrabold">
                      {Math.round(a.value / 10000).toLocaleString('ko-KR')}
                      <span className="text-muted-foreground ml-0.5 text-[12px] font-bold">
                        만원
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 최근 적재 내역 */}
      <div className="border-border overflow-hidden rounded-[12px] border bg-white">
        <div className="border-border flex items-center border-b px-4 py-3.5">
          <span className="text-[14px] font-extrabold">최근 적재 내역</span>
          <span className="text-muted-foreground ml-2.5 text-[13px]">최신순 (자동 정렬)</span>
          <span className="text-muted-foreground ml-auto inline-flex items-center gap-1.5 text-[12px]">
            행 drill-down
            <R2Pill tone="neutral">지원 예정</R2Pill>
          </span>
        </div>
        {rows.length === 0 ? (
          <div className="text-muted-foreground px-4 py-10 text-center text-[14px]">
            아직 적재된 위탁 재고가 없어요. 위 폼으로 첫 위탁을 입고하세요.
          </div>
        ) : (
          <table className="w-full border-collapse text-[14px]">
            <R2TableHead
              cols={[
                '에이전트',
                '권종',
                '보유 / 판매중',
                '정산 단가',
                '정산 예정액',
                '갱신',
                '액션',
              ]}
            />
            <tbody>
              {rows.map((r) => {
                const agentName =
                  r.agent?.store_name ||
                  r.agent?.full_name ||
                  r.agent?.username ||
                  r.agent?.id.slice(0, 8) ||
                  '알 수 없음';
                const skuBrand = r.sku?.brand ?? '';
                const dept = BRAND_TO_DEPT[skuBrand];
                const skuThumb = r.sku?.thumbnail_url ?? null;
                const total = r.qty_available + r.qty_reserved;
                const merged =
                  new Date(r.updated_at).getTime() - new Date(r.created_at).getTime() > 60_000;
                return (
                  <tr key={r.id} className="border-warm-100 border-t">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex size-6 items-center justify-center rounded-[6px] text-[12px] font-extrabold text-white"
                          style={{ background: 'linear-gradient(135deg, #D4A24C, #B6862E)' }}
                        >
                          {agentName[0]}
                        </div>
                        <span className="text-[14px] font-bold">{agentName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {skuThumb ? (
                          <div className="border-warm-200 relative size-6 shrink-0 overflow-hidden rounded-[6px] border bg-white">
                            <Image
                              src={skuThumb}
                              alt={r.sku?.display_name ?? ''}
                              fill
                              sizes="24px"
                              className="object-cover"
                            />
                          </div>
                        ) : dept ? (
                          <DeptMark dept={dept} size={24} />
                        ) : null}
                        <span className="text-[14px] font-bold">
                          {shortBrandLabel(skuBrand)}{' '}
                          {((r.sku?.denomination ?? 0) / 10000).toLocaleString('ko-KR')}만원권
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 tabular-nums">
                      <span className="font-extrabold">{r.qty_available}</span>
                      <span className="text-muted-foreground"> / </span>
                      <span className="font-bold" style={{ color: '#8C6321' }}>
                        {r.qty_reserved}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold tabular-nums">
                      {r.unit_cost.toLocaleString('ko-KR')}원
                    </td>
                    <td className="px-4 py-3.5 font-extrabold tabular-nums">
                      {(total * r.unit_cost).toLocaleString('ko-KR')}원
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-muted-foreground text-[13px]">
                        {formatRelative(r.updated_at)}
                      </div>
                      {merged && <R2Pill tone="progress">기존 재고에 합산</R2Pill>}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <EditUnitCostButton
                          inventoryId={r.id}
                          currentUnitCost={r.unit_cost}
                          qtyReserved={r.qty_reserved}
                          agentName={agentName}
                          skuLabel={`${shortBrandLabel(skuBrand)} ${((r.sku?.denomination ?? 0) / 10000).toLocaleString('ko-KR')}만원권`}
                        />
                        <ReleaseConsignmentButton
                          inventoryId={r.id}
                          qtyAvailable={r.qty_available}
                          agentName={agentName}
                          skuLabel={`${shortBrandLabel(skuBrand)} ${((r.sku?.denomination ?? 0) / 10000).toLocaleString('ko-KR')}만원권 · 정산 단가 ${r.unit_cost.toLocaleString('ko-KR')}원`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-muted-foreground mt-4 text-[13px]">
        같은 에이전트 · 권종 · 정산 단가로 다시 입고하면 기존 위탁 재고에 수량만 더해져요. 정산
        단가가 다르면 별도 재고로 분리됩니다.
      </p>
    </>
  );
}
