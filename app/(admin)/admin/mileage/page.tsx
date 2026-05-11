import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AdminPageHead } from '@/components/admin/admin-shell';
import { R2Pill, R2TabBar, R2TableHead, type R2TabItem } from '@/components/admin/r2';
import { bankNameByCode } from '@/lib/domain/banks';
import { ConfirmChargeButton, RejectChargeButton, ResolveWithdrawButton } from './mileage-actions';

// NOTE: 적립 버킷은 method 기반 자동 결정 (bank_transfer → cash, pg → pg_locked) — 시나리오 진행 충분.
//       어드민 override 라디오 / 사용자 잔액 검색 탭 / 자동 3초 갱신은 "지원 예정".

type ChargeRow = {
  id: number;
  user_id: string;
  amount: number;
  method: 'bank_transfer' | 'pg';
  status: 'pending' | 'confirmed' | 'cancelled';
  depositor_name: string | null;
  requested_at: string;
  user: { full_name: string | null; username: string | null; email: string | null } | null;
};

type WithdrawRow = {
  id: number;
  user_id: string;
  amount: number;
  fee: number;
  bank_code: string;
  account_number_last4: string;
  account_holder: string;
  status: 'requested' | 'processing' | 'completed' | 'rejected';
  requested_at: string;
  admin_memo: string | null;
  user: { full_name: string | null; username: string | null; email: string | null } | null;
};

const TAB_DEFS: { id: string; label: string; href: string }[] = [
  { id: 'charge', label: '충전 승인', href: '/admin/mileage?tab=charge' },
  { id: 'withdraw', label: '출금 처리', href: '/admin/mileage?tab=withdraw' },
  { id: 'balance', label: '사용자 잔액 검색', href: '/admin/mileage?tab=balance' },
];

const CHARGE_SELECT = `
  id, user_id, amount, method, status, depositor_name,
  requested_at,
  user:user_id(full_name, username, email)
` as const;

