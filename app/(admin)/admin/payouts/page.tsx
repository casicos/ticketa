import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ReleasePayoutButton } from './release-button';
import { formatKRW, formatDateTime, shortId } from '@/lib/format';

// ------------------------------------------------------------------
// 타입
// ------------------------------------------------------------------

type PayoutRow = {
  id: string;
  seller_id: string;
  order_item_id: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  status: 'pending' | 'released' | 'held';
  released_at: string | null;
  bank_code: string | null;
  account_number_last4: string | null;
  admin_memo: string | null;
  created_at: string;
  seller: {
    full_name: string;
    email: string | null;
  } | null;
  order_item: {
    quantity: number;
    unit_price: number;
    order_id: string;
    sku: { display_name: string } | null;
    order: {
      payment_confirmed_at: string | null;
    } | null;
  } | null;
};

type SellerGroup = {
  sellerId: string;
  sellerName: string;
  sellerEmail: string | null;
  rows: PayoutRow[];
  totalNet: number;
};

// ------------------------------------------------------------------
// 유틸
// ------------------------------------------------------------------

function groupBySeller(rows: PayoutRow[]): SellerGroup[] {
  const map = new Map<string, SellerGroup>();
  for (const r of rows) {
    const existing = map.get(r.seller_id);
    if (existing) {
      existing.rows.push(r);
      existing.totalNet += r.net_amount;
    } else {
      map.set(r.seller_id, {
        sellerId: r.seller_id,
        sellerName: r.seller?.full_name ?? '(이름 없음)',
        sellerEmail: r.seller?.email ?? null,
        rows: [r],
        totalNet: r.net_amount,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.totalNet - a.totalNet);
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function isOverdue(row: PayoutRow, nowMs: number): boolean {
  const paymentConfirmedAt = row.order_item?.order?.payment_confirmed_at;
  if (!paymentConfirmedAt) return false;
  return nowMs - new Date(paymentConfirmedAt).getTime() > THREE_DAYS_MS;
}

// ------------------------------------------------------------------
// 쿼리
// ------------------------------------------------------------------

const PAYOUT_SELECT = `
  id, seller_id, order_item_id,
  gross_amount, commission_amount, net_amount,
  status, released_at, bank_code, account_number_last4, admin_memo, created_at,
  seller:seller_id ( full_name, email ),
  order_item:order_item_id (
    quantity, unit_price, order_id,
    sku:sku_id ( display_name ),
    order:order_id ( payment_confirmed_at )
  )
` as const;

async function fetchPendingPayouts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<PayoutRow[]> {
  const { data } = await supabase
    .from('payouts')
    .select(PAYOUT_SELECT)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  return (data ?? []) as unknown as PayoutRow[];
}

async function fetchRecentReleasedPayouts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<PayoutRow[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('payouts')
    .select(PAYOUT_SELECT)
    .eq('status', 'released')
    .gte('released_at', since)
    .order('released_at', { ascending: false })
    .limit(100);
  return (data ?? []) as unknown as PayoutRow[];
}

// ------------------------------------------------------------------
// 행 컴포넌트
// ------------------------------------------------------------------

function PendingRow({ row, nowMs }: { row: PayoutRow; nowMs: number }) {
  const skuName = row.order_item?.sku?.display_name ?? '(SKU 없음)';
  const qty = row.order_item?.quantity ?? 0;
  const orderShort = row.order_item ? shortId(row.order_item.order_id) : '-';
  const overdue = isOverdue(row, nowMs);
  const accountMissing = !row.bank_code || !row.account_number_last4;

  return (
    <div className="border-border rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-bold tracking-tight">{skuName}</div>
          <div className="text-muted-foreground mt-0.5 text-xs tabular-nums">
            주문 #{orderShort} · 수량 {qty}장 · 생성 {formatDateTime(row.created_at)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {overdue && (
            <span className="bg-destructive/10 text-destructive rounded-sm px-2 py-0.5 text-xs font-semibold">
              3일 초과
            </span>
          )}
          {accountMissing && (
            <span className="bg-warning/15 text-warning rounded-sm px-2 py-0.5 text-xs font-semibold">
              계좌 없음
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs tabular-nums sm:grid-cols-4">
        <div>
          <div className="text-muted-foreground">총액</div>
          <div className="font-medium">{formatKRW(row.gross_amount)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">수수료</div>
          <div className="font-medium">-{formatKRW(row.commission_amount)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">지급액</div>
          <div className="font-semibold">{formatKRW(row.net_amount)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">계좌</div>
          <div className="font-medium">
            {row.bank_code && row.account_number_last4
              ? `${row.bank_code} ****${row.account_number_last4}`
              : '-'}
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <ReleasePayoutButton
          payoutId={row.id}
          sellerName={row.seller?.full_name ?? '(이름 없음)'}
          netAmount={row.net_amount}
          bankCode={row.bank_code}
          accountLast4={row.account_number_last4}
        />
      </div>
    </div>
  );
}

function ReleasedRow({ row }: { row: PayoutRow }) {
  const skuName = row.order_item?.sku?.display_name ?? '(SKU 없음)';
  const qty = row.order_item?.quantity ?? 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
      <div className="flex flex-col">
        <span className="font-bold tracking-tight">
          {row.seller?.full_name ?? '(이름 없음)'} · {skuName}
        </span>
        <span className="text-muted-foreground text-xs tabular-nums">
          수량 {qty}장 · 지급일 {formatDateTime(row.released_at)}
          {row.admin_memo ? ` · ${row.admin_memo}` : ''}
        </span>
      </div>
      <div className="font-mono text-sm font-semibold tabular-nums">
        {formatKRW(row.net_amount)}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// 페이지 (서버 컴포넌트)
// ------------------------------------------------------------------

export default async function AdminPayoutsPage() {
  const supabase = await createSupabaseServerClient();

  const [pending, released] = await Promise.all([
    fetchPendingPayouts(supabase),
    fetchRecentReleasedPayouts(supabase),
  ]);

  // 3일 초과 판정 기준 — 서버 렌더 시점. (Date.now() 는 lint purity 규칙에 걸리므로 new Date() 사용)
  const nowMs = new Date().getTime();

  const pendingGroups = groupBySeller(pending);
  const pendingTotalNet = pending.reduce((sum, r) => sum + r.net_amount, 0);
  const overdueCount = pending.filter((r) => isOverdue(r, nowMs)).length;
  const releasedTotalNet = released.reduce((sum, r) => sum + r.net_amount, 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-6 sm:px-8 sm:py-8">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/admin">
          <ChevronLeft className="size-4" strokeWidth={1.75} />
          어드민
        </Link>
      </Button>

      <header className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">정산 관리</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">판매자별 정산 대기 현황 및 지급 처리</p>
      </header>

      {/* 요약 타일 */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="surface-card p-5">
          <p className="text-muted-foreground text-[15px] font-bold">정산 대기 건수</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{pending.length}건</p>
          <p className="text-muted-foreground mt-1 text-xs tabular-nums">
            총 지급액 {formatKRW(pendingTotalNet)}
          </p>
        </div>
        <div className="surface-card p-5">
          <p className="text-muted-foreground text-[15px] font-bold">3일 초과 대기</p>
          <p
            className={`mt-2 text-2xl font-bold tabular-nums ${overdueCount > 0 ? 'text-destructive' : ''}`}
          >
            {overdueCount}건
          </p>
          <p className="text-muted-foreground mt-1 text-xs">payment_confirmed 후 3일 경과</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-muted-foreground text-[15px] font-bold">최근 30일 지급</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{released.length}건</p>
          <p className="text-muted-foreground mt-1 text-xs tabular-nums">
            총 {formatKRW(releasedTotalNet)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* 정산 대기 */}
        <section className="surface-card overflow-hidden p-0">
          <header className="border-border flex items-center justify-between border-b px-5 py-3">
            <h2 className="text-sm font-bold tracking-tight">정산 대기</h2>
            <span className="text-muted-foreground text-xs tabular-nums">
              {pendingGroups.length}명 / {pending.length}건
            </span>
          </header>
          {pendingGroups.length === 0 ? (
            <p className="text-muted-foreground px-5 py-6 text-sm">대기 중인 정산이 없습니다.</p>
          ) : (
            <div className="divide-border divide-y">
              {pendingGroups.map((group) => (
                <div key={group.sellerId} className="p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold tracking-tight">{group.sellerName}</p>
                      {group.sellerEmail && (
                        <p className="text-muted-foreground text-xs">{group.sellerEmail}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs">대기 총액</p>
                      <p className="font-mono text-sm font-semibold tabular-nums">
                        {formatKRW(group.totalNet)} · {group.rows.length}건
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {group.rows.map((row) => (
                      <PendingRow key={row.id} row={row} nowMs={nowMs} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 최근 정산 완료 */}
        <section className="surface-card overflow-hidden p-0">
          <header className="border-border flex items-center justify-between border-b px-5 py-3">
            <h2 className="text-sm font-bold tracking-tight">최근 정산 완료</h2>
            <span className="text-muted-foreground text-xs tabular-nums">{released.length}건</span>
          </header>
          {released.length === 0 ? (
            <p className="text-muted-foreground px-5 py-6 text-sm">
              최근 30일 내 지급 이력이 없습니다.
            </p>
          ) : (
            <div className="divide-border divide-y">
              {released.map((row) => (
                <ReleasedRow key={row.id} row={row} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
