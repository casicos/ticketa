import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/guards';
import { fetchMyMileageBalance } from '@/lib/domain/mileage';
import { fetchBankInfo, type BankInfo } from '@/lib/domain/platform-settings';
import { bankNameByCode } from '@/lib/domain/banks';
import { BankMark } from '@/components/ticketa/bank-mark';
import { brandShortLabel } from '@/components/ticketa/dept-mark';
import { DesktopMileageHub } from '@/components/account/desktop-mileage-hub';
import { MobileMileageHub } from '@/components/account/mobile-mileage-hub';
import { MyRoomShell } from '@/components/account/my-room-shell';

type LedgerRow = {
  id: number;
  type: string;
  amount: number;
  memo: string | null;
  created_at: string;
  related_listing_id?: string | null;
  sku_label?: string | null;
};

type ChargeReqRow = {
  id: number;
  amount: number;
  method: 'bank_transfer' | 'pg';
  status: 'pending' | 'confirmed' | 'cancelled';
  depositor_name: string | null;
  requested_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
};

type WithdrawReqRow = {
  id: number;
  amount: number;
  fee: number;
  bank_code: string;
  account_number_last4: string;
  account_holder: string;
  status: 'requested' | 'processing' | 'completed' | 'rejected';
  requested_at: string;
  completed_at: string | null;
  admin_memo: string | null;
};

