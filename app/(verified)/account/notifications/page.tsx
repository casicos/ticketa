import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';
import { DesktopNotifications } from '@/components/account/desktop-notifications';
import { MyRoomShell } from '@/components/account/my-room-shell';
import { MobileNotifications } from '@/components/account/mobile-notifications';

// TODO: backend wiring — needs notification_settings table
// Settings shown are static placeholder defaults.

export default async function NotificationsPage() {
  const current = await getCurrentUser();
  if (!current) redirect('/login?next=/account/notifications');

  return (
    <MyRoomShell active="notify">
      <div className="hidden md:block">
        <DesktopNotifications />
      </div>
      <div className="md:hidden">
        <MobileNotifications />
      </div>
    </MyRoomShell>
  );
}
