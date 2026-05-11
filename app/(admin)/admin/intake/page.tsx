import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AdminPageHead } from '@/components/admin/admin-shell';
import { R2Pill, R2TabBar, R2TableHead, type R2TabItem } from '@/components/admin/r2';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';
import { shortId } from '@/lib/format';
import type { ListingStatus } from '@/lib/domain/listings';
import {
  MarkReceivedButton,
  MarkVerifiedButton,
  MarkShippedButton,
  ForceCompleteButton,
  AdminCancelButton,
} from './intake-actions';

// NOTE: 일괄 선택 / 일괄 액션 + CSV 내보내기 — 시나리오 미필수, "지원 예정" 라벨링.
//       단건 transition (수령 / 검수 통과 / 발송 / 수신 확인 / 취소) 으로 운영 가능.

type IntakeRow = {
  id: string;
  status: ListingStatus;
  unit_price: number;
  quantity_offered: number;
  pre_verified: boolean;
  shipping_carrier: string | null;
  tracking_no: string | null;
  admin_memo: string | null;
  cancel_reason: string | null;
  purchased_at: string | null;
  handed_over_at: string | null;
  received_at: string | null;
  verified_at: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  seller_id: string;
  buyer_id: string | null;
  seller: { full_name: string | null; username: string | null; store_name: string | null } | null;
  buyer: { full_name: string | null; username: string | null } | null;
  sku: { brand: string; denomination: number; display_name: string } | null;
};

const BRAND_LABEL: Record<string, string> = {
  lotte: '롯데',
  hyundai: '현대',
  shinsegae: '신세계',
  galleria: '갤러리아',
  ak: 'AK',
};

const TAB_DEFS: {
  id: string;
  label: string;
  status: ListingStatus;
  stageAnchor: keyof IntakeRow;
  slaHours: number;
}[] = [
  {
    id: 'handed_over',
    label: '인계 대기',
    status: 'handed_over',
    stageAnchor: 'handed_over_at',
    slaHours: 24,
  },
  {
    id: 'received',
    label: '검수 대기',
    status: 'received',
    stageAnchor: 'received_at',
    slaHours: 24,
  },
  {
    id: 'verified',
    label: '검수 완료',
    status: 'verified',
    stageAnchor: 'verified_at',
    slaHours: 24,
  },
  { id: 'shipped', label: '발송 중', status: 'shipped', stageAnchor: 'shipped_at', slaHours: 72 },
  {
    id: 'completed',
    label: '완료',
    status: 'completed',
    stageAnchor: 'completed_at',
    slaHours: Infinity,
  },
  {
    id: 'cancelled',
    label: '취소',
    status: 'cancelled',
    stageAnchor: 'cancelled_at',
    slaHours: Infinity,
  },
];

const LISTING_SELECT = `
  id, status, unit_price, quantity_offered, pre_verified,
  shipping_carrier, tracking_no, admin_memo, cancel_reason,
  purchased_at, handed_over_at, received_at, verified_at, shipped_at, completed_at, cancelled_at,
  seller_id, buyer_id,
  seller:seller_id(full_name, username, store_name),
  buyer:buyer_id(full_name, username),
  sku:sku_id(brand, denomination, display_name)
` as const;

