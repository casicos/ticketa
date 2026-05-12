import Link from 'next/link';
// admin client — cross-user 조인을 위해 RLS 우회 필요. /admin/** 는 proxy.ts 가 admin role 가드.
// (boundaries 룰 패턴 'app/(admin)/**' 매칭이 일부 경우에 'app' 으로 떨어져 한 줄 disable)
// eslint-disable-next-line boundaries/dependencies
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { AdminPageHead } from '@/components/admin/admin-shell';
import { shortId, formatDenominationLabel } from '@/lib/format';
import { DashboardRefreshButton } from './dashboard-refresh-button';

const ACCENT_BLUE = 'var(--ticketa-blue-500)';
const ACCENT_GOLD = '#8C6321';
const ACCENT_GREEN = '#1F6B43';
const ACCENT_RED = '#C0625A';

// ─────────────── KPI ───────────────

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: string;
}) {
  return (
    <div
      className="border-border flex-1 rounded-[12px] border bg-white p-4"
      style={{ borderLeft: `3px solid ${tone}` }}
    >
      <div className="text-muted-foreground text-[12px] font-extrabold tracking-[0.08em] uppercase">
        {label}
      </div>
      <div className="mt-1 text-[26px] font-black tracking-[-0.024em] tabular-nums">{value}</div>
      <div className="text-muted-foreground mt-0.5 text-[13px] font-semibold">{sub}</div>
    </div>
  );
}

// ─────────────── Queue card ───────────────

type QueueItem = {
  label: string;
  meta: string;
  hot?: boolean;
  mono?: boolean;
};

function QueueCard({
  title,
  sub,
  count,
  breaches,
  accent,
  href,
  hrefLabel,
  items,
}: {
  title: string;
  sub: string;
  count: number;
  breaches: number;
  accent: string;
  href: string;
  hrefLabel: string;
  items: QueueItem[];
}) {
  return (
    <div className="border-border flex flex-col rounded-[14px] border bg-white p-[18px]">
      <div className="mb-1 flex items-start gap-2.5">
        <span className="mt-2 size-2 rounded-full" style={{ background: accent }} />
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-extrabold tracking-[-0.014em]">{title}</span>
            <span
              className="text-[22px] font-black tracking-[-0.022em] tabular-nums"
              style={{ color: accent }}
            >
              {count.toLocaleString('ko-KR')}
            </span>
            {breaches > 0 && (
              <span
                className="ml-auto rounded-full px-2 py-0.5 text-[12px] font-extrabold"
                style={{ background: 'rgba(255,82,82,0.12)', color: '#dc2626' }}
              >
                ⚠ 기한 {breaches}건
              </span>
            )}
          </div>
          <div className="text-muted-foreground mt-0.5 text-[13px]">{sub}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {items.length === 0 ? (
          <div className="bg-warm-50 text-muted-foreground rounded-[8px] px-2.5 py-2 text-[13px]">
            처리 대기 항목이 없어요.
          </div>
        ) : (
          items.map((it, i) => (
            <Link
              key={i}
              href={href}
              className="flex items-center gap-2 rounded-[8px] px-2.5 py-2"
              style={{ background: it.hot ? 'rgba(255,82,82,0.05)' : 'var(--warm-50)' }}
            >
              <span className="bg-muted-foreground size-1 rounded-full" />
              <span
                className={`text-[13px] font-bold ${it.mono ? 'font-mono' : ''}`}
                style={{ color: it.hot ? '#dc2626' : 'var(--foreground)' }}
              >
                {it.label}
              </span>
              <span className="text-muted-foreground ml-auto text-[13px] font-semibold tabular-nums">
                {it.meta}
              </span>
            </Link>
          ))
        )}
      </div>
      <Link
        href={href}
        className="border-warm-100 mt-3 border-t pt-2.5 text-[13px] font-extrabold no-underline"
        style={{ color: accent }}
      >
        {hrefLabel} 전체 보기 →
      </Link>
    </div>
  );
}

// ─────────────── helpers ───────────────

function hoursAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

function formatStuck(hrs: number): string {
  const h = Math.floor(hrs);
  if (h < 1) return `${Math.max(1, Math.floor(hrs * 60))}분`;
  if (h < 24) return `${h}시간`;
  return `${Math.floor(h / 24)}일`;
}

function fmtKRWShort(amount: number): string {
  if (amount >= 10_000_000) return `${(amount / 10_000_000).toFixed(1)}천만`;
  if (amount >= 10_000) return `${Math.round(amount / 10_000).toLocaleString('ko-KR')}만`;
  return amount.toLocaleString('ko-KR');
}

