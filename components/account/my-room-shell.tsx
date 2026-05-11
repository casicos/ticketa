import Link from 'next/link';
import { cn } from '@/lib/utils';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/guards';

export type MyRoomActive =
  | 'wallet'
  | 'sales'
  | 'buys'
  | 'list'
  | 'charge'
  | 'withdraw'
  | 'gift'
  | 'address'
  | 'profile'
  | 'auth'
  | 'notify'
  | 'security';

type NavItem = {
  id: MyRoomActive;
  label: string;
  href: string;
};

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: '거래 관련',
    items: [
      { id: 'sales', label: '판매 내역', href: '/sell/listings' },
      { id: 'buys', label: '구매 내역', href: '/buy/orders' },
      { id: 'list', label: '매물 등록', href: '/sell/new' },
    ],
  },
  {
    group: '마일리지',
    items: [
      { id: 'wallet', label: '내 지갑', href: '/account/mileage' },
      { id: 'charge', label: '충전', href: '/account/mileage/charge' },
      { id: 'withdraw', label: '출금', href: '/account/mileage/withdraw' },
      { id: 'gift', label: '선물 상품권', href: '/account/gift' },
    ],
  },
  {
    group: '계정',
    items: [
      { id: 'profile', label: '개인정보', href: '/account/profile' },
      { id: 'auth', label: '본인인증', href: '/account/verification' },
      { id: 'address', label: '배송지', href: '/account/addresses' },
      { id: 'notify', label: '알림 설정', href: '/account/notifications' },
      { id: 'security', label: '보안센터', href: '/account/password' },
    ],
  },
];

type Counts = {
  sellSubmitted: number;
  sellInProgress: number;
  buyPurchased: number;
  buyInProgress: number;
} | null;

async function fetchCounts(userId: string): Promise<Counts> {
  const supabase = await createSupabaseServerClient();
  const [sellSub, sellProg, buyPurch, buyProg] = await Promise.all([
    supabase
      .from('listing')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', userId)
      .eq('status', 'submitted'),
    supabase
      .from('listing')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', userId)
      .in('status', ['purchased', 'handed_over', 'received', 'verified', 'shipped']),
    supabase
      .from('listing')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', userId)
      .eq('status', 'purchased'),
    supabase
      .from('listing')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', userId)
      .in('status', ['handed_over', 'received', 'verified', 'shipped']),
  ]);
  return {
    sellSubmitted: sellSub.count ?? 0,
    sellInProgress: sellProg.count ?? 0,
    buyPurchased: buyPurch.count ?? 0,
    buyInProgress: buyProg.count ?? 0,
  };
}

function buildSubText(id: MyRoomActive, c: Counts): string | null {
  if (!c) return null;
  if (id === 'sales') return `등록대기 ${c.sellSubmitted} · 판매중 ${c.sellInProgress}`;
  if (id === 'buys') return `결제완료 ${c.buyPurchased} · 구매중 ${c.buyInProgress}`;
  return null;
}

export async function MyRoomShell({
  active,
  children,
}: {
  active: MyRoomActive;
  children: React.ReactNode;
}) {
  const current = await getCurrentUser();
  const counts = current ? await fetchCounts(current.auth.id) : null;

  return (
    <div className="mx-auto w-full max-w-[1216px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <aside className="border-border hidden self-start rounded-2xl border bg-white px-4 py-5 lg:block">
          <div className="border-border border-b pb-3.5 text-[15px] font-extrabold tracking-[-0.018em]">
            마이룸
          </div>
          {NAV.map((g, gi) => (
            <div key={g.group} className={gi === 0 ? 'mt-3.5' : 'mt-4'}>
              <div className="text-muted-foreground px-1 pb-1.5 text-[14px] font-bold tracking-[0.04em] uppercase">
                {g.group}
              </div>
              {g.items.map((it) => {
                const isActive = it.id === active;
                const sub = buildSubText(it.id, counts);
                return (
                  <Link
                    key={it.id}
                    href={it.href}
                    className={cn(
                      'block rounded-md px-2.5 py-2 transition-colors',
                      isActive
                        ? 'bg-ticketa-blue-50 text-ticketa-blue-700'
                        : 'text-foreground hover:bg-muted/40',
                    )}
                  >
                    <div className={cn('text-[15px]', isActive ? 'font-bold' : 'font-semibold')}>
                      {it.label}
                    </div>
                    {sub && (
                      <div
                        className={cn(
                          'mt-0.5 text-[14px] tabular-nums',
                          isActive ? 'text-ticketa-blue-700/70' : 'text-muted-foreground',
                        )}
                      >
                        {sub}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
