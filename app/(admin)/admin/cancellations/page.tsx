import Image from 'next/image';
import { AdminPageHead } from '@/components/admin/admin-shell';
import { R2Pill, R2TabBar, type R2TabItem } from '@/components/admin/r2';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';
import { shortId, formatDenominationLabel } from '@/lib/format';
import { LISTING_STATUS_LABELS } from '@/lib/domain/listings';
import { fetchCancellations } from '@/lib/domain/admin/cancellations';
import { ApproveCancellationButton, RejectCancellationButton } from './cancellation-actions';

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

export default async function AdminCancellationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tabId = TAB_DEFS.find((t) => t.id === rawTab)?.id ?? 'pending';

  const { pending, done } = await fetchCancellations();

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
            const brandRaw = sku?.brand ?? '';
            const dept = BRAND_TO_DEPT[brandRaw];
            const thumb = sku?.thumbnail_url ?? null;
            const face = sku?.denomination ?? 0;
            const skuLabel = sku
              ? `${shortBrandLabel(brandRaw)} ${formatDenominationLabel(face)}`
              : '알 수 없는 상품권';
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
                    <span className="text-muted-foreground font-mono text-[13px] font-bold">
                      CN-{c.id.toString().padStart(5, '0')}
                    </span>
                    <R2Pill tone={c.role_at_request === 'buyer' ? 'progress' : 'warning'}>
                      {c.role_at_request === 'buyer' ? '구매자' : '판매자'} 요청
                    </R2Pill>
                    {c.status === 'pending' && breach && (
                      <R2Pill tone="danger">⚠ 처리시한 {sla}h 초과</R2Pill>
                    )}
                    {c.status === 'pending' && !breach && (
                      <span className="text-muted-foreground text-[13px] tabular-nums">
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
                          <div className="text-muted-foreground font-mono text-[12px]">
                            {c.requester?.username
                              ? `@${c.requester.username}`
                              : c.requested_by.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                      {c.listing && (
                        <div className="bg-warm-50 flex items-center gap-2.5 rounded-[10px] px-3.5 py-3">
                          {thumb ? (
                            <div className="border-warm-200 relative size-9 shrink-0 overflow-hidden rounded-[8px] border bg-white">
                              <Image
                                src={thumb}
                                alt={skuLabel}
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                            </div>
                          ) : dept ? (
                            <DeptMark dept={dept} size={36} />
                          ) : (
                            <DeptMark dept={brandRaw} size={36} />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-[14px] font-extrabold">{skuLabel}</div>
                            <div className="text-muted-foreground font-mono text-[12px]">
                              {shortId(c.listing_id)} · {c.listing.quantity_offered}매
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
                      <div className="text-muted-foreground mb-1.5 text-[12px] font-extrabold tracking-[0.06em] uppercase">
                        요청 사유
                      </div>
                      <div className="mb-2.5 text-[14px] leading-[1.6]">
                        &ldquo;{c.reason}&rdquo;
                      </div>
                      {c.admin_memo && (
                        <div className="bg-warm-50 text-muted-foreground rounded-[8px] px-3 py-2 text-[13px]">
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
