import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchMyMileageBalance } from '@/lib/domain/mileage';
import { DesktopMileageWithdraw } from '@/components/account/desktop-mileage-withdraw';
import { MobileMileageWithdraw } from '@/components/account/mobile-mileage-withdraw';
import { MyRoomShell } from '@/components/account/my-room-shell';
import { WithdrawAccountDialog } from '@/components/account/withdraw-account-dialog';
import { withdrawRequestAction } from '../actions';

export default async function WithdrawPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    error_message?: string;
  }>;
}) {
  const current = await getCurrentUser();
  if (!current) redirect('/login?next=/account/mileage/withdraw');

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const balance = await fetchMyMileageBalance(supabase);

  const { data: account } = await supabase
    .from('seller_payout_accounts')
    .select('bank_code, account_number_last4, account_holder')
    .eq('user_id', current.auth.id)
    .eq('is_active', true)
    .maybeSingle<{
      bank_code: string;
      account_number_last4: string;
      account_holder: string;
    }>();

  const sharedProps = {
    totalBalance: balance.total,
    withdrawable: balance.withdrawable,
    pgLocked: balance.pgLocked,
    defaultHolder: current.profile?.full_name ?? '',
    formAction: withdrawRequestAction as unknown as string,
    hasError: !!params.error,
    errorMessage: params.error_message ?? params.error,
  };

  const accountMissing = !account;

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
