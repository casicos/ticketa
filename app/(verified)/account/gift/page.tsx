import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Gift, Inbox, Send } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { MyRoomShell } from '@/components/account/my-room-shell';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';
import { GiftInboxActions } from './inbox-actions';
import { GiftOutboxActions } from './outbox-actions';

type Tab = 'inbox' | 'outbox';

type GiftRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  recipient_nickname_snapshot: string;
  qty: number;
  unit_price: number;
  total_price: number;
  message: string | null;
  status:
    | 'sent'
    | 'claimed_mileage'
    | 'claimed_delivery'
    | 'shipped'
    | 'completed'
    | 'refunded'
    | 'expired';
  shipping_carrier: string | null;
  tracking_no: string | null;
  sent_at: string;
  claimed_at: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  refunded_at: string | null;
  expires_at: string;
  sku: {
    id: string;
    brand: string;
    denomination: number;
    display_name: string;
  } | null;
  sender: { id: string; full_name: string | null; nickname: string | null } | null;
  recipient: { id: string; full_name: string | null; nickname: string | null } | null;
};

type AddressRow = {
  id: string;
  label: string | null;
  recipient_name: string;
  recipient_phone: string;
  postal_code: string;
  address1: string;
  address2: string | null;
  is_default: boolean;
};

const BRAND_LABEL: Record<string, string> = {
  lotte: '롯데',
  hyundai: '현대',
  shinsegae: '신세계',
  galleria: '갤러리아',
  ak: 'AK',
};

const STATUS_LABEL: Record<GiftRow['status'], { label: string; color: string; bg: string }> = {
  sent: { label: '수령 대기', color: '#8C6321', bg: 'rgba(212,162,76,0.14)' },
  claimed_mileage: { label: '마일리지 수령', color: '#1F6B43', bg: 'rgba(31,107,67,0.12)' },
  claimed_delivery: { label: '배송 준비', color: '#5BA3D0', bg: 'rgba(91,163,208,0.12)' },
  shipped: { label: '배송 중', color: '#5BA3D0', bg: 'rgba(91,163,208,0.12)' },
  completed: { label: '수령 완료', color: '#1F6B43', bg: 'rgba(31,107,67,0.12)' },
  refunded: { label: '환불', color: '#8C8278', bg: 'rgba(140,130,120,0.12)' },
  expired: { label: '만료', color: '#8C8278', bg: 'rgba(140,130,120,0.12)' },
};

function formatDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const GIFT_SELECT = `
  id, sender_id, recipient_id, recipient_nickname_snapshot,
  qty, unit_price, total_price, message, status,
  shipping_carrier, tracking_no,
  sent_at, claimed_at, shipped_at, completed_at, refunded_at, expires_at,
  sku:sku_id(id, brand, denomination, display_name),
  sender:sender_id(id, full_name, nickname),
  recipient:recipient_id(id, full_name, nickname)
`;

