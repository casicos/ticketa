import Link from 'next/link';
import { requireAuth } from '@/lib/auth/guards';
import { AdminPageHead, AdminKpi } from '@/components/admin/admin-shell';
import { shortId } from '@/lib/format';
import { GrantRoleButton, RevokeRoleButton } from '../members/member-actions';
import {
  fetchAdminUsers,
  fetchAdminUserCounts,
  fetchAdminUserTxStats,
  type Role,
  type AdminUserWithRoles,
} from '@/lib/domain/admin/users';

// NOTE: 회원 추가 / 상세 사이드 시트 / 등급 필터 — 지원 예정 (등급은 상단 탭이 동일 차원).
//       핵심 (agent/admin role 부여·회수) 은 GrantRoleButton/RevokeRoleButton 으로 작동.
//       거래 수·누적 거래액·가입기간 필터 — 실데이터 연동 완료.

const TIER_COLOR: Record<string, string> = {
  AGENT: '#D4A24C',
  ADMIN: '#5BA3D0',
  SELLER: '#1F6B43',
};

const TAB_OPTIONS = [
  { id: 'all', label: '전체' },
  { id: 'seller', label: 'P2P 셀러' },
  { id: 'agent', label: '에이전트' },
  { id: 'admin', label: '어드민' },
  { id: 'unverified', label: '미인증' },
] as const;

type TabId = (typeof TAB_OPTIONS)[number]['id'];

const PERIOD_OPTIONS = [
  { id: 'all', label: '가입기간 전체', days: 0 },
  { id: '7d', label: '최근 7일', days: 7 },
  { id: '30d', label: '최근 30일', days: 30 },
  { id: '90d', label: '최근 90일', days: 90 },
  { id: '1y', label: '최근 1년', days: 365 },
] as const;

type PeriodId = (typeof PERIOD_OPTIONS)[number]['id'];

function isSynthEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith('@ticketa.local');
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  });
}

async function loadUsers(
  search: string,
  tab: TabId,
  period: PeriodId,
): Promise<AdminUserWithRoles[]> {
  const sinceDays = PERIOD_OPTIONS.find((p) => p.id === period)?.days ?? 0;
  const rows = await fetchAdminUsers({
    search,
    unverifiedOnly: tab === 'unverified',
    sinceDays,
  });

  if (tab === 'agent') return rows.filter((u) => u.roles.includes('agent'));
  if (tab === 'admin') return rows.filter((u) => u.roles.includes('admin'));
  if (tab === 'seller')
    return rows.filter((u) => !u.roles.includes('agent') && !u.roles.includes('admin'));
  return rows;
}

