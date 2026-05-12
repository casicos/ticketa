import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchMyMileageBalance } from '@/lib/domain/mileage';
import { fetchWithdrawFee } from '@/lib/domain/platform-settings';
import { DesktopMileageWithdraw } from '@/components/account/desktop-mileage-withdraw';
import { MobileMileageWithdraw } from '@/components/account/mobile-mileage-withdraw';
import { MyRoomShell } from '@/components/account/my-room-shell';
import { WithdrawAccountDialog } from '@/components/account/withdraw-account-dialog';
import { withdrawRequestAction } from '../actions';

export type WithdrawAccountOption = {
  id: string;
  bank_code: string;
  account_number_last4: string;
  account_holder: string;
};

export type WithdrawHistoryRow = {
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

export default async function WithdrawPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    error_message?: string;
  }>;
}) {
  // current + params + supabase 병렬화. 이후 4개 쿼리는 user.id / 인증 의존.
  const [current, params, supabase] = await Promise.all([
    getCurrentUser(),
    searchParams,
    createSupabaseServerClient(),
  ]);
  if (!current) redirect('/login?next=/account/mileage/withdraw');

  const [balance, accountsRes, withdrawFee, historyRes] = await Promise.all([
    fetchMyMileageBalance(supabase, current.auth.id),
    supabase
      .from('seller_payout_accounts')
      .select('id, bank_code, account_number_last4, account_holder')
      .eq('user_id', current.auth.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    fetchWithdrawFee(),
    supabase
      .from('withdraw_requests')
      .select(
        'id, amount, fee, bank_code, account_number_last4, account_holder, status, requested_at, completed_at, admin_memo',
      )
      .eq('user_id', current.auth.id)
      .order('requested_at', { ascending: false })
      .limit(20),
  ]);
  const accounts = (accountsRes.data ?? []) as WithdrawAccountOption[];
  const history = (historyRes.data ?? []) as WithdrawHistoryRow[];
  const inFlightWithdraw = history
    .filter((w) => w.status === 'requested' || w.status === 'processing')
    .reduce((s, w) => s + w.amount, 0);

  const sharedProps = {
    totalBalance: balance.total,
    withdrawable: balance.withdrawable,
    pgLocked: balance.pgLocked,
    inFlightWithdraw,
    defaultHolder: current.profile?.full_name ?? '',
    formAction: withdrawRequestAction as unknown as string,
    hasError: !!params.error,
    errorMessage: params.error_message ?? params.error,
    accounts,
    withdrawFee,
    history,
  };

  const accountMissing = accounts.length === 0;

  return (
    <MyRoomShell active="withdraw">
      <div
        className={accountMissing ? 'pointer-events-none opacity-50 blur-[2px] select-none' : ''}
      >
        <DesktopMileageWithdraw {...sharedProps} />
        <MobileMileageWithdraw {...sharedProps} />
      </div>
      {accountMissing && <WithdrawAccountDialog defaultHolder={current.profile?.full_name ?? ''} />}
    </MyRoomShell>
  );
}
