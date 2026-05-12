import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatKoreanPhone } from '@/lib/format';
import { DesktopProfile } from '@/components/account/desktop-profile';
import { MyRoomShell } from '@/components/account/my-room-shell';
import { MobileProfile } from '@/components/account/mobile-profile';
import { AccountProfileForm } from '../account-profile-form';

export default async function ProfilePage() {
  const current = await getCurrentUser();
  if (!current) redirect('/login?next=/account/profile');

  const profile = current.profile;
  const fullName = profile?.full_name ?? null;
  const email = profile?.email ?? current.auth.email ?? null;
  const nickname = profile?.nickname ?? null;
  const phoneVerified = profile?.phone_verified ?? false;

  // phone / marketing_opt_in 은 JWT 미포함 (0047 migration 이후) — 별도 DB 조회.
  // pre-backfill 토큰이면 profile.phone / marketing_opt_in 에 값이 있으니 우선 사용.
  let phone: string | null = profile?.phone ? formatKoreanPhone(profile.phone) : null;
  let marketingOptIn: boolean = profile?.marketing_opt_in ?? false;
  if (!phone) {
    const supabase = await createSupabaseServerClient();
    const { data: dbRow } = await supabase
      .from('users')
      .select('phone, marketing_opt_in')
      .eq('id', current.auth.id)
      .maybeSingle<{ phone: string | null; marketing_opt_in: boolean }>();
    phone = dbRow?.phone ? formatKoreanPhone(dbRow.phone) : null;
    marketingOptIn = dbRow?.marketing_opt_in ?? marketingOptIn;
  }

  // Format join date from auth created_at
  const memberSince = current.auth.created_at
    ? new Date(current.auth.created_at).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : null;

  const props = { fullName, email, phone, nickname, phoneVerified, memberSince };

  return (
    <MyRoomShell active="profile">
      <div className="hidden md:block">
        <DesktopProfile {...props} />
      </div>
      <div className="md:hidden">
        <MobileProfile {...props} />
      </div>
      <section className="border-border mt-6 rounded-2xl border bg-white p-5 sm:p-6">
        <h2 className="mb-1 text-[16px] font-bold tracking-[-0.015em]">닉네임 · 마케팅 변경</h2>
        <p className="text-muted-foreground mb-4 text-[13px]">
          닉네임은 30일에 1회 변경 가능합니다. 저장 직후 헤더 표시에 바로 반영돼요.
        </p>
        <AccountProfileForm
          initialNickname={nickname ?? ''}
          initialMarketingOptIn={marketingOptIn}
        />
      </section>
    </MyRoomShell>
  );
}
