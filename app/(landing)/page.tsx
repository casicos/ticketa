import { getCurrentUser } from '@/lib/auth/guards';
import { DesktopLanding } from '@/components/landing/desktop-landing';
import { MobileLanding } from '@/components/landing/mobile-landing';

export default async function HomePage() {
  const current = await getCurrentUser();
  const user = current
    ? {
        name:
          current.profile?.nickname ??
          current.profile?.full_name ??
          current.auth.email?.split('@')[0] ??
          '회원',
      }
    : null;

  return (
    <>
      <MobileLanding className="md:hidden" user={user} />
      <DesktopLanding className="hidden md:block" user={user} />
    </>
  );
}