function hoursAgo(iso: string | null): number {
  if (!iso) return 0;
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

function formatEnterTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtMaskedUser(
  name: string | null | undefined,
  username: string | null | undefined,
): string {
  return username ? `@${username}` : (name ?? '—');
}

export default async function AdminIntakePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tabId = TAB_DEFS.find((t) => t.id === rawTab)?.id ?? 'handed_over';
  const activeTab = TAB_DEFS.find((t) => t.id === tabId)!;

  const supabase = await createSupabaseServerClient();

  const [tabCountsRes, listRes] = await Promise.all([
    Promise.all(
      TAB_DEFS.map((t) =>
        supabase
          .from('listing')
          .select('id', { count: 'exact', head: true })
          .eq('status', t.status),
      ),
    ),
    supabase
      .from('listing')
      .select(LISTING_SELECT)
      .eq('status', activeTab.status)
      .order(activeTab.stageAnchor as string, { ascending: false })
      .limit(100),
  ]);

  const tabCounts = tabCountsRes.map((r) => r.count ?? 0);
  const rows = (listRes.data ?? []) as unknown as IntakeRow[];

  const tabs: R2TabItem[] = TAB_DEFS.map((t, i) => ({
    id: t.id,
    label: t.label,
    count: tabCounts[i],
    href: `/admin/intake?tab=${t.id}`,
  }));

  return (
    <>
      <AdminPageHead
        title="검수 큐"
        sub="인계됨 → 수령 → 검수완료 → 발송됨 — 단계별 일괄 처리"
        right={
          <span className="border-border bg-warm-50 text-muted-foreground inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-dashed px-3 text-[12px] font-bold">
            CSV 내보내기
            <R2Pill tone="neutral">지원 예정</R2Pill>
          </span>
        }
      />

      <R2TabBar items={tabs} active={tabId} />

      {/* Bulk action bar — 지원 예정 (단건 처리로 운영) */}
      <div className="border-border bg-warm-50 text-muted-foreground mb-3.5 flex items-center gap-2.5 rounded-[12px] border border-dashed p-3.5 text-[13px]">
        <div className="border-border size-3.5 rounded-[3px] border-[1.5px] opacity-50" />
        <span>일괄 선택 · 일괄 액션</span>
        <R2Pill tone="neutral">지원 예정</R2Pill>
        <span className="ml-auto text-[12px]">
          단건 액션 ({rows.length}건) 으로 처리 중 — 각 행 우측 버튼 사용
        </span>
      </div>

      <div className="border-border overflow-hidden rounded-[12px] border bg-white">
        <table className="w-full border-collapse text-[14px]">
          <R2TableHead
            cols={['', '매물', '판매자 / 상점', '가격 × 수량', '진입 시각', '처리시한', '액션']}
          />
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-muted-foreground px-4 py-12 text-center text-[14px]"
                >
                  현재 {activeTab.label} 상태인 매물이 없어요.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const anchor = r[activeTab.stageAnchor] as string | null;
                const hrs = hoursAgo(anchor);
                const slaH = Math.floor(hrs);
                const breach = isFinite(activeTab.slaHours) && hrs >= activeTab.slaHours;
                const brand = (r.sku?.brand ?? 'lotte') as Department;
                const face = r.sku?.denomination ?? 0;
                const isAgent = !!r.seller?.store_name;
                const sellerLabel =
                  (isAgent && r.seller?.store_name) ||
                  fmtMaskedUser(r.seller?.full_name, r.seller?.username);
                const lineTotal = r.unit_price * r.quantity_offered;
                return (
                  <tr
                    key={r.id}
                    className="border-warm-100 border-t"
                    style={{ background: breach ? 'rgba(255,82,82,0.04)' : '#fff' }}
                  >
                    <td className="w-[28px] px-4 py-3.5">
                      <div className="border-border size-3.5 rounded-[3px] border-[1.5px]" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <DeptMark dept={brand} size={28} />
                        <div>
                          <div className="text-[13px] font-bold tracking-[-0.008em]">
                            {BRAND_LABEL[brand] ?? brand} {(face / 10000).toLocaleString('ko-KR')}
                            만원권
                          </div>
                          <div className="text-muted-foreground font-mono text-[11px]">
                            {shortId(r.id)}
                          </div>
                          {r.pre_verified && (
                            <span
                              className="mt-1 inline-block text-[10px] font-extrabold"
                              style={{ color: '#1F6B43' }}
                            >
                              [인증]
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {isAgent && <R2Pill tone="warning">AGENT</R2Pill>}
                        <span className="text-[13px] font-bold">{sellerLabel}</span>
                      </div>
                      {r.buyer && (
                        <div className="text-muted-foreground mt-0.5 text-[11px]">
                          → 구매자 {fmtMaskedUser(r.buyer.full_name, r.buyer.username)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums">
                      <div className="font-bold">
                        {r.unit_price.toLocaleString('ko-KR')}원 × {r.quantity_offered}
                      </div>
                      <div className="text-muted-foreground text-[12px] font-bold">
                        = {lineTotal.toLocaleString('ko-KR')}원
                      </div>
                    </td>
                    <td className="text-muted-foreground px-4 py-3.5 text-[12px] tabular-nums">
                      {formatEnterTime(anchor)}
                    </td>
                    <td className="px-4 py-3.5">
                      {breach ? (
                        <R2Pill tone="danger">⚠ {slaH}h 초과</R2Pill>
                      ) : isFinite(activeTab.slaHours) ? (
                        <span className="text-muted-foreground text-[13px] font-bold tabular-nums">
                          {slaH}h 경과
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[12px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                        {r.status === 'handed_over' && <MarkReceivedButton listingId={r.id} />}
                        {r.status === 'received' && <MarkVerifiedButton listingId={r.id} />}
                        {r.status === 'verified' && <MarkShippedButton listingId={r.id} />}
                        {r.status === 'shipped' && (
                          <ForceCompleteButton listingId={r.id} shippedAt={r.shipped_at} />
                        )}
                        {(r.status === 'handed_over' ||
                          r.status === 'received' ||
                          r.status === 'verified') && <AdminCancelButton listingId={r.id} />}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="border-warm-100 bg-warm-50 text-muted-foreground border-t px-4 py-3 text-[12px] tabular-nums">
          {rows.length === 0
            ? '— 건'
            : `1–${rows.length} / ${tabCounts[TAB_DEFS.findIndex((t) => t.id === tabId)]}건`}
          {isFinite(activeTab.slaHours)
            ? ` · 처리시한 ${activeTab.slaHours}시간 이상 적색 표시`
            : ''}
        </div>
      </div>

      {/* 단계별 액션 가이드 */}
      <div className="bg-warm-50 text-muted-foreground mt-4 flex flex-wrap gap-4 rounded-[10px] p-3.5 text-[12px]">
        <span>
          <b className="text-foreground">인계 대기</b> → 수령 처리
        </span>
        <span>
          <b className="text-foreground">검수 대기</b> → 검수 통과 / 검수 실패
        </span>
        <span>
          <b className="text-foreground">검수 완료</b> → 발송 처리 (택배사 dialog)
        </span>
        <span>
          <b className="text-foreground">발송 중</b> → 수신 확인 (수동 완료)
        </span>
      </div>
    </>
  );
}
