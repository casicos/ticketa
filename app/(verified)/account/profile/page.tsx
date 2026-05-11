import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';
import { formatKoreanPhone } from '@/lib/format';
import { DesktopProfile } from '@/components/account/desktop-profile';
import { MyRoomShell } from '@/components/account/my-room-shell';
import { MobileProfile } from '@/components/account/mobile-profile';

export default async function ProfilePage() {
  const current = await getCurrentUser();
  if (!current) redirect('/login?next=/account/profile');

  const profile = current.profile;
  const fullName = profile?.full_name ?? null;
  const email = profile?.email ?? current.auth.email ?? null;
  const phone = profile?.phone ? formatKoreanPhone(profile.phone) : null;
  const nickname = profile?.nickname ?? null;
  const phoneVerified = profile?.phone_verified ?? false;

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
    </MyRoomShell>
  );
}
