import { redirect } from 'next/navigation';
import { MoneyDisplay } from '@/components/ticketa/money-display';
import { MyRoomShell } from '@/components/account/my-room-shell';
import { getCurrentUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatKRW, formatDate } from '@/lib/format';

type PayoutRow = {
  id: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  status: 'pending' | 'released' | 'held';
  released_at: string | null;
  created_at: string;
  order_item: {
    quantity: number;
    unit_price: number;
    sku: { display_name: string } | null;
    order: {
      created_at: string;
      payment_confirmed_at: string | null;
    } | null;
  } | null;
};

function estimatePayoutDate(paymentConfirmedAt: string | null): string {
  if (!paymentConfirmedAt) return '미정';
  const base = new Date(paymentConfirmedAt);
  base.setDate(base.getDate() + 3);
  return base.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function isInCurrentMonth(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

const PAYOUT_SELECT = `
  id, gross_amount, commission_amount, net_amount, status,
  released_at, created_at,
  order_item:order_item_id (
    quantity, unit_price,
    sku:sku_id ( display_name ),
    order:order_id ( created_at, payment_confirmed_at )
  )
` as const;

export default async function SellPayoutsPage() {
  const current = await getCurrentUser();
  if (!current) {
    redirect(`/login?next=${encodeURIComponent('/sell/payouts')}`);
  }
  if (!current.profile?.phone_verified) {
    redirect(`/verify-phone?next=${encodeURIComponent('/sell/payouts')}`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: rowsRaw } = await supabase
    .from('payouts')
    .select(PAYOUT_SELECT)
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = (rowsRaw ?? []) as unknown as PayoutRow[];

  const pending = rows.filter((r) => r.status === 'pending');
  const released = rows.filter((r) => r.status === 'released');

  const pendingTotalNet = pending.reduce((sum, r) => sum + r.net_amount, 0);
  const monthReleasedRows = released.filter((r) => isInCurrentMonth(r.released_at));
  const monthReleasedNet = monthReleasedRows.reduce((sum, r) => sum + r.net_amount, 0);

  return (
    <MyRoomShell active="sales">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">정산 내역</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          판매 완료 건의 정산 대기 · 지급 완료 현황을 확인하세요.
        </p>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <SummaryTile
          kicker="정산 대기 금액"
          value={pendingTotalNet}
          subtitle={`${pending.length}건 대기`}
          accent="blue"
        />
        <SummaryTile
          kicker="이번 달 지급 완료"
          value={monthReleasedNet}
          subtitle={`${monthReleasedRows.length}건`}
          accent="gold"
        />
      </div>

      <div className="space-y-5">
        <PayoutSection
          title="대기"
          count={pending.length}
          rows={pending}
          emptyText="대기 중인 정산이 없습니다."
          mode="pending"
        />
        <PayoutSection
          title="완료"
          count={released.length}
          rows={released}
          emptyText="지급 완료된 정산이 없습니다."
          mode="released"
        />
      </div>
    </MyRoomShell>
  );
}

function SummaryTile({
  kicker,
  value,
  subtitle,
  accent,
}: {
  kicker: string;
  value: number;
  subtitle: string;
  accent: 'blue' | 'gold';
}) {
  const kickerClass = accent === 'gold' ? 'text-ticketa-gold-700' : 'text-ticketa-blue-700';
  return (
    <div className="surface-card p-5">
      <div className={`text-[10.5px] font-bold tracking-[0.06em] uppercase ${kickerClass}`}>
        {kicker}
      </div>
      <div className="mt-2">
        <MoneyDisplay value={value} size="lg" />
      </div>
      <div className="text-muted-foreground mt-1 text-xs">{subtitle}</div>
    </div>
  );
}

function PayoutSection({
  title,
  count,
  rows,
  emptyText,
  mode,
}: {
  title: string;
  count: number;
  rows: PayoutRow[];
  emptyText: string;
  mode: 'pending' | 'released';
}) {
  return (
    <section className="surface-card overflow-hidden p-0">
      <header className="border-border flex items-center justify-between border-b px-5 py-3">
        <h2 className="text-sm font-bold tracking-tight">{title}</h2>
        <span className="text-muted-foreground text-xs tabular-nums">{count}건</span>
      </header>
      {rows.length === 0 ? (
        <p className="text-muted-foreground px-5 py-6 text-sm">{emptyText}</p>
      ) : (
        <ul className="divide-border divide-y">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-bold tracking-tight">
                  {row.order_item?.sku?.display_name ?? '(SKU 없음)'}
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  수량 {row.order_item?.quantity ?? 0}장 · 주문일{' '}
                  {formatDate(row.order_item?.order?.created_at ?? null)}
                  {mode === 'pending'
                    ? ` · 예상 지급일 ${estimatePayoutDate(row.order_item?.order?.payment_confirmed_at ?? null)}`
                    : ` · 지급일 ${formatDate(row.released_at)}`}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <MoneyDisplay value={row.net_amount} size="sm" />
                <span className="text-muted-foreground text-[11px] tabular-nums">
                  총 {formatKRW(row.gross_amount)} − 수수료 {formatKRW(row.commission_amount)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
