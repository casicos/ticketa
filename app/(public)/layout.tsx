import { HeaderServer } from '@/components/header-server';
import { DesktopLandingFooter, MobileLandingFooter } from '@/components/landing/landing-footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <HeaderServer />
      <main className="flex flex-1 flex-col">{children}</main>
      <MobileLandingFooter className="md:hidden" />
      <DesktopLandingFooter className="hidden md:block" />
    </div>
  );
}