// ─────────────── data ───────────────

type ListingMini = {
  id: string;
  status: string;
  unit_price: number;
  quantity_offered: number;
  handed_over_at: string | null;
  received_at: string | null;
  verified_at: string | null;
  purchased_at: string | null;
  completed_at: string | null;
  seller: { full_name: string | null; username: string | null; store_name: string | null } | null;
  sku: { brand: string; denomination: number } | null;
};

type CancellationMini = {
  id: number;
  requested_at: string;
  role_at_request: 'seller' | 'buyer';
  requester: {
    full_name: string | null;
    username: string | null;
    store_name: string | null;
    email: string | null;
  } | null;
};

type ChargeMini = {
  id: number;
  amount: number;
  requested_at: string;
  depositor_name: string | null;
  user: { full_name: string | null; username: string | null; email: string | null } | null;
};

type WithdrawMini = {
  id: number;
  amount: number;
  requested_at: string;
  account_holder: string;
  bank_code: string;
  user: { full_name: string | null; username: string | null; email: string | null } | null;
};

type InventoryMini = {
  id: string;
  qty_available: number;
  unit_cost: number;
  created_at: string;
  agent: { full_name: string | null; username: string | null; store_name: string | null } | null;
  sku: { brand: string; denomination: number } | null;
};

type AuditMini = {
  id: number;
  actor_id: string | null;
  entity_type: string;
  event: string;
  to_state: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string | null; username: string | null; email: string | null } | null;
};

// DB 의 sku.brand 는 한글 풀네임("롯데백화점") — 화면 표기는 "백화점" 빼고 줄임.
// 영문 키 변형("lotte" 등) 도 안전하게 처리하는 fallback 포함.
const BRAND_LABEL_EN: Record<string, string> = {
  lotte: '롯데',
  hyundai: '현대',
  shinsegae: '신세계',
  galleria: '갤러리아',
  ak: 'AK',
};
function brandShortLabel(brand: string | null | undefined): string {
  if (!brand) return '';
  if (BRAND_LABEL_EN[brand]) return BRAND_LABEL_EN[brand];
  return brand.replace(/백화점$/, '').trim() || brand;
}

/** 사용자 라벨 fallback — full_name → @username → email → 미상.
 *  어드민 대시보드는 RLS 우회로 user 조인이 살아있으니 '익명' 은 거의 없어야 함. */
function userLabel(u: {
  full_name: string | null;
  username: string | null;
  email?: string | null;
  store_name?: string | null;
}): string {
  if (u.store_name) return u.store_name;
  if (u.full_name) return u.full_name;
  if (u.username) return `@${u.username}`;
  if (u.email) return u.email;
  return '미상';
}

