import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatKoreanPhone, shortId } from '@/lib/format';
import { bankNameByCode } from '@/lib/domain/banks';
import { DesktopAuth } from '@/components/account/desktop-auth';
import { MyRoomShell } from '@/components/account/my-room-shell';
import { MobileAuth } from '@/components/account/mobile-auth';

export default async function VerificationPage() {
  // current + supabase 병렬화. phone/payout 조회는 user.id 의존이라 뒤에.
  const [current, supabase] = await Promise.all([getCurrentUser(), createSupabaseServerClient()]);
  if (!current) redirect('/login?next=/account/verification');

  const phoneVerified = current.profile?.phone_verified ?? false;
  const fullName = current.profile?.full_name ?? '';
  const memberId = `TK-${shortId(current.auth.id).toUpperCase()}`;

  // phone 은 JWT 미포함 (0047 migration 이후) — 이 페이지가 표시용으로 별도 조회.
  // 활성 출금계좌도 같은 supabase 클라이언트에서 병렬 조회.
  const [phoneRes, payoutRes] = await Promise.all([
    supabase
      .from('users')
      .select('phone')
      .eq('id', current.auth.id)
      .maybeSingle<{ phone: string | null }>(),
    supabase
      .from('seller_payout_accounts')
      .select('account_number_last4, bank_code')
      .eq('user_id', current.auth.id)
      .eq('is_active', true)
      .maybeSingle<{ account_number_last4: string; bank_code: string }>(),
  ]);
  const phone = phoneRes.data?.phone ? formatKoreanPhone(phoneRes.data.phone) : null;
  const payoutAccount = payoutRes.data;
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