export default async function MileageHubPage({
  searchParams,
}: {
  searchParams: Promise<{
    just_requested?: string;
    just_withdrew?: string;
  }>;
}) {
  const current = await getCurrentUser();
  if (!current) redirect('/login?next=/account/mileage');

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const [balance, ledgerResult, chargeReqResult, withdrawReqResult, bankInfo] = await Promise.all([
    fetchMyMileageBalance(supabase),
    supabase
      .from('mileage_ledger')
      .select('id, type, amount, memo, created_at, related_listing_id')
      .eq('user_id', current.auth.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('charge_requests')
      .select(
        'id, amount, method, status, depositor_name, requested_at, confirmed_at, cancelled_at, cancel_reason',
      )
      .eq('user_id', current.auth.id)
      .order('requested_at', { ascending: false })
      .limit(10),
    supabase
      .from('withdraw_requests')
      .select(
        'id, amount, fee, bank_code, account_number_last4, account_holder, status, requested_at, completed_at, admin_memo',
      )
      .eq('user_id', current.auth.id)
      .order('requested_at', { ascending: false })
      .limit(10),
    fetchBankInfo(supabase),
  ]);

  const rawLedger = (ledgerResult.data ?? []) as LedgerRow[];

  // related_listing_id → SKU 라벨 매핑.
  // RLS: status='submitted' 공개 + buyer_id=auth.uid() 읽기 허용으로 대부분 커버.
  const listingIds = Array.from(
    new Set(rawLedger.map((r) => r.related_listing_id).filter((v): v is string => Boolean(v))),
  );
  const skuLabelMap = new Map<string, string>();
  if (listingIds.length > 0) {
    const { data: listingData } = await supabase
      .from('listing')
      .select('id, sku:sku_id(brand, denomination)')
      .in('id', listingIds);
    for (const row of (listingData ?? []) as unknown as Array<{
      id: string;
      sku: { brand: string; denomination: number } | null;
    }>) {
      if (!row.sku) continue;
      const face = (row.sku.denomination / 10000).toLocaleString('ko-KR');
      skuLabelMap.set(row.id, `${brandShortLabel(row.sku.brand)} ${face}만원권`);
    }
  }
  const ledger: LedgerRow[] = rawLedger.map((r) => ({
    ...r,
    sku_label: r.related_listing_id ? (skuLabelMap.get(r.related_listing_id) ?? null) : null,
  }));
  const chargeRequests = (chargeReqResult.data ?? []) as ChargeReqRow[];
  const pendingCharges = chargeRequests.filter((c) => c.status === 'pending');
  const withdrawRequests = (withdrawReqResult.data ?? []) as WithdrawReqRow[];
  const openWithdraws = withdrawRequests.filter(
    (w) => w.status === 'requested' || w.status === 'processing',
  );
  const inFlightWithdraw = openWithdraws.reduce((sum, w) => sum + w.amount, 0);

  const showRequested = params.just_requested === '1';
  const showWithdrew = params.just_withdrew === '1';

  const userName =
    current.profile?.full_name || current.profile?.nickname || current.profile?.email || '회원';

  return (
    <MyRoomShell active="wallet">
      {(showRequested || showWithdrew) && (
        <div className="mb-4 space-y-2">
          {showRequested && (
            <div className="border-ticketa-blue-200 bg-ticketa-blue-50 text-ticketa-blue-700 rounded-lg border px-4 py-3 text-sm">
              입금 안내가 발송됐어요. 무통장입금 후 어드민 확인이 되면 마일리지가 적립돼요.
            </div>
          )}
          {showWithdrew && (
            <div className="border-success/40 bg-success/10 text-success rounded-lg border px-4 py-3 text-sm">
              출금 신청이 접수됐어요. 어드민 확인 후 입금됩니다.
            </div>
          )}
        </div>
      )}

      {pendingCharges.length > 0 && (
        <PendingDepositBanner pendings={pendingCharges} bank={bankInfo} />
      )}
      {openWithdraws.length > 0 && <OpenWithdrawBanner pendings={openWithdraws} />}

      <div className="hidden md:block">
        <DesktopMileageHub
          userName={userName}
          total={balance.total}
          withdrawable={balance.withdrawable}
          inFlightWithdraw={inFlightWithdraw}
          ledger={ledger}
        />
      </div>
      <div className="md:hidden">
        <MobileMileageHub
          total={balance.total}
          withdrawable={balance.withdrawable}
          inFlightWithdraw={inFlightWithdraw}
          ledger={ledger}
        />
      </div>

      {chargeRequests.length > 0 && <ChargeRequestHistory rows={chargeRequests} />}
      {withdrawRequests.length > 0 && <WithdrawRequestHistory rows={withdrawRequests} />}
    </MyRoomShell>
  );
}

function PendingDepositBanner({ pendings, bank }: { pendings: ChargeReqRow[]; bank: BankInfo }) {
  const total = pendings.reduce((s, p) => s + p.amount, 0);
  return (
    <div className="border-warm-200 mb-4 rounded-[14px] border bg-white p-4 sm:p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="bg-warm-100 text-warm-700 inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-extrabold tracking-[0.06em] uppercase">
          입금 대기
        </span>
        <span className="text-[14px] font-bold">
          {pendings.length}건 · 합계{' '}
          <span className="tabular-nums">{total.toLocaleString('ko-KR')}</span>원
        </span>
      </div>
      <div className="border-warm-100 bg-warm-50 flex items-center gap-3 rounded-[10px] border p-3">
        <BankMark
          name={bank.bank_name}
          brandColor={bank.brand_color}
          thumbnailUrl={bank.thumbnail_url}
          size="lg"
        />
        <div className="flex-1">
          <div className="text-muted-foreground text-[12px] font-extrabold tracking-[0.06em] uppercase">
            입금 안내 계좌
          </div>
          <div className="mt-0.5 text-[15px] font-extrabold">
            {bank.bank_name} <span className="font-mono">{bank.account}</span>
          </div>
          <div className="text-muted-foreground text-[13px]">예금주 {bank.holder}</div>
        </div>
      </div>
      <p className="text-muted-foreground mt-2 text-[13px]">
        위 계좌로 신청 금액 그대로 송금해주세요. 입금자명이 신청 시 입력한 예금주명과 다르면 승인이
        지연되거나 반려될 수 있어요.
      </p>
    </div>
  );
}

function OpenWithdrawBanner({ pendings }: { pendings: WithdrawReqRow[] }) {
  const total = pendings.reduce((s, p) => s + p.amount, 0);
  return (
    <div className="border-warm-200 mb-4 rounded-[14px] border bg-white p-4 sm:p-5">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-extrabold tracking-[0.06em] uppercase"
          style={{ background: 'rgba(91,163,208,0.15)', color: 'var(--ticketa-blue-700)' }}
        >
          출금 진행 중
        </span>
        <span className="text-[14px] font-bold">
          {pendings.length}건 · 합계{' '}
          <span className="tabular-nums">{total.toLocaleString('ko-KR')}</span>원
        </span>
      </div>
      <ul className="divide-warm-100 divide-y">
        {pendings.map((w) => {
          const statusLabel = '처리 중';
          const statusBg = 'rgba(91,163,208,0.15)';
          const statusFg = 'var(--ticketa-blue-700)';
          return (
            <li key={w.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex h-5 items-center rounded-full px-2 text-[11px] font-extrabold"
                    style={{ background: statusBg, color: statusFg }}
                  >
                    {statusLabel}
                  </span>
                  <span className="text-[15px] font-extrabold tabular-nums">
                    {w.amount.toLocaleString('ko-KR')}원
                  </span>
                </div>
                <div className="text-muted-foreground mt-0.5 text-[12px]">
                  {bankNameByCode(w.bank_code)} ****{w.account_number_last4} · 예금주{' '}
                  {w.account_holder}
                </div>
              </div>
              <div className="text-muted-foreground shrink-0 text-[12px] tabular-nums">
                신청{' '}
                {new Date(w.requested_at).toLocaleString('ko-KR', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-muted-foreground mt-2 text-[13px]">
        어드민이 송금을 완료하면 자동으로 상태가 업데이트돼요. 입금까지 평균 30분 ~ 1영업일.
      </p>
    </div>
  );
}

function WithdrawRequestHistory({ rows }: { rows: WithdrawReqRow[] }) {
  const STATUS_LABEL: Record<WithdrawReqRow['status'], { l: string; bg: string; fg: string }> = {
    requested: { l: '처리 중', bg: 'rgba(91,163,208,0.15)', fg: 'var(--ticketa-blue-700)' },
    processing: { l: '처리 중', bg: 'rgba(91,163,208,0.15)', fg: 'var(--ticketa-blue-700)' },
    completed: { l: '완료', bg: 'rgba(31,107,67,0.12)', fg: '#1F6B43' },
    rejected: { l: '반려', bg: 'rgba(190,42,42,0.12)', fg: '#BE2A2A' },
  };
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-[15px] font-extrabold tracking-tight">출금 신청 내역</h2>
      <div className="border-warm-200 overflow-hidden rounded-[12px] border bg-white">
        <ul className="divide-warm-100 divide-y">
          {rows.map((r) => {
            const s = STATUS_LABEL[r.status];
            return (
              <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                <span
                  className="mt-0.5 inline-flex h-6 items-center rounded-full px-2 text-[12px] font-extrabold"
                  style={{ background: s.bg, color: s.fg }}
                >
                  {s.l}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[14px] font-bold tabular-nums">
                    {r.amount.toLocaleString('ko-KR')}원
                    <span className="text-muted-foreground text-[13px] font-normal">
                      · 수수료 {r.fee.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-[12px]">
                    {bankNameByCode(r.bank_code)} ****{r.account_number_last4} · 예금주{' '}
                    {r.account_holder}
                  </div>
                  {r.status === 'rejected' && r.admin_memo && (
                    <div className="text-destructive mt-0.5 text-[13px]">
                      반려 사유: {r.admin_memo}
                    </div>
                  )}
                </div>
                <div className="text-muted-foreground shrink-0 text-[12px] tabular-nums">
                  {new Date(r.completed_at ?? r.requested_at).toLocaleString('ko-KR', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function ChargeRequestHistory({ rows }: { rows: ChargeReqRow[] }) {
  const STATUS_LABEL: Record<ChargeReqRow['status'], { l: string; bg: string; fg: string }> = {
    pending: { l: '대기', bg: 'rgba(212,162,76,0.14)', fg: '#8C6321' },
    confirmed: { l: '승인', bg: 'rgba(31,107,67,0.12)', fg: '#1F6B43' },
    cancelled: { l: '반려', bg: 'rgba(190,42,42,0.12)', fg: '#BE2A2A' },
  };
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-[15px] font-extrabold tracking-tight">충전 신청 내역</h2>
      <div className="border-warm-200 overflow-hidden rounded-[12px] border bg-white">
        <ul className="divide-warm-100 divide-y">
          {rows.map((r) => {
            const s = STATUS_LABEL[r.status];
            return (
              <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                <span
                  className="mt-0.5 inline-flex h-6 items-center rounded-full px-2 text-[12px] font-extrabold tabular-nums"
                  style={{ background: s.bg, color: s.fg }}
                >
                  {s.l}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[14px] font-bold tabular-nums">
                    {r.amount.toLocaleString('ko-KR')}원
                    <span className="text-muted-foreground text-[13px] font-normal">
                      · {r.method === 'pg' ? 'PG' : '무통장'}
                    </span>
                    {r.depositor_name && (
                      <span className="text-muted-foreground text-[13px] font-normal">
                        · 입금자 {r.depositor_name}
                      </span>
                    )}
                  </div>
                  {r.status === 'cancelled' && r.cancel_reason && (
                    <div className="text-destructive mt-0.5 text-[13px]">
                      반려 사유: {r.cancel_reason}
                    </div>
                  )}
                </div>
                <div className="text-muted-foreground shrink-0 text-[12px] tabular-nums">
                  {new Date(r.confirmed_at ?? r.cancelled_at ?? r.requested_at).toLocaleString(
                    'ko-KR',
                    { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' },
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
