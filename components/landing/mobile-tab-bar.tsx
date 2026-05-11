import Link from 'next/link';
import { Home, TrendingUp, Search, Wallet, User } from 'lucide-react';

/**
 * 모바일 하단 5-탭 + 중앙 FAB(검색).
 * mockup screens-shared.jsx 의 MobileTabBar 매칭.
 */
export function MobileTabBar({
  active = 'home',
}: {
  active?: 'home' | 'catalog' | 'search' | 'mileage' | 'me';
}) {
  const left = [
    { id: 'home', label: '홈', href: '/', Icon: Home },
    { id: 'catalog', label: '시세', href: '/catalog', Icon: TrendingUp },
  ] as const;
  const right = [
    { id: 'mileage', label: '지갑', href: '/account/mileage', Icon: Wallet },
    { id: 'me', label: '내정보', href: '/account', Icon: User },
  ] as const;

  return (
    <div
      className="border-border relative grid items-stretch border-t bg-white pt-0 pb-2"
      style={{ height: 72, gridTemplateColumns: '1fr 1fr 88px 1fr 1fr' }}
    >
      {left.map(({ id, label, href, Icon }) => (
        <TabItem key={id} href={href} label={label} Icon={Icon} active={active === id} />
      ))}

      {/* 중앙 FAB */}
      <div className="relative flex items-start justify-center">
        <Link
          href="/catalog"
          className="absolute -top-5 flex size-[60px] flex-col items-center justify-center rounded-full text-white"
          style={{
            background: 'linear-gradient(135deg, #11161E, #1A2230)',
            boxShadow: '0 8px 24px rgba(17,22,30,0.32), 0 0 0 4px #fff',
          }}
        >
          <Search className="size-5" strokeWidth={2} />
          <span
            aria-hidden
            className="absolute top-2.5 right-3 size-1 rounded-full"
            style={{ background: '#D4A24C' }}
          />
        </Link>
        <span
          className={[
            'mt-11 text-[10.5px] font-semibold tracking-tight',
            active === 'search' ? 'text-ticketa-blue-700' : 'text-muted-foreground',
          ].join(' ')}
        >
          검색
        </span>
      </div>

      {right.map(({ id, label, href, Icon }) => (
        <TabItem key={id} href={href} label={label} Icon={Icon} active={active === id} />
      ))}
    </div>
  );
}

function TabItem({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        'flex flex-col items-center justify-center gap-[3px] text-[10.5px] font-semibold tracking-tight',
        active ? 'text-ticketa-blue-700' : 'text-muted-foreground',
      ].join(' ')}
    >
      <Icon className="size-5" strokeWidth={1.75} />
      <span>{label}</span>
    </Link>
  );
}
