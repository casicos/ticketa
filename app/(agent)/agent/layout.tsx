import { redirect } from 'next/navigation';
import { getCurrentUser, hasRole } from '@/lib/auth/guards';
import { AdminShell } from '@/components/admin/admin-shell';

/**
 * 에이전트 라우트 — agent role 가드 + AdminShell(role="agent") 사이드바.
 */
export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const ok = await hasRole('agent');
  if (!ok) redirect('/no-access?reason=agent-required');

  const current = await getCurrentUser();
  const userLabel = current?.profile?.full_name || '에이전트';
  const userSubtext = current?.profile?.email ?? current?.auth.email ?? 'agent@ticketa';

  return (
    <AdminShell role="agent" userLabel={userLabel} userSubtext={userSubtext}>
      {children}
    </AdminShell>
  );
}
