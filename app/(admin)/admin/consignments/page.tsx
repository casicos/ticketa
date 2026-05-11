import { redirect } from 'next/navigation';
import { hasRole } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AdminPageHead, AdminKpi } from '@/components/admin/admin-shell';
import { R2Pill, R2TableHead } from '@/components/admin/r2';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';
import {
  ConsignmentForm,
  type AgentOption,
  type SkuOption,
  type ExistingInventoryRow,
} from './consignment-form';

// "기존 행 합산" 배지 — updated_at vs created_at 차이로 추정 (적재 후 update 이력 있으면 merged)
// 사이드 시트 (행 → 에이전트 inventory drill) — 지원 예정

type AgentRoleRow = {
  user_id: string;
  user: {
    id: string;
    username: string | null;
    full_name: string | null;
    store_name: string | null;
  } | null;
};

type SkuRow = {
  id: string;
  brand: string;
  denomination: number;
  display_name: string;
  is_active: boolean;
};

type RecentInventoryRow = {
  id: string;
  qty_available: number;
  qty_reserved: number;
  unit_cost: number;
  created_at: string;
  updated_at: string;
  agent: {
    id: string;
    username: string | null;
    full_name: string | null;
    store_name: string | null;
  } | null;
  sku: { id: string; brand: string; denomination: number; display_name: string } | null;
};

type AgentRanking = {
  id: string;
  name: string;
  username: string | null;
  pool: number;
  listed: number;
  value: number;
};

const BRAND_LABEL: Record<string, string> = {
  lotte: '롯데',
  hyundai: '현대',
  shinsegae: '신세계',
  galleria: '갤러리아',
  ak: 'AK',
};

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

async function loadConsignmentData() {
  const supabase = await createSupabaseServerClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return { supabase, thirtyDaysAgo };
}

export default async function AdminConsignmentsPage() {
  const ok = await hasRole('admin');
  if (!ok) redirect('/no-access?reason=admin-required');

  const { supabase, thirtyDaysAgo } = await loadConsignmentData();

  const [agentsRes, skusRes, recentRes, monthlyRes] = await Promise.all([
    supabase
      .from('user_roles')
      .select('user_id, user:user_id(id, username, full_name, store_name)')
      .eq('role', 'agent')
      .is('revoked_at', null),
    supabase
      .from('sku')
      .select('id, brand, denomination, display_name, is_active')
      .eq('is_active', true)
      .order('brand', { ascending: true })
      .order('denomination', { ascending: false }),
    supabase
      .from('agent_inventory')
      .select(
        'id, qty_available, qty_reserved, unit_cost, created_at, updated_at, agent:agent_id(id, username, full_name, store_name), sku:sku_id(id, brand, denomination, display_name)',
      )
      .order('updated_at', { ascending: false })
      .limit(20),
    supabase
      .from('agent_inventory')
      .select('qty_available, qty_reserved, unit_cost, agent_id, created_at')
      .gte('created_at', thirtyDaysAgo),
  ]);

  const agentRows = ((agentsRes.data ?? []) as unknown as AgentRoleRow[]).filter(
    (r) => r.user !== null,
  );
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

  const skus: SkuOption[] = ((skusRes.data ?? []) as SkuRow[]).map((s) => ({
    id: s.id,
    brand: s.brand,
    denomination: s.denomination,
    display_name: s.display_name,
    code: `${s.brand.slice(0, 2).toUpperCase()}-${String(s.denomination / 10000).padStart(2, '0')}`,
  }));

  const rows = (recentRes.data ?? []) as unknown as RecentInventoryRow[];

  // 30일 적재 총액 (created_at 기준 신규 적재만)
  const monthlyTotal = (
    (monthlyRes.data ?? []) as { qty_available: number; qty_reserved: number; unit_cost: number }[]
  ).reduce((s, r) => s + (r.qty_available + r.qty_reserved) * r.unit_cost, 0);

  const totalAgents = agents.length;
  const totalSkus = skus.length;

  // 폼 BEFORE/AFTER 미리보기 + 상위 5 에이전트 — 같은 fetch 재사용
  const allInventory = ((
    await supabase
      .from('agent_inventory')
      .select('id, agent_id, sku_id, qty_available, qty_reserved, unit_cost')
  ).data ?? []) as ExistingInventoryRow[];

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
        sub="에이전트 위탁 상품권 적재 — 동일 (에이전트·권종·단가) 면 기존 행에 합산"
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
            <span className="text-muted-foreground ml-auto text-[12px]">상위 5명</span>
          </div>
          {topAgents.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-[13px]">
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
                    className="flex size-8 items-center justify-center rounded-[8px] text-[13px] font-extrabold text-white"
                    style={{ background: 'linear-gradient(135deg, #D4A24C, #B6862E)' }}
                  >
                    {a.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold tracking-[-0.008em]">
                      {a.name}
                    </div>
                    <div className="text-muted-foreground text-[11px] tabular-nums">
                      보유 <b className="text-foreground">{a.pool.toLocaleString('ko-KR')}</b> ·
                      판매중 <b style={{ color: '#8C6321' }}>{a.listed}</b>
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="text-[13px] font-extrabold">
                      {Math.round(a.value / 10000).toLocaleString('ko-KR')}
                      <span className="text-muted-foreground ml-0.5 text-[11px] font-bold">
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
          <span className="text-muted-foreground ml-2.5 text-[12px]">최신순 (자동 정렬)</span>
          <span className="text-muted-foreground ml-auto inline-flex items-center gap-1.5 text-[11px]">
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
              cols={['에이전트', '권종', '보유 / 판매중', '단가', '총 위탁가', '갱신', '']}
            />
            <tbody>
              {rows.map((r) => {
                const agentName =
                  r.agent?.store_name ||
                  r.agent?.full_name ||
                  r.agent?.username ||
                  r.agent?.id.slice(0, 8) ||
                  '알 수 없음';
                const skuBrand = (r.sku?.brand ?? 'lotte') as Department;
                const total = r.qty_available + r.qty_reserved;
                const merged =
                  new Date(r.updated_at).getTime() - new Date(r.created_at).getTime() > 60_000;
                return (
                  <tr key={r.id} className="border-warm-100 border-t">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex size-6 items-center justify-center rounded-[6px] text-[11px] font-extrabold text-white"
                          style={{ background: 'linear-gradient(135deg, #D4A24C, #B6862E)' }}
                        >
                          {agentName[0]}
                        </div>
                        <span className="text-[13px] font-bold">{agentName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <DeptMark dept={skuBrand} size={24} />
                        <span className="text-[13px] font-bold">
                          {BRAND_LABEL[skuBrand] ?? skuBrand}{' '}
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
                      <div className="text-muted-foreground text-[12px]">
                        {formatRelative(r.updated_at)}
                      </div>
                      {merged && <R2Pill tone="progress">기존 행 합산</R2Pill>}
                    </td>
                    <td className="text-muted-foreground px-4 py-3.5 text-right text-[12px]">—</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-muted-foreground mt-4 text-[12px]">
        동일 (에이전트 · 권종 · 단가) 조합으로 적재하면 기존 행의 보유 수량이 증가해요. 단가가
        다르면 새 행으로 분리됩니다.
      </p>
    </>
  );
}
