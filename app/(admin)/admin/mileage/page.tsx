import Link from 'next/link';
import { AdminPageHead } from '@/components/admin/admin-shell';
import { R2Pill, R2TabBar, R2TableHead, type R2TabItem } from '@/components/admin/r2';
import { bankNameByCode } from '@/lib/domain/banks';
import { shortId } from '@/lib/format';
import {
  fetchPendingCharges,
  fetchOpenWithdraws,
  searchUsersWithBalance,
  fetchUserLedger,
  type ChargeRequestRow as ChargeRow,
  type WithdrawRequestRow as WithdrawRow,
  type UserBalance,
  type LedgerEntry,
} from '@/lib/domain/admin/mileage';
import { ConfirmChargeButton, RejectChargeButton, ResolveWithdrawButton } from './mileage-actions';

// NOTE: 적립 버킷은 method 기반 자동 결정 (bank_transfer → cash, pg → pg_locked) — 시나리오 진행 충분.
//       어드민 override 라디오 / 사용자 잔액 검색 탭 / 자동 3초 갱신은 "지원 예정".

const TAB_DEFS: { id: string; label: string; href: string }[] = [
  { id: 'charge', label: '충전 승인', href: '/admin/mileage?tab=charge' },
  { id: 'withdraw', label: '출금 처리', href: '/admin/mileage?tab=withdraw' },
  { id: 'balance', label: '사용자 잔액 검색', href: '/admin/mileage?tab=balance' },
];

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

export default async function AdminMileagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tabId = TAB_DEFS.find((t) => t.id === rawTab)?.id ?? 'charge';
  const rawQ = Array.isArray(params.q) ? params.q[0] : params.q;
  const balanceQ = (rawQ ?? '').trim();
  const rawUserId = Array.isArray(params.user) ? params.user[0] : params.user;
  const focusedUserId = rawUserId ?? null;

  const [charges, withdraws] = await Promise.all([fetchPendingCharges(), fetchOpenWithdraws()]);

  const tabs: R2TabItem[] = TAB_DEFS.map((t) => ({
    id: t.id,
    label: t.label,
    href: t.href,
    count: t.id === 'charge' ? charges.length : t.id === 'withdraw' ? withdraws.length : undefined,
  }));

  let balanceResults: UserBalance[] = [];
  let focusedUser: UserBalance | null = null;
  let focusedLedger: LedgerEntry[] = [];
  if (tabId === 'balance') {
    if (balanceQ) balanceResults = await searchUsersWithBalance(balanceQ);
    if (focusedUserId) {
      // 검색 결과에서 못 찾으면 단일 회원 조회
      focusedUser = balanceResults.find((u) => u.user_id === focusedUserId) ?? null;
      if (!focusedUser) {
        const r = await searchUsersWithBalance(focusedUserId, 1);
        focusedUser = r[0] ?? null;
      }
      if (focusedUser) focusedLedger = await fetchUserLedger(focusedUserId);
    }
  }

  return (
    <>
      <AdminPageHead title="마일리지 관리" sub="충전 승인 · 출금 처리 · 사용자 잔액 조회" />

      <R2TabBar items={tabs} active={tabId} />

      {tabId === 'charge' && <ChargeTab rows={charges} />}
      {tabId === 'withdraw' && <WithdrawTab rows={withdraws} />}
      {tabId === 'balance' && (
        <BalanceTab
          query={balanceQ}
          results={balanceResults}
          focusedUser={focusedUser}
          ledger={focusedLedger}
        />
      )}
    </>
  );
}