async function loadDashboard() {
  // admin client — users RLS 우회 필요 (cross-user 프로필 조인).
  // proxy.ts 가 이미 admin role 가드.
  const supabase = createSupabaseAdminClient();
  const now = Date.now();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [
    todayDoneRes,
    yesterdayDoneRes,
    activeRes,
    submittedCount,
    inspectRows,
    cancelRows,
    chargeRows,
    withdrawRows,
    inventoryRows,
    stuckPurchaseRows,
    auditRows,
  ] = await Promise.all([
    supabase
      .from('listing')
      .select('unit_price, quantity_offered', { count: 'exact' })
      .eq('status', 'completed')
      .gte('completed_at', todayStartIso),
    supabase
      .from('listing')
      .select('unit_price, quantity_offered', { count: 'exact' })
      .eq('status', 'completed')
      .gte('completed_at', yesterdayStart)
      .lt('completed_at', todayStartIso),
    supabase
      .from('listing')
      .select('id', { count: 'exact', head: true })
      .in('status', ['purchased', 'handed_over', 'received', 'verified', 'shipped']),
    supabase.from('listing').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase
      .from('listing')
      .select(
        'id, status, unit_price, quantity_offered, handed_over_at, received_at, verified_at, purchased_at, completed_at, seller:seller_id(full_name, username, store_name), sku:sku_id(brand, denomination)',
      )
      .in('status', ['handed_over', 'received', 'verified'])
      .order('handed_over_at', { ascending: true })
      .limit(50),
    supabase
      .from('cancellation_requests')
      .select(
        'id, requested_at, role_at_request, requester:requested_by(full_name, username, store_name, email)',
      )
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })
      .limit(20),
    supabase
      .from('charge_requests')
      .select('id, amount, requested_at, depositor_name, user:user_id(full_name, username, email)')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })
      .limit(20),
    supabase
      .from('withdraw_requests')
      .select(
        'id, amount, requested_at, account_holder, bank_code, user:user_id(full_name, username, email)',
      )
      .in('status', ['requested', 'processing'])
      .order('requested_at', { ascending: true })
      .limit(20),
    supabase
      .from('agent_inventory')
      .select(
        'id, qty_available, unit_cost, created_at, agent:agent_id(full_name, username, store_name), sku:sku_id(brand, denomination)',
      )
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('listing')
      .select(
        'id, status, unit_price, quantity_offered, handed_over_at, received_at, verified_at, purchased_at, completed_at, seller:seller_id(full_name, username, store_name), sku:sku_id(brand, denomination)',
      )
      .eq('status', 'purchased')
      .lt('purchased_at', oneDayAgo)
      .order('purchased_at', { ascending: true })
      .limit(10),
    supabase
      .from('audit_events')
      .select(
        'id, actor_id, entity_type, event, to_state, metadata, created_at, actor:actor_id(full_name, username, email)',
      )
      .order('created_at', { ascending: false })
      .limit(6),
  ]);

  return {
    todayVolume: (
      (todayDoneRes.data ?? []) as { unit_price: number; quantity_offered: number }[]
    ).reduce((s, r) => s + r.unit_price * r.quantity_offered, 0),
    todayCount: todayDoneRes.count ?? 0,
    yesterdayVolume: (
      (yesterdayDoneRes.data ?? []) as { unit_price: number; quantity_offered: number }[]
    ).reduce((s, r) => s + r.unit_price * r.quantity_offered, 0),
    activeCount: activeRes.count ?? 0,
    submittedCount: submittedCount.count ?? 0,
    inspectRows: (inspectRows.data ?? []) as unknown as ListingMini[],
    cancelRows: (cancelRows.data ?? []) as unknown as CancellationMini[],
    chargeRows: (chargeRows.data ?? []) as unknown as ChargeMini[],
    withdrawRows: (withdrawRows.data ?? []) as unknown as WithdrawMini[],
    inventoryRows: (inventoryRows.data ?? []) as unknown as InventoryMini[],
    stuckPurchaseRows: (stuckPurchaseRows.data ?? []) as unknown as ListingMini[],
    auditRows: (auditRows.data ?? []) as unknown as AuditMini[],
  };
}

// ─────────────── classify audit ───────────────

type AuditKind = 'tx' | 'mileage' | 'cancel' | 'inspect' | 'security' | 'system';

const KIND_COLOR: Record<AuditKind, string> = {
  tx: ACCENT_BLUE,
  mileage: ACCENT_GOLD,
  cancel: ACCENT_RED,
  inspect: ACCENT_GREEN,
  security: '#7B2D8E',
  system: '#74695C',
};

function classifyAudit(event: string, entity: string): AuditKind {
  const e = event.toLowerCase();
  if (e.includes('purchase') || e.includes('buy') || e.includes('listing_submitted')) return 'tx';
  if (e.includes('mileage') || e.includes('charge') || e.includes('withdraw')) return 'mileage';
  if (e.includes('cancel') || e.includes('refund') || e.includes('expir')) return 'cancel';
  if (
    e.includes('verify') ||
    e.includes('ship') ||
    e.includes('receiv') ||
    e.includes('handover') ||
    e.includes('consign')
  )
    return 'inspect';
  if (e.includes('role') || e.includes('grant') || e.includes('revoke') || entity === 'user_role')
    return 'security';
  return 'system';
}