export default async function GiftPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await getCurrentUser();
  if (!current) redirect('/login?next=/account/gift');

  const params = await searchParams;
  const tabRaw = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab: Tab = tabRaw === 'outbox' ? 'outbox' : 'inbox';

  const supabase = await createSupabaseServerClient();

  const giftQuery = supabase
    .from('gifts')
    .select(GIFT_SELECT)
    .order('sent_at', { ascending: false })
    .limit(40);

  const filteredQuery =
    tab === 'inbox'
      ? giftQuery.eq('recipient_id', current.auth.id)
      : giftQuery.eq('sender_id', current.auth.id);

  const [giftsRes, addressesRes] = await Promise.all([
    filteredQuery,
    supabase
      .from('shipping_addresses')
      .select(
        'id, label, recipient_name, recipient_phone, postal_code, address1, address2, is_default',
      )
      .eq('user_id', current.auth.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  const rows = (giftsRes.data ?? []) as unknown as GiftRow[];
  const addresses = (addressesRes.data ?? []) as AddressRow[];

  const unclaimedCount = rows.filter((r) => tab === 'inbox' && r.status === 'sent').length;
  const totalValue = rows.reduce((s, r) => s + r.total_price, 0);

  return (
    <MyRoomShell active="gift">
      <div className="w-full">
        <div className="mb-6 flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">선물 상품권</h1>
            <p className="text-muted-foreground mt-1 text-[15px]">
              에이전트 매물을 닉네임으로 선물하고, 마일리지 또는 실물로 받아보세요.
            </p>
          </div>
        </div>

        {/* tabs + summary */}
        <div className="border-border mb-4 flex flex-wrap items-center justify-between gap-3 border-b">
          <div className="flex gap-1">
            <TabLink active={tab === 'inbox'} href="/account/gift?tab=inbox">
              <Inbox className="size-4" strokeWidth={2} />
              받은 선물
            </TabLink>
            <TabLink active={tab === 'outbox'} href="/account/gift?tab=outbox">
              <Send className="size-4" strokeWidth={2} />
              보낸 선물
            </TabLink>
          </div>
          <div className="text-muted-foreground flex items-center gap-4 pb-2 text-[14px] tabular-nums">
            {tab === 'inbox' && unclaimedCount > 0 && (
              <span>
                수령 대기{' '}
                <b className="text-foreground">{unclaimedCount.toLocaleString('ko-KR')}</b>건
              </span>
            )}
            <span>
              총 <b className="text-foreground">{rows.length.toLocaleString('ko-KR')}</b>건 ·{' '}
              <b className="text-foreground">{totalValue.toLocaleString('ko-KR')}</b>원
            </span>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => {
              const brand = r.sku?.brand ?? 'lotte';
              const meta = STATUS_LABEL[r.status];
              const skuLabel = r.sku
                ? `${BRAND_LABEL[brand] ?? brand} ${r.sku.denomination.toLocaleString('ko-KR')}원권`
                : '알 수 없는 SKU';
              const counterparty =
                tab === 'inbox'
                  ? r.sender?.full_name || r.sender?.nickname || '익명'
                  : r.recipient_nickname_snapshot;

              return (
                <article
                  key={r.id}
                  className="border-border overflow-hidden rounded-[12px] border bg-white"
                >
                  <div className="flex items-start gap-4 p-5">
                    <DeptMark dept={brand as Department} size={48} />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-extrabold">{skuLabel}</span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[12px] font-extrabold"
                          style={{ color: meta.color, background: meta.bg }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-[14px]">
                        {tab === 'inbox' ? 'From' : 'To'}{' '}
                        <span className="text-foreground font-bold">{counterparty}</span>
                        {tab === 'outbox' && r.recipient?.nickname && (
                          <span className="ml-1 font-mono text-[13px]">
                            (@{r.recipient.nickname})
                          </span>
                        )}
                        <span className="ml-2">· {formatDate(r.sent_at)}</span>
                      </div>
                      {r.message && (
                        <div className="bg-warm-50 text-foreground mt-2 rounded-[8px] px-3 py-2 text-[14px] italic">
                          &ldquo;{r.message}&rdquo;
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[14px] tabular-nums">
                        <span>
                          수량 <b>{r.qty.toLocaleString('ko-KR')}매</b>
                        </span>
                        <span>
                          액면 <b>{r.unit_price.toLocaleString('ko-KR')}원</b>
                        </span>
                        <span className="text-foreground">
                          총{' '}
                          <b className="text-[14px]">{r.total_price.toLocaleString('ko-KR')}원</b>
                        </span>
                      </div>
                      {r.shipping_carrier && r.tracking_no && (
                        <div className="text-muted-foreground mt-2 text-[13px] tabular-nums">
                          🚚 {r.shipping_carrier} · 운송장 {r.tracking_no}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0">
                      {tab === 'inbox' ? (
                        <GiftInboxActions
                          giftId={r.id}
                          status={r.status}
                          totalPrice={r.total_price}
                          qty={r.qty}
                          skuLabel={skuLabel}
                          senderLabel={counterparty}
                          addresses={addresses}
                        />
                      ) : (
                        <GiftOutboxActions
                          giftId={r.id}
                          status={r.status}
                          recipient={counterparty}
                          totalPrice={r.total_price}
                        />
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </MyRoomShell>
  );
}

function TabLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[14px] font-extrabold transition-colors ${
        active
          ? 'border-ticketa-blue-500 text-ticketa-blue-700'
          : 'text-muted-foreground hover:text-foreground border-transparent'
      }`}
    >
      {children}
    </Link>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="border-border rounded-[12px] border border-dashed bg-white p-12 text-center">
      <Gift className="text-muted-foreground mx-auto mb-3 size-10" strokeWidth={1.5} />
      <p className="text-[15px] font-bold">
        {tab === 'inbox' ? '받은 선물이 없어요' : '보낸 선물이 없어요'}
      </p>
      <p className="text-muted-foreground mt-1 text-[14px]">
        {tab === 'inbox'
          ? '에이전트 매물에서 누군가 닉네임으로 선물을 보내면 여기에 표시돼요.'
          : '카탈로그의 에이전트 매물에서 "선물하기"로 첫 선물을 보내보세요.'}
      </p>
    </div>
  );
}
