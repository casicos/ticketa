import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AdminPageHead } from '@/components/admin/admin-shell';
import { R2Pill, R2TabBar, type R2TabItem } from '@/components/admin/r2';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';
import { shortId } from '@/lib/format';
import { LISTING_STATUS_LABELS, type ListingStatus } from '@/lib/domain/listings';
import { ApproveCancellationButton, RejectCancellationButton } from './cancellation-actions';

type CancellationRow = {
  id: number;
  listing_id: string;
  requested_by: string;
  role_at_request: 'seller' | 'buyer';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  resolved_at: string | null;
  admin_memo: string | null;
  requester: {
    full_name: string | null;
    username: string | null;
    store_name: string | null;
  } | null;
  listing: {
    id: string;
    status: ListingStatus;
    unit_price: number;
    quantity_offered: number;
    sku: { brand: string; denomination: number; display_name: string } | null;
  } | null;
};

const TAB_DEFS: { id: string; label: string }[] = [
  { id: 'pending', label: '대기' },
  { id: 'done', label: '처리됨' },
];

const SLA_HOURS = 24;

function hoursAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const SELECT = `
  id, listing_id, requested_by, role_at_request, reason, status,
  requested_at, resolved_at, admin_memo,
  requester:requested_by(full_name, username, store_name),
  listing:listing_id(id, status, unit_price, quantity_offered, sku:sku_id(brand, denomination, display_name))
` as const;

export default async function AdminCancellationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tabId = TAB_DEFS.find((t) => t.id === rawTab)?.id ?? 'pending';

  const supabase = await createSupabaseServerClient();

  const [pendingRes, doneRes] = await Promise.all([
    supabase
      .from('cancellation_requests')
      .select(SELECT)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })
      .limit(50),
    supabase
      .from('cancellation_requests')
      .select(SELECT)
      .in('status', ['approved', 'rejected'])
      .order('resolved_at', { ascending: false })
      .limit(20),
  ]);

  const pending = (pendingRes.data ?? []) as unknown as CancellationRow[];
  const done = (doneRes.data ?? []) as unknown as CancellationRow[];

  const tabs: R2TabItem[] = TAB_DEFS.map((t) => ({
    id: t.id,
    label: t.label,
    count: t.id === 'pending' ? pending.length : done.length,
    href: `/admin/cancellations?tab=${t.id}`,
  }));

  const rows = tabId === 'pending' ? pending : done;

  return (
    <>
      <AdminPageHead title="취소 요청" sub="매물취소 — 승인 시 cash 환불 + agent_inventory 복구" />

      <R2TabBar items={tabs} active={tabId} />

      {rows.length === 0 ? (
        <div className="border-border rounded-[14px] border border-dashed bg-white p-12 text-center">
          <p className="text-[15px] font-bold">
            {tabId === 'pending' ? '대기 중인 취소 요청이 없어요' : '처리 내역이 없어요'}
          </p>
          <p className="text-muted-foreground mt-1 text-[14px]">
            {tabId === 'pending'
              ? '사용자가 취소를 요청하면 여기에 표시돼요.'
              : '승인 또는 반려된 취소 요청이 여기에 모입니다.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {rows.map((c) => {
            const sla = Math.floor(hoursAgo(c.requested_at));
            const breach = c.status === 'pending' && sla >= SLA_HOURS;
            const sku = c.listing?.sku;
            const brand = (sku?.brand ?? 'lotte') as Department;
            const face = sku?.denomination ?? 0;
            const requesterName =
              c.requester?.store_name ||
              c.requester?.full_name ||
              c.requester?.username ||
              c.requested_by.slice(0, 8);
            const isAgent = !!c.requester?.store_name;
            const refundAmount =
              c.listing != null ? c.listing.unit_price * c.listing.quantity_offered : null;
            const stateLabel = c.listing
              ? (LISTING_STATUS_LABELS[c.listing.status] ?? c.listing.status)
              : '—';

            return (
              <div
                key={c.id}
                className="border-border flex overflow-hidden rounded-[14px] border bg-white"
              >
                <div
                  className="w-1.5 shrink-0"
                  style={{
                    background:
                      c.status === 'pending'
                        ? breach
                          ? 'var(--destructive)'
                          : 'var(--warm-200)'
                        : c.status === 'approved'
                          ? '#1F6B43'
                          : '#8C8278',
                  }}
                />
                <div className="flex-1 px-5 py-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2.5">
                    <span className="text-muted-foreground font-mono text-[12px] font-bold">
                      CN-{c.id.toString().padStart(5, '0')}
                    </span>
                    <R2Pill tone={c.role_at_request === 'buyer' ? 'progress' : 'warning'}>
                      {c.role_at_request === 'buyer' ? '구매자' : '판매자'} 요청
                    </R2Pill>
                    {c.status === 'pending' && breach && (
                      <R2Pill tone="danger">⚠ 처리시한 {sla}h 초과</R2Pill>
                    )}
                    {c.status === 'pending' && !breach && (
                      <span className="text-muted-foreground text-[12px] tabular-nums">
                        {sla}h 경과 · {formatTime(c.requested_at)}
                      </span>
                    )}
                    {c.status !== 'pending' && (
                      <R2Pill tone={c.status === 'approved' ? 'success' : 'neutral'}>
                        {c.status === 'approved' ? '승인 완료' : '반려'}
                      </R2Pill>
                    )}
                    {c.status === 'pending' && (
                      <div className="ml-auto flex gap-2">
                        <RejectCancellationButton requestId={c.id} />
                        <ApproveCancellationButton
                          requestId={c.id}
                          refundAmount={refundAmount}
                          listingShortId={shortId(c.listing_id)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid gap-6 md:grid-cols-[1fr_1.3fr]">
                    <div>
                      <div className="mb-3 flex items-center gap-2.5">
                        <div
                          className="flex size-9 items-center justify-center rounded-full text-[14px] font-extrabold"
                          style={{
                            background: isAgent
                              ? 'linear-gradient(135deg, #D4A24C, #B6862E)'
                              : 'var(--warm-200)',
                            color: isAgent ? '#fff' : 'var(--warm-700)',
                          }}
                        >
                          {requesterName[0]}
                        </div>
                        <div>
                          <div className="text-[14px] font-extrabold">{requesterName}</div>
                          <div className="text-muted-foreground font-mono text-[11px]">
                            {c.requester?.username
                              ? `@${c.requester.username}`
                              : c.requested_by.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                      {c.listing && (
                        <div className="bg-warm-50 flex items-center gap-2.5 rounded-[10px] px-3.5 py-3">
                          <DeptMark dept={brand} size={32} />
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-extrabold">
                              {(face / 10000).toLocaleString('ko-KR')}만원권
                            </div>
                            <div className="text-muted-foreground font-mono text-[11px]">
                              {shortId(c.listing_id)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[15px] font-extrabold tabular-nums">
                              {refundAmount?.toLocaleString('ko-KR') ?? '—'}원
                            </div>
                            <R2Pill tone="progress">{stateLabel}</R2Pill>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-muted-foreground mb-1.5 text-[10px] font-extrabold tracking-[0.06em] uppercase">
                        요청 사유
                      </div>
                      <div className="mb-2.5 text-[14px] leading-[1.6]">
                        &ldquo;{c.reason}&rdquo;
                      </div>
                      {c.admin_memo && (
                        <div className="bg-warm-50 text-muted-foreground rounded-[8px] px-3 py-2 text-[12px]">
                          <b className="text-foreground">어드민 메모:</b> {c.admin_memo}
                        </div>
                      )}
                    </div>
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
