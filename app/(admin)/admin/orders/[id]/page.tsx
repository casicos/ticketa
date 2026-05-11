import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatKRW, formatDateTime } from '@/lib/format';
import {
  ConfirmPaymentButton,
  MarkShippedButton,
  MarkDeliveredButton,
  AdminCancelOrderButton,
} from '../order-actions';

// ------------------------------------------------------------------
// 타입
// ------------------------------------------------------------------

type OrderDetail = {
  id: string;
  status: string;
  total_amount: number;
  payment_due_at: string | null;
  payment_confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  shipping_address: Record<string, string> | null;
  admin_memo: string | null;
  created_at: string;
  buyer: {
    id: string;
    email: string | null;
    full_name: string;
    phone: string | null;
  } | null;
};

type OrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  status: string;
  fulfilled_at: string | null;
  cancelled_at: string | null;
  seller: {
    id: string;
    full_name: string;
    email: string | null;
  } | null;
  sku: {
    brand: string;
    denomination: number;
    display_name: string;
  } | null;
};

type AuditEvent = {
  id: number;
  actor_id: string | null;
  event: string;
  from_state: string | null;
  to_state: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

// ------------------------------------------------------------------
// 상수
// ------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  pending_payment: '입금 대기',
  payment_confirmed: '결제 확인됨',
  shipped: '발송 중',
  delivered: '배송 완료',
  cancelled: '취소됨',
  disputed: '분쟁',
};

const ITEM_STATUS_LABELS: Record<string, string> = {
  pending: '대기',
  fulfilled: '이행 완료',
  cancelled_item: '취소',
  refunded: '환불',
};

