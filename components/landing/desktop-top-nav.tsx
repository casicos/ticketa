import Link from 'next/link';
import { LogoLockup } from './logo';

/**
 * 마케팅용 데스크톱 상단 nav.
 * tone="dark" 는 hero 위에 떠 있는 형태 (transparent bg, white text).
 * tone="light" 는 일반 페이지용 (white bg, dark text).
 */
export function DesktopTopNav({
  tone = 'light',
  activeNav = '시세',
  user = null,
}: {
  tone?: 'light' | 'dark';
  activeNav?: string;
  user?: { name: string } | null;
}) {
  const isDark = tone === 'dark';
  const navItems = [
    { label: '시세', href: '/catalog' },
    { label: '매물', href: '/catalog' },
    { label: '마일리지', href: '/account/mileage' },
    { label: '선물하기', href: '/account/mileage' },
    { label: '도움말', href: '#' },
  ];

  return (
    <header
      className={[
        'relative z-10 border-b',
        isDark
          ? 'border-white/10 text-white'
          : 'border-border text-foreground bg-white/90 backdrop-blur-md backdrop-saturate-[180%]',
      ].join(' ')}
      style={isDark ? { background: '#11161E' } : undefined}
    >
      <div className="mx-auto flex h-16 items-center gap-8 px-8" style={{ maxWidth: 1216 }}>
        <Link href="/" className="shrink-0">
          <LogoLockup symbolSize={28} wordmarkHeight={18} color={isDark ? '#fff' : '#0F172A'} />
        </Link>

        <nav className="ml-4 flex gap-1">
          {navItems.map((it) => {
            const active = it.label === activeNav;
            return (
              <Link
                key={it.label}
                href={it.href}
                className={[
                  'rounded-md px-3.5 py-2 text-sm font-semibold transition-colors',
                  active
                    ? isDark
                      ? 'text-white'
                      : 'bg-warm-100 text-foreground'
                    : isDark
                      ? 'text-white/85 hover:text-white'
                      : 'text-warm-700 hover:text-foreground',
                ].join(' ')}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          {user ? (
            <Link
              href="/account"
              className={[
                'inline-flex h-9 items-center rounded-md px-4 text-sm font-bold tracking-tight transition-colors',
                isDark
                  ? 'text-ticketa-blue-700 bg-white hover:bg-white/90'
                  : 'bg-ticketa-blue-500 hover:bg-ticketa-blue-600 text-white',
              ].join(' ')}
            >
              {user.name}님 마이룸 →
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={[
                  'text-sm transition-colors',
                  isDark ? 'text-white/85 hover:text-white' : 'text-warm-700 hover:text-foreground',
                ].join(' ')}
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className={[
                  'inline-flex h-9 items-center rounded-md px-4 text-sm font-bold tracking-tight transition-colors',
                  isDark
                    ? 'text-ticketa-blue-700 bg-white hover:bg-white/90'
                    : 'bg-ticketa-blue-500 hover:bg-ticketa-blue-600 text-white',
                ].join(' ')}
              >
                지금 시작하기
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
