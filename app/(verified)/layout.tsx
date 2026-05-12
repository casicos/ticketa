import { HeaderServer } from '@/components/header-server';
import { DesktopLandingFooter, MobileLandingFooter } from '@/components/landing/landing-footer';

/**
 * (verified) 라우트 그룹: 로그인 + phone_verified 필요.
 * middleware.ts 가 이미 게이트 역할을 하므로 여기서는 Header / Footer 만 렌더.
 */
export default function VerifiedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <HeaderServer />
      <main className="flex flex-1 flex-col">{children}</main>
      <MobileLandingFooter className="md:hidden" />
      <DesktopLandingFooter className="hidden md:block" />
    </div>
  );
}
