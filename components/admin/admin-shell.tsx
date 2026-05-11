'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Shield,
  Search,
  Wallet,
  AlertTriangle,
  Users,
  Package,
  Tag,
  BarChart3,
  Store,
  Receipt,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoLockup } from '@/components/landing/logo';

export type AdminConsoleRole = 'admin' | 'agent';

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  disabled?: boolean;
  matches?: string[];
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

const PANEL_ACCENT: Record<AdminConsoleRole, string> = {
  admin: '#5BA3D0',
  agent: '#D4A24C',
};

const PANEL_LABEL: Record<AdminConsoleRole, string> = {
  admin: 'Admin Console',
  agent: 'Agent Console',
};

const ADMIN_NAV: NavSection[] = [
  {
    items: [
      {
        id: 'dashboard',
        label: '대시보드',
        href: '/admin',
        icon: LayoutDashboard,
        matches: ['/admin'],
      },
      {
        id: 'inspect',
        label: '검수 큐',
        href: '/admin/intake',
        icon: Shield,
        matches: ['/admin/intake'],
      },
      {
        id: 'consignments',
        label: '위탁 입고',
        href: '/admin/consignments',
        icon: Package,
        matches: ['/admin/consignments'],
      },
      {
        id: 'listings',
        label: '매물 관리',
        href: '/admin/listings',
        icon: Search,
        matches: ['/admin/listings'],
      },
      {
        id: 'monitor',
        label: '거래 모니터링',
        href: '/admin/monitor',
        icon: Wallet,
        matches: ['/admin/monitor'],
      },
      {
        id: 'cancellations',
        label: '취소 요청',
        href: '/admin/cancellations',
        icon: Settings,
        matches: ['/admin/cancellations'],
      },
      {
        id: 'mileage',
        label: '마일리지',
        href: '/admin/mileage',
        icon: Receipt,
        matches: ['/admin/mileage'],
      },
      {
        id: 'catalog',
        label: '권종 카탈로그',
        href: '/admin/catalog',
        icon: Tag,
        matches: ['/admin/catalog'],
      },
      {
        id: 'users',
        label: '사용자',
        href: '/admin/users',
        icon: Users,
        matches: ['/admin/users'],
      },
      {
        id: 'audit',
        label: '감사 로그',
        href: '/admin/audit',
        icon: BarChart3,
        disabled: true,
        matches: ['/admin/audit'],
      },
      {
        id: 'disputes',
        label: '분쟁 중재',
        href: '/admin/disputes',
        icon: AlertTriangle,
        disabled: true,
        matches: ['/admin/disputes'],
      },
    ],
  },
];