function tierFromRoles(roles: Role[]): { label: string; color: string } {
  if (roles.includes('admin')) return { label: 'ADMIN', color: TIER_COLOR.ADMIN! };
  if (roles.includes('agent')) return { label: 'AGENT', color: TIER_COLOR.AGENT! };
  if (roles.includes('seller')) return { label: 'SELLER', color: TIER_COLOR.SELLER! };
  return { label: 'GUEST', color: '#9CA8B8' };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawQ = Array.isArray(params.q) ? params.q[0] : params.q;
  const search = rawQ ?? '';
  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab: TabId = (TAB_OPTIONS.find((t) => t.id === rawTab)?.id ?? 'all') as TabId;
  const rawPeriod = Array.isArray(params.period) ? params.period[0] : params.period;
  const period: PeriodId = (PERIOD_OPTIONS.find((p) => p.id === rawPeriod)?.id ??
    'all') as PeriodId;

  const [users, counts, txStats, currentUser] = await Promise.all([
    loadUsers(search, tab, period),
    fetchAdminUserCounts(),
    fetchAdminUserTxStats(),
    requireAuth(),
  ]);

  const tabCounts = {
    all: counts.total,
    agent: counts.agents,
    admin: counts.admins,
    seller: Math.max(counts.total - counts.agents - counts.admins, 0),
    unverified: counts.total - counts.verified,
  } as const;

  // X 버튼: q 만 제거, tab + period 유지
  const clearSearchQs = new URLSearchParams();
  clearSearchQs.set('tab', tab);
  if (period !== 'all') clearSearchQs.set('period', period);
  const clearSearchHref = `/admin/users?${clearSearchQs.toString()}`;

  return (
    <>
      <AdminPageHead
        title="사용자 관리"
        sub="회원 검색 · 등급 / 한도 / 제재 · 에이전트 승인"
        right={
          <span className="border-border bg-warm-50 text-muted-foreground inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-dashed px-3 text-[13px] font-bold">
            + 회원 추가
            <span
              className="rounded-full px-2 py-0.5 text-[12px] font-extrabold"
              style={{ background: 'rgba(120,115,108,0.12)', color: '#57534e' }}
            >
              지원 예정
            </span>
          </span>
        }
      />

      <div className="mb-4 grid grid-cols-5 gap-3">
        <AdminKpi l="총 회원" v={counts.total} d="누적" />
        <AdminKpi
          l="본인인증 완료"
          v={counts.verified}
          d={counts.total ? `${Math.round((counts.verified / counts.total) * 100)}%` : '0%'}
        />
        <AdminKpi l="에이전트" v={counts.agents} d="활성 권한" />
        <AdminKpi l="어드민" v={counts.admins} d="활성 권한" />
        <AdminKpi
          l="미인증"
          v={counts.total - counts.verified}
          d={counts.total - counts.verified > 0 ? '본인인증 미완료' : '없음'}
          tone={counts.total - counts.verified > 0 ? 'warn' : 'ok'}
        />
      </div>

      {/* Tabs + search */}
      <div className="border-border mb-3.5 overflow-hidden rounded-[12px] border bg-white">
        <div className="border-border flex gap-1 border-b px-4">
          {TAB_OPTIONS.map((t) => {
            const active = t.id === tab;
            const qs = new URLSearchParams();
            qs.set('tab', t.id);
            if (search) qs.set('q', search);
            if (period !== 'all') qs.set('period', period);
            const href = `/admin/users?${qs.toString()}`;
            return (
              <Link
                key={t.id}
                href={href}
                className="-mb-px inline-flex items-center gap-1.5 border-b-2 px-3.5 py-3 text-[14px] font-extrabold transition-colors"
                style={{
                  color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
                  borderColor: active ? 'var(--foreground)' : 'transparent',
                }}
              >
                {t.label}
                {tabCounts[t.id] > 0 && (
                  <span
                    className="rounded-full px-1.5 text-[12px] font-extrabold tabular-nums"
                    style={{
                      background: active ? 'var(--foreground)' : 'var(--warm-100)',
                      color: active ? '#fff' : 'var(--muted-foreground)',
                    }}
                  >
                    {tabCounts[t.id].toLocaleString('ko-KR')}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        <form className="flex items-center gap-2.5 p-3.5" method="get">
          <input type="hidden" name="tab" value={tab} />
          <div className="border-border bg-warm-50 relative flex h-9 flex-1 items-center gap-2 rounded-[8px] border px-3">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted-foreground"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4.35-4.35" />
            </svg>
            <input
              key={`q-${search}`}
              name="q"
              defaultValue={search}
              placeholder="이름 · 회원ID · 휴대폰 · 이메일 · 닉네임"
              className="placeholder:text-muted-foreground flex-1 border-0 bg-transparent text-[14px] outline-none"
            />
            {search && (
              <Link
                href={clearSearchHref}
                title="검색어 지우기"
                aria-label="검색어 지우기"
                className="text-muted-foreground hover:bg-warm-100 hover:text-foreground grid size-5 place-items-center rounded-full"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </Link>
            )}
          </div>
          <button
            type="submit"
            className="border-border hover:bg-warm-50 h-9 rounded-[8px] border bg-white px-3.5 text-[14px] font-bold"
          >
            검색
          </button>
          <select
            key={`period-${period}`}
            name="period"
            defaultValue={period}
            title="가입기간 필터"
            className="border-border text-foreground hover:bg-warm-50 h-9 cursor-pointer rounded-[8px] border bg-white px-2.5 text-[13px] font-bold focus:outline-none"
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <span
            title="등급 필터 — 지원 예정 (상단 탭이 동일 기능 제공)"
            className="border-border bg-warm-50 text-muted-foreground inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-[8px] border border-dashed px-3 text-[13px] font-bold"
          >
            등급
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
            <span
              className="rounded-full px-1.5 text-[12px] font-extrabold"
              style={{ background: 'rgba(120,115,108,0.12)', color: '#57534e' }}
            >
              지원 예정
            </span>
          </span>
          {(search || period !== 'all') && (
            <Link
              href={`/admin/users?tab=${tab}`}
              className="text-muted-foreground text-[13px] hover:underline"
            >
              초기화
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="border-border overflow-hidden rounded-[12px] border bg-white">
        <table className="w-full border-collapse text-[14px]">
          <thead className="bg-warm-50">
            <tr>
              {[
                '회원',
                '회원ID',
                '등급',
                '본인인증',
                '거래 수',
                '누적 거래액',
                '가입일',
                '권한 관리',
                '상세',
              ].map((h) => (
                <th
                  key={h}
                  className="text-muted-foreground px-3.5 py-3 text-left text-[13px] font-extrabold tracking-[0.06em] uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="text-muted-foreground px-4 py-12 text-center text-[14px]"
                >
                  조회 결과가 없어요.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const tier = tierFromRoles(u.roles);
                const stats = txStats.get(u.id);
                const txCount = stats?.tx_count ?? 0;
                const txVolume = stats?.tx_volume ?? 0;
                const userLabel =
                  u.username ||
                  u.full_name ||
                  (isSynthEmail(u.email) ? null : u.email) ||
                  shortId(u.id);
                const realEmail = !isSynthEmail(u.email) ? u.email : null;
                const initial = (u.full_name?.[0] || u.username?.[0] || '?').toUpperCase();
                const isAgent = u.roles.includes('agent');
                const isAdmin = u.roles.includes('admin');
                const isSelf = u.id === currentUser.id;
                return (
                  <tr key={u.id} className="border-warm-100 border-t">
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex size-8 items-center justify-center rounded-full text-[14px] font-extrabold"
                          style={{
                            background: isAgent
                              ? 'linear-gradient(135deg, #D4A24C, #B6862E)'
                              : isAdmin
                                ? 'linear-gradient(135deg, #5BA3D0, #3F84B0)'
                                : 'linear-gradient(135deg, #FCE9C8, #D4A24C)',
                            color: isAgent || isAdmin ? '#fff' : '#11161E',
                          }}
                        >
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-extrabold">
                            {u.full_name || userLabel}
                          </div>
                          {u.store_name && (
                            <div className="text-muted-foreground truncate text-[13px]">
                              {u.store_name}
                            </div>
                          )}
                          {realEmail && (
                            <div className="text-muted-foreground truncate font-mono text-[12px]">
                              {realEmail}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-muted-foreground px-3.5 py-3 font-mono text-[13px]">
                      {u.username ? `@${u.username}` : shortId(u.id)}
                      {u.nickname && (
                        <div className="text-foreground font-mono text-[12px]">★ {u.nickname}</div>
                      )}
                    </td>
                    <td className="px-3.5 py-3">
                      <span
                        className="inline-flex items-center rounded-[4px] px-1.5 py-0.5 text-[12px] font-extrabold tracking-[0.06em] text-white"
                        style={{
                          background:
                            tier.label === 'AGENT' || tier.label === 'ADMIN'
                              ? `linear-gradient(135deg, ${tier.color}, ${tier.color}cc)`
                              : tier.color + '22',
                          color:
                            tier.label === 'AGENT' || tier.label === 'ADMIN' ? '#fff' : tier.color,
                        }}
                      >
                        {tier.label}
                      </span>
                    </td>
                    <td className="px-3.5 py-3">
                      {u.phone_verified ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-extrabold"
                          style={{ color: '#1F6B43', background: 'rgba(31,107,67,0.12)' }}
                        >
                          <span className="size-1.5 rounded-full bg-[#1F6B43]" />
                          인증
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-extrabold"
                          style={{ color: '#8C8278', background: 'var(--warm-100)' }}
                        >
                          미인증
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-[13px] tabular-nums">
                      {txCount > 0 ? (
                        <span className="text-foreground font-extrabold">
                          {txCount.toLocaleString('ko-KR')}건
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-[13px] tabular-nums">
                      {txVolume > 0 ? (
                        <span className="text-foreground font-extrabold">
                          {Math.round(txVolume / 10000).toLocaleString('ko-KR')}만
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="text-muted-foreground px-3.5 py-3 text-[13px] tabular-nums">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {isAgent ? (
                          <RevokeRoleButton
                            userId={u.id}
                            role="agent"
                            userLabel={userLabel ?? ''}
                          />
                        ) : (
                          <GrantRoleButton userId={u.id} role="agent" userLabel={userLabel ?? ''} />
                        )}
                        {isAdmin ? (
                          <RevokeRoleButton
                            userId={u.id}
                            role="admin"
                            userLabel={userLabel ?? ''}
                            disabled={isSelf}
                            disabledReason={
                              isSelf ? '자기 자신의 admin 권한은 회수할 수 없어요' : undefined
                            }
                          />
                        ) : (
                          <GrantRoleButton userId={u.id} role="admin" userLabel={userLabel ?? ''} />
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <span
                        title="회원 상세 — 지원 예정"
                        className="border-border bg-warm-50 text-muted-foreground inline-flex h-7 cursor-not-allowed items-center rounded-[6px] border border-dashed px-2.5 text-[12px] font-bold"
                      >
                        상세 → 지원 예정
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