export default async function AdminDashboardPage() {
  const data = await loadDashboard();

  // KPI 계산
  const todayDelta =
    data.yesterdayVolume > 0
      ? ((data.todayVolume - data.yesterdayVolume) / data.yesterdayVolume) * 100
      : null;
  const deltaText =
    todayDelta === null
      ? '어제 거래 없음'
      : `${todayDelta >= 0 ? '+' : ''}${todayDelta.toFixed(1)}% vs 어제`;

  // 검수 큐 breaches (24h)
  const inspectBreaches = data.inspectRows.filter((r) => {
    const anchor =
      r.status === 'handed_over'
        ? r.handed_over_at
        : r.status === 'received'
          ? r.received_at
          : r.verified_at;
    return anchor && hoursAgo(anchor) >= 24;
  }).length;

  const cancelBreaches = data.cancelRows.filter((c) => hoursAgo(c.requested_at) >= 24).length;
  const stuckBreaches = data.stuckPurchaseRows.filter(
    (r) => r.purchased_at && hoursAgo(r.purchased_at) >= 48,
  ).length;

  const totalBreaches = inspectBreaches + cancelBreaches + stuckBreaches;

  // Hot alert candidates (top 3 oldest breaches)
  const hotAlerts: { label: string; emphasized: string }[] = [];
  for (const r of data.inspectRows) {
    const anchor =
      r.status === 'handed_over'
        ? r.handed_over_at
        : r.status === 'received'
          ? r.received_at
          : r.verified_at;
    if (anchor && hoursAgo(anchor) >= 24) {
      hotAlerts.push({
        label: `${r.status === 'handed_over' ? '검수' : r.status === 'received' ? '검증' : '발송'} ${Math.floor(hoursAgo(anchor))}시간 초과`,
        emphasized: shortId(r.id),
      });
      if (hotAlerts.length >= 2) break;
    }
  }
  for (const c of data.cancelRows) {
    if (hoursAgo(c.requested_at) >= 24 && hotAlerts.length < 3) {
      hotAlerts.push({
        label: `취소 요청 ${Math.floor(hoursAgo(c.requested_at))}시간 초과`,
        emphasized: `CN-${c.id.toString().padStart(5, '0')}`,
      });
    }
  }

  // 검수 큐 카드 items (top 3)
  const inspectItems: QueueItem[] = data.inspectRows.slice(0, 3).map((r) => {
    const anchor =
      r.status === 'handed_over'
        ? r.handed_over_at
        : r.status === 'received'
          ? r.received_at
          : r.verified_at;
    const hrs = anchor ? hoursAgo(anchor) : 0;
    const sku = r.sku;
    return {
      label: `${shortId(r.id)} · ${brandShortLabel(sku?.brand)} ${formatDenominationLabel(sku?.denomination ?? 0)} × ${r.quantity_offered}`,
      meta: anchor ? (hrs >= 24 ? `${Math.floor(hrs)}시간 초과` : `${Math.floor(hrs)}시간`) : '—',
      mono: true,
      hot: hrs >= 24,
    };
  });

  const cancelItems: QueueItem[] = data.cancelRows.slice(0, 3).map((c) => {
    const hrs = hoursAgo(c.requested_at);
    const name = c.requester ? userLabel(c.requester) : '미상';
    return {
      label: `CN-${c.id.toString().padStart(5, '0')} · ${name} / ${c.role_at_request === 'buyer' ? '구매자' : '판매자'} 요청`,
      meta: hrs >= 24 ? `${Math.floor(hrs)}시간 초과` : `${Math.floor(hrs)}시간`,
      hot: hrs >= 24,
    };
  });

  const chargeItems: QueueItem[] = data.chargeRows.slice(0, 3).map((c) => {
    const hrs = hoursAgo(c.requested_at);
    const name = c.user ? userLabel(c.user) : (c.depositor_name ?? '미상');
    const mismatch = c.depositor_name && c.user?.full_name && c.depositor_name !== c.user.full_name;
    const big = c.amount >= 2_000_000;
    return {
      label: mismatch
        ? `${name} · 본명 불일치`
        : big
          ? `${name} · ${c.amount.toLocaleString('ko-KR')}원 (대용량)`
          : `${name} · ${c.amount.toLocaleString('ko-KR')}원`,
      meta: hrs >= 12 ? `${Math.floor(hrs)}시간` : `${Math.max(1, Math.floor(hrs * 60))}분`,
      hot: !!(mismatch || big),
    };
  });

  const withdrawItems: QueueItem[] = data.withdrawRows.slice(0, 3).map((w) => {
    const hrs = hoursAgo(w.requested_at);
    const name = w.user ? userLabel(w.user) : (w.account_holder ?? '미상');
    return {
      label: `${name} · ${w.amount.toLocaleString('ko-KR')}원`,
      meta: hrs >= 12 ? `${Math.floor(hrs)}시간` : `${Math.max(1, Math.floor(hrs * 60))}분`,
      hot: hrs >= 24,
    };
  });

  const inventoryItems: QueueItem[] = data.inventoryRows.slice(0, 3).map((i) => ({
    label: `${i.agent?.store_name || i.agent?.username || '에이전트'} · ${brandShortLabel(i.sku?.brand)} ${formatDenominationLabel(i.sku?.denomination ?? 0)} × ${i.qty_available}`,
    meta: formatStuck(hoursAgo(i.created_at)) + ' 전',
  }));

  const stuckItems: QueueItem[] = data.stuckPurchaseRows.slice(0, 3).map((r) => {
    const hrs = r.purchased_at ? hoursAgo(r.purchased_at) : 0;
    return {
      label: `${shortId(r.id)} · 구매 확정 대기 ${Math.floor(hrs)}시간`,
      meta: `${(r.unit_price * r.quantity_offered).toLocaleString('ko-KR')}원`,
      hot: hrs >= 48,
    };
  });

  const stamp = new Date().toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <AdminPageHead
        title="대시보드"
        sub={`${stamp} · 처리해야 할 작업 모음`}
        right={<DashboardRefreshButton />}
      />

      {/* Top 지표 strip */}
      <div className="mb-4 flex gap-3">
        <Kpi
          label="오늘 거래액"
          value={`${fmtKRWShort(data.todayVolume)}원`}
          sub={`${data.todayCount}건 · ${deltaText}`}
          tone={ACCENT_BLUE}
        />
        <Kpi
          label="진행 중 거래"
          value={data.activeCount.toLocaleString('ko-KR')}
          sub={`정체 ${stuckBreaches}건`}
          tone={ACCENT_BLUE}
        />
        <Kpi
          label="활성 매물"
          value={data.submittedCount.toLocaleString('ko-KR')}
          sub="권 · P2P + 에이전트 통합"
          tone={ACCENT_GREEN}
        />
        <Kpi
          label="기한 임박"
          value={totalBreaches.toLocaleString('ko-KR')}
          sub={totalBreaches > 0 ? '12시간 이내 처리 필요' : '정상'}
          tone={ACCENT_RED}
        />
      </div>

      {/* Hot alert bar */}
      {hotAlerts.length > 0 && (
        <div
          className="mb-4 flex items-center gap-3 rounded-[10px] px-4 py-3"
          style={{ background: 'rgba(255,82,82,0.06)', border: '1px solid rgba(255,82,82,0.2)' }}
        >
          <span
            className="inline-flex size-[22px] items-center justify-center rounded-full text-[14px] font-extrabold text-white"
            style={{ background: '#FF6B5A' }}
          >
            !
          </span>
          <span className="text-[14px] font-bold">
            지금 처리 필요 —{' '}
            {hotAlerts.map((a, i) => (
              <span key={i}>
                {i > 0 && <span className="text-muted-foreground"> · </span>}
                <b style={{ color: '#dc2626' }}>{a.emphasized}</b>
                <span className="text-muted-foreground ml-1">{a.label}</span>
              </span>
            ))}
          </span>
          <Link
            href="/admin/intake?tab=handed_over"
            className="ml-auto text-[13px] font-extrabold no-underline"
            style={{ color: '#dc2626' }}
          >
            기한 초과 전체 보기 →
          </Link>
        </div>
      )}

      {/* 5 action queues */}
      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        <QueueCard
          title="검수 큐"
          sub="인계됨 → 수령 → 검수완료 → 발송됨"
          count={data.inspectRows.length}
          breaches={inspectBreaches}
          accent={ACCENT_BLUE}
          href="/admin/intake"
          hrefLabel="검수 큐 메뉴에서"
          items={inspectItems}
        />
        <QueueCard
          title="취소 요청"
          sub="승인 시 환불 + 재고 복구"
          count={data.cancelRows.length}
          breaches={cancelBreaches}
          accent={ACCENT_RED}
          href="/admin/cancellations"
          hrefLabel="취소 요청 메뉴에서"
          items={cancelItems}
        />
        <QueueCard
          title="마일리지 충전 승인"
          sub="입금자명 검증 · 200만원 이상 별도 확인"
          count={data.chargeRows.length}
          breaches={0}
          accent={ACCENT_GOLD}
          href="/admin/mileage?tab=charge"
          hrefLabel="마일리지 메뉴에서"
          items={chargeItems}
        />
        <QueueCard
          title="출금 신청"
          sub="실계좌 송금 후 처리 완료"
          count={data.withdrawRows.length}
          breaches={data.withdrawRows.filter((w) => hoursAgo(w.requested_at) >= 24).length}
          accent={ACCENT_GOLD}
          href="/admin/mileage?tab=withdraw"
          hrefLabel="마일리지 메뉴에서"
          items={withdrawItems}
        />
        <QueueCard
          title="위탁 입고"
          sub="에이전트 신규 적재 (최근 24시간)"
          count={data.inventoryRows.length}
          breaches={0}
          accent={ACCENT_GOLD}
          href="/admin/consignments"
          hrefLabel="위탁 입고 메뉴에서"
          items={inventoryItems}
        />
        <QueueCard
          title="거래 정체"
          sub="구매 확정 대기 24시간 이상"
          count={data.stuckPurchaseRows.length}
          breaches={stuckBreaches}
          accent={ACCENT_RED}
          href="/admin/monitor"
          hrefLabel="거래 모니터링 메뉴에서"
          items={stuckItems}
        />
      </div>

      {/* Bottom 2-col */}
      <div className="grid gap-3.5 lg:grid-cols-[2fr_1fr]">
        {/* 오늘의 흐름 */}
        <div className="border-border rounded-[14px] border bg-white p-[18px]">
          <div className="mb-3 flex items-center">
            <span className="text-[14px] font-extrabold">오늘의 흐름</span>
            <Link
              href="/admin/audit"
              className="text-muted-foreground ml-auto text-[12px] font-bold tracking-[0.06em] uppercase no-underline"
            >
              감사 로그 →
            </Link>
          </div>
          <div className="flex flex-col">
            {data.auditRows.length === 0 ? (
              <div className="text-muted-foreground px-2 py-4 text-center text-[14px]">
                최근 활동이 없어요.
              </div>
            ) : (
              data.auditRows.map((ev, i) => {
                const kind = classifyAudit(ev.event, ev.entity_type);
                const color = KIND_COLOR[kind];
                const actorLabel = ev.actor
                  ? ev.actor.username
                    ? `@${ev.actor.username}`
                    : (ev.actor.full_name ?? '시스템')
                  : '시스템';
                return (
                  <div
                    key={ev.id}
                    className="grid items-center gap-3 py-2.5 text-[13px]"
                    style={{
                      gridTemplateColumns: '50px 80px 1fr auto',
                      borderTop: i > 0 ? '1px solid var(--warm-100)' : 0,
                    }}
                  >
                    <span className="text-muted-foreground font-mono font-bold">
                      {new Date(ev.created_at).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="text-muted-foreground truncate text-[12px] font-bold">
                      {actorLabel}
                    </span>
                    <span className="truncate">
                      <span
                        className="mr-2 inline-block rounded-[4px] px-1.5 py-0.5 font-mono text-[12px] font-extrabold text-white"
                        style={{ background: color }}
                      >
                        {ev.entity_type}.{ev.event}
                      </span>
                      <span className="text-foreground">{ev.to_state ?? ''}</span>
                    </span>
                    <span className="text-muted-foreground text-[16px]">›</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick action shortcuts */}
        <div className="rounded-[14px] p-[18px] text-white" style={{ background: '#11161E' }}>
          <div className="mb-3 text-[12px] font-extrabold tracking-[0.08em] text-white/50 uppercase">
            빠른 액션
          </div>
          {[
            {
              label: '＋ 위탁 입고 신규',
              sub: '에이전트 · 권종 · 단가',
              target: '위탁 입고 메뉴',
              href: '/admin/consignments',
            },
            {
              label: '＋ 권종 추가',
              sub: '브랜드 × 권종 · 수수료',
              target: '권종 카탈로그 메뉴',
              href: '/admin/catalog',
            },
            {
              label: '＋ 에이전트 부여',
              sub: '심사 통과 사용자 → 에이전트',
              target: '사용자 메뉴',
              href: '/admin/users?tab=seller',
            },
            { label: '⚙ 분쟁 중재 대기', sub: '서비스 출시 후 활성', target: '비활성', href: null },
          ].map((a, i) => {
            const body = (
              <>
                <div className="text-[14px] font-extrabold text-white">{a.label}</div>
                <div className="mt-0.5 text-[12px] text-white/50">{a.sub}</div>
                <div
                  className="mt-0.5 text-[12px]"
                  style={{ color: a.href ? '#5BA3D0' : 'rgba(255,255,255,0.3)' }}
                >
                  {a.target}
                </div>
              </>
            );
            const wrapperCls = 'block py-3';
            const style = {
              borderTop: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 0,
              opacity: a.href ? 1 : 0.4,
            } as const;
            return a.href ? (
              <Link key={i} href={a.href} className={wrapperCls} style={style}>
                {body}
              </Link>
            ) : (
              <div key={i} className={wrapperCls} style={{ ...style, cursor: 'not-allowed' }}>
                {body}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
