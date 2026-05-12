import { AdminPageHead, AdminKpi } from '@/components/admin/admin-shell';
import { R2Pill } from '@/components/admin/r2';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';
import { shortId } from '@/lib/format';
import { fetchAdminListings } from '@/lib/domain/admin/listings';

// NOTE: 검색·필터·CSV·일괄·강제비공개·페이지네이션 — 시나리오 미필수, "지원 예정" 라벨.
//       매물 상태 관리는 /admin/intake (단계별 처리) + /admin/cancellations (취소) 에서 진행.

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

const STATUS_VARIANT: Record<
  string,
  { label: string; color: string; bg: string; dotColor?: string }
> = {
  submitted: { label: '판매중', color: '#1F6B43', bg: 'rgba(31,107,67,0.12)' },
  purchased: { label: '거래중', color: '#5BA3D0', bg: 'rgba(91,163,208,0.12)' },
  handed_over: { label: '인계', color: '#8C6321', bg: 'rgba(212,162,76,0.14)' },
  received: { label: '검수중', color: '#8C6321', bg: 'rgba(212,162,76,0.14)' },
  verified: { label: '검수완료', color: '#1F6B43', bg: 'rgba(31,107,67,0.12)' },
  shipped: { label: '발송중', color: '#5BA3D0', bg: 'rgba(91,163,208,0.12)' },
  completed: { label: '완료', color: '#74695C', bg: 'rgba(140,130,120,0.14)' },
  cancelled: { label: '강제비공개', color: '#C74937', bg: 'rgba(199,73,55,0.10)' },
};

function StatusPill({ status }: { status: string }) {
  const v = STATUS_VARIANT[status] ?? STATUS_VARIANT.completed!;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[13px] font-extrabold tracking-[0.02em]"
      style={{ color: v.color, background: v.bg }}
    >
      <span className="size-1.5 rounded-full" style={{ background: v.color }} />
      {v.label}
    </span>
  );
}

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}분`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간`;
  const days = Math.floor(hours / 24);
  return `${days}일`;
}

