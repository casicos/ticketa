import { redirect } from 'next/navigation';
import { getCurrentUser, hasRole } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AdminShell, type AdminNavCounts } from '@/components/admin/admin-shell';

/**
 * 어드민 라우트 2차 방어선 (미들웨어와 함께) + AdminShell 사이드바.
 *
 * nav 카운트 배지:
 *   - inspect (검수 큐) = handed_over + received + verified 합산 (어드민이 다음 단계로 옮겨야 할 매물)
 *   - consignments (위탁 입고) = 24시간 내 신규 적재 건수
 *   - mileage = pending 충전 + pending 출금 합산
 *   - cancellations = pending 취소 요청
 */
async function fetchAdminNavCounts(): Promise<AdminNavCounts> {
  const supabase = await createSupabaseServerClient();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [intakeRes, consignmentRes, chargeRes, withdrawRes, cancelRes] = await Promise.all([
    supabase
      .from('listing')
      .select('id', { count: 'exact', head: true })
      .in('status', ['handed_over', 'received', 'verified']),
    supabase
      .from('agent_inventory')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo),
    supabase
      .from('charge_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('withdrawals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('cancellation_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ]);

  return {
    inspect: intakeRes.count ?? 0,
    consignments: consignmentRes.count ?? 0,
    mileage: (chargeRes.count ?? 0) + (withdrawRes.count ?? 0),
    cancellations: cancelRes.count ?? 0,
  };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ok = await hasRole('admin');
  if (!ok) redirect('/no-access?reason=admin-required');

  const [current, counts] = await Promise.all([getCurrentUser(), fetchAdminNavCounts()]);
  const userLabel = current?.profile?.full_name || '관리자';
  const userSubtext = current?.profile?.email ?? current?.auth.email ?? 'admin@ticketa.me';

  return (
    <AdminShell role="admin" userLabel={userLabel} userSubtext={userSubtext} counts={counts}>
      {children}
    </AdminShell>
  );
}
