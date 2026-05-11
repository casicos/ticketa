import Link from 'next/link';
import { Suspense } from 'react';
import { cn } from '@/lib/utils';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/guards';
import { fetchMyListingCounts } from '@/lib/domain/listing-counts';

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

type SidebarCounts = {
  sellSubmitted: number;
  sellInProgress: number;
  buyPurchased: number;
  buyInProgress: number;
} | null;

function buildSubText(id: MyRoomActive, c: SidebarCounts): string | null {
  if (!c) return null;
  if (id === 'sales') return `등록대기 ${c.sellSubmitted} · 판매중 ${c.sellInProgress}`;
  if (id === 'buys') return `결제완료 ${c.buyPurchased} · 구매중 ${c.buyInProgress}`;
  return null;
}

/**
 * 사이드바를 카운트 없이 즉시 렌더. Suspense fallback 으로 쓰임.
 * 카운트 라인은 비어있고, 라벨/링크만 보임 (사용자가 즉시 클릭 가능).
 */
function MyRoomSidebar({ active, counts }: { active: MyRoomActive; counts: SidebarCounts }) {
  return (
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
  );
}

/**
 * 카운트를 실제 RPC 로 페치해서 사이드바 렌더. Suspense boundary 안에서 await.
 * 0048 migration 의 get_my_listing_counts RPC 호출 — 4 개 count 쿼리 → 1 RPC.
 */
async function MyRoomSidebarWithCounts({ active }: { active: MyRoomActive }) {
  const current = await getCurrentUser();
  if (!current) return <MyRoomSidebar active={active} counts={null} />;
  const supabase = await createSupabaseServerClient();
  const c = await fetchMyListingCounts(supabase);
  const counts: SidebarCounts = {
    sellSubmitted: c.sellSubmitted,
    sellInProgress: c.sellInProgress,
    buyPurchased: c.buyPurchased,
    buyInProgress: c.buyInProgress,
  };
  return <MyRoomSidebar active={active} counts={counts} />;
}

export function MyRoomShell({
  active,
  children,
}: {
  active: MyRoomActive;
  children: React.ReactNode;
}) {
  // children 은 즉시 렌더. 사이드바 카운트는 Suspense 로 스트리밍 — RPC 가 느려도
  // 메인 컨텐츠가 블록되지 않음. fallback 은 카운트 없는 동일한 사이드바.
  return (
    <div className="mx-auto w-full max-w-[1216px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <Suspense fallback={<MyRoomSidebar active={active} counts={null} />}>
          <MyRoomSidebarWithCounts active={active} />
        </Suspense>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
