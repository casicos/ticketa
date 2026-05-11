import { getCurrentUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchMyMileageBalance } from '@/lib/domain/mileage';
import { Header, type HeaderUserInfo } from './header';

/**
 * Header 서버 진입점 — 각 route-group layout 에서 호출.
 * getCurrentUser 1회 + 잔액 조회 후 필요한 필드만 클라이언트로 전달.
 */
export async function HeaderServer() {
  const current = await getCurrentUser();

  if (!current) {
    return <Header user={null} />;
  }

  let balance = 0;
  if (current.profile?.phone_verified) {
    const supabase = await createSupabaseServerClient();
    const b = await fetchMyMileageBalance(supabase, current.auth.id);
    balance = b.total;
  }

  const userInfo: HeaderUserInfo = {
    email: current.profile?.email ?? current.auth.email ?? null,
    full_name: current.profile?.full_name ?? '',
    phone_verified: current.profile?.phone_verified ?? false,
    roles: current.roles,
    balance,
  };

  return <Header user={userInfo} />;
}