// ------------------------------------------------------------------
// 페이지 (서버 컴포넌트)
// ------------------------------------------------------------------

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [orderRes, itemsRes, auditRes] = await Promise.all([
    supabase
      .from('orders')
      .select(
        `id, status, total_amount, payment_due_at, payment_confirmed_at,
         shipped_at, delivered_at, cancelled_at, cancel_reason,
         shipping_address, admin_memo, created_at,
         buyer:buyer_id ( id, email, full_name, phone )`,
      )
      .eq('id', id)
      .single(),

    supabase
      .from('order_items')
      .select(
        `id, quantity, unit_price, subtotal, status, fulfilled_at, cancelled_at,
         seller:seller_id ( id, full_name, email ),
         sku:sku_id ( brand, denomination, display_name )`,
      )
      .eq('order_id', id)
      .order('id'),

    supabase
      .from('audit_events')
      .select('id, actor_id, event, from_state, to_state, metadata, created_at')
      .eq('entity_type', 'order')
      .eq('entity_id', id)
      .order('created_at', { ascending: true }),
  ]);

  if (!orderRes.data) notFound();

  const order = orderRes.data as unknown as OrderDetail;
  const items = (itemsRes.data ?? []) as unknown as OrderItem[];
  const auditEvents = (auditRes.data ?? []) as unknown as AuditEvent[];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-6 sm:px-8 sm:py-8">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/admin/orders">
          <ChevronLeft className="size-4" strokeWidth={1.75} />
          주문 관리
        </Link>
      </Button>

      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:mb-6">
        <div className="space-y-1">
          <h1 className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">
            #{id.slice(0, 8)}
          </h1>
          <p className="text-muted-foreground text-sm">
            {STATUS_LABELS[order.status] ?? order.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.status === 'pending_payment' && (
            <>
              <ConfirmPaymentButton orderId={order.id} />
              <AdminCancelOrderButton orderId={order.id} />
            </>
          )}
          {order.status === 'payment_confirmed' && (
            <>
              <MarkShippedButton orderId={order.id} />
              <AdminCancelOrderButton orderId={order.id} />
            </>
          )}
          {order.status === 'shipped' && <MarkDeliveredButton orderId={order.id} />}
        </div>
      </header>

      {/* 주문 정보 */}
      <section className="surface-card mb-4 p-5 sm:p-6">
        <h2 className="mb-4 text-base font-bold tracking-tight">주문 정보</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
          <dt className="text-muted-foreground">주문 ID</dt>
          <dd className="font-mono text-xs">{order.id}</dd>
          <dt className="text-muted-foreground">총액</dt>
          <dd className="font-semibold tabular-nums">{formatKRW(order.total_amount)}</dd>
          <dt className="text-muted-foreground">상태</dt>
          <dd>{STATUS_LABELS[order.status] ?? order.status}</dd>
          <dt className="text-muted-foreground">생성 시각</dt>
          <dd className="tabular-nums">{formatDateTime(order.created_at)}</dd>
          <dt className="text-muted-foreground">입금 기한</dt>
          <dd className="tabular-nums">{formatDateTime(order.payment_due_at)}</dd>
          <dt className="text-muted-foreground">결제 확인</dt>
          <dd className="tabular-nums">{formatDateTime(order.payment_confirmed_at)}</dd>
          <dt className="text-muted-foreground">발송 시각</dt>
          <dd className="tabular-nums">{formatDateTime(order.shipped_at)}</dd>
          <dt className="text-muted-foreground">수령 시각</dt>
          <dd className="tabular-nums">{formatDateTime(order.delivered_at)}</dd>
          <dt className="text-muted-foreground">취소 시각</dt>
          <dd className="tabular-nums">{formatDateTime(order.cancelled_at)}</dd>
        </dl>
        {order.cancel_reason && (
          <div className="border-destructive/40 bg-destructive/10 mt-4 flex items-start gap-2.5 rounded-xl border p-4 text-sm">
            <span className="text-destructive font-medium">취소 사유: </span>
            <span>{order.cancel_reason}</span>
          </div>
        )}
        {order.admin_memo && (
          <p className="text-muted-foreground mt-3 text-xs italic">{order.admin_memo}</p>
        )}
      </section>

      {/* 구매자 정보 */}
      <section className="surface-card mb-4 p-5 sm:p-6">
        <h2 className="mb-4 text-base font-bold tracking-tight">구매자 정보</h2>
        {order.buyer ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
            <dt className="text-muted-foreground">이름</dt>
            <dd>{order.buyer.full_name}</dd>
            <dt className="text-muted-foreground">이메일</dt>
            <dd>{order.buyer.email ?? '-'}</dd>
            <dt className="text-muted-foreground">전화번호</dt>
            <dd>{order.buyer.phone ?? '-'}</dd>
            <dt className="text-muted-foreground">사용자 ID</dt>
            <dd className="font-mono text-xs">{order.buyer.id}</dd>
          </dl>
        ) : (
          <p className="text-muted-foreground text-sm">구매자 정보 없음</p>
        )}
      </section>

      {/* 배송지 */}
      {order.shipping_address && (
        <section className="surface-card mb-4 p-5 sm:p-6">
          <h2 className="mb-4 text-base font-bold tracking-tight">배송지</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
            <dt className="text-muted-foreground">수령인</dt>
            <dd>{order.shipping_address.recipient ?? '-'}</dd>
            <dt className="text-muted-foreground">전화번호</dt>
            <dd>{order.shipping_address.phone ?? '-'}</dd>
            <dt className="text-muted-foreground">우편번호</dt>
            <dd>{order.shipping_address.postal_code ?? '-'}</dd>
            <dt className="text-muted-foreground col-span-1">주소</dt>
            <dd className="sm:col-span-3">
              {order.shipping_address.address_line1 ?? '-'}
              {order.shipping_address.address_line2
                ? ` ${order.shipping_address.address_line2}`
                : ''}
            </dd>
            {order.shipping_address.note && (
              <>
                <dt className="text-muted-foreground">배송 메모</dt>
                <dd className="sm:col-span-3">{order.shipping_address.note}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {/* 주문 아이템 */}
      <section className="surface-card mb-4 overflow-hidden p-0">
        <header className="border-border flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-sm font-bold tracking-tight">주문 아이템</h2>
          <span className="text-muted-foreground text-xs tabular-nums">{items.length}건</span>
        </header>
        {items.length === 0 ? (
          <p className="text-muted-foreground px-5 py-6 text-sm">아이템 없음</p>
        ) : (
          <div className="divide-border divide-y">
            {items.map((item) => (
              <div key={item.id} className="space-y-1 px-5 py-3.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold tracking-tight">
                    {item.sku?.display_name ?? '(SKU 없음)'}
                  </span>
                  <span
                    className={
                      item.status === 'fulfilled'
                        ? 'text-success text-xs font-medium'
                        : item.status === 'cancelled_item'
                          ? 'text-destructive text-xs'
                          : 'text-muted-foreground text-xs'
                    }
                  >
                    {ITEM_STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </div>
                <div className="text-muted-foreground flex gap-6 text-xs tabular-nums">
                  <span>수량: {item.quantity}</span>
                  <span>단가: {formatKRW(item.unit_price)}</span>
                  <span>소계: {formatKRW(item.subtotal)}</span>
                </div>
                <div className="text-muted-foreground text-xs">
                  판매자: {item.seller?.full_name ?? '-'}
                  {item.seller?.email ? ` (${item.seller.email})` : ''}
                </div>
                {item.fulfilled_at && (
                  <div className="text-muted-foreground text-xs tabular-nums">
                    이행: {formatDateTime(item.fulfilled_at)}
                  </div>
                )}
                {item.cancelled_at && (
                  <div className="text-destructive text-xs tabular-nums">
                    취소: {formatDateTime(item.cancelled_at)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 감사 타임라인 */}
      <section className="surface-card p-5 sm:p-6">
        <h2 className="mb-4 text-base font-bold tracking-tight">상태 전이 타임라인</h2>
        {auditEvents.length === 0 ? (
          <p className="text-muted-foreground text-sm">기록 없음</p>
        ) : (
          <ol className="space-y-3">
            {auditEvents.map((ev) => (
              <li key={ev.id} className="flex gap-3 text-sm">
                <span className="text-muted-foreground w-36 shrink-0 text-xs tabular-nums">
                  {formatDateTime(ev.created_at)}
                </span>
                <div className="space-y-0.5">
                  <p className="font-mono font-medium">{ev.event}</p>
                  {(ev.from_state || ev.to_state) && (
                    <p className="text-muted-foreground text-xs">
                      {ev.from_state && <span>{ev.from_state}</span>}
                      {ev.from_state && ev.to_state && <span> → </span>}
                      {ev.to_state && <span>{ev.to_state}</span>}
                    </p>
                  )}
                  {ev.actor_id && (
                    <p className="text-muted-foreground font-mono text-xs">
                      actor: {ev.actor_id.slice(0, 8)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
