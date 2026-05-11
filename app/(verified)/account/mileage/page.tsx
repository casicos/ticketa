import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/guards';
import { fetchMyMileageBalance } from '@/lib/domain/mileage';
import { DesktopMileageHub } from '@/components/account/desktop-mileage-hub';
import { MobileMileageHub } from '@/components/account/mobile-mileage-hub';
import { MyRoomShell } from '@/components/account/my-room-shell';

type LedgerRow = {
  id: number;
  type: string;
  amount: number;
  memo: string | null;
  created_at: string;
};

export default async function MileageHubPage({
  searchParams,
}: {
  searchParams: Promise<{
    just_requested?: string;
    just_withdrew?: string;
  }>;
}) {
  const current = await getCurrentUser();
  if (!current) redirect('/login?next=/account/mileage');

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const [balance, ledgerResult] = await Promise.all([
    fetchMyMileageBalance(supabase),
    supabase
      .from('mileage_ledger')
      .select('id, type, amount, memo, created_at')
      .eq('user_id', current.auth.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const ledger = (ledgerResult.data ?? []) as LedgerRow[];

  const showRequested = params.just_requested === '1';
  const showWithdrew = params.just_withdrew === '1';

  const userName =
    current.profile?.full_name || current.profile?.nickname || current.profile?.email || '회원';

  return (
    <MyRoomShell active="wallet">
      {(showRequested || showWithdrew) && (
        <div className="mb-4 space-y-2">
          {showRequested && (
            <div className="border-ticketa-blue-200 bg-ticketa-blue-50 text-ticketa-blue-700 rounded-lg border px-4 py-3 text-sm">
              입금 안내가 발송됐어요. 무통장입금 후 어드민 확인이 되면 마일리지가 적립돼요.
            </div>
          )}
          {showWithdrew && (
            <div className="border-success/40 bg-success/10 text-success rounded-lg border px-4 py-3 text-sm">
              출금 신청이 접수됐어요. 어드민 확인 후 입금됩니다.
            </div>
          )}
        </div>
      )}

      <div className="hidden md:block">
        <DesktopMileageHub
          userName={userName}
          total={balance.total}
          withdrawable={balance.withdrawable}
          pgLocked={balance.pgLocked}
          ledger={ledger}
        />
      </div>
      <div className="md:hidden">
        <MobileMileageHub
          total={balance.total}
          withdrawable={balance.withdrawable}
          pgLocked={balance.pgLocked}
          ledger={ledger}
        />
      </div>
    </MyRoomShell>
  );
}
