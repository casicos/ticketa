import { AdminPageHead } from '@/components/admin/admin-shell';
import { R2Pill, R2TabBar, R2TableHead, type R2TabItem } from '@/components/admin/r2';
import { SkuMark } from '@/components/ticketa/sku-mark';
import { brandShortLabel } from '@/components/ticketa/dept-mark';
import { shortId } from '@/lib/format';
import type { ListingStatus } from '@/lib/domain/listings';
import {
  fetchAdminIntakeByStatus,
  fetchAdminIntakeCounts,
  type IntakeRow,
} from '@/lib/domain/admin/intake';
import {
  MarkReceivedButton,
  MarkVerifiedButton,
  MarkShippedButton,
  ForceCompleteButton,
  AdminCancelButton,
} from './intake-actions';

// NOTE: 일괄 선택 / 일괄 액션 + CSV 내보내기 — 시나리오 미필수, "지원 예정" 라벨링.
//       단건 transition (수령 / 검수 통과 / 발송 / 수신 확인 / 취소) 으로 운영 가능.

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

  const [tabCounts, rows] = await Promise.all([
    fetchAdminIntakeCounts(TAB_DEFS.map((t) => t.status)),
    fetchAdminIntakeByStatus(activeTab.status, activeTab.stageAnchor as string),
  ]);

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
          <span className="border-border bg-warm-50 text-muted-foreground inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-dashed px-3 text-[13px] font-bold">
            CSV 내보내기
            <R2Pill tone="neutral">지원 예정</R2Pill>
          </span>
        }
      />

      <R2TabBar items={tabs} active={tabId} />

      {/* Bulk action bar — 지원 예정 (단건 처리로 운영) */}
      <div className="border-border bg-warm-50 text-muted-foreground mb-3.5 flex items-center gap-2.5 rounded-[12px] border border-dashed p-3.5 text-[14px]">
        <div className="border-border size-3.5 rounded-[3px] border-[1.5px] opacity-50" />
        <span>일괄 선택 · 일괄 액션</span>
        <R2Pill tone="neutral">지원 예정</R2Pill>
        <span className="ml-auto text-[13px]">
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
                const brand = r.sku?.brand ?? '';
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
                        <SkuMark
                          thumbnailUrl={r.sku?.thumbnail_url ?? null}
                          brand={brand}
                          size={28}
                        />
                        <div>
                          <div className="text-[14px] font-bold tracking-[-0.008em]">
                            {brandShortLabel(brand)} {(face / 10000).toLocaleString('ko-KR')}
                            만원권
                          </div>
                          <div className="text-muted-foreground font-mono text-[12px]">
                            {shortId(r.id)}
                          </div>
                          {r.pre_verified && (
                            <span
                              className="mt-1 inline-block text-[12px] font-extrabold"
                              style={{ color: '#1F6B43' }}
                            >
                              인증
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {isAgent && <R2Pill tone="warning">AGENT</R2Pill>}
                        <span className="text-[14px] font-bold">{sellerLabel}</span>
                      </div>
                      {r.buyer && (
                        <div className="text-muted-foreground mt-0.5 text-[12px]">
                          → 구매자 {fmtMaskedUser(r.buyer.full_name, r.buyer.username)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums">
                      <div className="font-bold">
                        {r.unit_price.toLocaleString('ko-KR')}원 × {r.quantity_offered}
                      </div>
                      <div className="text-muted-foreground text-[13px] font-bold">
                        = {lineTotal.toLocaleString('ko-KR')}원
                      </div>
                    </td>
                    <td className="text-muted-foreground px-4 py-3.5 text-[13px] tabular-nums">
                      {formatEnterTime(anchor)}
                    </td>
                    <td className="px-4 py-3.5">
                      {breach ? (
                        <R2Pill tone="danger">⚠ {slaH}h 초과</R2Pill>
                      ) : isFinite(activeTab.slaHours) ? (
                        <span className="text-muted-foreground text-[14px] font-bold tabular-nums">
                          {slaH}h 경과
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[13px]">—</span>
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
        <div className="border-warm-100 bg-warm-50 text-muted-foreground border-t px-4 py-3 text-[13px] tabular-nums">
          {rows.length === 0
            ? '— 건'
            : `1–${rows.length} / ${tabCounts[TAB_DEFS.findIndex((t) => t.id === tabId)]}건`}
          {isFinite(activeTab.slaHours)
            ? ` · 처리시한 ${activeTab.slaHours}시간 이상 적색 표시`
            : ''}
        </div>
      </div>

      {/* 단계별 액션 가이드 */}
      <div className="bg-warm-50 text-muted-foreground mt-4 flex flex-wrap gap-4 rounded-[10px] p-3.5 text-[13px]">
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
