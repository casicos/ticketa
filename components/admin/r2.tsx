import Link from 'next/link';

export const R2_BLUE = 'var(--ticketa-blue-500)';
export const R2_GREEN = '#1F6B43';
export const R2_GOLD_DARK = '#8C6321';
export const R2_RED = 'var(--destructive)';

type Tone = 'neutral' | 'success' | 'progress' | 'warning' | 'danger' | 'purple';

const TONE_MAP: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: 'rgba(120,115,108,0.12)', fg: '#57534e' },
  success: { bg: 'rgba(31,107,67,0.12)', fg: R2_GREEN },
  progress: { bg: 'rgba(91,163,208,0.12)', fg: '#1d4ed8' },
  warning: { bg: 'rgba(212,162,76,0.14)', fg: R2_GOLD_DARK },
  danger: { bg: 'rgba(255,82,82,0.12)', fg: '#dc2626' },
  purple: { bg: 'rgba(123,45,142,0.12)', fg: '#7B2D8E' },
};

export function R2Pill({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  const c = TONE_MAP[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-[-0.005em] whitespace-nowrap tabular-nums"
      style={{ background: c.bg, color: c.fg }}
    >
      {children}
    </span>
  );
}

export function R2BtnPrimary({
  children,
  sm,
  type = 'button',
  disabled,
  onClick,
  asChildHref,
}: {
  children: React.ReactNode;
  sm?: boolean;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  asChildHref?: string;
}) {
  const cls = `inline-flex cursor-pointer items-center justify-center rounded-[10px] font-extrabold text-white disabled:opacity-50 ${
    sm ? 'h-8 px-3 text-[13px]' : 'h-11 px-5 text-[14px]'
  }`;
  if (asChildHref) {
    return (
      <Link
        href={asChildHref}
        className={cls}
        style={{ background: R2_BLUE, letterSpacing: '-0.01em' }}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cls}
      style={{ background: R2_BLUE, letterSpacing: '-0.01em' }}
    >
      {children}
    </button>
  );
}

export function R2BtnGhost({
  children,
  sm,
  tone,
  type = 'button',
  disabled,
  onClick,
  asChildHref,
}: {
  children: React.ReactNode;
  sm?: boolean;
  tone?: 'danger';
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  asChildHref?: string;
}) {
  const cls = `inline-flex cursor-pointer items-center justify-center rounded-[10px] border border-border bg-white font-bold disabled:opacity-50 ${
    sm ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-[13px]'
  }`;
  const color = tone === 'danger' ? R2_RED : 'var(--foreground)';
  if (asChildHref) {
    return (
      <Link href={asChildHref} className={cls} style={{ color }}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cls} style={{ color }}>
      {children}
    </button>
  );
}

export function R2BtnSuccess({
  children,
  sm,
  type = 'button',
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  sm?: boolean;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center justify-center rounded-[10px] font-extrabold text-white disabled:opacity-50 ${
        sm ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-[13px]'
      }`}
      style={{ background: R2_GREEN }}
    >
      {children}
    </button>
  );
}

export type R2TabItem = { id: string; label: string; count?: number; href?: string };

export function R2TabBar({ items, active }: { items: R2TabItem[]; active: string }) {
  return (
    <div className="border-border mb-3.5 flex gap-0.5 border-b">
      {items.map((t) => {
        const a = t.id === active;
        const content = (
          <>
            {t.label}
            {t.count != null && (
              <span
                className="ml-1 inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold tabular-nums"
                style={{
                  background: a ? R2_BLUE : 'var(--warm-100)',
                  color: a ? '#fff' : 'var(--muted-foreground)',
                }}
              >
                {t.count.toLocaleString('ko-KR')}
              </span>
            )}
          </>
        );
        const cls =
          '-mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-3 text-[14px] font-bold transition-colors';
        const style = {
          color: a ? 'var(--foreground)' : 'var(--muted-foreground)',
          borderColor: a ? R2_BLUE : 'transparent',
        };
        if (t.href) {
          return (
            <Link key={t.id} href={t.href} className={cls} style={style}>
              {content}
            </Link>
          );
        }
        return (
          <div key={t.id} className={cls} style={style}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

export function R2TableHead({ cols }: { cols: string[] }) {
  return (
    <thead className="bg-warm-50">
      <tr>
        {cols.map((c, i) => (
          <th
            key={i}
            className="text-muted-foreground px-4 py-3 text-left text-[12px] font-extrabold tracking-[0.06em] uppercase"
          >
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}
