'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Wallet } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { LogoLockup } from '@/components/landing/logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useRoleContext } from '@/lib/stores/role-context';
import type { Role } from '@/lib/auth/guards';
import { NotificationsBell } from '@/components/notifications-bell';

export type HeaderUserInfo = {
  email: string | null;
  full_name: string;
  phone_verified: boolean;
  roles: Role[];
  balance: number;
} | null;

type NavItem = {
  id: string;
  label: string;
  href: string;
  match: (path: string) => boolean;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { id: 'catalog', label: '시세·매물', href: '/catalog', match: (p) => p.startsWith('/catalog') },
  { id: 'sell', label: '판매하기', href: '/sell/new', match: (p) => p.startsWith('/sell') },
  {
    id: 'mileage',
    label: '마일리지',
    href: '/account/mileage',
    match: (p) => p.startsWith('/account/mileage'),
  },
  { id: 'gift', label: '선물', href: '/account/gift', match: (p) => p.startsWith('/account/gift') },
  {
    id: 'admin',
    label: '어드민',
    href: '/admin',
    match: (p) => p.startsWith('/admin'),
    adminOnly: true,
  },
];

export function Header({ user }: { user: HeaderUserInfo }) {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const { currentRoleView, setRoleView } = useRoleContext();

  useEffect(() => {
    if (!user) {
      setRoleView(null);
      return;
    }
    if (user.roles.length === 0) {
      setRoleView(null);
      return;
    }
    if (!currentRoleView || !user.roles.includes(currentRoleView)) {
      setRoleView(user.roles[0] ?? null);
    }
  }, [user, currentRoleView, setRoleView]);

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  const switchableRoles = user?.roles.filter((r) => r === 'seller' || r === 'agent') ?? [];
  const showRoleSwitcher = switchableRoles.length >= 2;
  const isAdmin = !!user?.roles.includes('admin');
  const isAgent = !!user?.roles.includes('agent');
  const navItems = NAV.filter((it) => !it.adminOnly || isAdmin);

  const initial = (() => {
    const name = user?.full_name?.trim();
    if (name) return name.slice(0, 1);
    return user?.email?.slice(0, 1).toUpperCase() ?? '?';
  })();

  return (
    <header className="border-border border-b bg-white">
      <div className="mx-auto flex h-[60px] w-full max-w-[1216px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        {/* Logo lockup */}
        <Link href="/" aria-label="Ticketa 홈" className="flex shrink-0 items-center">
          <LogoLockup symbolSize={28} wordmarkHeight={18} />
        </Link>

        {/* Primary nav (desktop) */}
        {user?.phone_verified && (
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((it) => {
              const isActive = it.match(pathname);
              return (
                <Link
                  key={it.id}
                  href={it.href}
                  className={cn(
                    'rounded-lg px-3.5 py-2 text-[15px] font-semibold transition-colors',
                    isActive
                      ? 'bg-warm-100 text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {it.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2.5">
          {!user && (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">로그인</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">회원가입</Link>
              </Button>
            </>
          )}

          {user && !user.phone_verified && (
            <Button asChild variant="outline" size="sm">
              <Link href="/verify-phone">본인인증 필요</Link>
            </Button>
          )}

          {user?.phone_verified && (
            <>
              {/* Mileage balance pill */}
              <Link
                href="/account/mileage"
                className="bg-ticketa-blue-50 text-ticketa-blue-700 hover:bg-ticketa-blue-100 hidden items-center gap-2 rounded-lg px-3 py-1.5 text-[15px] font-semibold tabular-nums transition-colors sm:flex"
              >
                <Wallet className="size-4" strokeWidth={2} />
                <span>
                  {user.balance.toLocaleString('ko-KR')}
                  <span className="ml-0.5 opacity-70">M</span>
                </span>
              </Link>

              <NotificationsBell />

              {showRoleSwitcher && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="role-switcher"
                      aria-label="역할 전환"
                    >
                      {currentRoleView === 'agent' ? '구매자' : '판매자'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>역할 전환</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={currentRoleView ?? ''}
                      onValueChange={(v) => setRoleView(v as Role)}
                    >
                      {switchableRoles.includes('seller') && (
                        <DropdownMenuRadioItem value="seller">판매자</DropdownMenuRadioItem>
                      )}
                      {switchableRoles.includes('agent') && (
                        <DropdownMenuRadioItem value="agent">구매자</DropdownMenuRadioItem>
                      )}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Avatar dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="계정 메뉴"
                    className="bg-warm-200 text-warm-700 hover:bg-warm-300 flex size-8 cursor-pointer items-center justify-center rounded-full text-[15px] font-bold transition-colors"
                  >
                    {initial}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {user.full_name || user.email}
                    <div className="text-muted-foreground mt-0.5 text-xs font-normal">
                      {user.roles.length > 0 ? user.roles.join(' · ') : '일반 사용자'}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/account">마이룸</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/sell/listings">판매 내역</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/buy/orders">구매 내역</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/mileage">마일리지</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/profile">개인정보</Link>
                    </DropdownMenuItem>
                    {(isAgent || isAdmin) && (
                      <>
                        <DropdownMenuSeparator />
                        {isAgent && (
                          <DropdownMenuItem asChild>
                            <Link href="/agent">에이전트 콘솔</Link>
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <DropdownMenuItem asChild>
                            <Link href="/admin">관리자</Link>
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout} variant="destructive">
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