function ChargeTab({ rows }: { rows: ChargeRow[] }) {
  if (rows.length === 0) return <EmptyState text="처리할 충전 신청이 없어요" />;

  return (
    <div className="border-border overflow-hidden rounded-[12px] border bg-white">
      <table className="w-full border-collapse text-[14px]">
        <R2TableHead
          cols={['사용자', '신청 금액', '입금자명', '결제 수단', '신청 시각', '처리시한', '액션']}
        />
        <tbody>
          {rows.map((r) => {
            const userName = r.user?.full_name || r.user?.username || '—';
            const username = r.user?.username ? `@${r.user.username}` : '';
            const sla = Math.floor(hoursAgo(r.requested_at));
            const isBig = r.amount >= 2_000_000;
            const mismatch =
              !!r.depositor_name && !!r.user?.full_name && r.depositor_name !== r.user.full_name;
            const rowBg = isBig
              ? 'rgba(212,162,76,0.04)'
              : mismatch
                ? 'rgba(255,82,82,0.04)'
                : '#fff';
            return (
              <tr key={r.id} className="border-warm-100 border-t" style={{ background: rowBg }}>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-warm-200 text-warm-700 flex size-8 items-center justify-center rounded-full text-[14px] font-extrabold">
                      {userName[0]}
                    </div>
                    <div>
                      <div className="text-[14px] font-bold">{userName}</div>
                      <div className="text-muted-foreground font-mono text-[12px]">{username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 tabular-nums">
                  <div
                    className="text-[15px] font-extrabold"
                    style={{ color: isBig ? '#8C6321' : 'var(--foreground)' }}
                  >
                    {r.amount.toLocaleString('ko-KR')}원
                  </div>
                  {isBig && <R2Pill tone="warning">⚡ 200만원+</R2Pill>}
                </td>
                <td className="px-4 py-3.5">
                  <div className="text-[14px] font-bold">{r.depositor_name ?? '—'}</div>
                  {mismatch && <R2Pill tone="danger">⚠ 본명 불일치</R2Pill>}
                </td>
                <td className="px-4 py-3.5">
                  <R2Pill tone={r.method === 'pg' ? 'progress' : 'neutral'}>
                    {r.method === 'pg' ? '카드' : '무통장'}
                  </R2Pill>
                </td>
                <td className="text-muted-foreground px-4 py-3.5 text-[13px] tabular-nums">
                  {formatTime(r.requested_at)}
                </td>
                <td className="px-4 py-3.5">
                  {sla >= 24 ? (
                    <R2Pill tone="danger">{sla}h 초과</R2Pill>
                  ) : sla >= 12 ? (
                    <R2Pill tone="warning">{sla}h</R2Pill>
                  ) : (
                    <span className="text-muted-foreground text-[14px] tabular-nums">{sla}h</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <div className="inline-flex gap-1.5">
                    <RejectChargeButton chargeId={r.id} />
                    <ConfirmChargeButton
                      chargeId={r.id}
                      amount={r.amount}
                      depositorName={r.depositor_name}
                      method={r.method}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WithdrawTab({ rows }: { rows: WithdrawRow[] }) {
  if (rows.length === 0) return <EmptyState text="처리할 출금 신청이 없어요" />;

  return (
    <div className="border-border overflow-hidden rounded-[12px] border bg-white">
      <table className="w-full border-collapse text-[14px]">
        <R2TableHead
          cols={['사용자', '출금 금액', '계좌', '신청 시각', '처리시한', '상태', '액션']}
        />
        <tbody>
          {rows.map((r) => {
            const userName = r.user?.full_name || r.user?.username || '—';
            const username = r.user?.username ? `@${r.user.username}` : '';
            const sla = Math.floor(hoursAgo(r.requested_at));
            return (
              <tr key={r.id} className="border-warm-100 border-t">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-warm-200 text-warm-700 flex size-8 items-center justify-center rounded-full text-[14px] font-extrabold">
                      {userName[0]}
                    </div>
                    <div>
                      <div className="text-[14px] font-bold">{userName}</div>
                      <div className="text-muted-foreground font-mono text-[12px]">{username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 tabular-nums">
                  <div className="text-[15px] font-extrabold">
                    {r.amount.toLocaleString('ko-KR')}원
                  </div>
                  <div className="text-muted-foreground text-[12px]">
                    수수료 {r.fee.toLocaleString('ko-KR')}원
                  </div>
                </td>
                <td className="px-4 py-3.5 text-[14px]">
                  <div className="font-bold">{bankNameByCode(r.bank_code)}</div>
                  <div className="text-foreground font-mono text-[14px] font-extrabold tabular-nums">
                    {r.account_number_full ?? `****${r.account_number_last4}`}
                  </div>
                  <div className="text-muted-foreground text-[12px]">예금주 {r.account_holder}</div>
                </td>
                <td className="text-muted-foreground px-4 py-3.5 text-[13px] tabular-nums">
                  {formatTime(r.requested_at)}
                </td>
                <td className="px-4 py-3.5">
                  {sla >= 24 ? (
                    <R2Pill tone="danger">{sla}h 초과</R2Pill>
                  ) : sla >= 12 ? (
                    <R2Pill tone="warning">{sla}h</R2Pill>
                  ) : (
                    <span className="text-muted-foreground text-[14px] tabular-nums">{sla}h</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <R2Pill tone="progress">처리 중</R2Pill>
                </td>
                <td className="px-4 py-3.5">
                  <ResolveWithdrawButton
                    withdrawId={r.id}
                    status="completed"
                    amount={r.amount}
                    accountHolder={r.account_holder}
                    bankCode={r.bank_code}
                    accountLast4={r.account_number_last4}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const LEDGER_TYPE_LABEL: Record<LedgerEntry['type'], string> = {
  charge: '충전',
  spend: '차감',
  refund: '환불',
  settle: '정산',
  withdraw: '출금',
  adjust: '조정',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function BalanceTab({
  query,
  results,
  focusedUser,
  ledger,
}: {
  query: string;
  results: UserBalance[];
  focusedUser: UserBalance | null;
  ledger: LedgerEntry[];
}) {
  return (
    <div className="flex flex-col gap-3.5">
      {/* 검색 폼 */}
      <form
        method="get"
        className="border-border flex items-center gap-2.5 rounded-[12px] border bg-white p-3.5"
      >
        <input type="hidden" name="tab" value="balance" />
        <div className="bg-warm-50 border-border relative flex h-9 flex-1 items-center gap-2 rounded-[8px] border px-3">
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
            key={`bal-q-${query}`}
            name="q"
            defaultValue={query}
            placeholder="이름 · 닉네임 · 이메일 · @아이디"
            className="placeholder:text-muted-foreground flex-1 border-0 bg-transparent text-[14px] outline-none"
          />
        </div>
        <button
          type="submit"
          className="border-border hover:bg-warm-50 h-9 rounded-[8px] border bg-white px-3.5 text-[14px] font-bold"
        >
          검색
        </button>
        {query && (
          <Link
            href="/admin/mileage?tab=balance"
            className="text-muted-foreground text-[13px] hover:underline"
          >
            초기화
          </Link>
        )}
      </form>

      {/* 검색 결과 리스트 */}
      {query && results.length === 0 && !focusedUser && (
        <div className="border-border bg-warm-50 rounded-[12px] border border-dashed p-8 text-center">
          <p className="text-[14px] font-bold">검색 결과가 없어요</p>
          <p className="text-muted-foreground mt-1 text-[13px]">
            이름·닉네임·이메일·@아이디로 검색해보세요.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="border-border overflow-hidden rounded-[12px] border bg-white">
          <table className="w-full border-collapse text-[14px]">
            <R2TableHead cols={['회원', '잔액 합계', 'cash (출금가능)', 'pg_locked', '액션']} />
            <tbody>
              {results.map((u) => {
                const userLabel = u.full_name || u.username || u.email || shortId(u.user_id);
                const focused = focusedUser?.user_id === u.user_id;
                return (
                  <tr
                    key={u.user_id}
                    className="border-warm-100 border-t"
                    style={{ background: focused ? 'rgba(91,163,208,0.06)' : '#fff' }}
                  >
                    <td className="px-4 py-3">
                      <div className="text-[14px] font-bold">{userLabel}</div>
                      <div className="text-muted-foreground font-mono text-[12px]">
                        {u.username ? `@${u.username}` : shortId(u.user_id)}
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className="text-[14px] font-extrabold">
                        {u.balance.toLocaleString('ko-KR')}원
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[14px] tabular-nums">
                      {u.cash_balance.toLocaleString('ko-KR')}원
                    </td>
                    <td className="px-4 py-3 text-[14px] tabular-nums">
                      {u.pg_locked.toLocaleString('ko-KR')}원
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/mileage?tab=balance&q=${encodeURIComponent(query)}&user=${u.user_id}`}
                        className="border-border hover:bg-warm-50 inline-flex h-8 items-center rounded-[8px] border bg-white px-3 text-[13px] font-bold"
                      >
                        {focused ? '원장 표시 중' : '원장 보기 →'}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 포커싱된 회원의 원장 */}
      {focusedUser && (
        <div className="border-border overflow-hidden rounded-[12px] border bg-white">
          <div className="border-warm-100 flex items-center justify-between border-b px-4 py-3">
            <div>
              <div className="text-muted-foreground text-[12px] font-extrabold tracking-[0.06em] uppercase">
                최근 원장 —{' '}
                {focusedUser.full_name || focusedUser.username || shortId(focusedUser.user_id)}
              </div>
              <div className="mt-0.5 text-[13px]">
                cash{' '}
                <b className="tabular-nums">{focusedUser.cash_balance.toLocaleString('ko-KR')}</b> ·
                pg_locked{' '}
                <b className="tabular-nums">{focusedUser.pg_locked.toLocaleString('ko-KR')}</b> ·
                합계 <b className="tabular-nums">{focusedUser.balance.toLocaleString('ko-KR')}원</b>
              </div>
            </div>
            <span className="text-muted-foreground text-[12px]">최근 30건</span>
          </div>
          {ledger.length === 0 ? (
            <div className="text-muted-foreground p-8 text-center text-[14px]">원장이 없어요</div>
          ) : (
            <table className="w-full border-collapse text-[14px]">
              <R2TableHead cols={['시각', '유형', '변동', '잔액 (계좌)', '메모']} />
              <tbody>
                {ledger.map((l) => {
                  const sign = l.amount >= 0 ? '+' : '';
                  const color = l.amount >= 0 ? '#1F6B43' : 'var(--destructive)';
                  return (
                    <tr key={l.id} className="border-warm-100 border-t">
                      <td className="text-muted-foreground px-4 py-2.5 text-[13px] tabular-nums">
                        {formatDateTime(l.created_at)}
                      </td>
                      <td className="px-4 py-2.5">
                        <R2Pill tone={l.amount >= 0 ? 'success' : 'neutral'}>
                          {LEDGER_TYPE_LABEL[l.type] ?? l.type}
                        </R2Pill>
                      </td>
                      <td className="px-4 py-2.5 font-extrabold tabular-nums" style={{ color }}>
                        {sign}
                        {l.amount.toLocaleString('ko-KR')}원
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {l.balance_after.toLocaleString('ko-KR')}원
                      </td>
                      <td className="text-muted-foreground px-4 py-2.5 text-[13px]">
                        {l.memo ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!query && !focusedUser && (
        <div className="border-border bg-warm-50 rounded-[12px] border border-dashed p-8 text-center">
          <p className="text-[14px] font-bold">사용자를 검색해주세요</p>
          <p className="text-muted-foreground mt-1 text-[13px]">
            이름·닉네임·이메일·@아이디 입력 후 검색 → cash / pg_locked / 합계 + 최근 30건 원장 노출
          </p>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="border-border rounded-[14px] border bg-white p-10 text-center">
      <div
        className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full"
        style={{ background: 'rgba(31,107,67,0.10)' }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1F6B43"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 13l4 4 10-10" />
        </svg>
      </div>
      <div className="text-muted-foreground text-[12px] font-extrabold tracking-[0.08em] uppercase">
        처리할 항목 없음
      </div>
      <div className="mt-1 text-[16px] font-extrabold">{text}</div>
      <div className="text-muted-foreground mt-1 text-[14px]">
        새 신청이 들어오면 여기에 표시돼요.
      </div>
    </div>
  );
}
