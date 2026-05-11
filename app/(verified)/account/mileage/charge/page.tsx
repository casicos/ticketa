import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';
import { fetchMyMileageBalance } from '@/lib/domain/mileage';
import { fetchBankInfo } from '@/lib/domain/platform-settings';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DesktopMileageCharge } from '@/components/account/desktop-mileage-charge';
import { MobileMileageCharge } from '@/components/account/mobile-mileage-charge';
import { MyRoomShell } from '@/components/account/my-room-shell';
import { chargeRequestAction } from '../actions';

export default async function ChargePage({
  searchParams,
}: {
  searchParams: Promise<{
    amount?: string;
    returnTo?: string;
    error?: string;
    error_message?: string;
  }>;
}) {
  const current = await getCurrentUser();
  if (!current) redirect('/login?next=/account/mileage/charge');

  const params = await searchParams;
  const returnTo = sanitizeRedirectPath(params.returnTo ?? null);

  const supabase = await createSupabaseServerClient();
  const [balance, bankRaw] = await Promise.all([
    fetchMyMileageBalance(supabase),
    fetchBankInfo(supabase),
  ]);
  const bank = { bankName: bankRaw.bank_name, account: bankRaw.account, holder: bankRaw.holder };

  const sharedProps = {
    currentBalance: balance.total,
    defaultHolder: current.profile?.full_name ?? '',
    returnTo: returnTo ?? '/account/mileage',
    bankInfo: bank,
    hasError: !!params.error,
    errorMessage: params.error_message ?? params.error,
    formAction: chargeRequestAction as unknown as string,
  };

  return (
    <MyRoomShell active="charge">
      <DesktopMileageCharge {...sharedProps} />
      <MobileMileageCharge {...sharedProps} />
    </MyRoomShell>
  );
}
