import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatKoreanPhone, shortId } from '@/lib/format';
import { bankNameByCode } from '@/lib/domain/banks';
import { DesktopAuth } from '@/components/account/desktop-auth';
import { MyRoomShell } from '@/components/account/my-room-shell';
import { MobileAuth } from '@/components/account/mobile-auth';

export default async function VerificationPage() {
  const current = await getCurrentUser();
  if (!current) redirect('/login?next=/account/verification');

  const phoneVerified = current.profile?.phone_verified ?? false;
  const phone = current.profile?.phone ? formatKoreanPhone(current.profile.phone) : null;
  const fullName = current.profile?.full_name ?? '';
  const memberId = `TK-${shortId(current.auth.id).toUpperCase()}`;

  // 등록 활성 출금 계좌 여부 (예금주 인증 표시용)
  const supabase = await createSupabaseServerClient();
  const { data: payoutAccount } = await supabase
    .from('seller_payout_accounts')
    .select('account_number_last4, bank_code')
    .eq('user_id', current.auth.id)
    .eq('is_active', true)
    .maybeSingle<{ account_number_last4: string; bank_code: string }>();
  const hasPayoutAccount = !!payoutAccount;
  const payoutAccountSummary = payoutAccount
    ? `${bankNameByCode(payoutAccount.bank_code)} ****${payoutAccount.account_number_last4}`
    : undefined;

  const sharedProps = {
    phoneVerified,
    phone,
    fullName,
    memberId,
    hasPayoutAccount,
    payoutAccountSummary,
  };

  return (
    <MyRoomShell active="auth">
      <div className="hidden md:block">
        <DesktopAuth {...sharedProps} />
      </div>
      <div className="md:hidden">
        <MobileAuth phoneVerified={phoneVerified} phone={phone} />
      </div>
    </MyRoomShell>
  );
}
