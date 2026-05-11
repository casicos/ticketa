'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Coins, Truck, MapPin, Plus } from 'lucide-react';
import { claimGiftMileageAction, claimGiftDeliveryAction } from './actions';

export type AddressLite = {
  id: string;
  label: string | null;
  recipient_name: string;
  recipient_phone: string;
  postal_code: string;
  address1: string;
  address2: string | null;
  is_default: boolean;
};

export function GiftInboxActions({
  giftId,
  status,
  totalPrice,
  qty,
  skuLabel,
  senderLabel,
  addresses,
}: {
  giftId: string;
  status:
    | 'sent'
    | 'claimed_mileage'
    | 'claimed_delivery'
    | 'shipped'
    | 'completed'
    | 'refunded'
    | 'expired';
  totalPrice: number;
  qty: number;
  skuLabel: string;
  senderLabel: string;
  addresses: AddressLite[];
}) {
  const [open, setOpen] = useState<'mileage' | 'delivery' | null>(null);

  if (status !== 'sent') {
    return null;
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setOpen('mileage')}
          className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-[10px] px-4 text-[13px] font-extrabold text-white"
          style={{ background: 'linear-gradient(180deg, #1F6B43 0%, #155032 100%)' }}
        >
          <Coins className="size-4" strokeWidth={2.25} />
          마일리지로 받기
        </button>
        <button
          type="button"
          onClick={() => setOpen('delivery')}
          className="border-border text-foreground hover:bg-warm-50 inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-[10px] border bg-white px-4 text-[13px] font-extrabold"
        >
          <Truck className="size-4" strokeWidth={2.25} />
          현물 배송
        </button>
      </div>

      {open === 'mileage' && (
        <MileageClaimDialog
          giftId={giftId}
          totalPrice={totalPrice}
          qty={qty}
          skuLabel={skuLabel}
          senderLabel={senderLabel}
          onClose={() => setOpen(null)}
        />
      )}
      {open === 'delivery' && (
        <DeliveryClaimDialog
          giftId={giftId}
          qty={qty}
          skuLabel={skuLabel}
          addresses={addresses}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function MileageClaimDialog({
  giftId,
  totalPrice,
  qty,
  skuLabel,
  senderLabel,
  onClose,
}: {
  giftId: string;
  totalPrice: number;
  qty: number;
  skuLabel: string;
  senderLabel: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function confirm() {
    const fd = new FormData();
    fd.set('gift_id', giftId);
    start(async () => {
      const r = await claimGiftMileageAction(fd);
      if (r.ok) {
        toast.success(`${totalPrice.toLocaleString('ko-KR')}원이 마일리지로 적립됐어요`);
        onClose();
        router.refresh();
      } else {
        toast.error(r.message ?? '실패');
      }
    });
  }

  return (
    <DialogShell title="마일리지로 받기" onClose={onClose}>
      <div className="grid gap-4 px-6 py-5">
        <div className="border-border bg-warm-50/40 rounded-[10px] border p-4 text-[13px]">
          <div className="text-muted-foreground">선물</div>
          <div className="mt-1 text-[15px] font-extrabold">{skuLabel}</div>
          <div className="text-muted-foreground text-[13px]">
            From <b className="text-foreground">{senderLabel}</b> · {qty.toLocaleString('ko-KR')}매
          </div>
        </div>
        <div
          className="rounded-[12px] p-5 text-center"
          style={{
            background:
              'linear-gradient(135deg, rgba(31,107,67,0.10) 0%, rgba(31,107,67,0.02) 100%)',
            border: '1px solid rgba(31,107,67,0.20)',
          }}
        >
          <div className="text-muted-foreground text-[12px] font-bold tracking-[0.08em] uppercase">
            지급 마일리지
          </div>
          <div
            className="mt-1 text-[28px] font-extrabold tracking-[-0.02em] tabular-nums"
            style={{ color: '#1F6B43' }}
          >
            +{totalPrice.toLocaleString('ko-KR')}원
          </div>
          <div className="text-muted-foreground mt-1.5 text-[12px]">
            cash 잔액으로 적립 · 즉시 출금 가능
          </div>
        </div>
        <p className="text-muted-foreground text-[12px]">
          마일리지로 받으면 보낸 사람에게 알림이 가지 않아요.
        </p>
      </div>
      <DialogFooter
        onClose={onClose}
        confirmLabel={pending ? '처리 중…' : `${totalPrice.toLocaleString('ko-KR')}원 받기 →`}
        onConfirm={confirm}
        confirmDisabled={pending}
        confirmTone="success"
      />
    </DialogShell>
  );
}

function DeliveryClaimDialog({
  giftId,
  qty,
  skuLabel,
  addresses,
  onClose,
}: {
  giftId: string;
  qty: number;
  skuLabel: string;
  addresses: AddressLite[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string | null>(
    addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? null,
  );

  function confirm() {
    if (!selected) {
      toast.error('배송지를 선택하세요');
      return;
    }
    const fd = new FormData();
    fd.set('gift_id', giftId);
    fd.set('address_id', selected);
    start(async () => {
      const r = await claimGiftDeliveryAction(fd);
      if (r.ok) {
        toast.success('배송 신청이 접수됐어요. 1~3일 내 발송됩니다');
        onClose();
        router.refresh();
      } else {
        toast.error(r.message ?? '실패');
      }
    });
  }

  return (
    <DialogShell title="현물 배송으로 받기" onClose={onClose}>
      <div className="grid gap-4 px-6 py-5">
        <div className="border-border bg-warm-50/40 rounded-[10px] border p-4 text-[13px]">
          <div className="text-muted-foreground">선물</div>
          <div className="mt-1 text-[15px] font-extrabold">{skuLabel}</div>
          <div className="text-muted-foreground text-[13px]">
            {qty.toLocaleString('ko-KR')}매 — 실물 상품권으로 발송돼요
          </div>
        </div>

        {addresses.length === 0 ? (
          <div className="border-border rounded-[10px] border border-dashed p-6 text-center">
            <MapPin className="text-muted-foreground mx-auto mb-2 size-7" strokeWidth={1.5} />
            <p className="text-[14px] font-bold">등록된 배송지가 없어요</p>
            <p className="text-muted-foreground mt-1 text-[12px]">
              현물 수령 전에 배송지를 먼저 등록하세요.
            </p>
            <Link
              href="/account/addresses"
              className="bg-ticketa-blue-500 mt-3 inline-flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-extrabold text-white"
            >
              <Plus className="size-3.5" strokeWidth={2.25} />
              배송지 등록하기
            </Link>
          </div>
        ) : (
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-bold">배송지 선택</div>
              <Link
                href="/account/addresses"
                className="text-ticketa-blue-700 text-[12px] font-bold underline-offset-2 hover:underline"
              >
                관리 →
              </Link>
            </div>
            {addresses.map((a) => {
              const active = selected === a.id;
              return (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => setSelected(a.id)}
                  className="rounded-[10px] border p-3 text-left transition-colors"
                  style={{
                    borderColor: active ? '#5BA3D0' : 'var(--border)',
                    background: active ? 'rgba(91,163,208,0.06)' : 'white',
                  }}
                >
                  <div className="flex items-center gap-1.5 text-[13px] font-extrabold">
                    {a.label || a.recipient_name}
                    {a.is_default && (
                      <span className="bg-ticketa-blue-50 text-ticketa-blue-700 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                        기본
                      </span>
                    )}
                  </div>
                  <div className="text-foreground mt-0.5 text-[12px]">
                    {a.recipient_name} · {a.recipient_phone}
                  </div>
                  <div className="text-muted-foreground text-[12px]">
                    ({a.postal_code}) {a.address1}
                    {a.address2 ? ` ${a.address2}` : ''}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <p className="text-muted-foreground text-[12px]">
          어드민 검수 후 1~3일 내 등기 발송돼요. 발송이 시작되면 알림으로 운송장이 안내됩니다.
        </p>
      </div>
      <DialogFooter
        onClose={onClose}
        confirmLabel={pending ? '처리 중…' : '배송 신청 →'}
        onConfirm={confirm}
        confirmDisabled={pending || !selected || addresses.length === 0}
        confirmTone="primary"
      />
    </DialogShell>
  );
}

function DialogShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[480px] overflow-hidden rounded-[14px] bg-white shadow-2xl">
        <div className="border-border border-b px-6 py-4">
          <h3 className="text-[18px] font-extrabold tracking-[-0.018em]">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}

function DialogFooter({
  onClose,
  confirmLabel,
  onConfirm,
  confirmDisabled,
  confirmTone,
}: {
  onClose: () => void;
  confirmLabel: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  confirmTone?: 'primary' | 'success';
}) {
  const bg =
    confirmTone === 'success' ? 'linear-gradient(180deg, #1F6B43 0%, #155032 100%)' : '#5BA3D0';
  return (
    <div className="border-border bg-warm-50/40 flex items-center justify-end gap-2 border-t px-6 py-3.5">
      <button
        type="button"
        onClick={onClose}
        className="border-border text-foreground hover:bg-warm-50 h-10 cursor-pointer rounded-[10px] border bg-white px-4 text-[14px] font-bold"
      >
        취소
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={confirmDisabled}
        className="h-10 cursor-pointer rounded-[10px] px-5 text-[14px] font-extrabold text-white disabled:opacity-50"
        style={{ background: bg }}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