const AGENT_NAV: NavSection[] = [
  {
    items: [
      {
        id: 'a-overview',
        label: '대시보드',
        href: '/agent',
        icon: LayoutDashboard,
        matches: ['/agent'],
      },
      {
        id: 'a-inventory',
        label: '위탁 재고',
        href: '/agent/inventory',
        icon: Package,
        matches: ['/agent/inventory'],
      },
      {
        id: 'a-orders',
        label: '주문 처리',
        href: '/agent/orders',
        icon: AlertTriangle,
        matches: ['/agent/orders'],
      },
      {
        id: 'a-sales',
        label: '매출 분석',
        href: '/agent/sales',
        icon: BarChart3,
        matches: ['/agent/sales'],
      },
      {
        id: 'a-store',
        label: '상점 브랜드',
        href: '/agent/store',
        icon: Store,
        matches: ['/agent/store'],
      },
      {
        id: 'a-settle',
        label: '정산',
        href: '/agent/settlements',
        icon: Receipt,
        matches: ['/agent/settlements'],
      },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.disabled) return false;
  const candidates = item.matches ?? [item.href];
  return candidates.some((p) => {
    if (p === pathname) return true;
    // Treat '/admin' as the dashboard — exact only
    if (p === '/admin' || p === '/agent') return pathname === p;
    return pathname.startsWith(`${p}/`) || pathname === p;
  });
}

export type AdminNavCounts = {
  inspect?: number;
  consignments?: number;
  mileage?: number;
  cancellations?: number;
};

export function AdminShell({
  role,
  userLabel,
  userSubtext,
  counts,
  children,
}: {
  role: AdminConsoleRole;
  /** 사이드바 풋터에 노출되는 사용자 라벨 (예: "관리자") */
  userLabel: string;
  /** 라벨 아래 작은 텍스트 (예: 이메일) */
  userSubtext: string;
  /** nav 항목 우측에 노출되는 카운트 배지 — 0/undefined 면 미노출 */
  counts?: AdminNavCounts;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '/admin';
  const rawSections = role === 'agent' ? AGENT_NAV : ADMIN_NAV;
  const sections: NavSection[] = counts
    ? rawSections.map((s) => ({
        ...s,
        items: s.items.map((it) => {
          const c = counts[it.id as keyof AdminNavCounts];
          return c && c > 0 ? { ...it, badge: c } : it;
        }),
      }))
    : rawSections;
  const accent = PANEL_ACCENT[role];
  const panelLabel = PANEL_LABEL[role];
  const initial = role === 'agent' ? 'A' : '운';

  return (
    <div className="flex min-h-svh">
      <aside
        className="flex w-[240px] shrink-0 flex-col text-white"
        style={{ background: '#0E131C' }}
      >
        {/* Brand block */}
        <div
          className="px-5 pt-6 pb-[18px]"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Link href={role === 'agent' ? '/agent' : '/admin'} aria-label="Console 홈">
            <LogoLockup symbolSize={26} wordmarkHeight={16} color="#fff" />
          </Link>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="size-[5px] rounded-full" style={{ background: accent }} />
            <span className="text-[13px] font-bold tracking-[0.10em] text-white/55 uppercase">
              {panelLabel}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section, si) => (
            <div key={si} className={si === 0 ? '' : 'mt-4'}>
              {section.title && (
                <div className="mb-1.5 px-3 text-[11px] font-bold tracking-[0.08em] text-white/35 uppercase">
                  {section.title}
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map((it) => {
                  const Icon = it.icon;
                  const active = isActive(pathname, it);
                  if (it.disabled) {
                    return (
                      <div
                        key={it.id}
                        className="relative flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2.5 text-[15px] font-semibold line-through"
                        style={{ color: 'rgba(255,255,255,0.30)' }}
                        aria-disabled
                      >
                        <Icon size={18} strokeWidth={1.75} className="opacity-40" />
                        <span>{it.label}</span>
                        <span className="ml-auto rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[11px] font-bold tracking-[0.04em] text-white/55">
                          보류
                        </span>
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={it.id}
                      href={it.href}
                      className={cn(
                        'relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[15px] font-semibold transition-colors',
                        active ? 'text-white' : 'text-white/60 hover:text-white',
                      )}
                      style={{
                        background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
                      }}
                    >
                      {active && (
                        <span
                          className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-[3px]"
                          style={{ background: accent }}
                        />
                      )}
                      <Icon
                        size={18}
                        strokeWidth={1.75}
                        className={cn(active ? 'opacity-100' : 'opacity-70')}
                      />
                      <span>{it.label}</span>
                      {it.badge !== undefined && it.badge > 0 && (
                        <span
                          className="ml-auto inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-[12px] font-extrabold tabular-nums"
                          style={{ background: '#FF6B5A', color: '#fff' }}
                        >
                          {it.badge > 9 ? '9+' : it.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div
          className="px-5 py-5 text-[13px]"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.55)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold"
              style={{ background: accent, color: '#11161E' }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-bold text-white">{userLabel}</div>
              <div className="truncate">{userSubtext}</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden p-8">{children}</main>
    </div>
  );
}

export function AdminPageHead({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="border-border mb-[22px] flex items-end gap-3.5 border-b pb-3.5">
      <div className="flex-1">
        <h1 className="text-[24px] font-extrabold tracking-[-0.022em]">{title}</h1>
        {sub && <p className="text-muted-foreground mt-1 text-[15px]">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function AdminKpi({
  l,
  v,
  d,
  tone = 'ok',
}: {
  l: string;
  v: string | number;
  d?: string;
  tone?: 'ok' | 'warn' | 'err';
}) {
  return (
    <div className="border-border rounded-xl border bg-white p-4">
      <div className="text-muted-foreground text-[15px] font-bold tracking-[0.02em]">{l}</div>
      <div className="mt-1.5 text-[22px] font-extrabold tracking-[-0.02em] tabular-nums">
        {typeof v === 'number' ? v.toLocaleString('ko-KR') : v}
      </div>
      {d && (
        <div
          className="mt-1 text-[15px] font-semibold"
          style={{
            color:
              tone === 'err'
                ? 'var(--semantic-error)'
                : tone === 'warn'
                  ? 'var(--ticketa-gold-700)'
                  : 'var(--semantic-success)',
          }}
        >
          {d}
        </div>
      )}
    </div>
  );
}