export default async function AdminListingsPage() {
  const { rows: listings, agentSellerIds } = await fetchAdminListings();

  const total = listings.length;
  const agentCount = listings.filter((l) => agentSellerIds.has(l.seller_id)).length;
  const p2pCount = total - agentCount;
  const flaggedCount = listings.filter(
    (l) => l.admin_memo && l.admin_memo.startsWith('[판매자요청]'),
  ).length;
  const cancelledCount = listings.filter((l) => l.status === 'cancelled').length;

  return (
    <>
      <AdminPageHead
        title="매물 관리"
        sub="등록된 모든 매물 — 검색·강제 비공개·정산 조정"
        right={
          <div className="flex items-center gap-2">
            <span className="border-border bg-warm-50 text-muted-foreground inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-dashed px-3 text-[13px] font-bold">
              CSV · 일괄 작업
              <R2Pill tone="neutral">지원 예정</R2Pill>
            </span>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-5 gap-3">
        <AdminKpi l="전체 매물" v={total} d={`최근 ${total}건 기준`} />
        <AdminKpi
          l="P2P 매물"
          v={p2pCount}
          d={total ? `${Math.round((p2pCount / total) * 100)}%` : '0%'}
        />
        <AdminKpi
          l="에이전트 매물"
          v={agentCount}
          d={total ? `${Math.round((agentCount / total) * 100)}%` : '0%'}
        />
        <AdminKpi
          l="내림 요청"
          v={flaggedCount}
          d={flaggedCount > 0 ? '처리 필요' : '0'}
          tone={flaggedCount > 0 ? 'warn' : 'ok'}
        />
        <AdminKpi
          l="강제 비공개"
          v={cancelledCount}
          d={cancelledCount > 0 ? '취소된 매물' : '없음'}
          tone={cancelledCount > 0 ? 'err' : 'ok'}
        />
      </div>

      {/* Filter bar — 지원 예정 (시나리오 단계에서는 최근 100건 자동 노출) */}
      <div className="border-border bg-warm-50 text-muted-foreground mb-3.5 flex flex-wrap items-center gap-2.5 rounded-[12px] border border-dashed p-3.5 text-[13px]">
        <span>검색 · 셀러유형 · 백화점 · 권종 · 상태 필터</span>
        <R2Pill tone="neutral">지원 예정</R2Pill>
        <span className="ml-auto">최근 등록 100건 자동 노출 중</span>
      </div>

      {/* Table */}
      <div className="border-border overflow-hidden rounded-[12px] border bg-white">
        <table className="w-full border-collapse text-[14px]">
          <thead className="bg-warm-50">
            <tr>
              {['', 'ID', '백화점', '권종', '호가 · 수량', '셀러', '상태', '경과', ''].map(
                (h, i) => (
                  <th
                    key={i}
                    className="text-muted-foreground px-3 py-3 text-left text-[13px] font-extrabold tracking-[0.06em] uppercase"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {listings.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="text-muted-foreground px-4 py-12 text-center text-[14px]"
                >
                  최근 등록된 매물이 없어요.
                </td>
              </tr>
            ) : (
              listings.map((r) => {
                const isFlagged = r.admin_memo && r.admin_memo.startsWith('[판매자요청]');
                const isAgent = agentSellerIds.has(r.seller_id);
                const brand = r.sku?.brand ?? '';
                const dept = BRAND_TO_DEPT[brand];
                const sellerLabel =
                  (isAgent && r.seller?.store_name) ||
                  r.seller?.full_name ||
                  r.seller?.username ||
                  shortId(r.seller_id);
                const face = r.sku?.denomination ?? 0;
                const discountPct = face > 0 ? ((face - r.unit_price) / face) * 100 : 0;
                return (
                  <tr
                    key={r.id}
                    className="border-warm-100 border-t"
                    style={{ background: isFlagged ? 'rgba(199,73,55,0.04)' : '#fff' }}
                  >
                    <td className="w-[34px] px-3 py-3">
                      <div className="border-border size-3.5 rounded-[3px] border-[1.5px]" />
                    </td>
                    <td className="px-3 py-3 font-mono text-[14px] font-bold">{shortId(r.id)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {dept ? <DeptMark dept={dept} size={22} /> : null}
                        <span className="text-[14px] font-bold">{shortBrandLabel(brand)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-bold tabular-nums">
                      {face.toLocaleString('ko-KR')}원
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-extrabold tabular-nums">
                        {r.unit_price.toLocaleString('ko-KR')}원
                      </div>
                      <div className="flex items-center gap-2 text-[13px]">
                        {discountPct > 0 ? (
                          <span style={{ color: '#1F6B43', fontWeight: 700 }}>
                            −{discountPct.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">액면</span>
                        )}
                        <span className="text-muted-foreground">
                          × {r.quantity_offered.toLocaleString('ko-KR')}매
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        {isAgent && (
                          <span
                            className="rounded-[3px] px-1.5 py-0.5 text-[12px] font-extrabold tracking-[0.06em] text-white"
                            style={{
                              background: 'linear-gradient(135deg, #D4A24C, #B6862E)',
                            }}
                          >
                            AGENT
                          </span>
                        )}
                        <span className="text-[14px] font-bold">{sellerLabel}</span>
                      </div>
                      {r.seller?.username && (
                        <div className="text-muted-foreground font-mono text-[12px]">
                          @{r.seller.username}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill status={r.status} />
                      {r.pre_verified && r.verified_at && (
                        <div
                          className="mt-1 text-[12px] font-extrabold"
                          style={{ color: '#1F6B43' }}
                        >
                          인증 매물
                        </div>
                      )}
                      {isFlagged && (
                        <div className="text-destructive mt-1 text-[12px] font-extrabold">
                          ⚠ 내림 요청
                        </div>
                      )}
                    </td>
                    <td className="text-muted-foreground px-3 py-3 text-[13px] tabular-nums">
                      {formatAge(r.submitted_at)}
                    </td>
                    <td className="text-muted-foreground px-3 py-3 text-right text-[13px]">—</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="border-warm-100 bg-warm-50 flex items-center justify-between border-t px-4 py-3 text-[14px]">
          <span className="text-muted-foreground tabular-nums">
            1 — {listings.length}건 / 최근 100건 한도
          </span>
          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[12px]">
            페이지네이션
            <R2Pill tone="neutral">지원 예정</R2Pill>
          </span>
        </div>
      </div>
    </>
  );
}