const WITHDRAW_SELECT = `
  id, user_id, amount, fee, bank_code, account_number_last4, account_holder,
  status, admin_memo, requested_at,
  user:user_id(full_name, username, email)
` as const;

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

  const supabase = await createSupabaseServerClient();

  const [chargesPending, withdrawsPending] = await Promise.all([
    supabase
      .from('charge_requests')
      .select(CHARGE_SELECT)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })
      .limit(50),
    supabase
      .from('withdraw_requests')
      .select(WITHDRAW_SELECT)
      .in('status', ['requested', 'processing'])
      .order('requested_at', { ascending: true })
      .limit(50),
  ]);

  const charges = (chargesPending.data ?? []) as unknown as ChargeRow[];
  const withdraws = (withdrawsPending.data ?? []) as unknown as WithdrawRow[];

  const tabs: R2TabItem[] = TAB_DEFS.map((t) => ({
    id: t.id,
    label: t.label,
    href: t.href,
    count: t.id === 'charge' ? charges.length : t.id === 'withdraw' ? withdraws.length : undefined,
  }));

  return (
    <>
      <AdminPageHead title="마일리지 관리" sub="충전 승인 · 출금 처리 · 사용자 잔액 조회" />

      <R2TabBar items={tabs} active={tabId} />

      {tabId === 'charge' && <ChargeTab rows={charges} />}
      {tabId === 'withdraw' && <WithdrawTab rows={withdraws} />}
      {tabId === 'balance' && <BalancePlaceholder />}
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
                    <div className="bg-warm-200 text-warm-700 flex size-8 items-center justify-center rounded-full text-[13px] font-extrabold">
                      {userName[0]}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold">{userName}</div>
                      <div className="text-muted-foreground font-mono text-[11px]">{username}</div>
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
                  <div className="text-[13px] font-bold">{r.depositor_name ?? '—'}</div>
                  {mismatch && <R2Pill tone="danger">⚠ 본명 불일치</R2Pill>}
                </td>
                <td className="px-4 py-3.5">
                  <R2Pill tone={r.method === 'pg' ? 'progress' : 'neutral'}>
                    {r.method === 'pg' ? '카드' : '무통장'}
                  </R2Pill>
                </td>
                <td className="text-muted-foreground px-4 py-3.5 text-[12px] tabular-nums">
                  {formatTime(r.requested_at)}
                </td>
                <td className="px-4 py-3.5">
                  {sla >= 24 ? (
                    <R2Pill tone="danger">{sla}h 초과</R2Pill>
                  ) : sla >= 12 ? (
                    <R2Pill tone="warning">{sla}h</R2Pill>
                  ) : (
                    <span className="text-muted-foreground text-[13px] tabular-nums">{sla}h</span>
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
                    <div className="bg-warm-200 text-warm-700 flex size-8 items-center justify-center rounded-full text-[13px] font-extrabold">
                      {userName[0]}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold">{userName}</div>
                      <div className="text-muted-foreground font-mono text-[11px]">{username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 tabular-nums">
                  <div className="text-[15px] font-extrabold">
                    {r.amount.toLocaleString('ko-KR')}원
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    수수료 {r.fee.toLocaleString('ko-KR')}원
                  </div>
                </td>
                <td className="px-4 py-3.5 text-[13px]">
                  <div className="font-bold">{bankNameByCode(r.bank_code)}</div>
                  <div className="text-muted-foreground font-mono text-[12px]">
                    {r.account_holder} · ****{r.account_number_last4}
                  </div>
                </td>
                <td className="text-muted-foreground px-4 py-3.5 text-[12px] tabular-nums">
                  {formatTime(r.requested_at)}
                </td>
                <td className="px-4 py-3.5">
                  {sla >= 24 ? (
                    <R2Pill tone="danger">{sla}h 초과</R2Pill>
                  ) : sla >= 12 ? (
                    <R2Pill tone="warning">{sla}h</R2Pill>
                  ) : (
                    <span className="text-muted-foreground text-[13px] tabular-nums">{sla}h</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <R2Pill tone={r.status === 'processing' ? 'progress' : 'neutral'}>
                    {r.status === 'processing' ? '진행중' : '신청'}
                  </R2Pill>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <div className="inline-flex gap-1.5">
                    {r.status === 'requested' && (
                      <ResolveWithdrawButton
                        withdrawId={r.id}
                        status="processing"
                        amount={r.amount}
                        accountHolder={r.account_holder}
                        bankCode={r.bank_code}
                        accountLast4={r.account_number_last4}
                      />
                    )}
                    {(r.status === 'requested' || r.status === 'processing') && (
                      <ResolveWithdrawButton
                        withdrawId={r.id}
                        status="completed"
                        amount={r.amount}
                        accountHolder={r.account_holder}
                        bankCode={r.bank_code}
                        accountLast4={r.account_number_last4}
                      />
                    )}
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

function BalancePlaceholder() {
  return (
    <div className="border-border bg-warm-50 rounded-[14px] border border-dashed p-12 text-center">
      <div className="mx-auto mb-3 inline-flex">
        <R2Pill tone="neutral">지원 예정</R2Pill>
      </div>
      <p className="text-[15px] font-bold">사용자 잔액 검색</p>
      <p className="text-muted-foreground mt-1 text-[14px]">
        사용자 검색 → cash / pg_locked / withdrawable 한눈에 + 최근 30일 원장
        <br />— 시나리오 운영에는 비포함. 다음 단계에서 활성화 예정.
      </p>
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
      <div className="text-muted-foreground text-[11px] font-extrabold tracking-[0.08em] uppercase">
        처리할 항목 없음
      </div>
      <div className="mt-1 text-[16px] font-extrabold">{text}</div>
      <div className="text-muted-foreground mt-1 text-[13px]">
        새 신청이 들어오면 여기에 표시돼요.
      </div>
    </div>
  );
}
